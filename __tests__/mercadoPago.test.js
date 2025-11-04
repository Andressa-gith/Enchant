/* eslint-disable no-undef */

/**
 * @file Testes unitários para o mercadoPago.controller.js
 * @description Suite de testes para o fluxo de autorização Oauth do Mercado Pago,
 * simulando axios, Supabase e process.env.
 * @version 3.1.1 (Corrigido erro de digitação no mock)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';

// --- Definição dos Mocks ---

// Mock para o Axios
const mockAxios = {
    post: jest.fn(),
};

// --- [INÍCIO DA CORREÇÃO] Mocks Fluentes ---

// Mocks FINAIS (os que retornam os dados/erros)
const mockUpdateEqFinal = jest.fn(); // Mock para a chamada .eq()
const mockUpdateSelectFinal = jest.fn(); // Mock para a chamada .select()

/**
 * Mock da função .from()
 * [CORREÇÃO]: Esta função agora *não* configura mais o 'mockUpdateEqFinal'.
 * Isso era o que estava causando o bug.
 */
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'instituicao') {

        // A linha problemática (mockUpdateEqFinal.mockReturnValue) foi REMOVIDA daqui.

        const newChain = {};
        newChain.update = jest.fn(() => ({
            eq: mockUpdateEqFinal, // Ambas as funções usam este .eq()
        }));
        return newChain;
    }
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
};
// --- [FIM DA CORREÇÃO] ---

// Spies para o console
let consoleLogSpy;
let consoleErrorSpy;

// --- Aplicação dos Mocks (Modo ESM) ---

jest.unstable_mockModule('axios', () => ({
    __esModule: true,
    default: mockAxios,
}));

jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));


// --- Helpers de Teste ---

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (user, query) => ({
    user: user || null,
    query: query || {},
});

// --- Configuração de Ambiente (process.env) ---

const originalEnv = process.env;

beforeAll(() => {
    jest.resetModules();
    process.env = {
        ...originalEnv,
        MERCADO_PAGO_APP_ID: 'mock-app-id',
        MERCADO_PAGO_REDIRECT_URI: 'http://localhost/mock-callback',
        MERCADO_PAGO_CLIENT_SECRET: 'mock-client-secret',
    };
});

afterAll(() => {
    process.env = originalEnv;
});


// --- Suíte de Testes: Mercado Pago Controller ---

describe('Mercado Pago Controller', () => {
    /** @type {object} */
    let res;
    let generateAuthLink, handleCallback, disconnect;

    beforeAll(async () => {
        const controller = await import('../backend/controllers/mercadoPago.controller.js');
        generateAuthLink = controller.generateAuthLink;
        handleCallback = controller.handleCallback;
        disconnect = controller.disconnect;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();

        // [CORREÇÃO] Definimos o mock *padrão* aqui.
        // Este é o comportamento da cadeia longa (.eq().select())
        // que o 'handleCallback' usa.
        mockUpdateEqFinal.mockReturnValue({
            select: mockUpdateSelectFinal,
        });

        // Silencia os 'console.log' e 'console.error'
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        // Restaura os consoles
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    // --- Testes para generateAuthLink ---
    describe('generateAuthLink', () => {
        it('deve redirecionar para a URL de autorização correta', async () => {
            // Arrange
            const req = mockRequest(null, { id: MOCK_INSTITUICAO_ID });

            // Act
            await generateAuthLink(req, res);

            // Assert
            expect(res.redirect).toHaveBeenCalledTimes(1);
            const redirectUrl = res.redirect.mock.calls[0][0];
            expect(redirectUrl).toContain('https://auth.mercadopago.com.br/authorization');
            expect(redirectUrl).toContain('client_id=mock-app-id');
            expect(redirectUrl).toContain(`state=${MOCK_INSTITUICAO_ID}`);
            expect(redirectUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fmock-callback'); // URI Encoded
        });

        it('deve retornar 400 se o ID da instituição não for fornecido', async () => {
            // Arrange
            const req = mockRequest(null, {}); // Sem ID na query

            // Act
            await generateAuthLink(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('ID da instituição não fornecido');
            expect(res.redirect).not.toHaveBeenCalled();
        });
    });

    // --- Testes para handleCallback ---
    // (Não precisam de alteração, pois usam o mock padrão do beforeEach)
    describe('handleCallback', () => {
        it('deve trocar o código, salvar tokens no Supabase e enviar script de sucesso', async () => {
            // Arrange
            const req = mockRequest(null, { code: 'teste-code', state: MOCK_INSTITUICAO_ID });
            const mockAxiosResponse = {
                data: { access_token: 'mock-access-token', /* ... */ }
            };
            mockAxios.post.mockResolvedValue(mockAxiosResponse);
            const mockSupabaseResponse = [{ id: MOCK_INSTITUICAO_ID, mp_connected: true }];
            mockUpdateSelectFinal.mockResolvedValue({ data: mockSupabaseResponse, error: null });

            // Act
            await handleCallback(req, res);

            // Assert (Axios)
            expect(mockAxios.post).toHaveBeenCalled();
            // Assert (Supabase)
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockUpdateEqFinal).toHaveBeenCalledWith('id', MOCK_INSTITUICAO_ID);
            expect(mockUpdateSelectFinal).toHaveBeenCalled(); // .select() foi chamado
            // Assert (Resposta)
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining('mp-success'));
        });

        it('deve enviar script de erro se "mpError" estiver na query', async () => {
            const req = mockRequest(null, { error: 'access_denied', state: MOCK_INSTITUICAO_ID });
            await handleCallback(req, res);
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining("message: 'Erro ao conectar: access_denied'"));
        });

        it('deve enviar script de erro se "code" estiver faltando', async () => {
            const req = mockRequest(null, { state: MOCK_INSTITUICAO_ID });
            await handleCallback(req, res);
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining("message: 'Dados incompletos'"));
        });

        it('deve enviar script de erro se o Axios falhar', async () => {
            const req = mockRequest(null, { code: 'bad-code', state: MOCK_INSTITUICAO_ID });
            const mockError = new Error('Falha no Axios');
            mockAxios.post.mockRejectedValue(mockError);
            await handleCallback(req, res);
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining("message: 'Erro ao salvar tokens: Falha no Axios'"));
        });

        it('deve enviar script de erro se o Supabase falhar', async () => {
            const req = mockRequest(null, { code: 'good-code', state: MOCK_INSTITUICAO_ID });
            const mockAxiosResponse = { data: { access_token: '...', user_id: 123 } };
            mockAxios.post.mockResolvedValue(mockAxiosResponse);

            const mockError = new Error('Falha no DB');
            mockUpdateSelectFinal.mockResolvedValue({ data: null, error: mockError }); // .select() falha

            await handleCallback(req, res);

            expect(mockUpdateSelectFinal).toHaveBeenCalled();
            expect(res.send).toHaveBeenCalledWith(expect.stringContaining("message: 'Erro ao salvar tokens: Falha no DB'"));
        });
    });

    // --- Testes para disconnect ---
    describe('disconnect', () => {
        it('deve retornar 200 e { success: true } ao desconectar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {});

            // [CORREÇÃO] Sobrescrevemos o mock padrão do 'beforeEach'.
            // Queremos que o .eq() seja o final e retorne a Promise de sucesso.
            mockUpdateEqFinal.mockResolvedValue({ error: null });

            // Act
            await disconnect(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockUpdateEqFinal).toHaveBeenCalledWith('id', MOCK_INSTITUICAO_ID);
            expect(mockUpdateSelectFinal).not.toHaveBeenCalled(); // Garante que o .select() não foi chamado
            expect(res.json).toHaveBeenCalledWith({ success: true }); // <- LINHA CORRIGIDA (removido o '_')
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {});
            const mockError = new Error('Falha no DB');

            // [CORREÇÃO] Sobrescrevemos o mock padrão do 'beforeEach'.
            // Queremos que o .eq() seja o final e retorne a Promise com o objeto de erro. // <- LINHA CORRIGIDA (removido o '_')
            // Isso vai ativar o 'if (error) throw error' no seu controller.
            mockUpdateEqFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await disconnect(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockUpdateEqFinal).toHaveBeenCalledWith('id', MOCK_INSTITUICAO_ID);
            expect(mockUpdateSelectFinal).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao desconectar' });
        });
    });
});