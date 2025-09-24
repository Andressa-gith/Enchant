import supabase from '../db/supabaseClient.js';

class UserProfileController {
    async getProfile(req, res) {
        try {
            const usuarioId = req.user.id; 

            const { data, error } = await supabase
                .from('instituicao') // 1. O nome da sua tabela
                .select('nome, email_contato')    // 2. As colunas que você quer
                .eq('id', usuarioId)      // 3. A condição (WHERE id = usuarioId)
                .single();                // 4. Diz que esperamos apenas um resultado

            // Se o Supabase retornar um erro...
            if (error) {
                throw error; // Joga o erro para o nosso 'catch'
            }
            
            if (!data) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }

            res.status(200).json(data); 

        } catch (error) {
            console.error("Erro ao buscar dados do perfil:", error);
            res.status(500).json({ message: 'Erro interno ao buscar dados do perfil.' });
        }
    }

    logout(req, res) {
        try {
            res.clearCookie('auth_token');
            
            res.status(200).json({ message: 'Logout sinalizado pelo servidor.' });
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            res.status(500).json({ message: 'Erro interno ao fazer logout.' });
        }
    }
}

export default new UserProfileController();