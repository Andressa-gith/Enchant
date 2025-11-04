/* eslint-disable no-undef */

/**
 * @file Testes unitários para o parceria.controller.js
 * @description Suite de testes para o CRUD de Parcerias, simulando
 * o Supabase client e o Logger.
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'inst_12345';
const MOCK_PARCERIA_ID = 'parc_67890';
const MOCK_PARCERIA_DATA = {
    id: MOCK_PARCERIA_ID,
    instituicao_id: MOCK_INSTITUICAO_ID,
    nome: 'Parceiro Teste',
    tipo_setor: 'Público',
    status: 'ativo',
    data_inicio: '2023-01-01',
    objetivos: 'Testar o fluxo'
};

// --- [INÍCIO MOCKS] ---

// 1. Mock do Logger
// Mocks para cada nível de log
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// Objeto do logger mockado
const mockLogger = {
    info: mockLoggerInfo,
    debug: mockLoggerDebug,
    warn: mockLoggerWarn,
    error: mockLoggerError,
};

// 2. Mock do Supabase (Fluente)
// Mocks FINAIS (onde a Promise é resolvida)
const mockGetOrderFinal = jest.fn();
const mockInsertSingleFinal = jest.fn();
const mockUpdateSelectFinal = jest.fn();
const mockDeleteEqFinal = jest.fn();

// Mocks de CADEIA (funções que retornam o próximo passo)
// Cadeia 1: from().select().eq().order() -> Para getParcerias
const mockGetEq = jest.fn(() => ({ order: mockGetOrderFinal }));
const mockSelect = jest.fn(() => ({ eq: mockGetEq }));

// Cadeia 2: from().insert().select().single() -> Para addParceria
const mockInsertSelect = jest.fn(() => ({ single: mockInsertSingleFinal }));
const mockInsert = jest.fn(() => ({ select: mockInsertSelect }));

// Cadeia 3: from().update().eq().eq().select() -> Para updateParceria
const mockUpdateEq2 = jest.fn(() => ({ select: mockUpdateSelectFinal }));
const mockUpdateEq1 = jest.fn(() => ({ eq: mockUpdateEq2 }));
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq1 }));

// Cadeia 4: from().delete().eq().eq() -> Para deleteParceria
const mockDeleteEq2 = mockDeleteEqFinal;
const mockDeleteEq1 = jest.fn(() => ({ eq: mockDeleteEq2 }));
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq1 }));

/**
 * Mock da função .from() que age como um "roteador" para
 * os diferentes "verbos" (select, insert, update, delete).
 */
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'parceiro') {
        return {
            select: mockSelect,
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
        };
    }
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
};

// --- [FIM MOCKS] ---

// --- Aplicação dos Mocks (Modo ESM) ---

jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));

jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: mockLogger,
}));

// --- Helpers de Teste ---

/**
 * Cria um objeto 'res' mockado do Express.
 * @returns {object} Objeto 'res' com jest.fn()
 */
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Cria um objeto 'req' mockado do Express.
 * @param {object} [user] - Objeto req.user (para rota protegida)
 * @param {object} [body] - Objeto req.body
 * @param {object} [params] - Objeto req.params
 * @returns {object} Objeto 'req' mockado
 */
const mockRequest = (user, body, params) => ({
    user: user || null,
    body: body || {},
    params: params || {},
});

// --- Suíte de Testes: Parceria Controller ---

describe('Parceria Controller', () => {
    let res;
    let getParcerias, addParceria, updateParceria, deleteParceria;

    beforeAll(async () => {
        // Importa o controller APÓS os mocks serem aplicados
        const controller = await import('../backend/controllers/parceria.controller.js');
        getParcerias = controller.getParcerias;
        addParceria = controller.addParceria;
        updateParceria = controller.updateParceria;
        deleteParceria = controller.deleteParceria;
    });

    beforeEach(() => {
        // Limpa todos os mocks antes de cada teste
        jest.clearAllMocks();
        res = mockResponse();
    });

    // --- Testes para getParcerias ---
    describe('getParcerias', () => {
        it('deve retornar 200 e a lista de parcerias', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID });
            const mockData = [MOCK_PARCERIA_DATA];
            mockGetOrderFinal.mockResolvedValue({ data: mockData, error: null });

            // Act
            await getParcerias(req, res);

            // Assert
            // Verifica a chamada correta ao Supabase
            expect(mockFrom).toHaveBeenCalledWith('parceiro');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockGetEq).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockGetOrderFinal).toHaveBeenCalledWith('data_inicio', { ascending: false });

            // Verifica a resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockData);
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Busca de parcerias bem-sucedida'));
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID });
            const mockError = new Error('Falha no DB');
            mockGetOrderFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await getParcerias(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar parcerias.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao buscar parcerias'), mockError);
        });
    });

    // --- Testes para addParceria ---
    describe('addParceria', () => {
        it('deve retornar 201 e a parceria criada', async () => {
            // Arrange
            const newParceriaData = { ...MOCK_PARCERIA_DATA };
            delete newParceriaData.id; // Remove o ID, pois é uma criação
            delete newParceriaData.instituicao_id;

            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, newParceriaData);
            mockInsertSingleFinal.mockResolvedValue({ data: MOCK_PARCERIA_DATA, error: null });

            // Act
            await addParceria(req, res);

            // Assert
            // Verifica se o 'insert' foi chamado com os dados corretos
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    instituicao_id: MOCK_INSTITUICAO_ID,
                    nome: MOCK_PARCERIA_DATA.nome,
                    status: MOCK_PARCERIA_DATA.status,
                    data_fim: null, // Verifica se nulos são tratados
                })
            );
            expect(mockInsertSelect).toHaveBeenCalled();
            expect(mockInsertSingleFinal).toHaveBeenCalled();

            // Verifica a resposta
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Parceria adicionada com sucesso!',
                data: MOCK_PARCERIA_DATA
            });
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('adicionada com sucesso'));
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {});
            const mockError = new Error('Falha no DB');
            mockInsertSingleFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await addParceria(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao adicionar parceria.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao adicionar parceria'), mockError);
        });
    });

    // --- Testes para updateParceria ---
    describe('updateParceria', () => {
        it('deve retornar 200 e a parceria atualizada', async () => {
            // Arrange
            const updateData = { nome: 'Nome Atualizado' };
            const req = mockRequest(
                { id: MOCK_INSTITUICAO_ID },
                updateData,
                { id: MOCK_PARCERIA_ID }
            );

            // O Supabase update retorna um *array* de dados atualizados
            const updatedResponseData = [{ ...MOCK_PARCERIA_DATA, ...updateData }];
            mockUpdateSelectFinal.mockResolvedValue({ data: updatedResponseData, error: null });

            // Act
            await updateParceria(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('parceiro');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updateData));
            expect(mockUpdateEq1).toHaveBeenCalledWith('id', MOCK_PARCERIA_ID);
            expect(mockUpdateEq2).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockUpdateSelectFinal).toHaveBeenCalled();

            // Verifica a resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Parceria atualizada com sucesso!',
                data: updatedResponseData[0] // Deve retornar o primeiro objeto do array
            });
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('atualizada com sucesso'));
        });

        it('deve retornar 404 se a parceria não for encontrada (ou sem permissão)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { id: 'id_inexistente' });
            // O Supabase retorna um array vazio se o .eq() não encontrar nada
            mockUpdateSelectFinal.mockResolvedValue({ data: [], error: null });

            // Act
            await updateParceria(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Parceria não encontrada') });
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('não encontrada para atualização'));
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { id: MOCK_PARCERIA_ID });
            const mockError = new Error('Falha no DB');
            mockUpdateSelectFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await updateParceria(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao atualizar parceria.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao atualizar parceria'), mockError);
        });
    });

    // --- Testes para deleteParceria ---
    describe('deleteParceria', () => {
        it('deve retornar 200 ao deletar com sucesso', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { id: MOCK_PARCERIA_ID });
            // O delete retorna 'count' se a opção { count: 'exact' } for usada
            mockDeleteEqFinal.mockResolvedValue({ error: null, count: 1 });

            // Act
            await deleteParceria(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('parceiro');
            expect(mockDelete).toHaveBeenCalledWith({ count: 'exact' });
            expect(mockDeleteEq1).toHaveBeenCalledWith('id', MOCK_PARCERIA_ID);
            expect(mockDeleteEq2).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);

            // Verifica a resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Parceria deletada com sucesso!' });
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('deletada com sucesso'));
        });

        it('deve retornar 404 se a parceria não for encontrada (ou sem permissão)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { id: 'id_inexistente' });
            // O delete retorna count: 0 se o .eq() não encontrar nada
            mockDeleteEqFinal.mockResolvedValue({ error: null, count: 0 });

            // Act
            await deleteParceria(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Parceria não encontrada') });
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('não encontrada para exclusão'));
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { id: MOCK_PARCERIA_ID });
            const mockError = new Error('Falha no DB');
            mockDeleteEqFinal.mockResolvedValue({ error: mockError, count: null });

            // Act
            await deleteParceria(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao deletar parceria.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao deletar parceria'), mockError);
        });
    });
});