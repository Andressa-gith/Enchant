import supabaseAdmin from '../db/supabaseAdmin.js';
import logger from '../utils/logger.js';

/**
 * Buscar notificações não lidas do admin
 */
export const getNotificacoesNaoLidas = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('notificacoes_admin')
            .select('*')
            .eq('lida', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            notificacoes: data,
            total: data.length
        });

    } catch (error) {
        logger.error('Erro ao buscar notificações', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar notificações.'
        });
    }
};

/**
 * Buscar todas as notificações (com paginação)
 */
export const getTodasNotificacoes = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabaseAdmin
            .from('notificacoes_admin')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.status(200).json({
            success: true,
            notificacoes: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar notificações', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar notificações.'
        });
    }
};

/**
 * Marcar notificação como lida
 */
export const marcarComoLida = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('notificacoes_admin')
            .update({ lida: true })
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'Notificação marcada como lida.'
        });

    } catch (error) {
        logger.error('Erro ao marcar notificação', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar notificação.'
        });
    }
};

/**
 * Marcar todas como lidas
 */
export const marcarTodasComoLidas = async (req, res) => {
    try {
        const { error } = await supabaseAdmin
            .from('notificacoes_admin')
            .update({ lida: true })
            .eq('lida', false);

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: 'Todas as notificações foram marcadas como lidas.'
        });

    } catch (error) {
        logger.error('Erro ao marcar notificações', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar notificações.'
        });
    }
};

/**
 * Buscar requisições pendentes com dados completos
 */
export const getRequisicoesPendentes = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('vw_requisicoes_pendentes')
            .select('*');

        if (error) throw error;

        res.status(200).json({
            success: true,
            requisicoes: data,
            total: data.length
        });

    } catch (error) {
        logger.error('Erro ao buscar requisições pendentes', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar requisições.'
        });
    }
};

/**
 * Buscar estatísticas de requisições
 */
export const getEstatisticasRequisicoes = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('vw_requisicoes_stats')
            .select('*')
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            estatisticas: data
        });

    } catch (error) {
        logger.error('Erro ao buscar estatísticas', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas.'
        });
    }
};