/**
 * @file Testes de integração para a API do Dashboard (/api/dashboard).
 * @description Testa os endpoints principais que fornecem dados para o dashboard.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/dashboard';

/**
 * @describe Testes para os endpoints da API do Dashboard.
 */
describe('Testes da API do Dashboard', () => {
    
    let token;

    /**
     * @beforeAll Autentica um usuário de teste antes de todos os testes.
     */
    beforeAll(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });

        if (error) throw new Error(`Setup de teste falhou: Login não pôde ser realizado. ${error.message}`);
        token = data.session.access_token; 
        expect(token).toBeDefined();
    });

    /**
     * @describe Testes para a rota principal GET / (getDashboardData).
     */
    describe('GET /', () => {
        it('deve retornar os dados do dashboard para um usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            // 1. Verifica se a requisição foi bem-sucedida
            expect(response.statusCode).toBe(200);

            // 2. Verifica a "forma" do objeto de resposta (shape validation)
            expect(response.body).toHaveProperty('kpis');
            expect(response.body).toHaveProperty('graficos');
            expect(response.body).toHaveProperty('atividades');
            expect(response.body).toHaveProperty('alertas');
            expect(response.body).toHaveProperty('relatoriosRecentes');

            // 3. Verifica a forma de um objeto aninhado para garantir a estrutura
            expect(response.body.kpis).toHaveProperty('totalItensEstoque');
            expect(response.body.graficos).toHaveProperty('fluxoDoacoes');
        });

        it('deve retornar erro 401 para um usuário não autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX); // Sem o token

            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota GET /atividades (getAllActivities).
     */
    describe('GET /atividades', () => {
        it('deve retornar a lista completa de atividades para um usuário autenticado', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/atividades`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('deve retornar erro 401 para um usuário não autenticado', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/atividades`); // Sem o token
                
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota GET /alertas (getAllAlerts).
     */
    describe('GET /alertas', () => {
        it('deve retornar a lista completa de alertas para um usuário autenticado', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/alertas`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('deve retornar erro 401 para um usuário não autenticado', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/alertas`); // Sem o token
                
            expect(response.statusCode).toBe(401);
        });
    });
});