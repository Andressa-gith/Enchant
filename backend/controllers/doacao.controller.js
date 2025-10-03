import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js';

/**
 * Registra uma nova doação (entrada) no estoque.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const registrarDoacaoController = async (req, res) => {
    logger.info('Iniciando registro de nova doação de entrada...');
    try {
        const instituicao_id = req.user.id;
        const dadosDoFormulario = req.body;
        logger.debug('Dados recebidos do formulário de doação:', dadosDoFormulario);

        if (!dadosDoFormulario.categoria_id || !dadosDoFormulario.quantidade) {
            logger.warn('Tentativa de registrar doação com dados incompletos.', { body: req.body });
            return res.status(400).json({ message: 'Dados incompletos. Categoria e quantidade são obrigatórios.' });
        }

        const novaDoacao = {
            ...dadosDoFormulario,
            instituicao_id: instituicao_id,
        };
        
        logger.info('Inserindo nova doação no banco de dados...');
        const { data, error } = await supabase
            .from('doacao_entrada')
            .insert(novaDoacao)
            .select()
            .single();

        if (error) throw error;

        logger.info(`Doação de entrada registrada com sucesso! ID: ${data.id}`);
        res.status(201).json(data);

    } catch (error) {
        logger.error('Erro ao registrar doação de entrada.', error);
        res.status(500).json({ message: 'Erro interno no servidor ao registrar a doação.' });
    }
};

/**
 * Registra uma nova retirada (saída) de um item do estoque.
 * Inclui validação para garantir que a retirada não exceda o estoque disponível.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const registrarRetiradaController = async (req, res) => {
    logger.info('Iniciando registro de nova retirada de doação...');
    try {
        const instituicao_id = req.user.id;
        const { entrada_id, quantidade_retirada, destinatario, observacao } = req.body;
        logger.debug('Dados recebidos para retirada:', { entrada_id, quantidade_retirada, destinatario });

        if (!entrada_id || !quantidade_retirada || Number(quantidade_retirada) <= 0) {
            logger.warn('Tentativa de registrar retirada com dados incompletos.', { body: req.body });
            return res.status(400).json({ message: 'Item do estoque e quantidade (maior que zero) são obrigatórios.' });
        }

        logger.info(`Validando estoque para o item de entrada ID: ${entrada_id}`);
        const { data: entrada, error: erroEntrada } = await supabase
            .from('doacao_entrada')
            .select('quantidade')
            .eq('id', entrada_id)
            .eq('instituicao_id', instituicao_id) 
            .single();

        if (erroEntrada || !entrada) {
            logger.warn(`Item de estoque (ID: ${entrada_id}) não encontrado ou sem permissão para a instituição ID: ${instituicao_id}`);
            return res.status(404).json({ message: `Item do estoque (ID: ${entrada_id}) não encontrado ou não pertence à sua instituição.` });
        }

        const { data: saidas, error: erroSaidas } = await supabase
            .from('doacao_saida')
            .select('quantidade_retirada')
            .eq('entrada_id', entrada_id);

        if (erroSaidas) throw erroSaidas;

        const totalJaRetirado = saidas.reduce((acc, item) => acc + Number(item.quantidade_retirada), 0);
        const quantidadeDisponivel = Number(entrada.quantidade) - totalJaRetirado;
        logger.debug(`Validação de estoque para ID ${entrada_id}: Disponível=${quantidadeDisponivel}, Solicitado=${quantidade_retirada}`);

        if (Number(quantidade_retirada) > quantidadeDisponivel) {
            logger.warn(`Tentativa de retirada maior que o estoque para o item ID: ${entrada_id}.`);
            return res.status(400).json({ message: `A quantidade solicitada (${quantidade_retirada}) é maior que o estoque disponível (${quantidadeDisponivel}).` });
        }

        const novaRetirada = {
            instituicao_id,
            entrada_id,
            quantidade_retirada,
            destinatario,
            observacao
        };

        logger.info('Inserindo nova retirada no banco de dados...');
        const { data, error } = await supabase
            .from('doacao_saida')
            .insert(novaRetirada)
            .select()
            .single();

        if (error) throw error;

        logger.info(`Retirada registrada com sucesso! ID da saída: ${data.id}`);
        res.status(201).json(data);

    } catch (error) {
        logger.error('Erro ao registrar retirada de doação.', error);
        res.status(500).json({ message: 'Erro interno no servidor ao registrar a retirada.' });
    }
};