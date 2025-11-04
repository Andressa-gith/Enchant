/* eslint-disable no-undef */

/**
 * @file Testes unitários para o auth.controller.js
 * @description Este arquivo contém a suíte de testes unitários para as funções
 * de autenticação (login, reset de senha), simulando o Supabase Auth e o logger.
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// --- Definição dos Mocks ---

/** Mock completo do módulo de logger. */
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

/**
 * @description Mock para os métodos do Supabase Auth.
 * Estas são as funções que o auth.controller realmente chama.
 */
const mockAuth = {
    signInWithPassword: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
};

/** * @description Objeto final do mock do Supabase Client.
 * O controller acessará `supabase.auth`.
 */
const mockSupabase = {
    auth: mockAuth,
};

// --- Aplicação dos Mocks (Modo ESM) ---
// Configura o Jest para interceptar os imports antes que eles aconteçam.

jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: mockLogger,
}));

// Mockamos o supabaseClient para retornar nosso objeto mockAuth
jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));


// --- Helpers de Teste ---

/**
 * Cria um objeto 'res' (resposta) mockado para o Express.
 * @returns {object} Objeto 'res' com funções mockadas (status, json).
 */
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Cria um objeto 'req' (requisição) mockado para o Express.
 * @param {object} [body] - Objeto 'body' mockado (padrão: {}).
 * @returns {object} Objeto 'req' mockado.
 */
const mockRequest = (body) => ({
    body: body || {},
});


// --- Suíte de Testes: Auth Controller ---

describe('Auth Controller', () => {
    /** @type {object} */
    let res;
    
    // Variáveis para armazenar as funções do controller importadas
    let loginInstituicao, enviarEmailResetSenha, redefinirSenha;

    /**
     * Antes de todos os testes, importa dinamicamente o controller.
     * Isso garante que os mocks sejam aplicados ANTES do controller ser carregado.
     */
    beforeAll(async () => {
        const controller = await import('../backend/controllers/auth.controller.js');
        loginInstituicao = controller.loginInstituicao;
        enviarEmailResetSenha = controller.enviarEmailResetSenha;
        redefinirSenha = controller.redefinirSenha;
    });

    /**
     * Antes de CADA teste, limpa o histórico de todos os mocks
     * e reinicia o objeto 'res'.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
    });

    // --- Testes para loginInstituicao ---
    describe('loginInstituicao', () => {
        it('deve retornar 200 e a mensagem de sucesso em caso de login válido', async () => {
            // Arrange
            const req = mockRequest({ email: 'teste@ong.com', senha: '123456' });
            
            const mockSessao = {
                user: { id: 'c1ad67ca-e215-4639-b672-6e9d7a9854a6' },
                session: { access_token: 'mock-token-jwt-123' } 
            };
            // mockAuth.signInWithPassword.mockResolvedValue({ data: mockUserData, error: null }); // <- Linha antiga
            mockAuth.signInWithPassword.mockResolvedValue({ data: mockSessao, error: null });

            // Act
            await loginInstituicao(req, res);

            // Assert
            expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'teste@ong.com', password: '123456' });
            expect(res.status).toHaveBeenCalledWith(200);
            
            expect(res.json).toHaveBeenCalledWith({
                message: 'Login bem-sucedido!',
                redirectTo: '/dashboard',
                token: 'mock-token-jwt-123'
            });
            expect(mockLogger.info).toHaveBeenCalledWith(`Login bem-sucedido para o usuário ID: ${mockSessao.user.id}`);
        });


        it('deve retornar 400 se o email não for fornecido', async () => {
            // Arrange
            const req = mockRequest({ senha: '123456' }); // Sem email

            // Act
            await loginInstituicao(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email e senha são obrigatórios.' });
            expect(mockLogger.warn).toHaveBeenCalledWith('Tentativa de login com email ou senha ausentes.');
            expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
        });

        it('deve retornar 401 se as credenciais forem inválidas', async () => {
            // Arrange
            const req = mockRequest({ email: 'errado@ong.com', senha: 'senhaerrada' });
            const mockError = { message: 'Invalid login credentials' };
            mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: mockError });

            // Act
            await loginInstituicao(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Credenciais inválidas. Verifique seu email e senha.' });
            expect(mockLogger.warn).toHaveBeenCalledWith(`Falha na autenticação para o email: errado@ong.com. Motivo: ${mockError.message}`);
        });

        it('deve retornar 500 se o Supabase falhar inesperadamente', async () => {
            // Arrange
            const req = mockRequest({ email: 'teste@ong.com', senha: '123456' });
            const mockError = new Error('Falha na conexão com o DB');
            mockAuth.signInWithPassword.mockRejectedValue(mockError);

            // Act
            await loginInstituicao(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno no servidor.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro inesperado no servidor durante o login.', mockError);
        });
    });

    // --- Testes para enviarEmailResetSenha ---
    describe('enviarEmailResetSenha', () => {
        it('deve retornar 200 e uma mensagem genérica (email existente)', async () => {
            // Arrange
            const req = mockRequest({ email: 'teste@ong.com' });
            mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

            // Act
            await enviarEmailResetSenha(req, res);

            // Assert
            expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('teste@ong.com', {
                redirectTo: 'http://localhost:3080/redefinir-senha',
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Se este email estiver cadastrado, um link para redefinição de senha foi enviado.' });
            expect(mockLogger.error).not.toHaveBeenCalled(); // Não deve logar erro
        });

        it('deve retornar 200 e a mesma mensagem genérica (email NÃO existente)', async () => {
            // Arrange
            const req = mockRequest({ email: 'naoexiste@ong.com' });
            const mockError = { message: 'User not found' };
            // Simula o Supabase retornando um erro (que o controller deve "abafar")
            mockAuth.resetPasswordForEmail.mockResolvedValue({ error: mockError });

            // Act
            await enviarEmailResetSenha(req, res);

            // Assert
            expect(mockAuth.resetPasswordForEmail).toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith(`Erro do Supabase ao tentar enviar email de reset para naoexiste@ong.com.`, mockError); // Loga o erro internamente
            expect(res.status).toHaveBeenCalledWith(200); // Mas retorna 200 para o usuário
            expect(res.json).toHaveBeenCalledWith({ message: 'Se este email estiver cadastrado, um link para redefinição de senha foi enviado.' });
        });

        it('deve retornar 400 se o email não for fornecido', async () => {
            // Arrange
            const req = mockRequest({}); // Body vazio

            // Act
            await enviarEmailResetSenha(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'O campo de email é obrigatório.' });
            expect(mockAuth.resetPasswordForEmail).not.toHaveBeenCalled();
        });
    });

    // --- Testes para redefinirSenha ---
    describe('redefinirSenha', () => {
        const mockUser = { id: 'user-uuid-123' };

        it('deve retornar 200 ao redefinir a senha com sucesso', async () => {
            // Arrange
            const req = mockRequest({ password: 'nova-senha-forte' });
            mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockAuth.updateUser.mockResolvedValue({ error: null });

            // Act
            await redefinirSenha(req, res);

            // Assert
            expect(mockAuth.getUser).toHaveBeenCalled();
            expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'nova-senha-forte' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Senha redefinida com sucesso!' });
            expect(mockLogger.info).toHaveBeenCalledWith(`Senha do usuário ID: ${mockUser.id} redefinida com sucesso.`);
        });

        it('deve retornar 401 se o token do usuário for inválido (nenhum usuário encontrado)', async () => {
            // Arrange
            const req = mockRequest({ password: 'nova-senha-forte' });
            mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null }); // Usuário não encontrado

            // Act
            await redefinirSenha(req, res);

            // Assert
            expect(mockAuth.getUser).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Não autorizado. Seu link pode ter expirado.' });
            expect(mockLogger.warn).toHaveBeenCalledWith('Tentativa de redefinir senha sem um usuário autenticado (token inválido ou expirado).');
            expect(mockAuth.updateUser).not.toHaveBeenCalled();
        });

        it('deve retornar 400 se a senha for muito curta (menos de 6 caracteres)', async () => {
            // Arrange
            const req = mockRequest({ password: '123' }); // Senha curta
            mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null }); // Usuário é válido

            // Act
            await redefinirSenha(req, res);

            // Assert
            expect(mockAuth.getUser).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'A senha é obrigatória e deve ter no mínimo 6 caracteres.' });
            expect(mockLogger.warn).toHaveBeenCalledWith(`Tentativa de redefinir senha com uma senha inválida para o usuário ID: ${mockUser.id}`);
            expect(mockAuth.updateUser).not.toHaveBeenCalled();
        });

        it('deve retornar 500 se o supabase.auth.updateUser falhar', async () => {
            // Arrange
            const req = mockRequest({ password: 'nova-senha-forte' });
            const mockError = new Error('Falha ao atualizar usuário');
            mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockAuth.updateUser.mockRejectedValue(mockError); // Simula o .updateUser() jogando um erro

            // Act
            await redefinirSenha(req, res);

            // Assert
            expect(mockAuth.getUser).toHaveBeenCalled();
            expect(mockAuth.updateUser).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao redefinir a senha.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro no processo de redefinição de senha.', mockError);
        });
    });
});