/**
 * @file Teste de integração para a rota de Health Check (/api/status).
 * @description Este arquivo verifica se a API está online e consegue se comunicar com o banco de dados.
 */

import request from 'supertest';
import app from '../../backend/server.js';

/**
 * @describe Testes para o endpoint de Health Check da API.
 */
describe('GET /api/status - Rota de Health Check', () => {

    it('deve retornar status 200 e uma mensagem de sucesso, indicando conexão com o banco', async () => {
        // Arrange: Para este teste simples, não há preparação necessária.

        // Act: Executa a requisição para a rota de health check.
        const response = await request(app)
            .get('/api/status');

        // Assert: Verifica se a resposta da API é a esperada.
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Conexão com o banco de dados');
    });

});