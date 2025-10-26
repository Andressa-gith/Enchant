/**
 * @file Testes de integração para a API de Documentos Comprobatórios (/api/documentos).
 * @description Testa as operações de criação, listagem e exclusão de documentos.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/documentos';

/**
 * @describe Testes para os endpoints da API de Documentos.
 */
describe('Testes da API de Documentos', () => {
    
    let token;
    let newDocumentoId;

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
     * @describe Testes para a rota POST / (Criação de Documento).
     */
    describe('POST /', () => {
        it('deve criar um novo documento com sucesso', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Recibo de Teste via Jest')
                .field('tipo_documento', 'Recibo de doação')
                .field('valor', 150.75)
                .attach('arquivo_documento', Buffer.from('conteudo do fake pdf'), 'recibo-teste.pdf');

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.titulo).toBe('Recibo de Teste via Jest');

            newDocumentoId = response.body.data.id;
        });

        it('deve retornar um erro 400 se o arquivo não for enviado', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Documento Sem Arquivo');
            
            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota GET / (Listagem de Documentos).
     */
    describe('GET /', () => {
        it('deve retornar a lista de documentos do usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const documentoCriado = response.body.find(d => d.id === newDocumentoId);
            expect(documentoCriado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota PUT /:id (Atualização de Documento).
     */
    describe('PUT /:id', () => {
        it('deve atualizar apenas o título e o valor de um documento (sem enviar novo arquivo)', async () => {
            const response = await request(app)
                .put(`${API_PREFIX}/${newDocumentoId}`)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Título Atualizado (Texto)')
                .field('valor', 200.50);

            expect(response.statusCode).toBe(200);
            expect(response.body.data.titulo).toBe('Título Atualizado (Texto)');
            expect(response.body.data.valor).toBe(200.50);
        });

        it('deve atualizar o título e substituir o arquivo de um documento', async () => {
            const response = await request(app)
                .put(`${API_PREFIX}/${newDocumentoId}`)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Título Atualizado (Com Arquivo)')
                .field('valor', 300.00)
                .attach('arquivo_documento', Buffer.from('novo conteudo'), 'arquivo-novo.pdf');

            expect(response.statusCode).toBe(200);
            expect(response.body.data.titulo).toBe('Título Atualizado (Com Arquivo)');
            // Verifica se o caminho do arquivo foi atualizado para o novo nome
            expect(response.body.data.caminho_arquivo).toContain('arquivo-novo.pdf');
        });

        it('deve retornar um erro 404 ao tentar atualizar um documento que não existe', async () => {
            const response = await request(app)
                .put(`${API_PREFIX}/999999`)
                .set('Authorization', `Bearer ${token}`)
                .field('titulo', 'Documento Fantasma')
                .field('valor', 0);
            
            expect(response.statusCode).toBe(404);
        });
    });

    /**
     * @describe Testes para a rota DELETE /:id (Exclusão de Documento).
     */
    describe('DELETE /:id', () => {
        it('deve deletar o documento criado nos testes anteriores', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newDocumentoId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
        });

        it('deve retornar um erro 404 ao tentar deletar o mesmo documento novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newDocumentoId}`)
                .set('Authorization', `Bearer ${token}`);

            // Esperamos 404 pois o controller foi corrigido para tratar este caso.
            expect(response.statusCode).toBe(404);
        });
    });
});