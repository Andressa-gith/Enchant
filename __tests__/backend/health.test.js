import request from 'supertest';
import app from '../../backend/server.js';

describe('GET /api/status - Rota de Health Check', () => {
    it('deve retornar status 200 e uma mensagem de sucesso', async () => {
        // 1. Faz a requisição para a nossa API
        const response = await request(app)
            .get('/api/status');

        // 2. Verifica (expect) se a resposta é a que esperamos
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Conexão com o banco de dados');
    });
});