/* eslint-disable no-undef */

/**
 * @file Testes unitários para o historicoDoacoes.controller.js
 * @description Suite de testes para o CRUD de Relatórios de Doação.
 * @version 2.0.0 (Corrigido o helper mockRequest para incluir params)
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';

// --- Definição dos Mocks ---

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

// --- Mocks Fluentes Independentes ---

const mockGetSalvosFinal = jest.fn();
const mockAddRelatorioFinal = jest.fn();
const mockDeleteRelatorioFinal = jest.fn();
const mockGetCategoriaFinal = jest.fn();
const mockGetEntradasPDFFinal = jest.fn();
const mockGetSaidasPDFFinal = jest.fn();

const createMockChain = () => {
    const chain = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.gte = jest.fn(() => chain);
    chain.lte = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.single = jest.fn(() => chain);
    chain.insert = jest.fn(() => chain);
    chain.delete = jest.fn(() => chain);
    chain.match = jest.fn(() => chain);
    return chain;
};

const mockFrom = jest.fn((tableName) => {
    const newChain = createMockChain();

    if (tableName === 'relatorio_doacao') {
        newChain.order = mockGetSalvosFinal; // getRelatoriosSalvos
        newChain.insert = jest.fn(() => ({ // adicionarRelatorio
            select: jest.fn(() => ({
                single: mockAddRelatorioFinal
            }))
        }));
        newChain.delete = jest.fn(() => ({ // deletarRelatorio
            match: mockDeleteRelatorioFinal
        }));
    }
    else if (tableName === 'categoria') {
        newChain.single = mockGetCategoriaFinal; // getDadosParaPDF (lookup)
    }
    else if (tableName === 'doacao_entrada') {
        newChain.order = mockGetEntradasPDFFinal; // getDadosParaPDF (Promise.all)
    }
    else if (tableName === 'doacao_saida') {
        newChain.order = mockGetSaidasPDFFinal; // getDadosParaPDF (Promise.all)
    }
    
    return newChain;
});

const mockSupabase = {
    from: mockFrom,
};

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

/**
 * [A CORREÇÃO]
 * Cria um objeto 'req' (requisição) mockado.
 * Agora inclui 'params' na assinatura.
 */
const mockRequest = (user, body, query, params) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    body: body || {},
    query: query || {},
    params: params || {}, // Garante que req.params nunca seja undefined
});


// --- Suíte de Testes: Historico Doacoes Controller ---

describe('Historico Doacoes Controller', () => {
    /** @type {object} */
    let res;
    let getRelatoriosSalvos, adicionarRelatorio, getDadosParaPDF, deletarRelatorio;

    beforeAll(async () => {
        const controller = await import('../backend/controllers/historicoDoacoes.controller.js');
        getRelatoriosSalvos = controller.getRelatoriosSalvos;
        adicionarRelatorio = controller.adicionarRelatorio;
        getDadosParaPDF = controller.getDadosParaPDF;
        deletarRelatorio = controller.deletarRelatorio;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
    });

    // --- Testes para getRelatoriosSalvos ---
    describe('getRelatoriosSalvos', () => {
        it('deve retornar 200 e a lista de relatórios', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, {}, {}); 
            const mockData = [{ id: 1, caminho_arquivo_pdf: 'path/1.pdf' }];
            mockGetSalvosFinal.mockResolvedValue({ data: mockData, error: null });

            // Act
            await getRelatoriosSalvos(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('relatorio_doacao');
            expect(mockGetSalvosFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, relatorios: mockData });
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest();
            const mockError = new Error('Falha no DB');
            mockGetSalvosFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await getRelatoriosSalvos(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Erro interno ao buscar relatórios salvos.' });
        });
    });

    // --- Testes para adicionarRelatorio ---
    describe('adicionarRelatorio', () => {
        const mockBody = { responsavel: 'Admin', caminho_arquivo_pdf: 'path/novo.pdf' };
        
        it('deve retornar 201 e o relatório salvo', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, {}, {}); 
            const mockResult = { id: 1, ...mockBody, instituicao_id: MOCK_INSTITUICAO_ID };
            mockAddRelatorioFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await adicionarRelatorio(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('relatorio_doacao');
            expect(mockAddRelatorioFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Registro de relatório salvo!', relatorio: mockResult });
        });

        it('deve retornar 400 se o caminho_arquivo_pdf não for fornecido', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { responsavel: 'Admin' }, {}, {});
            
            // Act
            await adicionarRelatorio(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'O caminho do arquivo PDF é obrigatório.' });
            expect(mockAddRelatorioFinal).not.toHaveBeenCalled();
        });
    });

    // --- Testes para getDadosParaPDF ---
    describe('getDadosParaPDF', () => {
        const mockQuery = { data_inicio_filtro: '2025-01-01', data_fim_filtro: '2025-01-31' };
        const mockEntradas = [{ id: 1, data_entrada: '...' }];
        const mockSaidas = [{ id: 2, data_saida: '...' }];

        it('deve retornar 400 se as datas estiverem faltando', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, {}, {}); // Sem query
            
            // Act
            await getDadosParaPDF(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Datas de início e fim são obrigatórias.' });
        });

        it('deve retornar 200 (sem filtro de categoria)', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { ...mockQuery, categoria_filtro: 'Geral' }, {}); 
            
            mockGetEntradasPDFFinal.mockResolvedValue({ data: mockEntradas, error: null });
            mockGetSaidasPDFFinal.mockResolvedValue({ data: mockSaidas, error: null });

            // Act
            await getDadosParaPDF(req, res);

            // Assert
            expect(mockGetCategoriaFinal).not.toHaveBeenCalled();
            expect(mockGetEntradasPDFFinal).toHaveBeenCalled();
            expect(mockGetSaidasPDFFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, entradas: mockEntradas, saidas: mockSaidas });
        });

        it('deve retornar 200 (COM filtro de categoria)', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, { ...mockQuery, categoria_filtro: 'Roupas' }, {}); 

            mockGetCategoriaFinal.mockResolvedValue({ data: { id: 5 }, error: null });
            mockGetEntradasPDFFinal.mockResolvedValue({ data: mockEntradas, error: null });
            mockGetSaidasPDFFinal.mockResolvedValue({ data: mockSaidas, error: null });

            // Act
            await getDadosParaPDF(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('categoria');
            expect(mockGetCategoriaFinal).toHaveBeenCalled();
            expect(mockGetEntradasPDFFinal).toHaveBeenCalled();
            expect(mockGetSaidasPDFFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, entradas: mockEntradas, saidas: mockSaidas });
        });
    });

    // --- Testes para deletarRelatorio ---
    describe('deletarRelatorio', () => {
        const params = { id: 2 };

        it('deve retornar 200 ao deletar com sucesso', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, {}, params); 
            mockDeleteRelatorioFinal.mockResolvedValue({ error: null, count: 1 });

            // Act
            await deletarRelatorio(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('relatorio_doacao');
            expect(mockDeleteRelatorioFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Relatório deletado com sucesso.' });
        });

        it('deve retornar 404 se o item não for encontrado (count 0)', async () => {
            // Arrange
            // [CORREÇÃO NA CHAMADA]
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, {}, params); 
            mockDeleteRelatorioFinal.mockResolvedValue({ error: null, count: 0 });

            // Act
            await deletarRelatorio(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('relatorio_doacao'); // Agora deve ser chamado
            expect(mockDeleteRelatorioFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Relatório não encontrado ou sem permissão para excluí-lo.' });
        });
    });
});