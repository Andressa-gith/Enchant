import supabase from '../db/supabaseClient.js';

export const checkDbConnection = async (req, res) => {
    try {
        
        const { error, count } = await supabase
            .from('usuario')
            .select('*', { count: 'exact', head: true });

        if (error) {
            throw error;
        }

        res.status(200).json({
            status: 'success',
            message: 'Conexão com o banco de dados do Supabase está ativa.',
            tableCheck: 'Tabela "usuario" acessível.',
            count: `A tabela possui ${count} registros.`
        });

    } catch (error) {

        console.error('Erro no health check do banco de dados:', error);
        res.status(500).json({
            status: 'error',
            message: 'Não foi possível conectar ao banco de dados.',
            error: error.message
        });

    }
};