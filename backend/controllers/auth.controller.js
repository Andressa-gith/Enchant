import supabase from '../db/supabaseClient.js';

/**
 * Realiza o login de uma instituição.
 * Recebe email e senha, valida no Supabase Auth e retorna
 * uma resposta de sucesso ou erro.
 */
export const loginInstituicao = async (req, res) => {
    // 1. Extrai email e senha do corpo da requisição
    const { email, senha } = req.body;

    // 2. Validação básica
    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        // 3. Usa a função do Supabase para fazer o login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha,
        });

        // 4. Tratamento de erro do Supabase
        if (error) {
            // Se o Supabase retornar um erro (ex: senha errada),
            // retornamos um erro 401 (Não Autorizado).
            console.error('Erro de login no Supabase:', error.message);
            return res.status(401).json({ message: 'Credenciais inválidas. Verifique seu email e senha.' });
        }

        // 5. Sucesso!
        // O 'data' contém a sessão do usuário (incluindo o token de acesso).
        // O front-end usará esse token para fazer requisições autenticadas no futuro.
        console.log('\nLogin bem-sucedido para o usuário:', data.user.email);
        
        // Enviamos uma resposta de sucesso com uma URL para redirecionamento
        res.status(200).json({ 
            message: 'Login bem-sucedido!',
            redirectTo: '/dashboard' // <-- Página para onde o usuário irá após o login
        });

    } catch (error) {
        console.error('Erro inesperado no servidor durante o login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// Adicione esta função ao seu arquivo authController.js

// Substitua a função inteira no seu auth.controller.js
export const enviarEmailResetSenha = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'O campo de email é obrigatório.' });
    }

    // --- MUDANÇA PRINCIPAL AQUI ---
    // Vamos forçar a URL completa. Isso ignora a "Site URL" do painel e garante
    // que o Supabase saiba EXATAMENTE para onde enviar o usuário.
    const redirectTo = 'http://localhost:3080/redefinir-senha';

    console.log(`Solicitando reset para ${email} com redirecionamento para: ${redirectTo}`);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
    });

    if (error) {
        console.error('Erro ao tentar enviar email de reset:', error.message);
    }
    
    res.status(200).json({ message: 'Se este email estiver cadastrado, um link para redefinição de senha foi enviado.' });
};