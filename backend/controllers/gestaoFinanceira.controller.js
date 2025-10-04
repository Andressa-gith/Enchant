import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js';

/**
 * Calcula o status de um lançamento financeiro com base no orçamento e no valor executado.
 * @param {number|string} orcamento - O valor orçado.
 * @param {number|string} executado - O valor já executado.
 * @returns {'Planejado' | 'Executado' | 'Pendente'} O status calculado.
 */
const calcularStatus = (orcamento, executado) => {
    const orcamentoNum = parseFloat(orcamento);
    const executadoNum = parseFloat(executado);

    if (executadoNum === 0) {
        return 'Planejado';
    }
    if (executadoNum >= orcamentoNum) {
        return 'Executado';
    }
    return 'Pendente';
};

/**
 * Busca todos os lançamentos financeiros da instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getFinanceiro = async (req, res) => {
    logger.info('Iniciando busca de dados financeiros...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando dados financeiros para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('gestao_financeira')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_criacao', { ascending: true });

        if (error) throw error;

        logger.info(`Busca de dados financeiros bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar dados financeiros.', error);
        res.status(500).json({ message: 'Erro ao buscar dados financeiros.' });
    }
};

/**
 * Adiciona um novo lançamento financeiro e calcula seu status automaticamente.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const addFinanceiro = async (req, res) => {
    logger.info('Iniciando adição de novo lançamento financeiro...');
    try {
        const instituicaoId = req.user.id;
        const { nome_categoria, origem_recurso, orcamento_previsto, valor_executado } = req.body;
        const ano = new Date().getFullYear();

        logger.debug('Dados recebidos para novo lançamento:', req.body);
        
        const status = calcularStatus(orcamento_previsto, valor_executado || 0);
        logger.info(`Status calculado para o novo lançamento: ${status}`);

        const { data, error } = await supabase
            .from('gestao_financeira')
            .insert({ 
                instituicao_id: instituicaoId, 
                nome_categoria, 
                origem_recurso, 
                orcamento_previsto, 
                valor_executado: valor_executado || 0, 
                status,
                ano 
            })
            .select().single();

        if (error) throw error;

        logger.info(`Lançamento financeiro ID: ${data.id} adicionado com sucesso.`);
        res.status(201).json({ message: 'Categoria financeira adicionada com sucesso!', data });
    } catch (error) {
        logger.error('Erro ao adicionar lançamento financeiro.', error);
        res.status(500).json({ message: 'Erro interno ao adicionar categoria.' });
    }
};

/**
 * Atualiza um lançamento financeiro e recalcula seu status automaticamente.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const updateFinanceiro = async (req, res) => {
    logger.info('Iniciando atualização de lançamento financeiro...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { nome_categoria, orcamento_previsto, valor_executado } = req.body;

        if (nome_categoria === undefined || orcamento_previsto === undefined || valor_executado === undefined) {
            logger.warn(`Tentativa de atualização do lançamento ID: ${id} com dados inválidos.`);
            return res.status(400).json({ message: 'Dados para atualização inválidos.' });
        }

        const status = calcularStatus(orcamento_previsto, valor_executado);
        logger.info(`Status recalculado para o lançamento ID: ${id}: ${status}`);

        const { data, error } = await supabase
            .from('gestao_financeira')
            .update({ nome_categoria, orcamento_previsto, valor_executado, status })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()

        if (error) throw error;

        if (!data || data.length === 0) {
            logger.warn(`Lançamento ID: ${id} não encontrado para atualização ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Registro não encontrado ou sem permissão.' });
        }

        const updatedData = data[0];

        logger.info(`Lançamento ID: ${id} atualizado com sucesso.`);
        res.status(200).json({ message: 'Lançamento atualizado com sucesso!', data: updatedData });

    } catch (error) {
        logger.error('Erro ao atualizar lançamento financeiro.', error);
        res.status(500).json({ message: 'Erro interno ao atualizar lançamento.' });
    }
};

/**
 * Deleta um lançamento financeiro.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteFinanceiro = async (req, res) => {
    logger.info('Iniciando exclusão de lançamento financeiro...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar lançamento financeiro ID: ${id}`);

        const { error, count } = await supabase
            .from('gestao_financeira')
            .delete({ count: 'exact' }) // Pede ao Supabase para retornar a contagem de linhas deletadas
            .eq('id', id)
            .eq('instituicao_id', instituicaoId);

        if (error) throw error;
        
        // Se nenhuma linha foi deletada, o registro não foi encontrado
        if (count === 0) {
            logger.warn(`Lançamento ID: ${id} não encontrado para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Lançamento não encontrado ou sem permissão para excluí-lo.' });
        }
        
        logger.info(`Lançamento ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Lançamento deletado com sucesso!' });
    } catch (error) {
        logger.error('Erro ao deletar lançamento financeiro.', error);
        res.status(500).json({ message: 'Erro ao deletar lançamento.' });
    }
};