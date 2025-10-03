import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js';

/**
 * Realiza o login de uma instituição.
 * Valida as credenciais no Supabase Auth e retorna a sessão do usuário.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const loginInstituicao = async (req, res) => {
    logger.info('Tentativa de login iniciada...');
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            logger.warn('Tentativa de login com email ou senha ausentes.');
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        // Usamos um log de debug para não expor o email em logs de produção
        logger.debug(`Autenticando usuário: ${email}`);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha,
        });

        if (error) {
            logger.warn(`Falha na autenticação para o email: ${email}. Motivo: ${error.message}`);
            return res.status(401).json({ message: 'Credenciais inválidas. Verifique seu email e senha.' });
        }

        logger.info(`Login bem-sucedido para o usuário ID: ${data.user.id}`);
        res.status(200).json({
            message: 'Login bem-sucedido!',
            redirectTo: '/dashboard'
        });

    } catch (error) {
        logger.error('Erro inesperado no servidor durante o login.', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

/**
 * Envia um email de redefinição de senha para o usuário.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const enviarEmailResetSenha = async (req, res) => {
    logger.info('Iniciando processo de envio de email para redefinição de senha...');
    try {
        const { email } = req.body;

        if (!email) {
            logger.warn('Tentativa de redefinição de senha sem fornecer email.');
            return res.status(400).json({ message: 'O campo de email é obrigatório.' });
        }

        // URL para a qual o usuário será redirecionado após clicar no link do email.
        const redirectTo = 'http://localhost:3080/redefinir-senha';
        logger.info(`Solicitando reset para o email fornecido com redirecionamento para: ${redirectTo}`);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo,
        });

        if (error) {
            // Não jogamos o erro, pois não queremos que o frontend saiba se o email existe ou não.
            // Apenas logamos para fins de depuração interna.
            logger.error(`Erro do Supabase ao tentar enviar email de reset para ${email}.`, error);
        }

        // Mensagem genérica para o usuário por segurança.
        logger.info('Resposta enviada para a solicitação de redefinição de senha.');
        res.status(200).json({ message: 'Se este email estiver cadastrado, um link para redefinição de senha foi enviado.' });

    } catch (error) {
        logger.error('Erro inesperado no servidor durante o envio de email de reset.', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

/**
 * Redefine a senha do usuário autenticado (que chegou através do link de reset).
 * @param {object} req - Objeto de requisição do Express (precisa do token de acesso e da nova senha).
 * @param {object} res - Objeto de resposta do Express.
 */
export const redefinirSenha = async (req, res) => {
    logger.info('Iniciando processo de redefinição de senha...');
    try {
        const { password } = req.body;
        // O Supabase usa o token de acesso (enviado no header pelo frontend) para identificar o usuário
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            logger.warn('Tentativa de redefinir senha sem um usuário autenticado (token inválido ou expirado).');
            return res.status(401).json({ message: 'Não autorizado. Seu link pode ter expirado.' });
        }
        
        if (!password || password.length < 6) {
            logger.warn(`Tentativa de redefinir senha com uma senha inválida para o usuário ID: ${user.id}`);
            return res.status(400).json({ message: 'A senha é obrigatória e deve ter no mínimo 6 caracteres.' });
        }

        logger.info(`Atualizando senha para o usuário ID: ${user.id}`);
        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) {
            throw error;
        }

        logger.info(`Senha do usuário ID: ${user.id} redefinida com sucesso.`);
        res.status(200).json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
        logger.error('Erro no processo de redefinição de senha.', error);
        res.status(500).json({ message: 'Erro interno ao redefinir a senha.' });
    }
};