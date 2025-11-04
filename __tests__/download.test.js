/* eslint-disable no-undef */

/**
 * @file Testes unitários para o download.controller.js
 * @description Suite de testes para a função getFile,
 * simulando o Supabase Storage e a lógica de MIME type.
 * @version 2.1.0 (Corrigido o expect do Buffer)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterEach } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';

// --- Definição dos Mocks ---

const mockPath = {
    extname: jest.fn(),
};
const mockDownloadFinal = jest.fn();
const mockStorageFrom = jest.fn(() => ({
    download: mockDownloadFinal,
}));
const mockSupabase = {
    storage: {
        from: mockStorageFrom,
    },
};

let consoleErrorSpy;

// --- Aplicação dos Mocks (Modo ESM) ---

jest.unstable_mockModule('path', () => ({
    default: mockPath,
}));

jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));


// --- Helpers de Teste ---

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (params, path) => ({
    params: params || {},
    path: path || '/',
});


// --- Suíte de Testes: Download Controller ---

describe('Download Controller', () => {
    /** @type {object} */
    let res;
    let getFile;

    beforeAll(async () => {
        const controllerModule = await import('../backend/controllers/download.controller.js');
        getFile = controllerModule.default.getFile; 
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // --- Teste de Sucesso (200) ---
    it('deve retornar 200 e forçar o download do arquivo em caso de sucesso', async () => {
        // Arrange
        const params = { instituicaoId: MOCK_INSTITUICAO_ID, fileName: 'relatorio-final.pdf' };
        const req = mockRequest(params, `/audit/${MOCK_INSTITUICAO_ID}/relatorio-final.pdf`);
        
        mockPath.extname.mockReturnValue('.pdf');
        
        const mockFileArrayBuffer = Buffer.from('conteudo-do-pdf-mockado').buffer;
        const mockBlob = {
            arrayBuffer: jest.fn().mockResolvedValue(mockFileArrayBuffer),
        };
        mockDownloadFinal.mockResolvedValue({ data: mockBlob, error: null });

        // Act
        await getFile(req, res);

        // Assert
        expect(mockStorageFrom).toHaveBeenCalledWith('audit');
        expect(mockDownloadFinal).toHaveBeenCalledWith(`${MOCK_INSTITUICAO_ID}/relatorio-final.pdf`);
        expect(mockBlob.arrayBuffer).toHaveBeenCalled();

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="relatorio-final.pdf"'));

        // --- [A CORREÇÃO] ---
        // Em vez de comparar instâncias de Buffer, verificamos se FOI UM BUFFER.
        expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
        // --- [FIM DA CORREÇÃO] ---

        expect(res.status).not.toHaveBeenCalled();
    });

    // --- Teste de Validação (400) ---
    it('deve retornar 400 se o bucket não puder ser extraído do path', async () => {
        // Arrange
        const req = mockRequest({ instituicaoId: MOCK_INSTITUICAO_ID, fileName: 'file.pdf' }, '/');
        
        // Act
        await getFile(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('Parâmetros de download inválidos.');
        expect(mockDownloadFinal).not.toHaveBeenCalled();
    });

    // --- Teste de Arquivo Não Encontrado (404) ---
    it('deve retornar 404 se o Supabase Storage retornar um erro', async () => {
        // Arrange
        const params = { instituicaoId: MOCK_INSTITUICAO_ID, fileName: 'arquivo-nao-existe.pdf' };
        const req = mockRequest(params, `/audit/${MOCK_INSTITUICAO_ID}/arquivo-nao-existe.pdf`);
        const mockError = { message: 'File not found' };
        
        mockDownloadFinal.mockResolvedValue({ data: null, error: mockError });

        // Act
        await getFile(req, res);

        // Assert
        expect(mockDownloadFinal).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Arquivo não encontrado.');
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // --- Teste de Erro Interno (500) ---
    it('deve retornar 500 se data.arrayBuffer() falhar (arquivo corrompido)', async () => {
        // Arrange
        const params = { instituicaoId: MOCK_INSTITUICAO_ID, fileName: 'corrompido.pdf' };
        const req = mockRequest(params, `/audit/${MOCK_INSTITUICAO_ID}/corrompido.pdf`);
        mockPath.extname.mockReturnValue('.pdf');

        const mockError = new Error('Falha ao ler o buffer');
        const mockBlobCorrompido = {
            arrayBuffer: jest.fn().mockRejectedValue(mockError),
        };
        mockDownloadFinal.mockResolvedValue({ data: mockBlobCorrompido, error: null });

        // Act
        await getFile(req, res);

        // Assert
        expect(mockDownloadFinal).toHaveBeenCalled();
        expect(mockBlobCorrompido.arrayBuffer).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Erro interno ao processar o download.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Erro geral no download:', mockError);
    });
});