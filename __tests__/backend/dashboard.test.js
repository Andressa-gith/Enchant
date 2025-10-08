/**
 * @file Testes de integração para a API do Dashboard (/api/dashboard).
 * @description Esta suíte valida os endpoints que consolidam e retornam dados para a
 * interface principal do dashboard, incluindo a rota principal, atividades e alertas.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/dashboard';

/**
 * @describe Suíte de testes para os endpoints da API do Dashboard.
 */
describe('API do Dashboard - Testes de Integração', () => {

    let token;

    /**
     * @beforeAll Executa uma vez antes de todos os testes.
     * @description Realiza a autenticação de um usuário de teste para obter um token JWT válido.
     */
    beforeAll(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });

        if (error) {
            throw new Error(`Setup de teste falhou: Login não pôde ser realizado. ${error.message}`);
        }
        token = data.session.access_token;
        expect(token).toBeDefined();
    });

    /**
     * @describe Testes de Segurança e Autenticação
     * @description Verifica se os endpoints do dashboard estão devidamente protegidos.
     */
    describe('Segurança e Autenticação', () => {
        it('GET / - deve retornar 401 para usuário não autenticado', async () => {
            const response = await request(app).get(API_PREFIX);
            expect(response.statusCode).toBe(401);
        });

        it('GET /atividades - deve retornar 401 para usuário não autenticado', async () => {
            const response = await request(app).get(`${API_PREFIX}/atividades`);
            expect(response.statusCode).toBe(401);
        });

        it('GET /alertas - deve retornar 401 para usuário não autenticado', async () => {
            const response = await request(app).get(`${API_PREFIX}/alertas`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: GET /
     * @description Testa a obtenção dos dados consolidados do dashboard.
     */
    describe('GET / - Dados Principais do Dashboard', () => {
        it('deve retornar a estrutura de dados completa do dashboard com sucesso', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);

            // Validação da estrutura principal (Shape Validation)
            expect(response.body).toHaveProperty('kpis');
            expect(response.body).toHaveProperty('graficos');
            expect(response.body).toHaveProperty('atividades');
            expect(response.body).toHaveProperty('alertas');
            expect(response.body).toHaveProperty('relatoriosRecentes');
            
            // Validação de uma sub-estrutura para garantir a integridade
            expect(response.body.kpis).toHaveProperty('totalItensEstoque');
            expect(response.body.graficos).toHaveProperty('fluxoDoacoes');
        });

        it('deve retornar dados filtrados ao passar startDate e endDate como query params', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}?startDate=2025-01-01&endDate=2025-01-31`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('kpis'); // Verifica se a estrutura ainda é válida
        });
        
        it('deve retornar erro 500 se o formato da data no filtro for inválido', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}?startDate=data-invalida`)
                .set('Authorization', `Bearer ${token}`);
            
            // O controller vai gerar um erro ao tentar `new Date('data-invalida')`, que será capturado pelo catch.
            expect(response.statusCode).toBe(500);
            expect(response.body.message).toBe('Erro interno ao buscar dados do dashboard.');
        });
    });

    /**
     * @describe Testes para a rota: GET /atividades
     * @description Testa a obtenção da lista completa de atividades.
     */
    describe('GET /atividades - Lista Completa de Atividades', () => {
        it('deve retornar uma lista de atividades com a estrutura correta', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/atividades`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            // Se houver atividades, verifica a estrutura do primeiro item
            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('data');
                expect(response.body[0]).toHaveProperty('tipo');
                expect(response.body[0]).toHaveProperty('desc');
            }
        });
    });

    /**
     * @describe Testes para a rota: GET /alertas
     * @description Testa a obtenção da lista completa de alertas.
     */
    describe('GET /alertas - Lista Completa de Alertas', () => {
        it('deve retornar uma lista de alertas com a estrutura correta', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/alertas`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            // Se houver alertas, verifica a estrutura do primeiro item
            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('tipo');
                expect(response.body[0]).toHaveProperty('texto');
            }
        });
    });
});
