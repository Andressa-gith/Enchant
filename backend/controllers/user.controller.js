import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';

export const cadastrarInstituicao = async (req, res) => {
    console.log('\nRecebida requisição para /cadastro');

    const {
        email_contato, senha, nome_instituicao, cnpj,
        tipo_instituicao, numero, cep, bairro, cidade, estado
    } = req.body;

    if (!email_contato || !senha || !nome_instituicao) {
        return res.status(400).json({ message: "Email, senha e nome da instituição são obrigatórios." });
    }

    let novoUsuarioId = null;

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email_contato,
            password: senha,
            options: {
                data: { nome_instituicao, cnpj, tipo_instituicao }
            }
        });

        // --- NOVO BLOCO DE VERIFICAÇÃO DE ERRO ---
        if (authError) {
            // Verificamos se o erro é de "usuário já existe".
            // O Supabase geralmente retorna status 400 ou 422 para isso.
            // A mensagem é a forma mais segura de verificar.
            if (authError.message.includes("User already registered")) {
                console.log("Tentativa de cadastro com email duplicado:", email_contato);
                // Status 409 (Conflict) é o ideal para recursos duplicados.
                return res.status(409).json({ message: 'Este endereço de email já está cadastrado.' });
            }
            // Para outros erros de autenticação (ex: senha fraca), jogamos para o catch.
            throw authError;
        }
        
        if (!authData.user) {
            throw new Error("Criação do usuário no Auth falhou sem retornar um erro explícito.");
        }

        novoUsuarioId = authData.user.id;
        console.log(`Usuário criado no Auth com sucesso. ID: ${novoUsuarioId}`);
        
        const { error: enderecoError } = await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cep, bairro, cidade, estado
        });
        if (enderecoError) throw enderecoError;
        console.log('Endereço inserido com sucesso.');

        const { error: telefoneError } = await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero
        });
        if (telefoneError) throw telefoneError;
        console.log('Telefone inserido com sucesso.');
        
        return res.status(201).json({ message: 'Instituição cadastrada com sucesso!', userId: novoUsuarioId });

    } catch (error) {
        console.error('ERRO NO PROCESSO DE CADASTRO:', error.message);

        if (novoUsuarioId) {
            console.log(`Iniciando rollback: deletando usuário com ID ${novoUsuarioId}...`);
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
            if (deleteError) {
                console.error('FALHA CRÍTICA NO ROLLBACK! Usuário pode ter ficado órfão:', deleteError.message);
            } else {
                console.log('Rollback bem-sucedido: usuário deletado.');
            }
        }

        // Se o erro não for de email duplicado, ele cai aqui como um erro de servidor.
        return res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.', error: error.message });
    }
};