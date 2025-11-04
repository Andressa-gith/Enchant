/* eslint-disable no-undef */

/**
 * @file Testes unitários para o ai.controller.js
 * @description Este arquivo contém a suíte de testes unitários para a função handleChatRequest,
 * focado em isolar a lógica da função simulando todas as dependências (axios, req, res).
 * @version 2.2.0 (Corrigido e Padronizado para ESM)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// --- Definição dos Mocks ---

/**
 * Mock completo do módulo 'axios'.
 */
const mockAxios = {
    post: jest.fn(),
};

// --- Aplicação dos Mocks (Modo ESM) ---

jest.unstable_mockModule('axios', () => ({
    __esModule: true,
    default: mockAxios,
}));

// --- Configuração do Ambiente (process.env) ---

const originalEnv = process.env;

beforeAll(() => {
    jest.resetModules();
    process.env = {
        ...originalEnv,
        GEMINI_API_KEY: 'mock-api-key-12345',
    };
});

afterAll(() => {
    process.env = originalEnv;
});


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


// --- Suíte de Testes: handleChatRequest ---

describe('handleChatRequest - Testes Unitários do Controller', () => {

    let res;
    let handleChatRequest;

    /**
     * Importa dinamicamente o controller APÓS os mocks serem configurados.
     */
    beforeAll(async () => {
        const controller = await import('../backend/controllers/ai.controller.js');
        handleChatRequest = controller.handleChatRequest;
    });

    /**
     * Reseta os mocks antes de cada teste.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
    });

    /**
     * @test {200} Cenário de sucesso (Caminho Feliz).
     */
    it('deve retornar status 200 e a resposta da IA em caso de sucesso', async () => {
        // Arrange
        const req = mockRequest({
            userMessage: 'Olá, qual a funcionalidade de Dashboard?',
            conversationHistory: []
        });
        
        const mockApiResponse = {
            data: {
                candidates: [{
                    content: { parts: [{ text: 'O Dashboard é a tela principal.' }] }
                }]
            }
        };
        mockAxios.post.mockResolvedValue(mockApiResponse);

        // Act
        await handleChatRequest(req, res);

        // Assert
        
        // 1. Verifica se a API Externa foi chamada corretamente
        expect(mockAxios.post).toHaveBeenCalledTimes(1);
        
        expect(mockAxios.post).toHaveBeenCalledWith(
            // 1.1. Verifica a URL correta
            expect.stringContaining('gemini-2.5-pro:generateContent?key=mock-api-key-12345'),
            
            // 1.2. Verifica se o payload 'contents' contém a mensagem do usuário
            expect.objectContaining({
                contents: expect.arrayContaining([
                    // Verificamos apenas a última parte (a mensagem do usuário),
                    // já que o controller adiciona o prompt do sistema e o histórico.
                    expect.objectContaining({
                        role: 'user', 
                        parts: [{ text: 'Olá, qual a funcionalidade de Dashboard?' }] 
                    })
                ])
            })
        );

        // 2. Verifica se a resposta (res) foi enviada corretamente
        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            response: 'O Dashboard é a tela principal.'
        });
    });

    /**
     * @test {400} Cenário de falha de validação.
     */
    it('deve retornar status 400 se "userMessage" não for fornecido', async () => {
        // Arrange
        const req = mockRequest({
            conversationHistory: []
        });
        
        // Act
        await handleChatRequest(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Nenhuma mensagem fornecida.'
        });
        expect(mockAxios.post).not.toHaveBeenCalled();
    });

    /**
     * @test {500} Cenário de erro na API externa.
     */
    it('deve retornar status 500 se a chamada para a API externa falhar', async () => {
        // Arrange
        const req = mockRequest({
            userMessage: 'Isso vai dar erro.'
        });
        
        const mockError = new Error('Simulação de erro de rede');
        mockAxios.post.mockRejectedValue(mockError);

        // para evitar "poluir" o log de teste com um erro que já esperamos.
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        await handleChatRequest(req, res);

        // Restaura o console.error original
        consoleErrorSpy.mockRestore();

        // Assert
        expect(mockAxios.post).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Erro ao se comunicar com o assistente de IA.'
        });
    });
});