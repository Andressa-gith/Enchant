/**
 * @file Testes de integração para a API de Relatórios de Transparência (/api/relatorios).
 * @description Testa as operações de criação, listagem e exclusão de relatórios,
 * incluindo upload de arquivos, segurança e limpeza completa do ambiente de teste (DB e Storage).
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/relatorios';

/**
 * @describe Suíte de testes para os endpoints da API de Relatórios de Transparência.
 */
describe('API de Relatórios - Testes de Integração', () => {
    
    let token;
    let instituicaoId;
    let relatorioCriado; // Armazena o objeto completo do relatório criado para testes e limpeza.

    /**
     * @beforeAll Executa uma vez antes de todos os testes.
     * @description Autentica um usuário de teste para obter um token JWT válido.
     */
    beforeAll(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });
        if (error) throw new Error(`Setup de teste falhou no login: ${error.message}`);
        token = data.session.access_token; 
        instituicaoId = data.user.id;
        expect(token).toBeDefined();
    });

    /**
     * @afterAll Executa uma vez depois de todos os testes.
     * @description Limpa o relatório criado no banco de dados e seu respectivo arquivo no Storage.
     */
    afterAll(async () => {
        if (relatorioCriado) {
            // Garante a limpeza completa, mesmo que o teste de DELETE falhe.
            await supabase.storage.from('reports').remove([relatorioCriado.caminho_arquivo]);
            await supabase.from('relatorio').delete().eq('id', relatorioCriado.id);
            console.log(`\n[TEARDOWN] Relatório de teste ID ${relatorioCriado.id} e seu arquivo foram limpos com sucesso.`);
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
        it('DELETE /:id - deve retornar 401 se não houver token', async () => {
            const response = await request(app).delete(`${API_PREFIX}/999999`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: POST /
     * @description Testa a criação de um novo relatório com upload de arquivo.
     */
    describe('POST / - Criar Relatório', () => {
        it('deve criar um novo relatório com sucesso quando todos os dados são válidos', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Relatório de Teste Jest')
                .field('descricao', 'Descrição do relatório de teste automatizado.')
                .attach('arquivo_relatorio', Buffer.from('conteúdo do fake pdf para o teste'), 'relatorio-teste.pdf');

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.titulo).toBe('Relatório de Teste Jest');

            relatorioCriado = response.body.data;
        });

        it('deve retornar erro 400 se o arquivo não for enviado', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Relatório Sem Arquivo');
            
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Nenhum arquivo foi enviado.');
        });
    });

    /**
     * @describe Testes para a rota: GET /
     * @description Testa a listagem de relatórios.
     */
    describe('GET / - Listar Relatórios', () => {
        it('deve retornar a lista de relatórios, incluindo o recém-criado', async () => {
            expect(relatorioCriado).toBeDefined();

            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const encontrado = response.body.find(r => r.id === relatorioCriado.id);
            expect(encontrado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota: DELETE /:id
     * @description Testa a exclusão de um relatório e seu arquivo associado.
     */
    describe('DELETE /:id - Excluir Relatório', () => {
        it('deve excluir o relatório criado com sucesso', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${relatorioCriado.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Relatório deletado com sucesso!');
            
            // Define como nulo para que o afterAll não tente limpar novamente.
            relatorioCriado = null; 
        });

        it('deve retornar erro 404 ao tentar excluir um relatório que não existe', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/999999`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });
    });
});
