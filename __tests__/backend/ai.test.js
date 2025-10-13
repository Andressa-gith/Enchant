/**
 * @file Testes de integração para a rota de IA (POST /chat).
 * @description Este arquivo contém a suíte de testes para o endpoint `/chat`,
 * que lida com as interações com o assistente de IA. Os testes
 * cobrem o fluxo de sucesso, validação de dados de entrada e
 * o tratamento de falhas na comunicação com a API externa.
 * @author Seu Nome <seu-email@exemplo.com>
 * @version 1.0.0
 */

import { jest, describe, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../backend/server.js';
import axios from 'axios';

/**
 * Mock do módulo 'axios' para isolar nossos testes da API externa do Gemini.
 * Isso nos permite simular as respostas da API (tanto de sucesso quanto de erro)
 * sem depender de uma conexão de rede real, tornando os testes mais rápidos,
 * consistentes e sem custos.
 */
jest.mock('axios');

/**
 * @describe Bloco de testes para o endpoint `POST /chat`.
 * Agrupa todos os cenários de teste relacionados à rota de chat com a IA.
 * @test {POST} /chat
 */
describe('POST /chat - Rota de Interação com a IA', () => {

    /**
     * Hook do Jest que é executado após a conclusão de cada teste ('it') neste bloco.
     * Sua função aqui é limpar todos os mocks, garantindo que o estado de um teste
     * (ex: quantas vezes um mock foi chamado) não interfira nos testes seguintes.
     */
    afterEach(() => {
        jest.clearAllMocks();
    });

    /**
     * @test {200} Cenário de sucesso.
     * @description Verifica se, ao receber uma mensagem válida, a rota processa a requisição,
     * chama a API externa mockada e retorna a resposta da IA com o status 200 (OK).
     */
    it('deve retornar uma resposta da IA com status 200 em caso de sucesso', async () => {
        // Arrange: Prepara os dados e o ambiente para o teste.
        const requestBody = {
            userMessage: 'Olá, qual a função do dashboard?',
            conversationHistory: [],
        };
        const mockAiTextResponse = 'O dashboard serve para te dar uma visão geral das suas operações.';
        const mockApiResponse = {
            data: {
                candidates: [{ content: { parts: [{ text: mockAiTextResponse }] } }],
            },
        };

        axios.post = jest.fn();
        // Configura o mock do `axios.post` para simular uma resposta bem-sucedida da API Gemini.
        axios.post.mockResolvedValue(mockApiResponse);

        // Act: Executa a ação a ser testada, ou seja, a chamada à nossa rota.
        const response = await request(app)
            .post('/api/ai/chat')
            .send(requestBody);

        // Assert: Verifica se os resultados são os esperados.
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ response: mockAiTextResponse });
        expect(axios.post).toHaveBeenCalledTimes(1); // Garante que a API externa foi chamada uma única vez.
    });

    /**
     * @test {400} Cenário de erro de validação.
     * @description Garante que a rota retorne um erro 400 (Bad Request) se a propriedade
     * obrigatória `userMessage` não for fornecida no corpo da requisição.
     */
    it('deve retornar status 400 se "userMessage" não for fornecido', async () => {
        // Arrange: Define um corpo de requisição inválido (neste caso, vazio).
        const invalidRequestBody = {};

        // Act: Envia a requisição para o endpoint com os dados inválidos.
        const response = await request(app)
            .post('/api/ai/chat')
            .send(invalidRequestBody);

        // Assert: Verifica se a resposta de erro é a esperada.
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: 'Nenhuma mensagem fornecida.' });

        // Assegura que a API externa (axios.post) NÃO foi acionada,
        // pois a validação interna da nossa rota barrou a requisição antes.
        expect(axios.post).not.toHaveBeenCalled();
    });

    /**
     * @test {500} Cenário de erro na API externa.
     * @description Testa o tratamento de erro do nosso controller. Se a chamada para a API
     * do Gemini falhar (ex: por um erro de rede ou da própria API), a rota
     * deve capturar essa exceção e retornar um status 500 (Internal Server Error).
     */
    it('deve retornar status 500 se a chamada para a API externa falhar', async () => {
        // Arrange: Prepara um corpo de requisição válido, pois a validação deve passar.
        const requestBody = {
            userMessage: 'Isso vai dar erro.',
        };

        axios.post = jest.fn();

        // Configura o mock do `axios.post` para simular uma falha, rejeitando a Promise.
        axios.post.mockRejectedValue(new Error('Simulação de erro de rede da API'));

        // Act: Executa a chamada que, internamente, encontrará o erro simulado.
        const response = await request(app)
            .post('/api/ai/chat')
            .send(requestBody);

        // Assert: Verifica se o erro foi tratado corretamente e a resposta adequada foi enviada.
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Erro ao se comunicar com o assistente de IA.' });

        // Confirma que nosso sistema tentou, de fato, fazer a chamada à API externa.
        expect(axios.post).toHaveBeenCalledTimes(1);
    });
});