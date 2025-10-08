/**
 * @file Testes de integração para a API de Autenticação (/api/auth).
 * @description Esta suíte de testes valida os endpoints de login,
 * solicitação de redefinição de senha e a efetiva redefinição da senha.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/auth';

// Credenciais do usuário de teste para evitar repetição.
const TEST_USER_EMAIL = 'guilherme.oliver@ba.estudante.senai.br';
const TEST_USER_PASSWORD = 'G@123456';

/**
 * @describe Suíte de testes para os endpoints da API de Autenticação.
 */
describe('API de Autenticação - Testes de Integração', () => {

    /**
     * @describe Testes para a rota: POST /login
     * @description Valida o processo de autenticação de um usuário.
     */
    describe('POST /login', () => {
        it('deve autenticar com sucesso com credenciais válidas', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({
                    email: TEST_USER_EMAIL,
                    senha: TEST_USER_PASSWORD
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Login bem-sucedido!');
            expect(response.body.redirectTo).toBe('/dashboard');
        });

        it('deve retornar erro 401 com senha incorreta', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({
                    email: TEST_USER_EMAIL,
                    senha: 'senha-totalmente-errada'
                });

            expect(response.statusCode).toBe(401);
            expect(response.body.message).toBe('Credenciais inválidas. Verifique seu email e senha.');
        });

        it('deve retornar erro 401 com email inexistente', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({
                    email: 'email.inexistente@teste.com',
                    senha: 'qualquer-senha'
                });

            expect(response.statusCode).toBe(401);
        });

        it('deve retornar erro 400 se a senha não for fornecida', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({ email: TEST_USER_EMAIL });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Email e senha são obrigatórios.');
        });

        it('deve retornar erro 400 se o email não for fornecido', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({ senha: TEST_USER_PASSWORD });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Email e senha são obrigatórios.');
        });
    });

    /**
     * @describe Testes para a rota: POST /esqueci-senha
     * @description Valida o processo de solicitação de redefinição de senha.
     */
    describe('POST /esqueci-senha', () => {
        it('deve retornar mensagem de sucesso para um email VÁLIDO para evitar enumeração de usuários', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/esqueci-senha`)
                .send({ email: TEST_USER_EMAIL });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Se este email estiver cadastrado, um link para redefinição de senha foi enviado.');
        });

        it('deve retornar a MESMA mensagem de sucesso para um email INVÁLIDO para evitar enumeração', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/esqueci-senha`)
                .send({ email: 'email.inexistente@teste.com' });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Se este email estiver cadastrado, um link para redefinição de senha foi enviado.');
        });

        it('deve retornar erro 400 se o campo de email não for fornecido', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/esqueci-senha`)
                .send({}); // Corpo vazio

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('O campo de email é obrigatório.');
        });
    });
});
