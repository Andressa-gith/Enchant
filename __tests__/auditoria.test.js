/* eslint-disable no-undef */

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
 * Funções como .eq() e .select() retornam este mesmo objeto
 * para permitir o encadeamento.
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
 * @returns {object} Objeto 'res' com funções mockadas (status, json, send).
 */
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Cria um objeto 'req' (requisição) mockado para o Express.
 * @param {object} [user] - Objeto 'user' mockado (padrão: MOCK_INSTITUICAO_ID).
 * @param {object} [body] - Objeto 'body' mockado (padrão: {}).
 * @param {object} [params] - Objeto 'params' mockado (padrão: {}).
 * @param {object} [file] - Objeto 'file' mockado (padrão: null).
 * @returns {object} Objeto 'req' mockado.
 */
const mockRequest = (user, body, params, file) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    body: body || {},
    params: params || {},
    file: file || null,
});


// --- Suíte de Testes: Auditoria Controller ---

describe('Auditoria Controller', () => {
    /** @type {object} */
    let res;
    
    // Variáveis para armazenar as funções do controller importadas
    let getAuditorias, addAuditoria, updateAuditoriaStatus, deleteAuditoria;

    /**
     * Antes de todos os testes, importa dinamicamente o controller.
     * Isso garante que os mocks sejam aplicados ANTES do controller ser carregado.
     */
    beforeAll(async () => {
        const controller = await import('../backend/controllers/auditoria.controller.js');
        getAuditorias = controller.getAuditorias;
        addAuditoria = controller.addAuditoria;
        updateAuditoriaStatus = controller.updateAuditoriaStatus;
        deleteAuditoria = controller.deleteAuditoria;
    });

    /**
     * Antes de CADA teste, limpa o histórico de todos os mocks
     * e reinicia o objeto 'res'.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();

        // Limpa mocks fluentes específicos que podem reter chamadas
        mockQueryChain.eq.mockClear();
        mockQueryChain.select.mockClear();
    });

    // --- Testes para getAuditorias ---
    describe('getAuditorias', () => {
        it('deve retornar 200 e a lista de auditorias da instituição', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID });
            const mockData = [{ id: 1, titulo: 'Auditoria 1' }];
            mockOrder.mockResolvedValue({ data: mockData, error: null });

            await getAuditorias(req, res);

            expect(mockFrom).toHaveBeenCalledWith('nota_auditoria');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockOrder).toHaveBeenCalledWith('data_auditoria', { ascending: false });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockData);
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID });
            const mockError = new Error('Falha no DB');
            mockOrder.mockResolvedValue({ data: null, error: mockError });

            await getAuditorias(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar auditorias.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro ao buscar auditorias.', mockError);
        });
    });

    // --- Testes para addAuditoria ---
    describe('addAuditoria', () => {
        const file = {
            originalname: 'relatorio.pdf',
            buffer: Buffer.from('teste'),
            mimetype: 'application/pdf',
        };
        const body = {
            titulo: 'Nova Auditoria',
            data_auditoria: '2025-01-01',
            tipo: 'Auditoria interna',
            status: 'Em andamento',
        };
        const user = { id: MOCK_INSTITUICAO_ID };
        const mockFilePath = `${MOCK_INSTITUICAO_ID}/mock-uuid-12345-relatorio.pdf`;

        it('deve retornar 201 e adicionar a auditoria (com upload)', async () => {
            const req = mockRequest(user, body, {}, file);
            const mockResult = { id: 1, ...body, caminho_arquivo: mockFilePath };
            mockUpload.mockResolvedValue({ error: null });
            mockSingle.mockResolvedValue({ data: mockResult, error: null });

            await addAuditoria(req, res);

            expect(mockUuid.v4).toHaveBeenCalled();
            expect(mockStorageFrom).toHaveBeenCalledWith('audit');
            expect(mockUpload).toHaveBeenCalledWith(
                mockFilePath,
                file.buffer,
                { contentType: file.mimetype, upsert: false }
            );
            expect(mockFrom).toHaveBeenCalledWith('nota_auditoria');
            expect(mockInsert).toHaveBeenCalledWith({
                instituicao_id: user.id,
                titulo: body.titulo,
                data_auditoria: body.data_auditoria,
                tipo: body.tipo,
                status: body.status,
                caminho_arquivo: mockFilePath,
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Auditoria adicionada com sucesso!',
                data: mockResult
            });
            expect(mockRemove).not.toHaveBeenCalled();
        });

        it('deve retornar 400 se nenhum arquivo for enviado', async () => {
            const req = mockRequest(user, body, {}, null); 
            await addAuditoria(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nenhum arquivo de auditoria foi enviado.' });
            expect(mockUpload).not.toHaveBeenCalled();
            expect(mockInsert).not.toHaveBeenCalled();
        });
        
        it('deve retornar 500 se o upload do arquivo falhar', async () => {
            const req = mockRequest(user, body, {}, file);
            const mockUploadError = new Error('Falha no Storage');
            mockUpload.mockResolvedValue({ error: mockUploadError });

            await addAuditoria(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao adicionar auditoria.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro no processo de adicionar auditoria.', mockUploadError);
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('deve retornar 500 e fazer rollback do arquivo se a inserção no DB falhar', async () => {
            const req = mockRequest(user, body, {}, file);
            const mockInsertError = new Error('Falha na inserção do DB');
            mockUpload.mockResolvedValue({ error: null });
            mockSingle.mockResolvedValue({ data: null, error: mockInsertError });
            mockRemove.mockResolvedValue({ error: null });

            await addAuditoria(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao adicionar auditoria.' });
            expect(mockLogger.warn).toHaveBeenCalledWith('Erro ao inserir no banco. Iniciando rollback do arquivo no Storage...');
            expect(mockStorageFrom).toHaveBeenCalledWith('audit');
            expect(mockRemove).toHaveBeenCalledWith([mockFilePath]);
        });
    });

    // --- Testes para updateAuditoriaStatus ---
    describe('updateAuditoriaStatus', () => {
        const user = { id: MOCK_INSTITUICAO_ID };
        const params = { id: '1' };
        
        it('deve retornar 200 e atualizar o status', async () => {
            const body = { status: 'Aprovado' };
            const req = mockRequest(user, body, params);
            const mockResult = { id: '1', status: 'Aprovado' };
            mockSingle.mockResolvedValue({ data: mockResult, error: null });

            await updateAuditoriaStatus(req, res);

            expect(mockFrom).toHaveBeenCalledWith('nota_auditoria');
            expect(mockUpdate).toHaveBeenCalledWith({ status: 'Aprovado' });
            expect(mockQueryChain.eq).toHaveBeenCalledWith('id', '1');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockQueryChain.select).toHaveBeenCalledWith();
            expect(mockSingle).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Status atualizado com sucesso!',
                data: mockResult
            });
        });

        it('deve retornar 400 se o status não for fornecido', async () => {
            const req = mockRequest(user, {}, params);
            await updateAuditoriaStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Novo status não fornecido.' });
            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('deve retornar 404 se a auditoria não for encontrada (erro PGRST116)', async () => {
            const body = { status: 'Aprovado' };
            const req = mockRequest(user, body, params);
            const mockError = { code: 'PGRST116' };
            mockSingle.mockResolvedValue({ data: null, error: mockError });
            
            await updateAuditoriaStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Auditoria não encontrada ou você não tem permissão para alterá-la.' });
        });

        it('deve retornar 500 para outros erros do DB', async () => {
            const body = { status: 'Aprovado' };
            const req = mockRequest(user, body, params);
            const mockError = new Error('Erro genérico do DB');
            mockSingle.mockResolvedValue({ data: null, error: mockError });
            
            await updateAuditoriaStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao atualizar status.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro ao atualizar status da auditoria.', mockError);
        });
    });

    // --- Testes para deleteAuditoria ---
    describe('deleteAuditoria', () => {
        const user = { id: MOCK_INSTITUICAO_ID };
        const params = { id: 'auditoria-2' };

        it('deve retornar 200 e deletar a auditoria (DB e Storage)', async () => {
            const req = mockRequest(user, {}, params);
            const mockFetch = { caminho_arquivo: `${MOCK_INSTITUICAO_ID}/arquivo-para-deletar.pdf` };
            
            // Etapa 1: Mock do Fetch
            mockSingle.mockResolvedValue({ data: mockFetch, error: null });
            // Etapa 2: Mock do Delete do DB
            mockDeleteEq.mockResolvedValue({ error: null });
            // Etapa 3: Mock do Delete do Storage
            mockRemove.mockResolvedValue({ error: null });

            await deleteAuditoria(req, res);

            // Verifica Etapa 1 (Fetch)
            expect(mockFrom).toHaveBeenCalledWith('nota_auditoria');
            expect(mockSelect).toHaveBeenCalledWith('caminho_arquivo');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'auditoria-2');
            expect(mockQueryChain.eq).toHaveBeenCalledWith('instituicao_id', MOCK_INSTITUICAO_ID);
            expect(mockSingle).toHaveBeenCalled();
            
            // Verifica Etapa 2 (Delete DB)
            expect(mockDelete).toHaveBeenCalled();
            expect(mockDeleteEq).toHaveBeenCalledWith('id', 'auditoria-2');

            // Verifica Etapa 3 (Delete Storage)
            expect(mockStorageFrom).toHaveBeenCalledWith('audit');
            expect(mockRemove).toHaveBeenCalledWith([mockFetch.caminho_arquivo]);

            // Verifica Resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nota de auditoria deletada com sucesso!' });
        });

        it('deve retornar 404 se a auditoria não for encontrada na busca inicial', async () => {
            const req = mockRequest(user, {}, params);
            const mockError = new Error('Não encontrado');
            mockSingle.mockResolvedValue({ data: null, error: mockError });

            await deleteAuditoria(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nota de auditoria não encontrada ou você não tem permissão.' });
            expect(mockDelete).not.toHaveBeenCalled();
            expect(mockRemove).not.toHaveBeenCalled();
        });
        
        it('deve retornar 500 se a exclusão do DB falhar', async () => {
            const req = mockRequest(user, {}, params);
            const mockFetch = { caminho_arquivo: 'caminho.pdf' };
            const mockDbError = new Error('Falha ao deletar do DB');

            mockSingle.mockResolvedValue({ data: mockFetch, error: null });
            mockDeleteEq.mockResolvedValue({ error: mockDbError });

            await deleteAuditoria(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao deletar nota de auditoria.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro ao deletar nota de auditoria.', mockDbError);
            expect(mockRemove).not.toHaveBeenCalled();
        });

        it('deve retornar 200 (e logar um aviso) se a exclusão do Storage falhar', async () => {
            const req = mockRequest(user, {}, params);
            const mockFetch = { caminho_arquivo: 'arquivo-orfao.pdf' };
            const mockStorageError = new Error('Falha no Storage');

            mockSingle.mockResolvedValue({ data: mockFetch, error: null });
            mockDeleteEq.mockResolvedValue({ error: null });
            mockRemove.mockResolvedValue({ error: mockStorageError });

            await deleteAuditoria(req, res);
            
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Falha ao remover arquivo do Storage para auditoria ID: ${params.id}.`, 
                mockStorageError
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nota de auditoria deletada com sucesso!' });
        });
    });
});