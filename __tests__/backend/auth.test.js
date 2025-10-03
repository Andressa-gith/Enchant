/**
 * @file Testes de integração para a API de Autenticação (/api/auth).
 * @description Testa os endpoints de login e recuperação de senha.
 */

import request from 'supertest';
import app from '../../backend/server.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/auth';

/**
 * @describe Testes para os endpoints da API de Autenticação.
 */
describe('Testes da API de Autenticação', () => {

    /**
     * @describe Testes para a rota POST /login
     */
    describe('POST /login', () => {
        it('deve autenticar com sucesso com credenciais válidas', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({
                    email: 'guilherme.oliver@ba.estudante.senai.br',
                    senha: 'G@123456'
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Login bem-sucedido!');
            expect(response.body.redirectTo).toBe('/dashboard');
        });

        it('deve retornar erro 401 com senha incorreta', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({
                    email: 'guilherme.oliver@ba.estudante.senai.br',
                    senha: 'senha-errada'
                });

            expect(response.statusCode).toBe(401);
            expect(response.body.message).toBe('Credenciais inválidas. Verifique seu email e senha.');
        });

        it('deve retornar erro 400 se faltar email ou senha', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/login`)
                .send({
                    email: 'guilherme.oliver@ba.estudante.senai.br'
                }); // Enviando sem a senha

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Email e senha são obrigatórios.');
        });
    });

    /**
     * @describe Testes para a rota POST /esqueci-senha
     */
    describe('POST /esqueci-senha', () => {
        it('deve sempre retornar uma mensagem de sucesso para evitar enumeração de usuários', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/esqueci-senha`)
                .send({
                    email: 'guilherme.oliver@ba.estudante.senai.br'
                });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Se este email estiver cadastrado, um link para redefinição de senha foi enviado.');
        });

        it('deve retornar erro 400 se o email não for fornecido', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/esqueci-senha`)
                .send({}); // Enviando corpo vazio

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('O campo de email é obrigatório.');
        });
    });

});