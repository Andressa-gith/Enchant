/* eslint-disable no-undef */

/**
 * @file Testes unitários para o documento.controller.js
 * @description Suite de testes para o CRUD de Documentos, simulando Supabase e Storage.
 * @version 2.0.0 (Corrigido com mocks fluentes independentes)
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

const mockUuid = {
    v4: jest.fn(() => 'mock-uuid-12345'),
};

// --- [INÍCIO DA CORREÇÃO] Mocks Fluentes Independentes ---

// Mocks FINAIS (os que retornam os dados/erros)
const mockGetFinal = jest.fn();
const mockAddFinal = jest.fn();
const mockUpdateSelectFinal = jest.fn();
const mockFetchOldFileFinal = jest.fn();
const mockDeleteFetchFinal = jest.fn();
const mockDeleteFinal = jest.fn();

// Mocks do Storage
const mockUpload = jest.fn();
const mockRemove = jest.fn();

/**
 * @description Cria uma nova cadeia de mock fluente.
 * Ela precisa ter TODAS as funções que o controller usa.
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
    chain.match = jest.fn(() => chain); // [A CORREÇÃO]
    return chain;
};

// Contadores para rotear as chamadas
let selectCallCount = 0;

/**
 * Mock da função .from() que age como um "roteador".
 */
const mockFrom = jest.fn((tableName) => {
    const newChain = createMockChain();
    
    // Roteamento baseado no que é chamado
    
    // Para .insert()
    newChain.insert = jest.fn(() => ({
        select: jest.fn(() => ({
            single: mockAddFinal, // addDocumento
        })),
    }));

    // Para .update()
    newChain.update = jest.fn(() => ({
        match: jest.fn(() => ({
            select: mockUpdateSelectFinal, // updateDocumento
        })),
    }));

    // Para .delete()
    newChain.delete = jest.fn(() => ({
        eq: mockDeleteFinal, // deleteDocumento (DB)
    }));

    // Para .select()
    newChain.select = jest.fn((selectStr) => {
        selectCallCount++;
        if (selectStr === 'caminho_arquivo') {
            // updateDocumento (fetch) ou deleteDocumento (fetch)
            newChain.single = mockFetchOldFileFinal;
        } else {
            // getDocumentos
            newChain.order = mockGetFinal;
        }
        return newChain;
    });

    return newChain;
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
    storage: {
        from: jest.fn(() => ({
            upload: mockUpload,
            remove: mockRemove,
        })),
    },
};
// --- [FIM DA CORREÇÃO] ---


// --- Aplicação dos Mocks (Modo ESM) ---

jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: mockLogger,
}));

jest.unstable_mockModule('uuid', () => ({
    v4: mockUuid.v4,
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

const mockRequest = (user, body, params, file) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    body: body || {},
    params: params || {},
    file: file || null,
});


// --- Suíte de Testes: Documento Controller ---

describe('Documento Controller', () => {
    /** @type {object} */
    let res;
    let getDocumentos, addDocumento, updateDocumento, deleteDocumento;

    beforeAll(async () => {
        const controller = await import('../backend/controllers/documento.controller.js');
        getDocumentos = controller.getDocumentos;
        addDocumento = controller.addDocumento;
        updateDocumento = controller.updateDocumento;
        deleteDocumento = controller.deleteDocumento;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        selectCallCount = 0;
    });

    // --- Testes para getDocumentos ---
    describe('getDocumentos', () => {
        it('deve retornar 200 e a lista de documentos', async () => {
            // Arrange
            const req = mockRequest();
            const mockData = [{ id: 1, titulo: 'Doc 1' }];
            mockGetFinal.mockResolvedValue({ data: mockData, error: null });

            // Act
            await getDocumentos(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('documento_comprobatorio');
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
            await getDocumentos(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar documentos.' });
        });
    });

    // --- Testes para addDocumento ---
    describe('addDocumento', () => {
        const file = { originalname: 'nota.pdf', buffer: Buffer.from('teste'), mimetype: 'application/pdf' };
        const body = { titulo: 'Nota Fiscal', tipo_documento: 'NF', valor: 150.50 };
        const mockFilePath = `${MOCK_INSTITUICAO_ID}/mock-uuid-12345-nota.pdf`;
        
        it('deve retornar 201 e adicionar o documento (com upload)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, {}, file);
            const mockResult = { id: 1, ...body, caminho_arquivo: mockFilePath };
            mockUpload.mockResolvedValue({ error: null });
            mockAddFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await addDocumento(req, res);

            // Assert (Upload)
            expect(mockUpload).toHaveBeenCalledWith(mockFilePath, file.buffer, expect.anything());
            // Assert (DB Insert)
            expect(mockFrom).toHaveBeenCalledWith('documento_comprobatorio');
            expect(mockAddFinal).toHaveBeenCalled(); // [CORRIGIDO]
            // Assert (Response)
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Documento adicionado com sucesso!', data: mockResult });
            expect(mockRemove).not.toHaveBeenCalled();
        });

        // ... (testes de 400 e 500 do addDocumento estão corretos) ...
        it('deve retornar 400 se nenhum arquivo for enviado', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, {}, null);
            await addDocumento(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nenhum arquivo foi enviado.' });
            expect(mockUpload).not.toHaveBeenCalled();
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('deve retornar 500 e fazer rollback se o upload falhar', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, {}, file);
            const mockUploadError = new Error('Falha no Storage');
            mockUpload.mockResolvedValue({ error: mockUploadError });

            await addDocumento(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao adicionar documento.' });
            expect(mockRemove).toHaveBeenCalledWith([mockFilePath]); 
        });

        it('deve retornar 500 e fazer rollback se o insert no DB falhar', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, {}, file);
            const mockInsertError = new Error('Falha no DB');
            mockUpload.mockResolvedValue({ error: null });
            mockAddFinal.mockResolvedValue({ data: null, error: mockInsertError });

            await addDocumento(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao adicionar documento.' });
            expect(mockRemove).toHaveBeenCalledWith([mockFilePath]);
        });
    });

    // --- Testes para updateDocumento ---
    describe('updateDocumento', () => {
        const params = { id: 1 };
        const body = { titulo: 'Título Atualizado', valor: 200 };

        it('deve retornar 200 e atualizar (sem arquivo novo)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, params, null); // Sem file
            const mockResult = [{ id: 1, ...body }];
            mockUpdateSelectFinal.mockResolvedValue({ data: mockResult, error: null });
            
            // Act
            await updateDocumento(req, res);

            // Assert
            expect(mockUpload).not.toHaveBeenCalled();
            expect(mockRemove).not.toHaveBeenCalled();
            expect(mockFrom).toHaveBeenCalledWith('documento_comprobatorio');
            expect(mockUpdateSelectFinal).toHaveBeenCalled(); // [CORRIGIDO]
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Documento atualizado com sucesso!'
            }));
        });

        it('deve retornar 200 e atualizar (com arquivo novo)', async () => {
            // Arrange
            const file = { originalname: 'novo.pdf', buffer: Buffer.from('novo'), mimetype: 'application/pdf' };
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, params, file);
            const mockFilePath = `${MOCK_INSTITUICAO_ID}/mock-uuid-12345-novo.pdf`;
            
            // 1. Mock do Fetch do arquivo antigo
            const mockDocAntigo = { caminho_arquivo: 'path/antigo.pdf' };
            mockFetchOldFileFinal.mockResolvedValue({ data: mockDocAntigo, error: null });
            
            // 2. Mock do Upload do novo arquivo
            mockUpload.mockResolvedValue({ error: null });
            
            // 3. Mock do Remove do arquivo antigo
            mockRemove.mockResolvedValue({ error: null });
            
            // 4. Mock do Update no DB
            const mockResult = [{ id: 1, ...body, caminho_arquivo: mockFilePath }];
            mockUpdateSelectFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await updateDocumento(req, res);

            // Assert
            expect(mockFetchOldFileFinal).toHaveBeenCalled(); // 1. Buscou
            expect(mockUpload).toHaveBeenCalledWith(mockFilePath, file.buffer, expect.anything()); // 2. Subiu
            expect(mockRemove).toHaveBeenCalledWith([mockDocAntigo.caminho_arquivo]); // 3. Removeu
            expect(mockUpdateSelectFinal).toHaveBeenCalled(); // 4. Atualizou [CORRIGIDO]
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ caminho_arquivo: mockFilePath })
            }));
        });

        // ... (teste de 404 do updateDocumento está correto) ...
        it('deve retornar 404 se o documento não for encontrado (com arquivo novo)', async () => {
            const file = { originalname: 'novo.pdf', buffer: Buffer.from('novo'), mimetype: 'application/pdf' };
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, body, params, file);
            mockFetchOldFileFinal.mockResolvedValue({ data: null, error: { message: 'not found' } });
            
            await updateDocumento(req, res);

            expect(mockFetchOldFileFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Documento não encontrado ou sem permissão.' });
            expect(mockUpload).not.toHaveBeenCalled();
        });
    });

    // --- Testes para deleteDocumento ---
    describe('deleteDocumento', () => {
        const params = { id: 2 };

        it('deve retornar 200 e deletar o documento (DB e Storage)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, params);
            const mockDoc = { caminho_arquivo: 'path/para/deletar.pdf' };
            
            // 1. Mock do Fetch
            mockFetchOldFileFinal.mockResolvedValue({ data: mockDoc, error: null });
            // 2. Mock do Delete DB
            mockDeleteFinal.mockResolvedValue({ error: null });
            // 3. Mock do Remove Storage
            mockRemove.mockResolvedValue({ error: null });

            // Act
            await deleteDocumento(req, res);

            // Assert
            expect(mockFetchOldFileFinal).toHaveBeenCalled(); // 1. Buscou
            // [CORREÇÃO] O mock é chamado com ('id', 2)
            expect(mockDeleteFinal).toHaveBeenCalledWith('id', params.id); // 2. Deletou DB
            expect(mockRemove).toHaveBeenCalledWith([mockDoc.caminho_arquivo]); // 3. Deletou Storage
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Documento deletado com sucesso!' });
        });

        // ... (testes de 404 e 200/warn do deleteDocumento estão corretos) ...
        it('deve retornar 404 se o documento não for encontrado', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, params);
            mockFetchOldFileFinal.mockResolvedValue({ data: null, error: { message: 'not found' } });
            
            await deleteDocumento(req, res);

            expect(mockFetchOldFileFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Documento não encontrado ou você não tem permissão.' });
            expect(mockDeleteFinal).not.toHaveBeenCalled();
            expect(mockRemove).not.toHaveBeenCalled();
        });

        it('deve retornar 200 (com aviso) se o DB for deletado mas o Storage falhar', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}, params);
            const mockDoc = { caminho_arquivo: 'path/arquivo-orfao.pdf' };
            const mockStorageError = new Error('Falha no Storage');
            
            mockFetchOldFileFinal.mockResolvedValue({ data: mockDoc, error: null });
            mockDeleteFinal.mockResolvedValue({ error: null });
            mockRemove.mockResolvedValue({ error: mockStorageError });

            await deleteDocumento(req, res);
            
            expect(mockRemove).toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Falha ao remover arquivo do Storage para documento ID: ${params.id}.`,
                mockStorageError
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Documento deletado com sucesso!' });
        });
    });
});