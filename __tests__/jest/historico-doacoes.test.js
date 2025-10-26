/**
 * @file Testes de integração para a API de Histórico de Doações (/api/historico-doacoes).
 * @description Testa os endpoints de CRUD para registros de relatórios salvos, a busca de dados
 * para PDF com filtros, e a segurança de autenticação das rotas.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/historico-doacoes';

/**
 * @describe Suíte de testes para os endpoints da API de Histórico de Doações.
 */
describe('API de Histórico de Doações - Testes de Integração', () => {
    
    let token;
    let relatorioPrincipalId; // Armazena o ID do relatório criado para usar em outros testes.
    const relatoriosParaLimpar = [];

    /**
     * @beforeAll Executa uma vez antes de todos os testes.
     * @description Autentica um usuário de teste para obter um token JWT válido.
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
     * @afterAll Executa uma vez depois de todos os testes.
     * @description Limpa todos os registros de relatórios criados durante a suíte de testes.
     */
    afterAll(async () => {
        if (relatoriosParaLimpar.length > 0) {
            const { error } = await supabase.from('relatorio_doacao').delete().in('id', relatoriosParaLimpar);
            if (error) {
                console.error('Falha na limpeza dos relatórios de teste:', error);
            } else {
                console.log(`\n[TEARDOWN] ${relatoriosParaLimpar.length} relatórios de teste foram limpos.`);
            }
        }
    });

    /**
     * @describe Testes de Segurança e Autenticação
     * @description Verifica se os endpoints estão protegidos e retornam 401 sem token.
     */
    describe('Segurança e Autenticação', () => {
        it('GET /relatorios-salvos - deve retornar 401 se não houver token', async () => {
            const response = await request(app).get(`${API_PREFIX}/relatorios-salvos`);
            expect(response.statusCode).toBe(401);
        });
        it('POST /adicionar - deve retornar 401 se não houver token', async () => {
            const response = await request(app).post(`${API_PREFIX}/adicionar`);
            expect(response.statusCode).toBe(401);
        });
        it('GET /dados-pdf - deve retornar 401 se não houver token', async () => {
            const response = await request(app).get(`${API_PREFIX}/dados-pdf`);
            expect(response.statusCode).toBe(401);
        });
        it('DELETE /deletar/:id - deve retornar 401 se não houver token', async () => {
            const response = await request(app).delete(`${API_PREFIX}/deletar/999999`);
            expect(response.statusCode).toBe(401);
        });
    });

    /**
     * @describe Testes para a rota: POST /adicionar
     * @description Testa a criação de um novo registro de relatório.
     */
    describe('POST /adicionar - Criar Registro de Relatório', () => {
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
                    caminho_arquivo_pdf: 'test-results/relatorio-geral.pdf'
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.relatorio).toHaveProperty('id');
            
            relatorioPrincipalId = response.body.relatorio.id;
            relatoriosParaLimpar.push(relatorioPrincipalId);
        });

        it('deve retornar erro 400 se o caminho do PDF não for enviado', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/adicionar`)
                .set('Authorization', `Bearer ${token}`)
                .send({ responsavel: 'Tester' }); // Corpo incompleto

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('O caminho do arquivo PDF é obrigatório.');
        });
    });

    /**
     * @describe Testes para a rota: GET /relatorios-salvos
     * @description Testa a listagem de relatórios salvos.
     */
    describe('GET /relatorios-salvos - Listar Relatórios', () => {
        it('deve retornar a lista de relatórios salvos, incluindo o recém-criado', async () => {
            expect(relatorioPrincipalId).toBeDefined();

            const response = await request(app)
                .get(`${API_PREFIX}/relatorios-salvos`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.relatorios)).toBe(true);
            const relatorioCriado = response.body.relatorios.find(r => r.id === relatorioPrincipalId);
            expect(relatorioCriado).toBeDefined();
        });
    });

    /**
     * @describe Testes para a rota: GET /dados-pdf
     * @description Testa a busca de dados para geração de PDF, incluindo filtros.
     */
    describe('GET /dados-pdf - Buscar Dados para PDF', () => {
        it('deve retornar dados de entrada e saída com filtros de data válidos', async () => {
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
        });
        
        it('deve filtrar os dados por categoria corretamente', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/dados-pdf`)
                .set('Authorization', `Bearer ${token}`)
                .query({
                    data_inicio_filtro: '2025-01-01',
                    data_fim_filtro: '2025-01-31',
                    categoria_filtro: 'Alimentos'
                });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            // Poderíamos adicionar mais asserções aqui se tivéssemos dados controlados no DB
            // Por exemplo: verificar se todas as entradas retornadas são da categoria "Alimentos".
        });

        it('deve retornar erro 400 se as datas de filtro não forem fornecidas', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/dados-pdf`)
                .set('Authorization', `Bearer ${token}`)
                .query({}); // Sem filtros

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe('Datas de início e fim são obrigatórias.');
        });
    });

    /**
     * @describe Testes para a rota: DELETE /deletar/:id
     * @description Testa a exclusão de um registro de relatório.
     */
    describe('DELETE /deletar/:id - Excluir Relatório', () => {
        it('deve excluir o relatório criado com sucesso', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/deletar/${relatorioPrincipalId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('deve retornar erro 404 ao tentar excluir o mesmo relatório novamente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/deletar/${relatorioPrincipalId}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });

        it('deve retornar erro 404 ao tentar excluir um relatório com ID inexistente', async () => {
            const response = await request(app)
                .delete(`${API_PREFIX}/deletar/999999`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(404);
        });
    });
});
