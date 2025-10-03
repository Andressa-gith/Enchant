/**
 * @file Testes de integração para a API de Contratos (/api/contratos).
 * @description Testa as operações de criação, listagem e exclusão de contratos.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/contratos';

/**
 * @describe Testes para os endpoints da API de Contratos.
 */
describe('Testes da API de Contratos', () => {
    
    let token;
    let newContratoId;

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
     * @describe Testes para a rota POST / (Criação de Contrato).
     */
    describe('POST /', () => {
        it('deve criar um novo contrato com sucesso quando todos os dados são válidos', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('nome_contrato', 'Contrato de Teste via Jest')
                .field('descricao', 'Descrição do contrato de teste.')
                .field('ano_vigencia', 2025)
                .attach('arquivo_contrato', Buffer.from('conteudo do fake pdf'), 'contrato-teste.pdf');

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.nome_contrato).toBe('Contrato de Teste via Jest');

            newContratoId = response.body.data.id;
        });

        it('deve retornar um erro 400 se o arquivo não for enviado', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('nome_contrato', 'Contrato Sem Arquivo');
            
            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota GET / (Listagem de Contratos).
     */
    describe('GET /', () => {
        it('deve retornar a lista de contratos do usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const contratoCriado = response.body.find(c => c.id === newContratoId);
            expect(contratoCriado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota DELETE /:id (Exclusão de Contrato).
     */
    describe('DELETE /:id', () => {
        it('deve deletar o contrato criado nos testes anteriores', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newContratoId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
        });

        it('deve retornar um erro 404 ao tentar deletar o mesmo contrato novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newContratoId}`)
                .set('Authorization', `Bearer ${token}`);

            // Esperamos 404 pois o controller foi corrigido para tratar este caso.
            expect(response.statusCode).toBe(404);
        });
    });
});