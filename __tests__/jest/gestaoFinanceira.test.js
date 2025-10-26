/**
 * @file Testes de integração para a API de Gestão Financeira (/api/financeiro).
 * @description Testa as operações CRUD para os lançamentos financeiros, incluindo a lógica
 * de cálculo de status, segurança e validação de dados de entrada.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/financeiro';

/**
 * @describe Suíte de testes para os endpoints da API de Gestão Financeira.
 */
describe('API de Gestão Financeira - Testes de Integração', () => {

    let token;
    let lancamentoPrincipalId; // Armazena o ID do lançamento usado em múltiplos testes.
    const lancamentosParaLimpar = []; // Guarda todos os IDs criados para a limpeza final.

    /**
     * @beforeAll Executa uma vez antes de todos os testes.
     * @description Autentica um usuário de teste para obter um token JWT válido.
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
     * @afterAll Executa uma vez depois de todos os testes.
     * @description Limpa todos os lançamentos financeiros criados durante a execução da suíte.
     */
    afterAll(async () => {
        if (lancamentosParaLimpar.length > 0) {
            const { error } = await supabase.from('gestao_financeira').delete().in('id', lancamentosParaLimpar);
            if (error) {
                console.error('Falha na limpeza dos dados de teste financeiros:', error);
            } else {
                console.log(`\n[TEARDOWN] ${lancamentosParaLimpar.length} lançamentos financeiros de teste foram limpos.`);
            }
        }
    });
    
    /**
     * @describe Testes de Segurança e Autenticação
     * @description Verifica se os endpoints estão protegidos e retornam 401 sem token.
     */
    describe('Segurança e Autenticação', () => {
        it('GET / - deve retornar 401 se não houver token', async () => {
            const response = await request(app).get(API_PREFIX);
            expect(response.statusCode).toBe(401);
        });
        it('POST / - deve retornar 401 se não houver token', async () => {
            const response = await request(app).post(API_PREFIX);
            expect(response.statusCode).toBe(401);
        });
        it('PATCH /:id - deve retornar 401 se não houver token', async () => {
            const response = await request(app).patch(`${API_PREFIX}/999999`);
            expect(response.statusCode).toBe(401);
        });
        it('DELETE /:id - deve retornar 401 se não houver token', async () => {
            const response = await request(app).delete(`${API_PREFIX}/999999`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: POST /
     * @description Testa a criação de lançamentos e a lógica de cálculo de status.
     */
    describe('POST / - Criar Lançamento', () => {
        it('deve criar um lançamento com status "Planejado" (executado = 0)', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome_categoria: 'Teste Planejado',
                    origem_recurso: 'Recursos Próprios',
                    orcamento_previsto: 1000.00,
                    valor_executado: 0
                });
            expect(response.statusCode).toBe(201);
            expect(response.body.data.status).toBe('Planejado');
            lancamentoPrincipalId = response.body.data.id; // Guarda para outros testes
            lancamentosParaLimpar.push(response.body.data.id);
        });

        it('deve criar um lançamento com status "Executado" (executado >= orçado)', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome_categoria: 'Teste Executado',
                    origem_recurso: 'Recursos Privados',
                    orcamento_previsto: 500.00,
                    valor_executado: 500.00
                });
            expect(response.statusCode).toBe(201);
            expect(response.body.data.status).toBe('Executado');
            lancamentosParaLimpar.push(response.body.data.id);
        });
        
        it('deve criar um lançamento com status "Pendente" (0 < executado < orçado)', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome_categoria: 'Teste Pendente',
                    origem_recurso: 'Governo Federal',
                    orcamento_previsto: 800.00,
                    valor_executado: 300.00
                });
            expect(response.statusCode).toBe(201);
            expect(response.body.data.status).toBe('Pendente');
            lancamentosParaLimpar.push(response.body.data.id);
        });
    });

    /**
     * @describe Testes para a rota: GET /
     * @description Testa a listagem de todos os lançamentos financeiros.
     */
    describe('GET / - Listar Lançamentos', () => {
        it('deve retornar a lista de lançamentos da instituição', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);
            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const lancamento = response.body.find(l => l.id === lancamentoPrincipalId);
            expect(lancamento).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota: PATCH /:id
     * @description Testa a atualização de um lançamento e o recálculo de status.
     */
    describe('PATCH /:id - Atualizar Lançamento', () => {
        it('deve atualizar um lançamento e recalcular o status para "Pendente"', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/${lancamentoPrincipalId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    nome_categoria: 'Teste Planejado (Atualizado)',
                    orcamento_previsto: 1000.00,
                    valor_executado: 450.00 // > 0 e < 1000
                });
            expect(response.statusCode).toBe(200);
            expect(response.body.data.status).toBe('Pendente');
        });

        it('deve retornar erro 400 se o corpo da requisição for inválido', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/${lancamentoPrincipalId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ nome_categoria: 'Incompleto' }); // Faltam campos
            expect(response.statusCode).toBe(400);
        });

        it('deve retornar erro 404 ao tentar atualizar um lançamento que não existe', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/999999`)
                .set('Authorization', `Bearer ${token}`)
                .send({ nome_categoria: 'Inexistente', orcamento_previsto: 1, valor_executado: 1 });
            expect(response.statusCode).toBe(404);
        });
    });

    /**
     * @describe Testes para a rota: DELETE /:id
     * @description Testa a exclusão de um lançamento financeiro.
     */
    describe('DELETE /:id - Excluir Lançamento', () => {
        it('deve excluir o lançamento principal com sucesso', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${lancamentoPrincipalId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.statusCode).toBe(200);

            // Remove da lista de limpeza, pois já foi deletado
            const index = lancamentosParaLimpar.indexOf(lancamentoPrincipalId);
            if (index > -1) lancamentosParaLimpar.splice(index, 1);
        });

        it('deve retornar erro 404 ao tentar excluir o mesmo lançamento novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${lancamentoPrincipalId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.statusCode).toBe(404);
        });
    });
});
