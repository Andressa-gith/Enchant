/**
 * @file Testes de integração para a API de Gestão Financeira (/api/financeiro).
 * @description Testa as operações CRUD para os lançamentos financeiros e a lógica de cálculo de status.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/financeiro';

/**
 * @describe Testes para os endpoints da API de Gestão Financeira.
 */
describe('Testes da API de Gestão Financeira', () => {
    
    let token;
    let newLancamentoId; // Armazena o ID do lançamento principal dos testes.
    const lancamentosParaLimpar = []; // Guarda IDs de todos os lançamentos criados para limpar no final.

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
     * @afterAll Limpa todos os dados de teste criados no banco de dados.
     */
    afterAll(async () => {
        if (lancamentosParaLimpar.length > 0) {
            // Deleta todos os lançamentos criados durante os testes.
            const { error } = await supabase
                .from('gestao_financeira')
                .delete()
                .in('id', lancamentosParaLimpar);

            if (error) {
                console.error('Falha na limpeza dos dados de teste:', error);
            } else {
                console.log(`\n[LIMPEZA] Lançamentos de teste removidos: ${lancamentosParaLimpar.join(', ')}`);
            }
        }
    });

    /**
     * @describe Testes para a rota POST / (Criação de Lançamento).
     */
    describe('POST /', () => {
        it('deve criar um novo lançamento com status "Planejado" (valor executado é 0)', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome_categoria: 'Despesas de Teste (Planejado)',
                    origem_recurso: 'Recursos Próprios',
                    orcamento_previsto: 1000.00,
                    valor_executado: 0
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.status).toBe('Planejado'); // <-- Testando a lógica de negócio!

            // Guarda o ID para os próximos testes e para a limpeza.
            newLancamentoId = response.body.data.id;
            lancamentosParaLimpar.push(newLancamentoId);
        });

        it('deve criar um novo lançamento com status "Executado" (valor executado >= orçamento)', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome_categoria: 'Despesas de Teste (Executado)',
                    origem_recurso: 'Recursos Próprios',
                    orcamento_previsto: 500.00,
                    valor_executado: 500.00
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.status).toBe('Executado'); // <-- Testando a lógica de negócio!

            lancamentosParaLimpar.push(response.body.data.id);
        });
    });

    /**
     * @describe Testes para a rota GET / (Listagem de Lançamentos).
     */
    describe('GET /', () => {
        it('deve retornar a lista de lançamentos do usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const lancamentoCriado = response.body.find(l => l.id === newLancamentoId);
            expect(lancamentoCriado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota PATCH /:id (Atualização de Lançamento).
     */
    describe('PATCH /:id', () => {
        it('deve atualizar um lançamento e recalcular o status para "Pendente"', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/${newLancamentoId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    nome_categoria: 'Despesas de Teste (Atualizado)',
                    orcamento_previsto: 1000.00,
                    valor_executado: 450.00 // > 0 e < 1000.00
                });

            console.log('CORPO DA RESPOSTA DO PATCH:', response.body); 

            expect(response.statusCode).toBe(200);
            expect(response.body.data.status).toBe('Pendente'); // <-- Testando a lógica de negócio!
        });

        it('deve retornar um erro 404 ao tentar atualizar um lançamento que não existe', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/999999`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    nome_categoria: 'Inexistente',
                    orcamento_previsto: 1,
                    valor_executado: 1
                });

            expect(response.statusCode).toBe(404);
        });
    });

    /**
     * @describe Testes para a rota DELETE /:id (Exclusão de Lançamento).
     */
    describe('DELETE /:id', () => {
        it('deve deletar o lançamento criado nos testes anteriores', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newLancamentoId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            // Remove o ID da lista de limpeza, pois já foi limpo aqui.
            const index = lancamentosParaLimpar.indexOf(newLancamentoId);
            if (index > -1) lancamentosParaLimpar.splice(index, 1);
        });

        it('deve retornar um erro 404 ao tentar deletar o mesmo lançamento novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newLancamentoId}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });
    });
});