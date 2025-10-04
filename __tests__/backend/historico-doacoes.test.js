/**
 * @file Testes de integração para a API de Histórico de Doações (/api/historico-doacoes).
 * @description Testa os endpoints de CRUD para relatórios de doações salvos e a busca de dados para PDF.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/historico-doacoes';

/**
 * @describe Testes para os endpoints da API de Histórico de Doações.
 */
describe('Testes da API de Histórico de Doações', () => {
    
    let token;
    let newRelatorioId; // Armazena o ID do relatório criado para usar nos outros testes.
    const relatoriosParaLimpar = [];

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
        if (relatoriosParaLimpar.length > 0) {
            const { error } = await supabase.from('relatorio_doacao').delete().in('id', relatoriosParaLimpar);
            if (error) console.error('Falha na limpeza dos relatórios de teste:', error);
            else console.log(`\n[LIMPEZA] Relatórios de teste removidos: ${relatoriosParaLimpar.join(', ')}`);
        }
    });

    /**
     * @describe Testes para a rota POST /adicionar (Criação de Registro de Relatório).
     */
    describe('POST /adicionar', () => {
        it('deve criar um novo registro de relatório com sucesso', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/adicionar`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    responsavel: 'Tester Jest',
                    data_inicio_filtro: '2025-01-01',
                    data_fim_filtro: '2025-01-31',
                    frequencia_filtro: 'Mensal',
                    categoria_filtro: 'Geral',
                    caminho_arquivo_pdf: 'test-path/relatorio.pdf'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.relatorio).toHaveProperty('id');
            
            newRelatorioId = response.body.relatorio.id;
            relatoriosParaLimpar.push(newRelatorioId);
        });

        it('deve retornar erro 400 se o caminho do PDF não for enviado', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/adicionar`)
                .set('Authorization', `Bearer ${token}`)
                .send({ responsavel: 'Tester' }); // Corpo incompleto

            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota GET /relatorios-salvos (Listagem de Relatórios).
     */
    describe('GET /relatorios-salvos', () => {
        it('deve retornar a lista de relatórios salvos', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/relatorios-salvos`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.relatorios)).toBe(true);
            const relatorioCriado = response.body.relatorios.find(r => r.id === newRelatorioId);
            expect(relatorioCriado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota GET /dados-pdf (Busca de dados com filtro).
     */
    describe('GET /dados-pdf', () => {
        it('deve retornar os dados de entrada e saída com filtros válidos', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/dados-pdf`)
                .set('Authorization', `Bearer ${token}`)
                .query({
                    data_inicio_filtro: '2025-01-01',
                    data_fim_filtro: '2025-01-31'
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('entradas');
            expect(response.body).toHaveProperty('saidas');
            expect(Array.isArray(response.body.entradas)).toBe(true);
        });

        it('deve retornar erro 400 se as datas de filtro não forem fornecidas', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/dados-pdf`)
                .set('Authorization', `Bearer ${token}`)
                .query({}); // Sem filtros

            expect(response.statusCode).toBe(400);
        });
    });

    /**
     * @describe Testes para a rota DELETE /deletar/:id (Exclusão de Relatório).
     */
    describe('DELETE /deletar/:id', () => {
        it('deve deletar o relatório criado', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/deletar/${newRelatorioId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('deve retornar erro 404 ao tentar deletar o mesmo relatório novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/deletar/${newRelatorioId}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });
    });
});