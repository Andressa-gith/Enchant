import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import logger from '../utils/logger.js';

/**
 * Cadastra uma nova instituição.
 * 1. Cria o usuário no Supabase Auth.
 * 2. Insere o endereço na tabela 'endereco'.
 * 3. Insere o telefone na tabela 'telefone'.
 * Possui lógica de rollback para deletar o usuário do Auth em caso de falha nos passos 2 ou 3.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const cadastrarInstituicao = async (req, res) => {
    logger.info('Iniciando processo de cadastro de nova instituição...');
    let novoUsuarioId = null;

    try {
        const {
            email_contato, senha, nome_instituicao, cnpj,
            tipo_instituicao, numero, cep, bairro, cidade, estado
        } = req.body;
        
        // Log de debug sem a senha!
        const debugData = { ...req.body };
        delete debugData.senha;
        logger.debug('Dados recebidos para o cadastro:', debugData);

        if (!email_contato || !senha || !nome_instituicao) {
            logger.warn('Tentativa de cadastro com campos obrigatórios ausentes.');
            return res.status(400).json({ message: "Email, senha e nome da instituição são obrigatórios." });
        }

        // --- PASSO 1: Criação do usuário no Auth ---
        logger.info(`[PASSO 1/3] Criando usuário no Supabase Auth para o email: ${email_contato}`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email_contato,
            password: senha,
            options: {
                data: { nome_instituicao, cnpj, tipo_instituicao }
            }
        });

        if (authError) {
            if (authError.message.includes("User already registered")) {
                logger.warn(`Tentativa de cadastro com email duplicado: ${email_contato}`);
                return res.status(409).json({ message: 'Este endereço de email já está cadastrado.' });
            }
            throw authError; // Outros erros de auth (senha fraca, etc.)
        }
        
        if (!authData.user) {
            throw new Error("Criação do usuário no Auth falhou sem retornar um erro explícito.");
        }

        novoUsuarioId = authData.user.id;
        logger.info(`[PASSO 1/3] Usuário criado no Auth com sucesso. ID: ${novoUsuarioId}`);
        
        // --- PASSO 2: Inserção do endereço ---
        logger.info(`[PASSO 2/3] Inserindo endereço para o usuário ID: ${novoUsuarioId}`);
        const { error: enderecoError } = await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cep, bairro, cidade, estado
        });
        if (enderecoError) throw enderecoError;
        logger.info('[PASSO 2/3] Endereço inserido com sucesso.');

        // --- PASSO 3: Inserção do telefone ---
        logger.info(`[PASSO 3/3] Inserindo telefone para o usuário ID: ${novoUsuarioId}`);
        const { error: telefoneError } = await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero
        });
        if (telefoneError) throw telefoneError;
        logger.info('[PASSO 3/3] Telefone inserido com sucesso.');
        
        logger.info(`Instituição ID: ${novoUsuarioId} cadastrada com sucesso em todas as etapas.`);
        return res.status(201).json({ message: 'Instituição cadastrada com sucesso!', userId: novoUsuarioId });

    } catch (error) {
        logger.error('ERRO NO PROCESSO DE CADASTRO. Acionando procedimentos de falha.', error);

        // --- LÓGICA DE ROLLBACK ---
        if (novoUsuarioId) {
            logger.warn(`Iniciando rollback: deletando usuário órfão do Auth com ID ${novoUsuarioId}...`);
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
            if (deleteError) {
                // Este é um erro gravíssimo que precisa ser investigado manualmente
                logger.error(`FALHA CRÍTICA NO ROLLBACK! Usuário pode ter ficado órfão: ID=${novoUsuarioId}`, deleteError);
            } else {
                logger.info(`Rollback bem-sucedido: usuário ID ${novoUsuarioId} deletado do Auth.`);
            }
        }

        return res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.' });
    }
};