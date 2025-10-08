/**
 * @file Testes de integração para a API de Contratos (/api/contratos).
 * @description Esta suíte de testes cobre todas as operações CRUD para a entidade Contrato,
 * incluindo casos de sucesso, falhas esperadas e segurança de autenticação.
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Prefixo da API para as rotas de contrato
const API_PREFIX = '/api/contratos';

/**
 * @describe Suíte de testes para os endpoints da API de Contratos.
 */
describe('API de Contratos - Testes de Integração', () => {

    let token;
    let instituicaoId;
    let contratoCriado; // Armazena o contrato inteiro criado para limpeza e verificação

    /**
     * @beforeAll Executa uma vez antes de todos os testes da suíte.
     * @description Realiza a autenticação para obter um token JWT válido e o ID da instituição
     * que será usado em todas as requisições subsequentes.
     */
    beforeAll(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br', // Use um usuário de teste do seu ambiente
            password: 'G@123456' // Use uma senha de teste
        });

        if (error) {
            throw new Error(`Falha no setup de testes: Login não pôde ser realizado. ${error.message}`);
        }

        token = data.session.access_token;
        instituicaoId = data.user.id;
        expect(token).toBeDefined();
        expect(instituicaoId).toBeDefined();
    });
    
    /**
     * @afterAll Executa uma vez após todos os testes da suíte.
     * @description Realiza a limpeza dos recursos criados durante os testes (contrato no banco
     * e arquivo no Storage) para garantir a idempotência dos testes.
     */
    afterAll(async () => {
        if (contratoCriado) {
            // Limpa o arquivo do Storage
            await supabase.storage.from('contracts').remove([contratoCriado.caminho_arquivo]);
            // Limpa o registro do banco de dados
            await supabase.from('contrato').delete().eq('id', contratoCriado.id);
            console.log(`[TEARDOWN] Contrato de teste ID: ${contratoCriado.id} limpo com sucesso.`);
        }
    });

    /**
     * @describe Testes de Autenticação
     * @description Verifica se os endpoints estão devidamente protegidos, retornando 401
     * quando nenhum token de autenticação é fornecido.
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
            const response = await request(app).delete(`${API_PREFIX}/${uuidv4()}`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: GET /
     * @description Testa a listagem de contratos.
     */
    describe('GET / - Listar Contratos', () => {
        it('deve retornar uma lista de contratos da instituição autenticada', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    /**
     * @describe Testes para a rota: POST /
     * @description Testa a criação de um novo contrato.
     */
    describe('POST / - Criar Contrato', () => {
        it('deve criar um novo contrato com sucesso quando todos os dados são válidos', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('nome_contrato', 'Contrato de Teste via Jest')
                .field('descricao', 'Descrição do contrato de teste automatizado.')
                .field('ano_vigencia', new Date().getFullYear())
                .attach('arquivo_contrato', Buffer.from('conteudo do fake pdf para o teste'), 'contrato-teste.pdf');

            expect(response.statusCode).toBe(201);
            expect(response.body.message).toBe('Contrato adicionado com sucesso!');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.nome_contrato).toBe('Contrato de Teste via Jest');
            expect(response.body.data.instituicao_id).toBe(instituicaoId);

            // Guarda a referência do contrato criado para usar nos testes seguintes e na limpeza
            contratoCriado = response.body.data;
        });

        it('deve retornar erro 400 se o arquivo do contrato não for enviado', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .field('nome_contrato', 'Contrato Sem Arquivo')
                .field('ano_vigencia', 2025);

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Nenhum arquivo de contrato foi enviado.');
        });
    });
    
    /**
     * @describe Testes para a rota: GET / (após criação)
     * @description Verifica se o contrato recém-criado aparece na listagem.
     */
    describe('GET / - Verificar Contrato na Listagem', () => {
        it('deve incluir o contrato recém-criado na lista', async () => {
            // Garante que o teste de criação tenha rodado e criado um contrato
            expect(contratoCriado).toBeDefined();

            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            const contratoEncontrado = response.body.find(c => c.id === contratoCriado.id);
            expect(contratoEncontrado).toBeDefined();
            expect(contratoEncontrado.nome_contrato).toBe(contratoCriado.nome_contrato);
        });
    });


    /**
     * @describe Testes para a rota: DELETE /:id
     * @description Testa a exclusão de um contrato.
     */
    describe('DELETE /:id - Excluir Contrato', () => {
        it('deve excluir o contrato criado anteriormente com sucesso', async () => {
            expect(contratoCriado).toBeDefined();

            const response = await request(app)
                .delete(`${API_PREFIX}/${contratoCriado.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Contrato deletado com sucesso!');
        });

        it('deve retornar erro 404 ao tentar excluir um contrato que não existe', async () => {
            const idInexistente = uuidv4(); // Gera um ID válido, porém não existente no banco
            const response = await request(app)
                .delete(`${API_PREFIX}/${idInexistente}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(404);
            expect(response.body.message).toContain('Contrato não encontrado');
        });

        it('deve retornar erro 404 ao tentar excluir o mesmo contrato novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${contratoCriado.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(404);
        });
    });
});