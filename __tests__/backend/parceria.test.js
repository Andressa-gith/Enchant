/**
 * @file Testes de integração para a API de Parcerias (/api/parcerias).
 * @description Testa as operações CRUD para os parceiros.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/parcerias';

/**
 * @describe Testes para os endpoints da API de Parcerias.
 */
describe('Testes da API de Parcerias', () => {
    
    let token;
    let newParceriaId;
    const parceriasParaLimpar = [];

    /**
     * @beforeAll Autentica um usuário de teste antes de todos os testes.
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
     * @afterAll Limpa todos os dados de teste criados no banco.
     */
    afterAll(async () => {
        if (parceriasParaLimpar.length > 0) {
            const { error } = await supabase.from('parceiro').delete().in('id', parceriasParaLimpar);
            if (error) console.error('Falha na limpeza das parcerias de teste:', error);
            else console.log(`\n[LIMPEZA] Parcerias de teste removidas: ${parceriasParaLimpar.join(', ')}`);
        }
    });

    /**
     * @describe Testes para a rota POST / (Criação de Parceria).
     */
    describe('POST /', () => {
        it('deve criar uma nova parceria com sucesso', async () => {
            const response = await request(app)
                .post(API_PREFIX)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    nome: 'Parceiro de Teste Jest',
                    tipo_setor: 'Privado',
                    status: 'Ativo',
                    data_inicio: '2025-01-01',
                    objetivos: 'Testar a API'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            
            newParceriaId = response.body.data.id;
            parceriasParaLimpar.push(newParceriaId);
        });
    });

    /**
     * @describe Testes para a rota GET / (Listagem de Parcerias).
     */
    describe('GET /', () => {
        it('deve retornar a lista de parcerias do usuário autenticado', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const parceriaCriada = response.body.find(p => p.id === newParceriaId);
            expect(parceriaCriada).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota PUT /:id (Atualização de Parceria).
     */
    describe('PUT /:id', () => {
        it('deve atualizar uma parceria específica com sucesso', async () => {
            const response = await request(app)
                .put(`${API_PREFIX}/${newParceriaId}`) // Usando PUT como na sua rota
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

        it('deve retornar um erro 404 ao tentar atualizar uma parceria que não existe', async () => {
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
     * @describe Testes para a rota DELETE /:id (Exclusão de Parceria).
     */
    describe('DELETE /:id', () => {
        it('deve deletar a parceria criada', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newParceriaId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            
            // Remove da lista de limpeza, pois já foi deletado
            const index = parceriasParaLimpar.indexOf(newParceriaId);
            if (index > -1) parceriasParaLimpar.splice(index, 1);
        });

        it('deve retornar um erro 404 ao tentar deletar a mesma parceria novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/${newParceriaId}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });
    });
});