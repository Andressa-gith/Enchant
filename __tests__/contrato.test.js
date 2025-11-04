/* eslint-disable no-undef */

/**
 * @file Testes unitários para o contrato.controller.js
 * @description Este arquivo contém a suíte de testes unitários para as funções
 * de CRUD de Contratos, simulando o Supabase (DB e Storage), logger e UUID.
 */

// Importa as funções globais do Jest (necessário para o modo ESM)
import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// --- Constantes de Teste ---

/** ID da Instituição (mockado) para ser usado em todos os testes. */
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';

// --- Definição dos Mocks ---

/** Mock completo do módulo de logger. */
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

/** Mock completo do módulo UUID, simulando a função v4. */
const mockUuid = {
    v4: jest.fn(() => 'mock-uuid-12345'),
};

// Mocks fluentes para o Supabase (permite encadeamento: .from().select().eq()...)

/** Mock da função final .order() */
const mockOrder = jest.fn();
/** Mock da função final .single() */
const mockSingle = jest.fn();
/** Mock da função final .eq() do .delete() */
const mockDeleteEq = jest.fn();

/**
 * Objeto mock para a cadeia de query fluente do Supabase.
 */
const mockQueryChain = {};
mockQueryChain.eq = jest.fn(() => mockQueryChain);
mockQueryChain.order = mockOrder;
mockQueryChain.single = mockSingle;
mockQueryChain.select = jest.fn(() => mockQueryChain);

/** Mock da função .insert(), que retorna sua própria cadeia interna. */
const mockInsert = jest.fn(() => ({
    select: jest.fn(() => ({
        single: mockSingle,
    })),
}));

/** Mock da função .update(), que retorna a cadeia de query principal. */
const mockUpdate = jest.fn(() => mockQueryChain);
/** Mock da função .delete(), que retorna sua cadeia específica. */
const mockDelete = jest.fn(() => ({
    eq: mockDeleteEq,
}));
/** Mock da função .select(), que retorna a cadeia de query principal. */
const mockSelect = jest.fn(() => mockQueryChain);

/** Mock da função principal .from() */
const mockFrom = jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
}));

/** Mock para as funções do Supabase Storage. */
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockStorageFrom = jest.fn(() => ({
    upload: mockUpload,
    remove: mockRemove,
}));

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
    storage: {
        from: mockStorageFrom,
    },
};

// --- Aplicação dos Mocks (Modo ESM) ---
// Configura o Jest para interceptar os imports antes que eles aconteçam.

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

/**
 * Cria um objeto 'res' (resposta) mockado para o Express.
 * @returns {object} Objeto 'res' com funções mockadas (status, json).
 */
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Cria um objeto 'req' (requisição) mockado para o Express.
 * @param {object} [user] - Objeto 'user' mockado.
 * @param {object} [body] - Objeto 'body' mockado.
 * @param {object} [params] - Objeto 'params' mockado.
 * @param {object} [file] - Objeto 'file' mockado.
 * @returns {object} Objeto 'req' mockado.
 */
const mockRequest = (user, body, params, file) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    body: body || {},
    params: params || {},
    file: file || null,
});


// --- Suíte de Testes: Contrato Controller ---

describe('Contrato Controller', () => {
    /** @type {object} */
    let res;
    
    // Variáveis para armazenar as funções do controller importadas
    let getContratos, addContrato, deleteContrato;

    /**
     * Antes de todos os testes, importa dinamicamente o controller.
     */
    beforeAll(async () => {
        const controller = await import('../backend/controllers/contrato.controller.js');
        getContratos = controller.getContratos;
        addContrato = controller.addContrato;
        deleteContrato = controller.deleteContrato;
    });

    /**
     * Antes de CADA teste, limpa o histórico de todos os mocks
     * e reinicia o objeto 'res'.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();

        // Limpa mocks fluentes específicos
        mockQueryChain.eq.mockClear();
        mockQueryChain.select.mockClear();
    });

    // --- Testes para getContratos ---
    describe('getContratos', () => {
        it('deve retornar 200 e a lista de contratos da instituição', async () => {
            const req = mockRequest();
            const mockData = [{ id: 1, nome_contrato: 'Contrato 1' }];
            // Cadeia: select -> eq -> order
            mockOrder.mockResolvedValue({ data: mockData, error: null });

            await getContratos(req, res);

            expect(mockFrom).toHaveBeenCalledWith('contrato');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockOrder).toHaveBeenCalledWith('ano_vigencia', { ascending: false });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockData);
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            const req = mockRequest();
            const mockError = new Error('Falha no DB');
            mockOrder.mockResolvedValue({ data: null, error: mockError });

            await getContratos(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar contratos.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro ao buscar contratos.', mockError);
        });
    });

    // --- Testes para addContrato ---
    describe('addContrato', () => {
        const file = {
            originalname: 'documento.pdf',
            buffer: Buffer.from('teste-pdf'),
            mimetype: 'application/pdf',
        };
        const body = {
            nome_contrato: 'Novo Contrato',
            descricao: 'Descrição teste',
            ano_vigencia: '2025', // Enviado como string (comum em forms)
        };
        const user = { id: MOCK_INSTITUICAO_ID };
        const mockFilePath = `${MOCK_INSTITUICAO_ID}/mock-uuid-12345-documento.pdf`;

        it('deve retornar 201 e adicionar o contrato (com upload)', async () => {
            const req = mockRequest(user, body, {}, file);
            const mockResult = { id: 1, ...body, ano_vigencia: 2025, caminho_arquivo: mockFilePath };
            
            mockUpload.mockResolvedValue({ error: null });
            mockSingle.mockResolvedValue({ data: mockResult, error: null });

            await addContrato(req, res);

            // 1. Verifica Upload
            expect(mockUuid.v4).toHaveBeenCalled();
            expect(mockStorageFrom).toHaveBeenCalledWith('contracts');
            expect(mockUpload).toHaveBeenCalledWith(
                mockFilePath,
                file.buffer,
                { contentType: file.mimetype, upsert: false }
            );

            // 2. Verifica Inserção no DB
            expect(mockFrom).toHaveBeenCalledWith('contrato');
            expect(mockInsert).toHaveBeenCalledWith({
                instituicao_id: user.id,
                nome_contrato: body.nome_contrato,
                descricao: body.descricao,
                ano_vigencia: 2025, // Verifica se o controller fez o parseInt
                caminho_arquivo: mockFilePath,
            });
            
            // 3. Verifica Resposta
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Contrato adicionado com sucesso!',
                data: mockResult
            });
            expect(mockRemove).not.toHaveBeenCalled(); // Rollback não deve ser chamado
        });

        it('deve retornar 400 se nenhum arquivo for enviado', async () => {
            const req = mockRequest(user, body, {}, null); // Sem arquivo
            
            await addContrato(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nenhum arquivo de contrato foi enviado.' });
            expect(mockUpload).not.toHaveBeenCalled();
            expect(mockInsert).not.toHaveBeenCalled();
        });
        
        it('deve retornar 500 e fazer rollback se o upload do arquivo falhar', async () => {
            const req = mockRequest(user, body, {}, file);
            const mockUploadError = new Error('Falha no Storage');
            mockUpload.mockResolvedValue({ error: mockUploadError });
            mockRemove.mockResolvedValue({ error: null }); // Mock do rollback

            await addContrato(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao adicionar contrato.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro no processo de adicionar contrato.', mockUploadError);
            expect(mockInsert).not.toHaveBeenCalled(); // Não deve tentar inserir no DB
            
            // Verifica se o Rollback foi chamado (lógica do catch)
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Tentando fazer rollback do arquivo:'));
            expect(mockStorageFrom).toHaveBeenCalledWith('contracts');
            expect(mockRemove).toHaveBeenCalledWith([mockFilePath]);
        });

        it('deve retornar 500 e fazer rollback se a inserção no DB falhar', async () => {
            const req = mockRequest(user, body, {}, file);
            const mockInsertError = new Error('Falha na inserção do DB');
            
            mockUpload.mockResolvedValue({ error: null }); // Upload OK
            mockSingle.mockResolvedValue({ data: null, error: mockInsertError }); // DB Falha
            mockRemove.mockResolvedValue({ error: null }); // Mock do rollback

            await addContrato(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao adicionar contrato.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro no processo de adicionar contrato.', mockInsertError);
            
            // Verifica se o Rollback foi chamado (lógica do catch)
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Tentando fazer rollback do arquivo:'));
            expect(mockStorageFrom).toHaveBeenCalledWith('contracts');
            expect(mockRemove).toHaveBeenCalledWith([mockFilePath]);
        });
    });

    // --- Testes para deleteContrato ---
    describe('deleteContrato', () => {
        const user = { id: MOCK_INSTITUICAO_ID };
        const params = { id: '2' };

        it('deve retornar 200 e deletar o contrato (DB e Storage)', async () => {
            const req = mockRequest(user, {}, params);
            const mockFetch = { caminho_arquivo: `${MOCK_INSTITUICAO_ID}/arquivo-existente.pdf` };
            
            // Etapa 1: Mock do Fetch
            mockSingle.mockResolvedValue({ data: mockFetch, error: null });
            // Etapa 2: Mock do Delete do DB
            mockDeleteEq.mockResolvedValue({ error: null });
            // Etapa 3: Mock do Delete do Storage
            mockRemove.mockResolvedValue({ error: null });

            await deleteContrato(req, res);

            // 1. Verifica Etapa 1 (Fetch)
            expect(mockFrom).toHaveBeenCalledWith('contrato');
            expect(mockSelect).toHaveBeenCalledWith('caminho_arquivo');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('id', '2');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockSingle).toHaveBeenCalled();
            
            // 2. Verifica Etapa 2 (Delete DB)
            expect(mockDelete).toHaveBeenCalled();
            expect(mockDeleteEq).toHaveBeenCalledWith('id', '2');

            // 3. Verifica Etapa 3 (Delete Storage)
            expect(mockStorageFrom).toHaveBeenCalledWith('contracts');
            expect(mockRemove).toHaveBeenCalledWith([mockFetch.caminho_arquivo]);

            // 4. Verifica Resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Contrato deletado com sucesso!' });
        });

        it('deve retornar 404 se o contrato não for encontrado na busca inicial', async () => {
            const req = mockRequest(user, {}, params);
            // Simula o Supabase não encontrando o item (data: null)
            mockSingle.mockResolvedValue({ data: null, error: null });

            await deleteContrato(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Contrato não encontrado ou você não tem permissão para excluí-lo.' });
            expect(mockLogger.warn).toHaveBeenCalledWith(`Contrato ID: 2 não encontrado para exclusão ou usuário sem permissão.`);
            expect(mockDelete).not.toHaveBeenCalled();
            expect(mockRemove).not.toHaveBeenCalled();
        });
        
        it('deve retornar 500 se a exclusão do DB falhar', async () => {
            const req = mockRequest(user, {}, params);
            const mockFetch = { caminho_arquivo: 'caminho.pdf' };
            const mockDbError = new Error('Falha ao deletar do DB');

            mockSingle.mockResolvedValue({ data: mockFetch, error: null }); // Fetch OK
            mockDeleteEq.mockResolvedValue({ error: mockDbError }); // Delete DB Falha

            await deleteContrato(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao deletar contrato.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro ao deletar contrato.', mockDbError);
            expect(mockRemove).not.toHaveBeenCalled(); // Não deve tentar deletar do storage se o DB falhou
        });

        it('deve retornar 200 (e logar um aviso) se a exclusão do Storage falhar', async () => {
            const req = mockRequest(user, {}, params);
            const mockFetch = { caminho_arquivo: 'arquivo-orfao.pdf' };
            const mockStorageError = new Error('Falha no Storage');

            mockSingle.mockResolvedValue({ data: mockFetch, error: null }); // Fetch OK
            mockDeleteEq.mockResolvedValue({ error: null }); // Delete DB OK
            mockRemove.mockResolvedValue({ error: mockStorageError }); // Storage Falha

            await deleteContrato(req, res);
            
            // Verifica o Log de aviso
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Falha ao remover arquivo do Storage para contrato ID: ${params.id}.`, 
                mockStorageError
            );
            
            // Resposta ainda deve ser sucesso
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Contrato deletado com sucesso!' });
        });
    });
});