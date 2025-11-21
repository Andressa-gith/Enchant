import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Valida auditoria usando IA
 */
async function validarAuditoriaComIA(arquivo) {
    try {
        logger.info('🤖 Validando auditoria com IA...');

        const base64Data = arquivo.buffer.toString('base64');
        const mimeType = arquivo.mimetype;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `Analise este documento e verifique se é uma AUDITORIA válida.
                       
                       Procure por:
                       - Título ou identificação do tipo de auditoria
                       - Data de realização da auditoria
                       - Auditor(es) responsável(is)
                       - Escopo e objetivos da auditoria
                       - Metodologia utilizada
                       - Constatações e observações
                       - Recomendações e plano de ação
                       - Conclusões ou parecer
                       - Assinatura ou validação
                       
                       Documentos válidos incluem:
                       - Relatórios de auditoria interna
                       - Relatórios de auditoria externa
                       - Pareceres de auditoria
                       - Notas técnicas de auditoria
                       - Relatórios de conformidade
                       - Relatórios de revisão de processos
                       
                       Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve e específico]".`;

        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType, data: base64Data } },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        if (texto.startsWith('VÁLIDO')) {
            logger.info('✅ Auditoria aprovada pela IA.');
            return { valido: true, motivo: null };
        } else {
            const motivo = texto.replace('INVÁLIDO:', '').trim() || 'Documento não corresponde a uma auditoria válida';
            logger.warn(`❌ Auditoria rejeitada: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error('Erro ao validar auditoria:', error);
        // ✅ CORRETO: retorna inválido e força revisão manual
        return { 
            valido: false, 
            motivo: 'Erro ao processar documento. Por favor, tente novamente ou contate o suporte.' 
        };
    }
}

/**
 * Busca todas as auditorias da instituição logada.
 */
export const getAuditorias = async (req, res) => {
    logger.info('Iniciando busca de auditorias...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando auditorias para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('nota_auditoria')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_auditoria', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de auditorias bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar auditorias.', error);
        res.status(500).json({ message: 'Erro ao buscar auditorias.' });
    }
};

export const addAuditoria = async (req, res) => {
    logger.info('Iniciando processo de adição de nova auditoria...');
    let filePath;
    try {
        const instituicaoId = req.user.id;
        const { titulo, data_auditoria, tipo, status } = req.body;

        logger.debug('Dados recebidos para nova auditoria:', { titulo, tipo, status });

        if (!req.file) {
            logger.warn('Tentativa de adicionar auditoria sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // ✅ VALIDAÇÃO COM IA
        const file = req.file;
        logger.info('🤖 Validando auditoria com IA...');
        const validacao = await validarAuditoriaComIA(file);

        if (!validacao.valido) {
            logger.warn(`❌ Auditoria rejeitada pela IA: ${validacao.motivo}`);
            return res.status(400).json({ 
                message: 'Documento inválido detectado pela análise automática.',
                detalhes: validacao.motivo,
                tipo_erro: 'validacao_ia'
            });
        }

        logger.info('✅ Auditoria aprovada pela IA. Prosseguindo com upload...');

        // 1. Upload do arquivo
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de auditoria para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('audit')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de auditoria realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados da auditoria no banco de dados...');
        const { data: auditoriaData, error: insertError } = await supabase
            .from('nota_auditoria')
            .insert({
                instituicao_id: instituicaoId,
                titulo,
                data_auditoria,
                tipo,
                status,
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        logger.info('Auditoria adicionada com sucesso!', { id: auditoriaData.id });
        res.status(201).json({ 
            message: 'Auditoria validada e adicionada com sucesso!', 
            data: auditoriaData 
        });

    } catch (error) {
        logger.error('Erro no processo de adicionar auditoria.', error);
        
        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('audit').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }
        
        res.status(500).json({ message: 'Erro interno ao adicionar auditoria.' });
    }
};

/**
 * Atualiza o status de uma auditoria específica.
 */
export const updateAuditoriaStatus = async (req, res) => {
    logger.info('Iniciando atualização de status de auditoria...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;
        
        logger.debug(`Tentando atualizar auditoria ID: ${id} para o status: ${status}`);

        if (!status) {
            logger.warn(`Tentativa de atualização sem fornecer status para auditoria ID: ${id}`);
            return res.status(400).json({ message: 'Novo status não fornecido.' });
        }

        const { data, error } = await supabase
            .from('nota_auditoria')
            .update({ status: status })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                logger.warn(`Auditoria não encontrada ou sem permissão para alteração. ID: ${id}`);
                return res.status(404).json({ message: 'Auditoria não encontrada ou você não tem permissão para alterá-la.' });
            }
            throw error;
        }

        logger.info(`Status da auditoria ID: ${id} atualizado com sucesso.`);
        res.status(200).json({ message: 'Status atualizado com sucesso!', data });

    } catch (error) {
        logger.error('Erro ao atualizar status da auditoria.', error);
        res.status(500).json({ message: 'Erro interno ao atualizar status.' });
    }
};

/**
 * Deleta uma auditoria e seu arquivo associado no Storage.
 */
export const deleteAuditoria = async (req, res) => {
    logger.info('Iniciando processo de exclusão de auditoria...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar auditoria ID: ${id}`);

        const { data: auditoria, error: fetchError } = await supabase
            .from('nota_auditoria')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !auditoria) {
            logger.warn(`Auditoria ID: ${id} não encontrada para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Nota de auditoria não encontrada ou você não tem permissão.' });
        }

        const { error: deleteDbError } = await supabase
            .from('nota_auditoria')
            .delete()
            .eq('id', id);
        if (deleteDbError) throw deleteDbError;
        logger.info(`Registro da auditoria ID: ${id} deletado do banco de dados.`);

        const { error: deleteStorageError } = await supabase.storage
            .from('audit')
            .remove([auditoria.caminho_arquivo]);
        if (deleteStorageError) {
            logger.warn(`Falha ao remover arquivo do Storage para auditoria ID: ${id}.`, deleteStorageError);
        }

        logger.info(`Auditoria ID: ${id} deletada com sucesso.`);
        res.status(200).json({ message: 'Nota de auditoria deletada com sucesso!' });

    } catch (error) {
        logger.error('Erro ao deletar nota de auditoria.', error);
        res.status(500).json({ message: 'Erro ao deletar nota de auditoria.' });
    }
};