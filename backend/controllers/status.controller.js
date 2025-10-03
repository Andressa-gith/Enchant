import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js';

/**
 * Realiza uma verificação de saúde (health check) para confirmar a conexão com o banco de dados.
 * Tenta fazer uma contagem de registros na tabela 'instituicao' para validar a conexão.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const checkDbConnection = async (req, res) => {
    logger.info('Executando health check da conexão com o banco de dados...');
    try {
        // Vamos usar a tabela 'instituicao' que é mais central para o seu sistema
        const { error, count } = await supabase
            .from('instituicao') 
            .select('*', { count: 'exact', head: true }); // 'head: true' é otimizado, só busca a contagem

        if (error) {
            // Se a tabela não for encontrada ou houver outro erro de permissão, ele será pego aqui.
            throw error;
        }

        const successMessage = 'Conexão com o banco de dados do Supabase está ativa.';
        logger.info(successMessage);
        
        res.status(200).json({
            status: 'success',
            message: successMessage,
            details: `Tabela "instituicao" acessível e possui ${count} registros.`
        });

    } catch (error) {
        const errorMessage = 'Falha no health check: Não foi possível conectar ao banco de dados.';
        logger.error(errorMessage, error);
        
        res.status(500).json({
            status: 'error',
            message: errorMessage,
            error: error.message
        });
    }
};