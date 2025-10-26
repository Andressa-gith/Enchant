/**
 * @file Testes de integração para a API de Auditorias (/api/auditorias).
 * @description Este arquivo testa todas as operações CRUD para a rota de auditorias,
 * garantindo que a autenticação, validação e manipulação de dados estejam funcionando.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/auditorias';

/**
 * @describe Testes para os endpoints da API de Auditorias.
 */
describe('Testes da API de Auditorias', () => {
    
    // Variáveis de escopo para compartilhar dados entre os testes.
    let token;          // Armazena o token JWT para autenticação.
    let newAuditoriaId; // Armazena o ID do recurso criado para ser usado em testes de update e delete.

    /**
     * @beforeAll Executa uma vez antes de todos os testes deste bloco.
     * Utilizado para autenticar um usuário de teste e obter um token JWT válido.
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
     * @describe Testes para a rota POST / (Criação de Auditoria).
     */
    describe('POST /', () => {
        it('deve criar uma nova auditoria com sucesso quando todos os dados são válidos', async () => {
            // Act: Executa a requisição para a API.
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Auditoria de Teste via Jest')
                .field('data_auditoria', '2025-01-01')
                .field('tipo', 'Auditoria interna')
                .field('status', 'Aprovado')
                .attach('arquivo_auditoria', Buffer.from('conteudo do fake pdf'), 'relatorio-teste.pdf');

            // Assert: Verifica se a resposta está correta.
            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.titulo).toBe('Auditoria de Teste via Jest');

            // Guarda o ID para os próximos testes, garantindo a sequência e limpeza.
            newAuditoriaId = response.body.data.id;
        });

        it('deve retornar um erro 400 se o arquivo não for enviado', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Auditoria Sem Arquivo');
            
            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota GET / (Listagem de Auditorias).
     */
    describe('GET /', () => {
        it('deve retornar a lista de auditorias do usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            // Verifica se a auditoria criada no teste anterior existe na lista.
            const auditoriaCriada = response.body.find(a => a.id === newAuditoriaId);
            expect(auditoriaCriada).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota PATCH /:id/status (Atualização de Status).
     */
    describe('PATCH /:id/status', () => {
        it('deve atualizar o status de uma auditoria específica com sucesso', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/${newAuditoriaId}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Em andamento' });

            expect(response.statusCode).toBe(200);
            expect(response.body.data.status).toBe('Em andamento');
        });

        it('deve retornar um erro 404 ao tentar atualizar uma auditoria que não existe', async () => {
            const response = await request(app)
                .patch(`${API_PREFIX}/999999/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'Em andamento' });

            expect(response.statusCode).toBe(404);
        });
    });

    /**
     * @describe Testes para a rota DELETE /:id (Exclusão de Auditoria).
     */
    describe('DELETE /:id', () => {
        it('deve deletar a auditoria criada nos testes anteriores', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newAuditoriaId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
        });

        it('deve retornar um erro 404 ao tentar deletar a mesma auditoria novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newAuditoriaId}`)
                .set('Authorization', `Bearer ${token}`);

            // Esperamos 404 pois o controller agora é robusto e verifica se o item existe antes de deletar.
            expect(response.statusCode).toBe(404);
        });
    });
});