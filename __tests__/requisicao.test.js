/* eslint-disable no-undef */

/**
 * @file Testes unitários para o relatorio.controller.js
 * @description Suite de testes para o CRUD de Relatórios, simulando
 * Supabase (DB e Storage), UUID e Logger, com foco na lógica de rollback.
 * @version 10.0 (Mock do Supabase explícito e com caminhos corrigidos)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';
const MOCK_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MOCK_FILE_BUFFER = Buffer.from('fake-pdf-content');
const MOCK_FILE_PATH = `${MOCK_INSTITUICAO_ID}/${MOCK_UUID}-relatorio.pdf`;

// --- [INÍCIO MOCKS] ---

// 1. Mock do 'uuid'
jest.unstable_mockModule('uuid', () => ({
    v4: jest.fn(() => MOCK_UUID),
}));

// 2. Mock do 'logger'
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// [CORREÇÃO DE CAMINHO]
jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: {
        info: mockLoggerInfo,
        debug: mockLoggerDebug,
        warn: mockLoggerWarn,
        error: mockLoggerError,
    },
}));

// 3. Mock do Supabase Client (Arquitetura V10 Estável)
const mockStorageUpload = jest.fn();
const mockStorageRemove = jest.fn();
const mockStorageFrom = jest.fn(() => ({
    upload: mockStorageUpload,
    remove: mockStorageRemove,
}));

// Mocks FINAIS GLOBAIS (controlados pelos testes)
const mockSelectOrderFinal = jest.fn();
const mockInsertSingleFinal = jest.fn();
const mockSelectEqEqSingleFinal = jest.fn();
const mockDeleteEqFinal = jest.fn();

// [CORREÇÃO] Criamos NOVAS, ISOLADAS cadeias para cada operação.
// Nenhuma função (like 'select' or 'eq') é reutilizada entre as cadeias.

// Cadeia 1: getRelatorios -> .select('*').eq(...).order()
const mockGet_Order = jest.fn(() => mockSelectOrderFinal());
const mockGet_Eq = jest.fn(() => ({ order: mockGet_Order })); // <--- [CORREÇÃO V11] Adicionado .eq()
const mockGet_Select = jest.fn(() => ({ eq: mockGet_Eq })); // <--- [CORREÇÃO V11]

// Cadeia 2: addRelatorio -> .insert().select().single()
const mockAdd_Single = jest.fn(() => mockInsertSingleFinal());
const mockAdd_Select = jest.fn(() => ({ single: mockAdd_Single }));
const mockAdd_Insert = jest.fn(() => ({ select: mockAdd_Select }));

// Cadeia 3: deleteRelatorio (Fetch) -> .select('...').eq().eq().single()
const mockDelFetch_Single = jest.fn(() => mockSelectEqEqSingleFinal());
const mockDelFetch_Eq2 = jest.fn(() => ({ single: mockDelFetch_Single }));
const mockDelFetch_Eq1 = jest.fn(() => ({ eq: mockDelFetch_Eq2 }));
const mockDelFetch_Select = jest.fn(() => ({ eq: mockDelFetch_Eq1 }));

// Cadeia 4: deleteRelatorio (Delete) -> .delete().eq()
const mockDelDel_Eq = jest.fn(() => mockDeleteEqFinal());
const mockDelDel_Delete = jest.fn(() => ({ eq: mockDelDel_Eq }));

// O roteador 'from' agora retorna TODAS as cadeias de uma vez.
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'relatorio') {
        return {
            // Roteador 'select' que diferencia as chamadas
            select: jest.fn((...args) => {
                if (args[0] === 'caminho_arquivo') {
                    return mockDelFetch_Select(...args); // Cadeia 3
                }
                return mockGet_Select(...args); // Cadeia 1 (ex: '*')
            }),
            insert: mockAdd_Insert,  // Cadeia 2
            delete: mockDelDel_Delete // Cadeia 4
        };
    }
    // Fallback
    return {}; 
});


const mockSupabase = {
    from: mockFrom,
    storage: { from: mockStorageFrom }
};

// [CORREÇÃO DE CAMINHO]
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

// req.file precisa ser mockado para 'addRelatorio'
const mockRequest = (user, body, params, file) => ({
    user: user || null,
    body: body || {},
    params: params || {},
    file: file || null, // Mock do multer
});

// --- Suíte de Testes: Relatorio Controller ---
describe('Relatorio Controller', () => {
    let res;
    let getRelatorios, addRelatorio, deleteRelatorio;

    beforeAll(async () => {
        // [CORREÇÃO DE CAMINHO]
        const controller = await import('../backend/controllers/relatorio.controller.js');
        getRelatorios = controller.getRelatorios;
        addRelatorio = controller.addRelatorio;
        deleteRelatorio = controller.deleteRelatorio;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        
        // Limpa mocks globais
        mockSelectOrderFinal.mockReset();
        mockInsertSingleFinal.mockReset();
        mockSelectEqEqSingleFinal.mockReset();
        mockDeleteEqFinal.mockReset();
        mockStorageUpload.mockReset();
        mockStorageRemove.mockReset();
    });

    // --- Testes para getRelatorios ---
    describe('getRelatorios', () => {
        it('deve retornar 200 e a lista de relatórios', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID });
            const mockData = [{ id: 1, titulo: 'Relatório 2023' }];
            mockSelectOrderFinal.mockResolvedValue({ data: mockData, error: null });

            // Act
            await getRelatorios(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('relatorio');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockData);
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID });
            const mockError = new Error('Falha no DB');
            mockSelectOrderFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await getRelatorios(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar relatórios.' });
        });
    });

    // --- Testes para addRelatorio ---
    describe('addRelatorio', () => {
        const mockFile = {
            originalname: 'relatorio.pdf',
            buffer: MOCK_FILE_BUFFER,
            mimetype: 'application/pdf',
        };
        const mockBody = { titulo: 'Relatório Teste', descricao: '...' };

        it('deve retornar 201 e adicionar o relatório com sucesso', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, null, mockFile);
            const mockData = { id: 1, ...mockBody, caminho_arquivo: MOCK_FILE_PATH };

            mockStorageUpload.mockResolvedValue({ error: null });
            mockInsertSingleFinal.mockResolvedValue({ data: mockData, error: null });

            // Act
            await addRelatorio(req, res);

            // Assert
            expect(mockStorageFrom).toHaveBeenCalledWith('reports');
            expect(mockStorageUpload).toHaveBeenCalledWith(MOCK_FILE_PATH, mockFile.buffer, expect.anything());
            expect(mockFrom).toHaveBeenCalledWith('relatorio');
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Relatório adicionado com sucesso!', data: mockData });
            expect(mockStorageRemove).not.toHaveBeenCalled();
        });

        it('deve retornar 400 se nenhum arquivo for enviado', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, null, null); // Sem arquivo

            // Act
            await addRelatorio(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nenhum arquivo foi enviado.' });
            expect(mockStorageUpload).not.toHaveBeenCalled();
        });

        it('deve retornar 500 e tentar rollback se o upload do Storage falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, null, mockFile);
            const mockError = new Error('Falha no Upload');
            mockStorageUpload.mockResolvedValue({ error: mockError });

            // Act
            await addRelatorio(req, res);

            // Assert
            expect(mockStorageUpload).toHaveBeenCalled();
            expect(mockInsertSingleFinal).not.toHaveBeenCalled(); // Não tentou inserir no DB
            expect(res.status).toHaveBeenCalledWith(500);

            // Tenta o Rollback
            expect(mockStorageFrom).toHaveBeenCalledWith('reports');
            expect(mockStorageRemove).toHaveBeenCalledWith([MOCK_FILE_PATH]);
        });

        it('deve retornar 500 e FAZER O ROLLBACK se a inserção no DB falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody, null, mockFile);
            const mockError = new Error('Falha no DB Insert');
            
            mockStorageUpload.mockResolvedValue({ error: null }); // Upload OK
            mockInsertSingleFinal.mockResolvedValue({ data: null, error: mockError }); // DB Falha

            // Act
            await addRelatorio(req, res);

            // Assert
            expect(mockStorageUpload).toHaveBeenCalled(); // 1. Upload OK
            expect(mockInsertSingleFinal).toHaveBeenCalled(); // 2. DB Falha
            expect(res.status).toHaveBeenCalledWith(500);

            // 3. O Rollback DEVE ser chamado
            expect(mockStorageFrom).toHaveBeenCalledWith('reports');
            expect(mockStorageRemove).toHaveBeenCalledWith([MOCK_FILE_PATH]);
        });
    });

    // --- Testes para deleteRelatorio ---
    describe('deleteRelatorio', () => {
        it('deve retornar 200 e deletar o relatório (DB e Storage)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: '1' });
            
            // 1. Fetch do caminho
            mockSelectEqEqSingleFinal.mockResolvedValue({ data: { caminho_arquivo: MOCK_FILE_PATH }, error: null });
            // 2. Delete do DB
            mockDeleteEqFinal.mockResolvedValue({ error: null });
            // 3. Remove do Storage
            mockStorageRemove.mockResolvedValue({ error: null });

            // Act
            await deleteRelatorio(req, res);

            // Assert
            expect(mockSelectEqEqSingleFinal).toHaveBeenCalled(); // 1. Fetch
            expect(mockDeleteEqFinal).toHaveBeenCalled(); // 2. Delete DB
            expect(mockStorageRemove).toHaveBeenCalledWith([MOCK_FILE_PATH]); // 3. Delete Storage
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Relatório deletado com sucesso!' });
        });

        it('deve retornar 404 se o relatório não for encontrado', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: '404' });
            
            // 1. Fetch do caminho (não encontra)
            mockSelectEqEqSingleFinal.mockResolvedValue({ data: null, error: null });

            // Act
            await deleteRelatorio(req, res);

            // Assert
            expect(mockSelectEqEqSingleFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Relatório não encontrado ou você não tem permissão.' });
            
            // Não deve tentar deletar
            expect(mockDeleteEqFinal).not.toHaveBeenCalled();
            expect(mockStorageRemove).not.toHaveBeenCalled();
        });

        it('deve retornar 500 se a exclusão do DB falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: '1' });
            const mockError = new Error('Falha no DB Delete');
            
            // 1. Fetch do caminho
            mockSelectEqEqSingleFinal.mockResolvedValue({ data: { caminho_arquivo: MOCK_FILE_PATH }, error: null });
            // 2. Delete do DB (Falha)
            mockDeleteEqFinal.mockResolvedValue({ error: mockError });

            // Act
            await deleteRelatorio(req, res);

            // Assert
            expect(mockSelectEqEqSingleFinal).toHaveBeenCalled();
            expect(mockDeleteEqFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            
            // Não deve tentar deletar do storage se o DB falhou
            expect(mockStorageRemove).not.toHaveBeenCalled();
        });

        it('deve retornar 200 (com warning) se a exclusão do Storage falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: '1' });
            const mockStorageError = new Error('Falha no Storage Remove');

            // 1. Fetch do caminho
            mockSelectEqEqSingleFinal.mockResolvedValue({ data: { caminho_arquivo: MOCK_FILE_PATH }, error: null });
            // 2. Delete do DB
            mockDeleteEqFinal.mockResolvedValue({ error: null });
            // 3. Remove do Storage (Falha)
            mockStorageRemove.mockResolvedValue({ error: mockStorageError });

            // Act
            await deleteRelatorio(req, res);

            // Assert
            expect(mockSelectEqEqSingleFinal).toHaveBeenCalled();
            expect(mockDeleteEqFinal).toHaveBeenCalled();
            expect(mockStorageRemove).toHaveBeenCalledWith([MOCK_FILE_PATH]);
            
            // O controller considera sucesso, apenas loga o erro do storage
            expect(res.status).toHaveBeenCalledWith(200); 
            expect(mockLoggerWarn).toHaveBeenCalledWith(
                expect.stringContaining('Falha ao remover arquivo do Storage'),
                mockStorageError
            );
        });
    });
});