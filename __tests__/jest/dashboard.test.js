/**
 * @file Testes de integração para a API do Dashboard (/api/dashboard).
 * @description Esta suíte valida os endpoints que consolidam e retornam dados para a
 * interface principal do dashboard, incluindo a rota principal, atividades e alertas.
 * Este teste é 100% independente: ele cria seus próprios dados e os limpa no final.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';

const API_PREFIX = '/api/dashboard';

describe('API do Dashboard - Testes de Integração', () => {

    let token;
    let testUserId;
    let categoriaId;
    let entradaId;
    let saidaId;

    /**
     * @beforeAll Prepara o ambiente para os testes.
     * @description Realiza login, obtém o ID do usuário e cria os dados necessários 
     * (categoria e doações) para que os testes do dashboard funcionem de forma isolada.
     */
    beforeAll(async () => {
        // 1. Login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'guilherme.oliver@ba.estudante.senai.br',
            password: 'G@123456'
        });
        if (authError) throw new Error(`Setup de teste falhou: Login não pôde ser realizado. ${authError.message}`);
        token = authData.session.access_token;
        testUserId = authData.user.id;
        expect(token).toBeDefined();

        // 2. Garante que a categoria "Alimentos" existe e pega o ID dela
        let { data: catData, error: catError } = await supabase.from('categoria').select('id').eq('nome', 'Alimentos').single();
        if (catError && catError.code === 'PGRST116') { // Se não existe, cria
            const { data, error } = await supabase.from('categoria').insert({ nome: 'Alimentos' }).select('id').single();
            if (error) throw new Error("Falha ao criar categoria de teste.");
            catData = data;
        }
        categoriaId = catData.id;

        // 3. Cria uma doação de ENTRADA para o teste
        const { data: entradaData, error: entradaError } = await supabase
            .from('doacao_entrada')
            .insert({
                instituicao_id: testUserId,
                categoria_id: categoriaId,
                quantidade: 100,
                doador_origem_texto: 'Doador de Teste do Dashboard'
            })
            .select('id')
            .single();
        if (entradaError) throw new Error(`Falha ao criar doação de entrada para o teste: ${entradaError.message}`);
        entradaId = entradaData.id;

        // 4. Cria uma doação de SAÍDA para o teste
        const { error: saidaError } = await supabase
            .from('doacao_saida')
            .insert({
                instituicao_id: testUserId,
                entrada_id: entradaId,
                quantidade_retirada: 20,
                destinatario: 'Beneficiário de Teste do Dashboard'
            });
        if (saidaError) throw new Error(`Falha ao criar doação de saída para o teste: ${saidaError.message}`);
    });

    /**
     * @afterAll Limpa o ambiente após a execução de todos os testes.
     * @description Deleta os dados de teste (saídas e entradas de doação) para não sujar o banco.
     */
    afterAll(async () => {
        console.log('--- FAXINEIRO (Dashboard): Limpando dados de teste... ---');
        // 1. Deleta a saída (filho)
        if (saidaId) {
            await supabase
                .from('doacao_saida')
                .delete()
                .eq('id', saidaId);
        }

        // 2. Deleta a entrada (pai)
        if (entradaId) {
            await supabase
                .from('doacao_entrada')
                .delete()
                .eq('id', entradaId);
        }
    });


    describe('Segurança e Autenticação', () => {
        it('GET / - deve retornar 401 para usuário não autenticado', async () => {
            const response = await request(app).get(API_PREFIX);
            expect(response.statusCode).toBe(401);
        });

        it('GET /atividades - deve retornar 401 para usuário não autenticado', async () => {
            const response = await request(app).get(`${API_PREFIX}/atividades`);
            expect(response.statusCode).toBe(401);
        });

        it('GET /alertas - deve retornar 401 para usuário não autenticado', async () => {
            const response = await request(app).get(`${API_PREFIX}/alertas`);
            expect(response.statusCode).toBe(401);
        });
    });

    describe('GET / - Dados Principais do Dashboard', () => {
        it('deve retornar a estrutura de dados completa e valores corretos com base nos dados de teste', async () => {
            const response = await request(app)
                .get(API_PREFIX)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);

            // Validações de estrutura
            expect(response.body).toHaveProperty('kpis');
            expect(response.body).toHaveProperty('graficos');
            expect(response.body).toHaveProperty('atividades');
            
            // Validações de valores, com base nos dados que CRIAMOS
            // Esperamos 100 - 20 = 80 itens no estoque de "Alimentos"
            expect(response.body.kpis.totalItensEstoque).toBeGreaterThanOrEqual(80);
            expect(response.body.totaisPorCategoria['Alimentos']).toBeGreaterThanOrEqual(80);
        });

        it('deve retornar dados filtrados ao passar startDate e endDate', async () => {
            const hoje = new Date().toISOString().split('T')[0];
            const response = await request(app)
                .get(`${API_PREFIX}?startDate=${hoje}&endDate=${hoje}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('kpis');
            // Como criamos os dados hoje, o estoque DEVE ser encontrado
            expect(response.body.kpis.totalItensEstoque).toBeGreaterThanOrEqual(80);
        });
        
        it('deve retornar erro 500 se o formato da data no filtro for inválido', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}?startDate=data-invalida`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.statusCode).toBe(500);
            expect(response.body.message).toBe('Erro interno ao buscar dados do dashboard.');
        });
    });

    describe('GET /atividades - Lista Completa de Atividades', () => {
        it('deve retornar uma lista de atividades e encontrar a doação de teste', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/atividades`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            const atividadeEntrada = response.body.find(a => a.desc.includes('Doador de Teste do Dashboard'));
            expect(atividadeEntrada).toBeDefined();

            const atividadeSaida = response.body.find(a => a.desc.includes('Beneficiário de Teste do Dashboard'));
            expect(atividadeSaida).toBeDefined();
        });
    });

    describe('GET /alertas - Lista Completa de Alertas', () => {
        it('deve retornar uma lista de alertas com a estrutura correta', async () => {
            const response = await request(app)
                .get(`${API_PREFIX}/alertas`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.statusCode).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('tipo');
                expect(response.body[0]).toHaveProperty('texto');
            }
        });
    });
});