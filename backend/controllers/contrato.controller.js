import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Valida contrato usando IA
 */
async function validarContratoComIA(arquivo) {
    try {
        logger.info('Validando contrato com IA...');

        const base64Data = arquivo.buffer.toString('base64');
        const mimeType = arquivo.mimetype;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `Analise este documento e verifique se é um CONTRATO válido.
                       
                       Procure por:
                       - Identificação das partes contratantes (contratante e contratado)
                       - Objeto do contrato (descrição dos serviços/produtos)
                       - Cláusulas contratuais
                       - Valores e condições de pagamento
                       - Prazo de vigência
                       - Assinaturas ou identificação das partes
                       - Data de celebração
                       - Testemunhas (quando aplicável)
                       
                       Documentos válidos incluem:
                       - Contratos de prestação de serviços
                       - Contratos de fornecimento
                       - Termos de parceria
                       - Convênios
                       - Acordos de cooperação
                       - Contratos de trabalho
                       
                       Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve e específico]".`;

        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType, data: base64Data } },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        if (texto.startsWith('VÁLIDO')) {
            logger.info('✅ Contrato aprovado pela IA.');
            return { valido: true, motivo: null };
        } else {
            const motivo = texto.replace('INVÁLIDO:', '').trim() || 'Documento não corresponde a um contrato válido';
            logger.warn(`❌ Contrato rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error('Erro ao validar contrato:', error);
        return { valido: true, motivo: 'Validação manual necessária (erro na IA)' };
    }
}

/**
 * Busca todos os contratos da instituição logada.
 */
export const getContratos = async (req, res) => {
    logger.info('Iniciando busca de contratos...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando contratos para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('contrato')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('ano_vigencia', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de contratos bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar contratos.', error);
        res.status(500).json({ message: 'Erro ao buscar contratos.' });
    }
};

/**
 * Adiciona novo contrato COM VALIDAÇÃO POR IA
 */
export const addContrato = async (req, res) => {
    logger.info('Iniciando processo de adição de novo contrato...');
    let filePath;
    try {
        const instituicaoId = req.user.id;
        const { nome_contrato, descricao, ano_vigencia } = req.body;

        logger.debug('Dados recebidos para novo contrato:', { nome_contrato, ano_vigencia });

        if (!req.file) {
            logger.warn('Tentativa de adicionar contrato sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo de contrato foi enviado.' });
        }

        // ✅ VALIDAÇÃO COM IA
        const file = req.file;
        logger.info('🤖 Validando contrato com IA...');
        const validacao = await validarContratoComIA(file);

        if (!validacao.valido) {
            logger.warn(`❌ Contrato rejeitado pela IA: ${validacao.motivo}`);
            return res.status(400).json({ 
                message: 'Documento inválido detectado pela análise automática.',
                detalhes: validacao.motivo
            });
        }

        logger.info('✅ Contrato aprovado pela IA. Prosseguindo com upload...');

        // 1. Upload do arquivo
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de contrato para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de contrato realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados do contrato no banco de dados...');
        const { data: contratoData, error: insertError } = await supabase
            .from('contrato')
            .insert({
                instituicao_id: instituicaoId,
                nome_contrato,
                descricao,
                ano_vigencia: parseInt(ano_vigencia, 10),
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        logger.info('Contrato adicionado com sucesso!', { id: contratoData.id });
        res.status(201).json({ 
            message: 'Contrato validado e adicionado com sucesso!', 
            data: contratoData 
        });

    } catch (error) {
        logger.error('Erro no processo de adicionar contrato.', error);
        
        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('contracts').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }
        
        res.status(500).json({ message: 'Erro interno ao adicionar contrato.' });
    }
};

/**
 * Deleta um contrato e seu arquivo associado no Storage.
 */
export const deleteContrato = async (req, res) => {
    logger.info('Iniciando processo de exclusão de contrato...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar contrato ID: ${id}`);

        const { data: contrato, error: fetchError } = await supabase
            .from('contrato')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !contrato) {
            logger.warn(`Contrato ID: ${id} não encontrado para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Contrato não encontrado ou você não tem permissão para excluí-lo.' });
        }

        const { error: deleteDbError } = await supabase
            .from('contrato')
            .delete()
            .eq('id', id);
        if (deleteDbError) throw deleteDbError;
        logger.info(`Registro do contrato ID: ${id} deletado do banco de dados.`);
        
        const { error: deleteStorageError } = await supabase.storage
            .from('contracts')
            .remove([contrato.caminho_arquivo]);
        if (deleteStorageError) {
            logger.warn(`Falha ao remover arquivo do Storage para contrato ID: ${id}.`, deleteStorageError);
        }

        logger.info(`Contrato ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Contrato deletado com sucesso!' });

    } catch (error) {
        logger.error('Erro ao deletar contrato.', error);
        res.status(500).json({ message: 'Erro ao deletar contrato.' });
    }
};