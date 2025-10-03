import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Busca todas as auditorias da instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
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

/**
 * Adiciona uma nova auditoria, incluindo o upload do arquivo.
 * @param {object} req - Objeto de requisição do Express (com req.body e req.file).
 * @param {object} res - Objeto de resposta do Express.
 */
export const addAuditoria = async (req, res) => {
    logger.info('Iniciando processo de adição de nova auditoria...');
    try {
        const instituicaoId = req.user.id;
        const { titulo, data_auditoria, tipo, status } = req.body;
        
        logger.debug('Dados recebidos para nova auditoria:', { titulo, tipo, status });

        if (!req.file) {
            logger.warn('Tentativa de adicionar auditoria sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo de auditoria foi enviado.' });
        }

        // 1. Upload do arquivo
        const file = req.file;
        const filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo para o Storage em: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('audit')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo realizado com sucesso.');

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

        if (insertError) {
            logger.warn('Erro ao inserir no banco. Iniciando rollback do arquivo no Storage...');
            await supabase.storage.from('audit').remove([filePath]);
            logger.info('Arquivo de rollback removido do Storage.');
            throw insertError;
        }

        logger.info('Auditoria adicionada com sucesso!', { id: auditoriaData.id });
        res.status(201).json({ message: 'Auditoria adicionada com sucesso!', data: auditoriaData });

    } catch (error) {
        logger.error('Erro no processo de adicionar auditoria.', error);
        res.status(500).json({ message: 'Erro interno ao adicionar auditoria.' });
    }
};

/**
 * Atualiza o status de uma auditoria específica.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
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
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteAuditoria = async (req, res) => {
    logger.info('Iniciando processo de exclusão de auditoria...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar auditoria ID: ${id}`);

        // 1. Busca o caminho do arquivo para garantir que o item existe
        const { data: auditoria, error: fetchError } = await supabase
            .from('nota_auditoria')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        // SE NÃO ACHOU, RETORNA 404 AQUI!
        if (fetchError || !auditoria) {
            logger.warn(`Auditoria ID: ${id} não encontrada para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Nota de auditoria não encontrada ou você não tem permissão.' });
        }

        // 2. Deleta o registro do banco
        const { error: deleteDbError } = await supabase
            .from('nota_auditoria')
            .delete()
            .eq('id', id);
        if (deleteDbError) throw deleteDbError;
        logger.info(`Registro da auditoria ID: ${id} deletado do banco de dados.`);

        // 3. Deleta o arquivo do Storage
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
}