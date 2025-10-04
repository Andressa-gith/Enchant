/**
 * @file Testes de integração para a API de Doações (/api/doacao).
 * @description Testa os endpoints de registro de entrada e saída de doações.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/doacao';

/**
 * @describe Testes para os endpoints da API de Doações.
 */
describe('Testes da API de Doações', () => {
    
    let token;
    let newEntradaId; // ID da doação de entrada que vamos criar e usar nos testes.
    let categoriaId;  // ID de uma categoria real do banco para usar nos testes.

    /**
     * @beforeAll Roda uma vez antes de todos os testes.
     * Autentica o usuário e busca o ID de uma categoria para ser usado na criação de doações.
     */
    beforeAll(async () => {
        // Autenticação
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });
        if (authError) throw new Error(`Setup de teste falhou no login: ${authError.message}`);
        token = authData.session.access_token;
        expect(token).toBeDefined();

        // Busca de uma categoria para usar nos testes
        const { data: catData, error: catError } = await supabase.from('categoria').select('id').eq('nome', 'Alimentos').single();
        if (catError || !catData) throw new Error('Setup de teste falhou: Categoria "Alimentos" não encontrada.');
        categoriaId = catData.id;
    });

    /**
     * @afterAll Roda uma vez depois de todos os testes.
     * Usado para limpar os dados de teste criados no banco de dados.
     */
    afterAll(async () => {
        if (newEntradaId) {
            // Limpa a doação de entrada criada. Se houver CASCADE no banco, as saídas relacionadas também serão limpas.
            await supabase.from('doacao_entrada').delete().eq('id', newEntradaId);
            console.log(`\n[LIMPEZA] Doação de teste ID: ${newEntradaId} removida.`);
        }
    });

    /**
     * @describe Testes para a rota POST /registrar-doacao
     */
    describe('POST /registrar-doacao', () => {
        it('deve registrar uma nova doação de entrada com sucesso', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-doacao`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    categoria_id: categoriaId,
                    quantidade: 100,
                    qualidade: 'Novo',
                    doador_origem_texto: 'Doador de Teste'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('id');
            
            // Guarda o ID para o teste de retirada e para a limpeza no afterAll
            newEntradaId = response.body.id;
        });

        it('deve retornar erro 400 se faltarem dados obrigatórios', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-doacao`)
                .set('Authorization', `Bearer ${token}`)
                .send({ quantidade: 50 }); // Sem categoria_id

            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota POST /registrar-retirada
     */
    describe('POST /registrar-retirada', () => {
        it('deve registrar uma retirada com sucesso de uma doação existente', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    entrada_id: newEntradaId, // Usa a doação que acabamos de criar
                    quantidade_retirada: 10,
                    destinatario: 'Beneficiário de Teste'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.quantidade_retirada).toBe(10);
        });

        it('deve retornar erro 400 ao tentar retirar uma quantidade maior que a disponível', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    entrada_id: newEntradaId,
                    quantidade_retirada: 9999, // Quantidade obviamente maior que o estoque
                    destinatario: 'Beneficiário de Teste'
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('maior que o estoque disponível');
        });

        it('deve retornar erro 404 ao tentar retirar de uma doação que não existe', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/registrar-retirada`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    entrada_id: 999999,
                    quantidade_retirada: 1,
                    destinatario: 'Beneficiário de Teste'
                });

            expect(response.statusCode).toBe(404);
        });
    });
});