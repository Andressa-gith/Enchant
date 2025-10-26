/**
 * @file Testes de integração para a API de Parcerias (/api/parcerias).
 * @description Testa as operações CRUD para os parceiros, incluindo segurança,
 * validação de dados e limpeza automática do ambiente de teste.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/parcerias';

/**
 * @describe Suíte de testes para os endpoints da API de Parcerias.
 */
describe('API de Parcerias - Testes de Integração', () => {
    
    let token;
    let parceriaPrincipalId; // Armazena o ID da parceria principal para usar em múltiplos testes.
    const parceriasParaLimpar = []; // Guarda todos os IDs criados para a limpeza final.

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
        expect(token).toBeDefined();
    });

    /**
     * @afterAll Executa uma vez depois de todos os testes.
     * @description Limpa todas as parcerias criadas durante a execução da suíte.
     */
    afterAll(async () => {
        if (parceriasParaLimpar.length > 0) {
            const { error } = await supabase.from('parceiro').delete().in('id', parceriasParaLimpar);
            if (error) {
                console.error('Falha na limpeza das parcerias de teste:', error);
            } else {
                console.log(`\n[TEARDOWN] ${parceriasParaLimpar.length} parcerias de teste foram limpas.`);
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
        it('PUT /:id - deve retornar 401 se não houver token', async () => {
            const response = await request(app).put(`${API_PREFIX}/999999`);
            expect(response.statusCode).toBe(401);
        });
        it('DELETE /:id - deve retornar 401 se não houver token', async () => {
            const response = await request(app).delete(`${API_PREFIX}/999999`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: POST /
     * @description Testa a criação de uma nova parceria.
     */
    describe('POST / - Criar Parceria', () => {
        it('deve criar uma nova parceria com sucesso', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome: 'Parceiro de Teste Jest',
                    tipo_setor: 'Privado',
                    status: 'Ativo',
                    data_inicio: '2025-01-01',
                    objetivos: 'Testar a API de criação'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            
            parceriaPrincipalId = response.body.data.id;
            parceriasParaLimpar.push(parceriaPrincipalId);
        });

        it('deve retornar erro 500 se faltarem campos obrigatórios (ex: nome)', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    tipo_setor: 'Privado',
                    status: 'Ativo'
                });
            // Espera-se 500 pois a violação de constraint (NOT NULL) acontece no banco.
            expect(response.statusCode).toBe(500);
        });
    });

    /**
     * @describe Testes para a rota: GET /
     * @description Testa a listagem de parcerias.
     */
    describe('GET / - Listar Parcerias', () => {
        it('deve retornar a lista de parcerias, incluindo a recém-criada', async () => {
            expect(parceriaPrincipalId).toBeDefined();
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const parceriaCriada = response.body.find(p => p.id === parceriaPrincipalId);
            expect(parceriaCriada).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota: PUT /:id
     * @description Testa a atualização de uma parceria existente.
     */
    describe('PUT /:id - Atualizar Parceria', () => {
        it('deve atualizar uma parceria específica com sucesso', async () => {
            const response = await request(app)
                .put(`${API_PREFIX}/${parceriaPrincipalId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome: 'Parceiro de Teste Atualizado',
                    tipo_setor: 'Público',
                    status: 'Inativo',
                    data_inicio: '2025-01-01',
                    objetivos: 'Testar a atualização da API'
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.data.status).toBe('Inativo');
            expect(response.body.data.nome).toBe('Parceiro de Teste Atualizado');
        });

        it('deve retornar erro 404 ao tentar atualizar uma parceria que não existe', async () => {
            const response = await request(app)
                .put(`${API_PREFIX}/999999`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome: 'Parceiro Fantasma',
                    tipo_setor: 'Público',
                    status: 'Ativo',
                    data_inicio: '2025-01-01'
                });
            expect(response.statusCode).toBe(404);
        });
    });

    /**
     * @describe Testes para a rota: DELETE /:id
     * @description Testa a exclusão de uma parceria.
     */
    describe('DELETE /:id - Excluir Parceria', () => {
        it('deve excluir a parceria criada com sucesso', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${parceriaPrincipalId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            
            // Remove da lista de limpeza, pois a exclusão já foi testada e executada.
            const index = parceriasParaLimpar.indexOf(parceriaPrincipalId);
            if (index > -1) parceriasParaLimpar.splice(index, 1);
        });

        it('deve retornar erro 404 ao tentar excluir a mesma parceria novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${parceriaPrincipalId}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });
    });
});
