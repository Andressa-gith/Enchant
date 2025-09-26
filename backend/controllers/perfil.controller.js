import supabase from '../db/supabaseClient.js';

class UserProfileController {
    async getProfile(req, res) {
        try {
            const usuarioId = req.user.id; 

            const { data, error } = await supabase
                .from('instituicao') // 1. O nome da sua tabela
                .select('nome, email_contato, cnpj, telefone ( numero ), endereco ( cidade, estado )')    // 2. As colunas que você quer
                .eq('id', usuarioId)      // 3. A condição (WHERE id = usuarioId)
                .single();                // 4. Diz que esperamos apenas um resultado

            // Se o Supabase retornar um erro...
            if (error) {
                throw error; // Joga o erro para o nosso 'catch'
            }
            
            if (!data) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }

            const fone = Array.isArray(data.telefone) ? data.telefone[0] : data.telefone;
            const end = Array.isArray(data.endereco) ? data.endereco[0] : data.endereco;

            const profileData = {
                nome: data.nome,
                email_contato: data.email_contato,
                cnpj: data.cnpj,
                // Extrai a string 'numero' de dentro do array 'telefones'
                telefone: fone?.numero || null,
                cidade: end?.cidade || null,
                estado: end?.estado || null
            };

            res.status(200).json(profileData); 

        } catch (error) {
            console.error("Erro ao buscar dados do perfil:", error);
            res.status(500).json({ message: 'Erro interno ao buscar dados do perfil.' });
        }
    }

    async updateProfile(req, res) {
        try {
            // 1. Obter dados da requisição
            const usuarioId = req.user.id;
            // Pegamos os dados que o frontend enviou no 'body'
            const { nome, email_contato, cnpj, telefone, cidade, estado } = req.body;

            // 2. Preparar os objetos de dados para cada tabela
            const instituicaoData = { nome, email_contato, cnpj };
            // Filtra chaves com valores undefined para não sobrescrever com 'nada' no banco
            Object.keys(instituicaoData).forEach(key => instituicaoData[key] === undefined && delete instituicaoData[key]);

            // 3. Executar as operações no banco de dados
            
            // Passo A: Atualizar a tabela principal 'instituicao'
            const { error: instituicaoError } = await supabase
                .from('instituicao')
                .update(instituicaoData)
                .eq('id', usuarioId);

            if (instituicaoError) throw instituicaoError;

            // Passo B: Usar 'upsert' para a tabela 'telefone'
            // 'upsert' = UPDATE (atualiza) se já existir, ou INSERT (insere) se não existir.
            // É perfeito para informações de perfil que podem ser adicionadas depois.
            if (telefone !== undefined) {
                const { error: telefoneError } = await supabase
                    .from('telefone')
                    .upsert({ 
                        numero: telefone, 
                        instituicao_id: usuarioId // Chave estrangeira para ligar ao usuário
                    }, {
                        onConflict: 'instituicao_id' // Coluna que define o conflito (se já existe um telefone para este usuário)
                    });
                if (telefoneError) throw telefoneError;
            }

            // Passo C: Usar 'upsert' para a tabela 'endereco'
            if (cidade !== undefined || estado !== undefined) {
                const { error: enderecoError } = await supabase
                    .from('endereco')
                    .upsert({ 
                        cidade: cidade, 
                        estado: estado, 
                        instituicao_id: usuarioId // Chave estrangeira
                    }, {
                        onConflict: 'instituicao_id'
                    });
                if (enderecoError) throw enderecoError;
            }
            
            // 4. Enviar resposta de sucesso
            res.status(200).json({ message: 'Perfil atualizado com sucesso!' });

        } catch (error) {
            console.error("Erro ao atualizar o perfil:", error);
            res.status(500).json({ message: 'Erro interno ao atualizar o perfil.' });
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