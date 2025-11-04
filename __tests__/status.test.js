/* eslint-disable no-undef */

/**
 * @file Testes unitários para o status.controller.js
 * @description Suite de testes para o endpoint de health check,
 * simulando o Supabase (DB) e o Logger.
 * @version 1.0.0 (Baseado na arquitetura V12 estável)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// --- [INÍCIO MOCKS] ---

// 1. Mock do 'logger'
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// [CAMINHO CORRIGIDO]
jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: {
        info: mockLoggerInfo,
        debug: mockLoggerDebug,
        warn: mockLoggerWarn,
        error: mockLoggerError,
    },
}));

// 2. Mock do Supabase Client (Arquitetura V12 Estável)
// Mock FINAL GLOBAL (controlado pelos testes)
const mockDbCheckFinal = jest.fn();

// Cadeia 1: checkDbConnection -> .from('instituicao').select(..., { count: 'exact', head: true })
const mockCheck_Select = jest.fn(() => mockDbCheckFinal());

// O roteador 'from'
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'instituicao') {
        return {
            select: mockCheck_Select,
        };
    }
    // Fallback
    return {}; 
});


const mockSupabase = {
    from: mockFrom,
    // Não precisamos de storage.from aqui
};

// [CAMINHO CORRIGIDO]
jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));

// --- [FIM MOCKS] ---

// --- Helpers de Teste ---
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Este controller não usa req, então o mock pode ser simples
const mockRequest = () => ({});

// --- Suíte de Testes: Status Controller ---
describe('Status Controller', () => {
    let res;
    let checkDbConnection;

    beforeAll(async () => {
        // [CAMINHO CORRIGIDO]
        const controller = await import('../backend/controllers/status.controller.js');
        checkDbConnection = controller.checkDbConnection;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        
        // Limpa mocks globais
        mockDbCheckFinal.mockReset();
    });

    // --- Testes para checkDbConnection ---
    describe('checkDbConnection', () => {
        it('deve retornar 200 se a conexão com o banco for bem-sucedida', async () => {
            // Arrange
            const req = mockRequest();
            const mockCount = 42;
            mockDbCheckFinal.mockResolvedValue({ error: null, count: mockCount });

            // Act
            await checkDbConnection(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockCheck_Select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Conexão com o banco de dados do Supabase está ativa.',
                details: `Tabela "instituicao" acessível e possui ${mockCount} registros.`
            });
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Conexão com o banco de dados do Supabase está ativa.'));
            expect(mockLoggerError).not.toHaveBeenCalled();
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest();
            const mockError = new Error('Falha de conexão');
            mockDbCheckFinal.mockResolvedValue({ error: mockError, count: null });

            // Act
            await checkDbConnection(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Falha no health check: Não foi possível conectar ao banco de dados.',
                error: mockError.message
            });
            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.stringContaining('Não foi possível conectar'),
                mockError
            );
        });
    });
});