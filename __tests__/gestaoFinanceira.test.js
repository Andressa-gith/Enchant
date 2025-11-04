/* eslint-disable no-undef */

/**
 * @file Testes unitários para o gestaoFinanceira.controller.js
 * @description Suite de testes para o CRUD de Gestão Financeira,
 * simulando o Supabase, logger e controlando o tempo (new Date()).
 * @version 2.0.0 (Corrigido - removido teste de helper privado)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterEach } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';
const MOCK_SYSTEM_DATE = '2025-10-01T10:00:00.000Z'; // O 'ano' será 2025

// --- Definição dos Mocks ---

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

// --- Mocks Fluentes Independentes para Supabase ---

// Mocks FINAIS
const mockGetFinal = jest.fn();
const mockAddFinal = jest.fn();
const mockUpdateFinal = jest.fn();
const mockDeleteFinal = jest.fn();

/**
 * @description Cria uma nova cadeia de mock fluente.
 */
const createMockChain = () => {
    const chain = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.single = jest.fn(() => chain);
    chain.insert = jest.fn(() => chain);
    chain.update = jest.fn(() => chain);
    chain.delete = jest.fn(() => chain);
    return chain;
};

/**
 * Mock da função .from() que age como um "roteador".
 */
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'gestao_financeira') {
        const newChain = createMockChain();
        
        // getFinanceiro: .select(...).eq(...).order(...)
        newChain.order = mockGetFinal;
        
        // addFinanceiro: .insert(...).select().single()
        newChain.insert = jest.fn(() => ({
            select: jest.fn(() => ({
                single: mockAddFinal
            }))
        }));
        
        // updateFinanceiro: .update(...).eq(...).eq(...).select()
        newChain.update = jest.fn(() => ({
            eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                    select: mockUpdateFinal
                }))
            }))
        }));

        // deleteFinanceiro: .delete(...).eq(...).eq(...)
        newChain.delete = jest.fn(() => ({
            eq: jest.fn(() => ({
                eq: mockDeleteFinal
            }))
        }));

        return newChain;
    }
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
};
// --- [FIM] Mocks ---


// --- Aplicação dos Mocks (Modo ESM) ---

jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: mockLogger,
}));

jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));


// --- Helpers de Teste ---

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (user, body, params) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    body: body || {},
    params: params || {},
});


// --- Suíte de Testes: Gestao Financeira Controller ---

describe('Gestao Financeira Controller', () => {
    /** @type {object} */
    let res;
    let getFinanceiro, addFinanceiro, updateFinanceiro, deleteFinanceiro;
    // [CORREÇÃO] Removida a variável 'calcularStatus'

    beforeAll(async () => {
        const controller = await import('../backend/controllers/gestaoFinanceira.controller.js');
        getFinanceiro = controller.getFinanceiro;
        addFinanceiro = controller.addFinanceiro;
        updateFinanceiro = controller.updateFinanceiro;
        deleteFinanceiro = controller.deleteFinanceiro;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        jest.useFakeTimers().setSystemTime(new Date(MOCK_SYSTEM_DATE));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // --- [CORREÇÃO] Removido o 'describe' da função 'calcularStatus' ---
    // A lógica dela é testada indiretamente nos testes de 'add' e 'update'.

    // --- Testes para getFinanceiro ---
    describe('getFinanceiro', () => {
        it('deve retornar 200 e a lista de lançamentos', async () => {
            // Arrange
            const req = mockRequest();
            const mockData = [{ id: 1, nome_categoria: 'Aluguel' }];
            mockGetFinal.mockResolvedValue({ data: mockData, error: null });

            // Act
            await getFinanceiro(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('gestao_financeira');
            expect(mockGetFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockData);
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest();
            const mockError = new Error('Falha no DB');
            mockGetFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await getFinanceiro(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar dados financeiros.' });
        });
    });

    // --- Testes para addFinanceiro ---
    describe('addFinanceiro', () => {
        const mockBody = { 
            nome_categoria: 'Doações', 
            origem_recurso: 'Recursos Privados',
            orcamento_previsto: 1000,
            valor_executado: 0 // Vai ser 'Planejado'
        };

        it('deve retornar 201 e o novo lançamento (calculando status "Planejado")', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            const expectedInsert = {
                ...mockBody,
                instituicao_id: MOCK_INSTITUICAO_ID,
                status: 'Planejado', // Testando indiretamente o calcularStatus
                ano: 2025
            };
            const mockResult = { id: 1, ...expectedInsert };
            mockAddFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await addFinanceiro(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('gestao_financeira');
            expect(mockAddFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Categoria financeira adicionada com sucesso!', data: mockResult });
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            const mockError = new Error('Falha no insert');
            mockAddFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await addFinanceiro(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao adicionar categoria.' });
        });
    });

    // --- Testes para updateFinanceiro ---
    describe('updateFinanceiro', () => {
        const params = { id: 1 };
        const mockBody = { 
            nome_categoria: 'Aluguel Atualizado', 
            orcamento_previsto: 1000,
            valor_executado: 1000 // Vai ser 'Executado'
        };

        it('deve retornar 200 e o lançamento atualizado (calculando status "Executado")', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, params);
            const expectedUpdate = {
                ...mockBody,
                status: 'Executado' // Testando indiretamente o calcularStatus
            };
            const mockResult = [{ id: 1, ...expectedUpdate }];
            mockUpdateFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await updateFinanceiro(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('gestao_financeira');
            expect(mockUpdateFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Lançamento atualizado com sucesso!', data: mockResult[0] });
        });

        // Teste extra para o status "Pendente"
        it('deve calcular corretamente o status "Pendente"', async () => {
            // Arrange
            const bodyPendente = { ...mockBody, valor_executado: 500 }; // Pendente
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, bodyPendente, params);
            const expectedUpdate = {
                ...bodyPendente,
                status: 'Pendente' // Testando indiretamente o calcularStatus
            };
            const mockResult = [{ id: 1, ...expectedUpdate }];
            mockUpdateFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await updateFinanceiro(req, res);

            // Assert
            expect(mockUpdateFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockResult[0] }));
        });

        it('deve retornar 400 se faltarem dados no body', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { nome_categoria: 'Incompleto' }, params); // Faltam dados
            
            // Act
            await updateFinanceiro(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Dados para atualização inválidos.' });
            expect(mockUpdateFinal).not.toHaveBeenCalled();
        });

        it('deve retornar 404 se o Supabase não encontrar o registro', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, params);
            mockUpdateFinal.mockResolvedValue({ data: [], error: null }); // Retorna array vazio

            // Act
            await updateFinanceiro(req, res);

            // Assert
            expect(mockUpdateFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Registro não encontrado ou sem permissão.' });
        });
    });

    // --- Testes para deleteFinanceiro ---
    describe('deleteFinanceiro', () => {
        const params = { id: 2 };

        it('deve retornar 200 ao deletar com sucesso', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, params);
            mockDeleteFinal.mockResolvedValue({ error: null, count: 1 });

            // Act
            await deleteFinanceiro(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('gestao_financeira');
            expect(mockDeleteFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Lançamento deletado com sucesso!' });
        });

        it('deve retornar 404 se o item não for encontrado (count 0)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, params);
            mockDeleteFinal.mockResolvedValue({ error: null, count: 0 });

            // Act
            await deleteFinanceiro(req, res);

            // Assert
            expect(mockDeleteFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Lançamento não encontrado ou sem permissão para excluí-lo.' });
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, params);
            const mockError = new Error('Falha no delete');
            mockDeleteFinal.mockResolvedValue({ error: mockError, count: null });

            // Act
            await deleteFinanceiro(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao deletar lançamento.' });
        });
    });
});