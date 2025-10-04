/**
 * @file Testes de integração para a API de Cadastro de Instituição (/api/user/cadastro).
 * @description Testa o fluxo de criação de usuário, incluindo validações e a lógica de rollback.
 */

import request from 'supertest';
import app from '../../backend/server.js';
import supabase from '../../backend/db/supabaseClient.js';
import supabaseAdmin from '../../backend/db/supabaseAdmin.js';
import { jest } from '@jest/globals';

const API_PREFIX = '/api/user';

/**
 * @describe Testes para o endpoint de Cadastro de Instituição.
 */
describe('Testes da API de Cadastro', () => {
    
    const usuariosParaLimpar = []; // Lista de IDs de usuários criados para limpar no final

    /**
     * @afterAll Garante que todos os usuários de teste criados no Auth sejam deletados.
     */
    afterAll(async () => {
        if (usuariosParaLimpar.length > 0) {
            console.log('\n[LIMPEZA] Deletando usuários de teste do Supabase Auth...');
            for (const userId of usuariosParaLimpar) {
                const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
                if (error) {
                    console.error(`Falha ao deletar usuário de teste ${userId}:`, error.message);
                }
            }
        }
    });

    /**
     * @describe Testes para a rota POST /cadastro
     */
    describe('POST /cadastro', () => {

        const emailUnico = `teste-${Date.now()}@jest.com`;
        const dadosCadastro = {
            email_contato: emailUnico,
            senha: 'Password123',
            nome_instituicao: 'Instituição de Teste Jest',
            cnpj: '00.000.000/0001-00',
            tipo_instituicao: 'ONG',
            numero: '71999999999',
            cep: '40000-000',
            bairro: 'Bairro Teste',
            cidade: 'Cidade Teste',
            estado: 'BA'
        };

        it('deve criar uma nova instituição com sucesso (Happy Path)', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send(dadosCadastro);

            expect(response.statusCode).toBe(201);
            expect(response.body).toHaveProperty('userId');
            
            // Adiciona o ID do usuário à lista de limpeza
            if(response.body.userId) {
                usuariosParaLimpar.push(response.body.userId);
            }
        });

        it('deve retornar erro 409 ao tentar cadastrar um email duplicado', async () => {
            // A primeira tentativa deve ter sucesso (já foi feita no teste anterior)
            // Esta é a segunda tentativa com o mesmo email.
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send(dadosCadastro);

            expect(response.statusCode).toBe(409);
            expect(response.body.message).toBe('Este endereço de email já está cadastrado.');
        });

        it('deve retornar erro 400 se faltarem campos obrigatórios', async () => {
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send({
                    email_contato: `teste-incompleto-${Date.now()}@jest.com`,
                    // Faltando 'senha' e 'nome_instituicao'
                });
            
            expect(response.statusCode).toBe(400);
        });

        it('deve fazer o rollback (deletar o usuário do Auth) se a inserção em tabelas secundárias falhar', async () => {
            // Mock: "Espionamos" a função insert e forçamos um erro APENAS quando for na tabela 'telefone'
            const insertSpy = jest.spyOn(supabase, 'from').mockImplementation((tableName) => {
                if (tableName === 'telefone') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            error: new Error('Erro forçado no teste de rollback!')
                        })
                    };
                }
                // Para todas as outras tabelas, funciona normalmente
                return supabase.from.getMockImplementation()(tableName);
            });

            const emailRollback = `teste-rollback-${Date.now()}@jest.com`;
            const response = await request(app)
                .post(`${API_PREFIX}/cadastro`)
                .send({ ...dadosCadastro, email_contato: emailRollback });
            
            // 1. O cadastro deve falhar com erro interno
            expect(response.statusCode).toBe(500);

            // 2. O usuário não deve existir no Supabase Auth (prova do rollback)
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
            const usuarioEncontrado = userData.users.find(u => u.email === emailRollback);
            expect(usuarioEncontrado).toBeUndefined();

            // Restaura a função original do Supabase para não afetar outros testes
            insertSpy.mockRestore();
        });
    });
});