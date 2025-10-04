/**
 * @file Testes de integração para a API de Perfil de Usuário (/api/user).
 * @description Testa os endpoints de busca e atualização de perfil, logout e status do tutorial.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/user';

/**
 * @describe Testes para os endpoints da API de Perfil.
 */
describe('Testes da API de Perfil', () => {
    
    let token;
    let userId;

    /**
     * @beforeAll Roda uma vez antes de todos os testes.
     * 1. Autentica o usuário para obter um token.
     * 2. Garante que o estado 'primeiro_login' seja 'true' antes dos testes começarem.
     */
    beforeAll(async () => {
        // Etapa 1: Login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });
        if (authError) throw new Error(`Setup de teste falhou no login: ${authError.message}`);
        token = authData.session.access_token;
        userId = authData.user.id;
        expect(token).toBeDefined();

        // Etapa 2: Garantir o estado inicial do banco de dados
        const { error: updateError } = await supabase
            .from('instituicao')
            .update({ primeiro_login: true })
            .eq('id', userId);
        if (updateError) throw new Error(`Setup de teste falhou ao resetar o tutorial: ${updateError.message}`);
        console.log('\n[SETUP] Status do tutorial garantido como "true" para o usuário de teste.');
    });

    /**
     * @describe Testes para a rota GET /profile
     */
    describe('GET /profile', () => {
        it('deve retornar os dados do perfil do usuário autenticado', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/profile`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('nome');
            expect(response.body).toHaveProperty('email');
            expect(response.body).toHaveProperty('cnpj');
        });

        it('deve retornar 401 para um usuário não autenticado', async () => {
            const response = await request(app).get(`${API_PREFIX}/profile`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota PUT /profile
     */
    describe('PUT /profile', () => {
        it('deve atualizar os dados do perfil e confirmar a alteração', async () => {
            const novoNome = `Instituicao Teste ${Date.now()}`;
            const novoTelefone = '71999998888';

            // 1. Faz o UPDATE
            const updateResponse = await request(app)
                .put(`${API_PREFIX}/profile`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome: novoNome,
                    telefone: novoTelefone
                });
            expect(updateResponse.statusCode).toBe(200);

            // 2. Faz o GET para VERIFICAR se o update funcionou de verdade
            const getResponse = await request(app)
                .get(`${API_PREFIX}/profile`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(getResponse.body.nome).toBe(novoNome);
            expect(getResponse.body.telefone).toBe(novoTelefone);
        });
    });

    /**
     * @describe Testes para a rota POST /tutorial-concluido
     */
    describe('POST /tutorial-concluido', () => {
        it('deve alterar o status de primeiro_login de true para false', async () => {
            // 1. Verifica o estado inicial (deve ser true)
            const getResponseBefore = await request(app)
                .get(`${API_PREFIX}/profile`)
                .set('Authorization', `Bearer ${token}`);
            expect(getResponseBefore.body.primeiro_login).toBe(true);
            
            // 2. Chama a rota para marcar o tutorial como visto
            const postResponse = await request(app)
                .post(`${API_PREFIX}/tutorial-concluido`)
                .set('Authorization', `Bearer ${token}`);
            expect(postResponse.statusCode).toBe(200);

            // 3. Verifica se o estado foi alterado para false
            const getResponseAfter = await request(app)
                .get(`${API_PREFIX}/profile`)
                .set('Authorization', `Bearer ${token}`);
            expect(getResponseAfter.body.primeiro_login).toBe(false);
        });
    });

    /**
     * @describe Testes para a rota POST /logout
     */
    describe('POST /logout', () => {
        it('deve retornar uma mensagem de sucesso', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/logout`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Logout sinalizado pelo servidor.');
        });
    });
});