/**
 * @file Testes de integração para a API de Doações (/api/doacao).
 * @description Esta suíte de testes valida os endpoints de registro de entrada (única e múltipla)
 * e de saída de doações, incluindo validações de estoque e segurança.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/doacao';

/**
 * @describe Suíte de testes para os endpoints da API de Doações.
 */
describe('API de Doações - Testes de Integração', () => {

    let token;
    let instituicaoId;
    let categoriaId; // ID de uma categoria real do banco para usar nos testes.
    let entradaUnicaId; // ID da doação de entrada única para usar nos testes de retirada.
    let multiplasEntradasIds = []; // Array para guardar IDs das doações múltiplas para limpeza.

    /**
     * @beforeAll Roda uma vez antes de todos os testes.
     * @description Autentica o usuário e busca o ID de uma categoria para ser usado na criação de doações.
     */
    beforeAll(async () => {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });
        if (authError) throw new Error(`Setup de teste falhou no login: ${authError.message}`);
        token = authData.session.access_token;
        instituicaoId = authData.user.id;
        expect(token).toBeDefined();

        const { data: catData, error: catError } = await supabase.from('categoria').select('id').eq('nome', 'Alimentos').single();
        if (catError || !catData) throw new Error('Setup de teste falhou: Categoria "Alimentos" não encontrada.');
        categoriaId = catData.id;
    });

    /**
     * @afterAll Roda uma vez depois de todos os testes.
     * @description Limpa todos os dados de teste (entradas únicas e múltiplas) criados no banco.
     */
    afterAll(async () => {
        const idsParaDeletar = [];
        if (entradaUnicaId) idsParaDeletar.push(entradaUnicaId);
        if (multiplasEntradasIds.length > 0) idsParaDeletar.push(...multiplasEntradasIds);

        if (idsParaDeletar.length > 0) {
            // Limpa as saídas primeiro para evitar violação de chave estrangeira
            await supabase.from('doacao_saida').delete().in('entrada_id', idsParaDeletar);
            // Depois limpa as entradas
            await supabase.from('doacao_entrada').delete().in('id', idsParaDeletar);
            console.log(`\n[TEARDOWN] ${idsParaDeletar.length} doações de teste foram limpas.`);
        }
    });
    
    /**
     * @describe Testes de Segurança e Autenticação
     * @description Verifica se os endpoints estão protegidos e retornam 401 sem token.
     */
    describe('Segurança e Autenticação', () => {
        it('/registrar-doacao - deve retornar 401 se não houver token', async () => {
            const response = await request(app).post(`${API_PREFIX}/registrar-doacao`);
            expect(response.statusCode).toBe(401);
        });

        it('/registrar-multiplas - deve retornar 401 se não houver token', async () => {
            const response = await request(app).post(`${API_PREFIX}/registrar-multiplas`);
            expect(response.statusCode).toBe(401);
        });

        it('/registrar-retirada - deve retornar 401 se não houver token', async () => {
            const response = await request(app).post(`${API_PREFIX}/registrar-retirada`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: POST /registrar-doacao
     * @description Valida o registro de uma única entrada de doação.
     */
    describe('POST /registrar-doacao - Registrar Entrada Única', () => {
        it('deve registrar uma nova doação com sucesso', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-doacao`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    categoria_id: categoriaId,
                    quantidade: 100,
                    qualidade: 'Novo',
                    doador_origem_texto: 'Doador de Teste Único'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.quantidade).toBe(100);
            
            entradaUnicaId = response.body.id;
        });

        it('deve retornar erro 400 se faltarem dados obrigatórios', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-doacao`)
                .set('Authorization', `Bearer ${token}`)
                .send({ quantidade: 50 }); // Sem categoria_id

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('Dados incompletos');
        });
    });
    
    /**
     * @describe Testes para a rota: POST /registrar-multiplas
     * @description Valida o registro de múltiplas entradas de doação ("carrinho").
     */
    describe('POST /registrar-multiplas - Registrar Múltiplas Entradas', () => {
        it('deve registrar múltiplas doações com sucesso', async () => {
            const doacoes = [
                { categoria_id: categoriaId, quantidade: 20, qualidade: 'Usado - Bom estado', doador_origem_texto: 'Doador Múltiplo 1', data_entrada: new Date().toISOString() },
                { categoria_id: categoriaId, quantidade: 30, qualidade: 'Novo', doador_origem_texto: 'Doador Múltiplo 2', data_entrada: new Date().toISOString() }
            ];
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-multiplas`)
                .set('Authorization', `Bearer ${token}`)
                .send(doacoes);
            
            expect(response.statusCode).toBe(201);
            expect(response.body.message).toBe('2 doações registradas com sucesso!');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(2);
            
            multiplasEntradasIds = response.body.data.map(d => d.id);
        });

        it('deve retornar erro 400 se o corpo for um array vazio', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-multiplas`)
                .set('Authorization', `Bearer ${token}`)
                .send([]);
            
            expect(response.statusCode).toBe(400);
        });

        it('deve retornar erro 400 se o corpo não for um array', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-multiplas`)
                .set('Authorization', `Bearer ${token}`)
                .send({ not: 'an array' });
            
            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota: POST /registrar-retirada
     * @description Valida o registro de uma saída de doação e as regras de estoque.
     */
    describe('POST /registrar-retirada - Registrar Saída', () => {
        it('deve registrar uma retirada com sucesso', async () => {
            expect(entradaUnicaId).toBeDefined(); // Garante que a doação de entrada existe
            
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    entrada_id: entradaUnicaId,
                    quantidade_retirada: 10,
                    destinatario: 'Beneficiário de Teste'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.quantidade_retirada).toBe(10);
        });

        it('deve retornar erro 400 ao tentar retirar mais do que o disponível', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({ entrada_id: entradaUnicaId, quantidade_retirada: 9999 });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('maior que o estoque disponível');
        });

        it('deve retornar erro 400 ao tentar retirar uma quantidade zero ou negativa', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({ entrada_id: entradaUnicaId, quantidade_retirada: 0 });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('maior que zero');
        });

        it('deve retornar erro 404 ao tentar retirar de uma entrada que não existe', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({ entrada_id: 999999, quantidade_retirada: 1 });

            expect(response.statusCode).toBe(404);
        });
    });
});
