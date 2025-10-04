import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js'; // <-- 1. Importamos o nosso logger

/**
 * Busca todas as parcerias da instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getParcerias = async (req, res) => {
    logger.info('Iniciando busca de parcerias...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando parcerias para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('parceiro')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_inicio', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de parcerias bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar parcerias.', error);
        res.status(500).json({ message: 'Erro ao buscar parcerias.' });
    }
};

/**
 * Adiciona uma nova parceria.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const addParceria = async (req, res) => {
    logger.info('Iniciando adição de nova parceria...');
    try {
        const instituicaoId = req.user.id;
        const { nome, tipo_setor, status, data_inicio, data_fim, valor_total_parceria, objetivos } = req.body;
        logger.debug('Dados recebidos para nova parceria:', { nome, status, data_inicio });

        const { data, error } = await supabase
            .from('parceiro')
            .insert({
                instituicao_id: instituicaoId,
                nome, tipo_setor, status, data_inicio,
                data_fim: data_fim || null,
                valor_total_parceria: valor_total_parceria || null,
                objetivos
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`Parceria ID: ${data.id} adicionada com sucesso.`);
        res.status(201).json({ message: 'Parceria adicionada com sucesso!', data });
    } catch (error) {
        logger.error('Erro ao adicionar parceria.', error);
        res.status(500).json({ message: 'Erro ao adicionar parceria.' });
    }
};

/**
 * Atualiza uma parceria existente.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const updateParceria = async (req, res) => {
    logger.info('Iniciando atualização de parceria...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { nome, tipo_setor, status, data_inicio, data_fim, valor_total_parceria, objetivos } = req.body;
        logger.debug(`Tentando atualizar parceria ID: ${id}`);

        const { data, error } = await supabase
            .from('parceiro')
            .update({
                nome, tipo_setor, status, data_inicio,
                data_fim: data_fim || null,
                valor_total_parceria: valor_total_parceria || null,
                objetivos
            })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()

        if (error) throw error;
        
        if (!data || data.length === 0) {
            logger.warn(`Parceria ID: ${id} não encontrada para atualização ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Parceria não encontrada ou você não tem permissão para alterá-la.' });
        }

        const updatedData = data[0];

        logger.info(`Parceria ID: ${id} atualizada com sucesso.`);
        res.status(200).json({ message: 'Parceria atualizada com sucesso!', data: updatedData });
    } catch (error) {
        logger.error('Erro ao atualizar parceria.', error);
        res.status(500).json({ message: 'Erro ao atualizar parceria.' });
    }
};

/**
 * Deleta uma parceria.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteParceria = async (req, res) => {
    logger.info('Iniciando exclusão de parceria...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar parceria ID: ${id}`);

        const { error, count } = await supabase
            .from('parceiro')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId);

        if (error) throw error;
        
        if (count === 0) {
            logger.warn(`Parceria ID: ${id} não encontrada para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Parceria não encontrada ou sem permissão para excluí-la.' });
        }

        logger.info(`Parceria ID: ${id} deletada com sucesso.`);
        res.status(200).json({ message: 'Parceria deletada com sucesso!' });
    } catch (error) {
        logger.error('Erro ao deletar parceria.', error);
        res.status(500).json({ message: 'Erro ao deletar parceria.' });
    }
};