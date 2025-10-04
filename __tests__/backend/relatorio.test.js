/**
 * @file Testes de integração para a API de Relatórios de Transparência (/api/relatorios).
 * @description Testa as operações de criação, listagem e exclusão de relatórios.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/relatorios';

/**
 * @describe Testes para os endpoints da API de Relatórios.
 */
describe('Testes da API de Relatórios', () => {
    
    let token;
    let newRelatorioId;

    /**
     * @beforeAll Autentica um usuário de teste antes de todos os testes.
     */
    beforeAll(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });
        if (error) throw new Error(`Setup de teste falhou no login: ${error.message}`);
        token = data.session.access_token; 
        expect(token).toBeDefined();
    });

    /**
     * @afterAll Limpa os dados de teste criados no banco.
     */
    afterAll(async () => {
        if (newRelatorioId) {
            // A exclusão no teste já limpa, mas isso é uma garantia extra caso o teste de delete falhe.
            await supabase.from('relatorio').delete().eq('id', newRelatorioId);
            console.log(`\n[LIMPEZA] Relatório de teste ID: ${newRelatorioId} garantidamente removido.`);
        }
    });

    /**
     * @describe Testes para a rota POST / (Criação de Relatório).
     */
    describe('POST /', () => {
        it('deve criar um novo relatório com sucesso', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Relatório de Teste Jest')
                .field('descricao', 'Descrição do relatório de teste.')
                .attach('arquivo_relatorio', Buffer.from('conteudo do fake pdf'), 'relatorio.pdf');

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.titulo).toBe('Relatório de Teste Jest');

            newRelatorioId = response.body.data.id;
        });

        it('deve retornar um erro 400 se o arquivo não for enviado', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Relatório Sem Arquivo');
            
            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota GET / (Listagem de Relatórios).
     */
    describe('GET /', () => {
        it('deve retornar a lista de relatórios do usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const relatorioCriado = response.body.find(r => r.id === newRelatorioId);
            expect(relatorioCriado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota DELETE /:id (Exclusão de Relatório).
     */
    describe('DELETE /:id', () => {
        it('deve deletar o relatório criado nos testes anteriores', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newRelatorioId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            
            // Remove o ID para que o afterAll não tente deletar de novo.
            newRelatorioId = null; 
        });

        it('deve retornar um erro 404 ao tentar deletar um relatório que não existe', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/999999`)
                .set('Authorization', `Bearer ${token}`);

            // Esperamos 404 pois o controller foi corrigido para tratar este caso.
            expect(response.statusCode).toBe(404);
        });
    });
});