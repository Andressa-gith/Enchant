// Cliente Supabase padrão, que respeita as regras de RLS
import supabase from '../db/supabaseClient.js';
// Cliente Supabase com privilégios de administrador para tarefas sensíveis
import supabaseAdmin from '../db/supabaseAdmin.js';

/**
 * Controller para cadastrar uma nova instituição.
 * Este processo envolve 3 etapas principais:
 * 1. Criação do usuário no serviço de Autenticação do Supabase.
 * 2. Criação do perfil da instituição na tabela 'instituicao' (via gatilho/trigger).
 * 3. Inserção de dados relacionados em outras tabelas ('endereco', 'telefone').
 * * Inclui uma lógica de rollback para deletar o usuário caso alguma das etapas
 * subsequentes à criação do usuário falhe, mantendo a consistência dos dados.
 */
export const cadastrarInstituicao = async (req, res) => {
    console.log('Recebida requisição para /api/instituicoes/cadastro');
    console.log(`Dados recebidos: ${JSON.stringify(req.body, null, 2)}`);

    // --- ETAPA 1: Extração e Validação dos Dados ---
    const {
        email_contato, 
        senha, 
        nome_instituicao, 
        cnpj,
        tipo_instituicao, 
        numero, 
        cep, 
        bairro,
        cidade, 
        estado
    } = req.body;

    console.log('Dados recebidos:', { email_contato, nome_instituicao });

    // Validação de campos essenciais no servidor
    if (!email_contato || !senha || !nome_instituicao) {
        return res.status(400).json({ message: "Email, senha e nome da instituição são obrigatórios." });
    }

    let novoUsuarioId = null;

    try {
        // --- ETAPA 2: Criação do Usuário no Supabase Auth ---
        // O usuário é criado no serviço de autenticação.
        // Dados extras são passados via 'options.data' para serem usados pelo gatilho (trigger)
        // que criará o perfil na nossa tabela 'instituicao'.
        console.log('Tentando criar usuário no Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email_contato,
            password: senha,
            options: {
                data: { nome_instituicao, cnpj, tipo_instituicao }
            }
        });

        if (authError) throw authError; // Joga o erro para o bloco catch
        if (!authData.user) throw new Error("Criação do usuário no Auth falhou sem retornar um erro explícito.");

        novoUsuarioId = authData.user.id;
        console.log(`Usuário criado no Auth com sucesso. ID: ${novoUsuarioId}`);

        // O gatilho do banco de dados já foi acionado e (esperamos) criou o perfil na tabela 'instituicao'.
        // Agora, continuamos para inserir os dados nas tabelas relacionadas.

        // --- ETAPA 3: Inserção de Dados Relacionados ---
        
        console.log('Tentando inserir endereço...');
        const { error: enderecoError } = await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cep, bairro, cidade, estado
        });
        if (enderecoError) throw enderecoError; // Se der erro, pula para o catch
        console.log('Endereço inserido com sucesso.');

        console.log('Tentando inserir telefone...');
        const { error: telefoneError } = await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero
        });
        if (telefoneError) throw telefoneError; // Se der erro, pula para o catch
        console.log('Telefone inserido com sucesso.');

        // --- ETAPA 4: Sucesso ---
        // Se todas as operações foram bem-sucedidas, enviamos a resposta final.
        return res.status(201).json({ message: 'Instituição cadastrada com sucesso!', userId: novoUsuarioId });

    } catch (error) {
        // --- ETAPA 5: Tratamento de Erros e Rollback ---
        console.error('ERRO NO PROCESSO DE CADASTRO:', error.message);

        // Se o erro aconteceu DEPOIS da criação do usuário no Auth (temos um novoUsuarioId),
        // precisamos deletar esse usuário para não deixar lixo no banco.
        if (novoUsuarioId) {
            console.log(`Iniciando rollback: deletando usuário com ID ${novoUsuarioId}...`);
            // Usamos o cliente ADMIN para deletar o usuário, pois ele tem permissão para isso.
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
            if (deleteError) {
                console.error('FALHA CRÍTICA NO ROLLBACK! Usuário pode ter ficado órfão:', deleteError.message);
            } else {
                console.log('Rollback bem-sucedido: usuário deletado.');
            }
        }

        // Enviamos uma resposta de erro genérica e informativa para o front-end.
        return res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.', error: error.message });
    }
};