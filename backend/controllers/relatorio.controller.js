import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Valida relatório de transparência usando IA
 */
async function validarRelatorioComIA(arquivo) {
    try {
        logger.info(' Validando relatório de transparência com IA...');

        const base64Data = arquivo.buffer.toString('base64');
        const mimeType = arquivo.mimetype;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `Você é um auditor especializado em validar documentos de transparência e prestação de contas.

TAREFA: Analise este documento e verifique se é um RELATÓRIO DE TRANSPARÊNCIA válido.

ELEMENTOS OBRIGATÓRIOS que o documento DEVE conter:
1. Identificação clara da organização/instituição (nome, CNPJ ou dados de identificação)
2. Período de referência do relatório (mês/ano ou exercício fiscal)
3. Dados financeiros OBRIGATÓRIOS:
   - Receitas (origem e valores)
   - Despesas (categorias e valores)
   OU
   - Balanço patrimonial
   OU
   - Demonstrativo contábil
4. Prestação de contas ou transparência na gestão de recursos

DOCUMENTOS VÁLIDOS incluem:
- Relatórios de prestação de contas com dados financeiros
- Relatórios financeiros anuais ou periódicos
- Demonstrativos de receitas e despesas
- Balanços patrimoniais
- Relatórios de atividades COM dados financeiros
- Relatórios de transparência fiscal

IMPORTANTE: 
- Se o documento NÃO contiver dados financeiros (receitas, despesas ou valores monetários), ele NÃO é um relatório de transparência válido.
- Se o documento for apenas texto descritivo sem números/valores, rejeite-o.
- Se faltar a identificação da instituição ou período, rejeite-o.

RESPOSTA OBRIGATÓRIA:
- Se VÁLIDO, responda APENAS: "VÁLIDO"
- Se INVÁLIDO, responda: "INVÁLIDO: [explique especificamente QUAL elemento obrigatório está faltando]"

Exemplos de respostas INVÁLIDAS corretas:
- "INVÁLIDO: Documento não contém dados financeiros (receitas ou despesas)"
- "INVÁLIDO: Falta identificação da instituição responsável"
- "INVÁLIDO: Não há período de referência especificado"
- "INVÁLIDO: Documento parece ser um texto genérico sem demonstrativos contábeis"

Analise agora:`;

        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType, data: base64Data } },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        logger.info(` Resposta da IA: ${texto}`);

        if (texto.startsWith('VÁLIDO')) {
            logger.info(' Relatório de transparência aprovado pela IA.');
            return { valido: true, motivo: null };
        } else {
            // Extrai o motivo de forma mais robusta
            let motivo = texto.replace(/^INVÁLIDO:?\s*/i, '').trim();
            
            if (!motivo || motivo.length < 10) {
                motivo = 'O documento não atende aos requisitos de um relatório de transparência (faltam dados financeiros, identificação da instituição ou período de referência)';
            }
            
            logger.warn(` Relatório rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error(' Erro ao validar relatório:', error);
        // ✅ CORRIGIDO: Retorna inválido em caso de erro
        return { 
            valido: false, 
            motivo: 'Erro ao processar o documento. Verifique se o arquivo está corrompido ou tente novamente mais tarde.' 
        };
    }
}

/**
 * Busca todos os relatórios de transparência da instituição logada.
 */
export const getRelatorios = async (req, res) => {
    logger.info('Iniciando busca de relatórios de transparência...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando relatórios para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('relatorio')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_publicacao', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de relatórios bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar relatórios.', error);
        res.status(500).json({ message: 'Erro ao buscar relatórios.' });
    }
};

/**
 * Adiciona novo relatório COM VALIDAÇÃO POR IA
 */
export const addRelatorio = async (req, res) => {
    logger.info('Iniciando processo de adição de novo relatório...');
    let filePath;
    try {
        const instituicaoId = req.user.id;
        const { titulo, descricao } = req.body;
        logger.debug('Dados recebidos para novo relatório:', { titulo });

        if (!req.file) {
            logger.warn('Tentativa de adicionar relatório sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // ✅ VALIDAÇÃO COM IA
        const file = req.file;
        logger.info(' Validando relatório de transparência com IA...');
        const validacao = await validarRelatorioComIA(file);

        if (!validacao.valido) {
            logger.warn(` Relatório rejeitado pela IA: ${validacao.motivo}`);
            return res.status(400).json({ 
                message: 'Documento inválido detectado pela análise automática.',
                detalhes: validacao.motivo,
                tipo_erro: 'validacao_ia'
            });
        }

        logger.info(' Relatório aprovado pela IA. Prosseguindo com upload...');

        // 1. Upload do arquivo
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de relatório para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('reports')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de relatório realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados do relatório no banco de dados...');
        const { data: relatorioData, error: insertError } = await supabase
            .from('relatorio')
            .insert({
                instituicao_id: instituicaoId,
                titulo: titulo,
                descricao: descricao,
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        logger.info(`Relatório ID: ${relatorioData.id} adicionado com sucesso.`);
        res.status(201).json({ 
            message: 'Relatório validado e adicionado com sucesso!', 
            data: relatorioData 
        });

    } catch (error) {
        logger.error('Erro no processo de adicionar relatório.', error);

        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('reports').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }
        
        res.status(500).json({ message: 'Erro interno ao adicionar relatório.' });
    }
};

/**
 * Deleta um relatório de transparência e seu arquivo associado no Storage.
 */
export const deleteRelatorio = async (req, res) => {
    logger.info('Iniciando processo de exclusão de relatório...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar relatório ID: ${id}`);

        logger.info(`Buscando informações do relatório ID: ${id} para exclusão.`);
        const { data: relatorio, error: fetchError } = await supabase
            .from('relatorio')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !relatorio) {
            logger.warn(`Relatório ID: ${id} não encontrado para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Relatório não encontrado ou você não tem permissão.' });
        }

        logger.info(`Registro do relatório ID: ${id} deletado do banco de dados.`);

        const { error: deleteDbError } = await supabase
            .from('relatorio')
            .delete()
            .eq('id', id);

        if (deleteDbError) throw deleteDbError;
        
        logger.info(`Deletando arquivo do Storage: ${relatorio.caminho_arquivo}`);
        const { error: deleteStorageError } = await supabase.storage
            .from('reports')
            .remove([relatorio.caminho_arquivo]);
            
        if (deleteStorageError) {
            logger.warn(`Falha ao remover arquivo do Storage para relatório ID: ${id}.`, deleteStorageError);
        }

        logger.info(`Relatório ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Relatório deletado com sucesso!' });

    } catch (error) {
        logger.error('Erro ao deletar relatório.', error);
        res.status(500).json({ message: 'Erro ao deletar relatório.' });
    }
};