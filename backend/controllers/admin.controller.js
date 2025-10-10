import supabaseAdmin from '../db/supabaseAdmin.js';
import logger from '../utils/logger.js';

/**
 * Visualizar detalhes completos de uma requisição específica
 */
export const visualizarRequisicao = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: requisicao, error } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select(`
                *,
                instituicao:instituicao_id (
                    id,
                    nome,
                    email_contato,
                    cnpj,
                    data_criacao
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!requisicao) {
            return res.status(404).json({
                success: false,
                message: 'Requisição não encontrada.'
            });
        }

        res.status(200).json({
            success: true,
            requisicao
        });

    } catch (error) {
        logger.error('Erro ao visualizar requisição', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar detalhes da requisição.'
        });
    }
};

/**
 * Download de um documento específico (não usado com email, mas mantido para compatibilidade)
 */
export const downloadDocumento = async (req, res) => {
    try {
        const { id } = req.params;

        res.status(501).json({
            success: false,
            message: 'Funcionalidade não disponível. Documentos são enviados por email.'
        });

    } catch (error) {
        logger.error('Erro ao fazer download do documento', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao baixar documento.'
        });
    }
};

/**
 * Estatísticas de requisições para dashboard admin
 */
export const estatisticasRequisicoes = async (req, res) => {
    try {
        // Total de requisições por status
        const { data: stats, error } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select('status');

        if (error) throw error;

        const estatisticas = {
            total: stats.length,
            pendentes: stats.filter(r => r.status === 'pendente').length,
            aprovadas: stats.filter(r => r.status === 'aprovado').length,
            rejeitadas: stats.filter(r => r.status === 'rejeitado').length
        };

        // Requisições recentes (últimos 30 dias)
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);

        const { data: recentes, error: recentesError } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select('created_at')
            .gte('created_at', dataLimite.toISOString());

        if (recentesError) throw recentesError;

        estatisticas.ultimos30Dias = recentes.length;

        res.status(200).json({
            success: true,
            estatisticas
        });

    } catch (error) {
        logger.error('Erro ao buscar estatísticas', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas.'
        });
    }
};