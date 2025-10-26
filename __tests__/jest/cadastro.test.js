/**
 * @file Testes de integração para a API de Cadastro de Instituição (/api/user/cadastro).
 * @description Testa o fluxo completo de criação de usuário, incluindo validações de entrada,
 * tratamento de emails duplicados e a crucial lógica de rollback em caso de falhas.
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';
import supabaseAdmin from '../../backend/db/supabaseAdmin.js';

// Define o prefixo da API para reutilização nos testes.
const API_PREFIX = '/api/user';

/**
 * @describe Suíte de testes para o endpoint de Cadastro de Instituição.
 */
describe('API de Cadastro - /api/user/cadastro', () => {
    
    // Armazena os IDs de todos os usuários criados com sucesso para limpeza no final.
    const usuariosParaLimpar = [];

    // Dados base para o cadastro, com um email que será único a cada execução.
    const emailUnico = `teste.jest.${Date.now()}@exemplo.com`;
    const dadosCadastroBase = {
        email_contato: emailUnico,
        senha: 'PasswordSegura123!',
        nome_instituicao: 'Instituição de Teste via Jest',
        cnpj: '00.000.000/0001-00',
        tipo_instituicao: 'ONG',
        numero: '71999998888',
        cep: '41000-000',
        bairro: 'Bairro dos Testes',
        cidade: 'Jest City',
        estado: 'JS'
    };

    /**
     * @afterAll Garante que todos os usuários de teste criados no Supabase Auth sejam deletados,
     * mantendo o ambiente de teste limpo.
     */
    afterAll(async () => {
        if (usuariosParaLimpar.length > 0) {
            console.log(`\n[TEARDOWN] Limpando ${usuariosParaLimpar.length} usuários de teste do Supabase Auth...`);
            for (const userId of usuariosParaLimpar) {
                const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
                if (error) {
                    console.error(`[TEARDOWN] Falha ao deletar usuário de teste ${userId}:`, error.message);
                }
            }
        }
    });

    /**
     * @describe Teste para o cenário de sucesso (Happy Path).
     */
    describe('Cenário de Sucesso', () => {
        it('deve criar uma nova instituição com sucesso quando todos os dados são válidos', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send(dadosCadastroBase);

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('userId');
            
            // Adiciona o ID do usuário à lista de limpeza.
            if(response.body.userId) {
                usuariosParaLimpar.push(response.body.userId);
            }
        });
    });

    /**
     * @describe Testes para cenários de validação e conflito de dados.
     */
    describe('Cenários de Validação e Conflito', () => {
        it('deve retornar erro 409 ao tentar cadastrar um email que já existe', async () => {
            // Este teste depende do teste de sucesso ter sido executado antes com o mesmo email.
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send(dadosCadastroBase);

            expect(response.statusCode).toBe(409);
            expect(response.body.message).toBe('Este endereço de email já está cadastrado.');
        });

        it('deve retornar erro 400 se faltarem campos obrigatórios (ex: senha)', async () => {
            const { senha, ...dadosIncompletos } = dadosCadastroBase;
            dadosIncompletos.email_contato = `teste-incompleto.${Date.now()}@exemplo.com`;

            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send(dadosIncompletos);
            
            expect(response.statusCode).toBe(400);
            expect(response.body.message).toContain('Email, senha e nome da instituição são obrigatórios.');
        });
    });

    /**
     * @describe Testes para o cenário de falha com rollback automático.
     */
    describe('Cenários de Falha com Rollback', () => {
        
        // Função auxiliar para restaurar mocks do jest
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('deve fazer rollback (deletar user do Auth) se a inserção de ENDEREÇO falhar', async () => {
            // Arrange: Simula um erro na inserção na tabela 'endereco'
            jest.spyOn(supabase, 'from').mockImplementation((tableName) => {
                if (tableName === 'endereco') {
                    return { insert: jest.fn().mockReturnValue({ error: new Error('Erro forçado na tabela de endereço!') }) };
                }
                // Chama a implementação original para qualquer outra tabela
                return jest.requireActual('../../backend/db/supabaseClient.js').default.from(tableName);
            });

            const emailRollback = `teste-rollback-endereco.${Date.now()}@exemplo.com`;
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send({ ...dadosCadastroBase, email_contato: emailRollback });
            
            // Assert: A API deve retornar erro 500
            expect(response.statusCode).toBe(500);

            // Assert: O usuário criado no Auth deve ter sido deletado pelo rollback
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const usuarioOrfao = data.users.find(u => u.email === emailRollback);
            expect(usuarioOrfao).toBeUndefined();
        });

        it('deve fazer rollback (deletar user do Auth) se a inserção de TELEFONE falhar', async () => {
            // Arrange: Simula um erro na inserção na tabela 'telefone'
            jest.spyOn(supabase, 'from').mockImplementation((tableName) => {
                if (tableName === 'telefone') {
                    return { insert: jest.fn().mockReturnValue({ error: new Error('Erro forçado na tabela de telefone!') }) };
                }
                return jest.requireActual('../../backend/db/supabaseClient.js').default.from(tableName);
            });

            const emailRollback = `teste-rollback-telefone.${Date.now()}@exemplo.com`;
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send({ ...dadosCadastroBase, email_contato: emailRollback });
            
            // Assert: A API deve retornar erro 500
            expect(response.statusCode).toBe(500);

            // Assert: O usuário criado no Auth deve ter sido deletado pelo rollback
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const usuarioOrfao = data.users.find(u => u.email === emailRollback);
            expect(usuarioOrfao).toBeUndefined();
        });
    });
});
