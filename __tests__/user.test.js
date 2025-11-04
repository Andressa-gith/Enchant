/* eslint-disable no-undef */

/**
 * @file Testes unitários para o user.controller.js
 * @description Suite de testes para o cadastro de instituição (com rollback)
 * e o CRUD de postagens da comunidade.
 * @version 12.0 (Corrigidos os asserts de 'criarPostagem' e 'excluirPostagem')
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';
const MOCK_POST_ID = 99;
const MOCK_FILE_BUFFER = Buffer.from('fake-image-content');
const MOCK_FILE_PATH = `${MOCK_INSTITUICAO_ID}/123456789.png`;
const MOCK_PUBLIC_IMG_URL = 'https://supabase.io/public/imagens-comunidade/img.png';

// --- [INÍCIO MOCKS] ---

// 1. Mock do 'logger'
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: {
        info: mockLoggerInfo,
        debug: mockLoggerDebug,
        warn: mockLoggerWarn,
        error: mockLoggerError,
    },
}));

// 2. Mock do Supabase Client (Cliente Padrão)
const mockAuthSignUp = jest.fn();
const mockStorageGetPublicUrl = jest.fn();
const mockStorageFrom = jest.fn(() => ({
    getPublicUrl: mockStorageGetPublicUrl,
}));

// Mocks FINAIS GLOBAIS (controlados pelos testes)
const mockEnderecoInsertFinal = jest.fn();
const mockTelefoneInsertFinal = jest.fn();
const mockPostInsertFinal = jest.fn();
const mockPostGetFinal = jest.fn();
const mockPostUpdateFinal = jest.fn();
const mockPostDeleteFinal = jest.fn();
const mockPostFetchFinal = jest.fn(); // Para fetch antes do update/delete

// [CORREÇÃO] Mocks da Cadeia 1 (Add Post) precisam ser expostos
const mockAdd_Single = jest.fn(() => mockPostInsertFinal());
const mockAdd_Select = jest.fn(() => ({ single: mockAdd_Single }));
const mockAdd_Insert = jest.fn(() => ({ select: mockAdd_Select })); // <-- VAMOS TESTAR ESTE

// Cadeias de Mock (V11)
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'endereco') {
        return { insert: mockEnderecoInsertFinal };
    }
    if (tableName === 'telefone') {
        return { insert: mockTelefoneInsertFinal };
    }
    if (tableName === 'postagens_comunidade') {
        // Cadeia 2: buscarPostagem -> .select('*').eq().eq().single()
        const get_single = jest.fn(() => mockPostGetFinal());
        const get_eq2 = jest.fn(() => ({ single: get_single }));
        const get_eq1 = jest.fn(() => ({ eq: get_eq2 }));
        
        // Cadeia 3: atualizarPostagem (Fetch) -> .select('*').eq().eq().single()
        const fetch_single = jest.fn(() => mockPostFetchFinal());
        const fetch_eq2 = jest.fn(() => ({ single: fetch_single }));
        const fetch_eq1 = jest.fn(() => ({ eq: fetch_eq2 }));
        
        // Cadeia 4: atualizarPostagem (Update) -> .update().eq().eq().select().single()
        const upd_single = jest.fn(() => mockPostUpdateFinal());
        const upd_select = jest.fn(() => ({ single: upd_single }));
        const upd_eq2 = jest.fn(() => ({ select: upd_select }));
        const upd_eq1 = jest.fn(() => ({ eq: upd_eq2 }));
        const update = jest.fn(() => ({ eq: upd_eq1 }));
        
        // Cadeia 5: excluirPostagem -> .delete().eq().eq()
        const del_eq2 = jest.fn(() => mockPostDeleteFinal());
        const del_eq1 = jest.fn(() => ({ eq: del_eq2 }));
        const del = jest.fn(() => ({ eq: del_eq1 }));

        // Roteador 'select'
        const select = jest.fn((...args) => {
            // Se for .select('*'), é um fetch (buscar, atualizar ou excluir)
            if (args[0] === '*') {
                return { eq: fetch_eq1 }; // Reutiliza a cadeia de fetch
            }
            return { eq: get_eq1 }; // Fallback para a cadeia 'get' normal
        });

        return {
            insert: mockAdd_Insert, // <--- USA O MOCK EXPOSTO
            select,
            update,
            delete: del,
        };
    }
    return {};
});

const mockSupabase = {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
        signUp: mockAuthSignUp,
    }
};

jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));

// 3. Mock do Supabase Admin Client
const mockAdminAuthDeleteUser = jest.fn();
const mockAdminStorageUpload = jest.fn();
const mockAdminStorageRemove = jest.fn();
const mockAdminStorageFrom = jest.fn(() => ({
    upload: mockAdminStorageUpload,
    remove: mockAdminStorageRemove,
}));

const mockSupabaseAdmin = {
    auth: {
        admin: {
            deleteUser: mockAdminAuthDeleteUser,
        }
    },
    storage: {
        from: mockAdminStorageFrom,
    }
};

jest.unstable_mockModule('../backend/db/supabaseAdmin.js', () => ({
    default: mockSupabaseAdmin,
}));

// --- [FIM MOCKS] ---

// --- Helpers de Teste ---
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (user, body, params, file) => ({
    user: user || null,
    body: body || {},
    params: params || {},
    file: file || null, // Mock do multer
});

// --- Suíte de Testes: User Controller ---
describe('User Controller', () => {
    let res;
    let cadastrarInstituicao, criarPostagemComunidade, buscarPostagemComunidade, atualizarPostagemComunidade, excluirPostagemComunidade;
    let consoleWarnSpy; // Spy para o console.warn

    beforeAll(async () => {
        const controller = await import('../backend/controllers/user.controller.js');
        cadastrarInstituicao = controller.cadastrarInstituicao;
        criarPostagemComunidade = controller.criarPostagemComunidade;
        buscarPostagemComunidade = controller.buscarPostagemComunidade;
        atualizarPostagemComunidade = controller.atualizarPostagemComunidade;
        excluirPostagemComunidade = controller.excluirPostagemComunidade;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        
        // Limpa mocks globais
        mockAuthSignUp.mockReset();
        mockEnderecoInsertFinal.mockReset();
        mockTelefoneInsertFinal.mockReset();
        mockPostInsertFinal.mockReset();
        mockPostGetFinal.mockReset();
        mockPostUpdateFinal.mockReset();
        mockPostDeleteFinal.mockReset();
        mockPostFetchFinal.mockReset();
        mockStorageGetPublicUrl.mockReset();
        mockAdminAuthDeleteUser.mockReset();
        mockAdminStorageUpload.mockReset();
        mockAdminStorageRemove.mockReset();
        mockAdd_Insert.mockClear(); // Limpa o mock da cadeia

        // [CORREÇÃO] Espiona o console.warn
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterAll(() => {
        consoleWarnSpy.mockRestore(); // Restaura o console
    });

    // --- Testes para cadastrarInstituicao ---
    describe('cadastrarInstituicao', () => {
        const mockBody = {
            email_contato: 'teste@ong.com',
            senha: 'senha-forte-123',
            nome_instituicao: 'ONG Teste',
            cnpj: '12345678000190',
            tipo_instituicao: 'Privada',
            numero: '11999998888',
            cep: '12345-000',
            bairro: 'Centro',
            cidade: 'São Paulo',
            estado: 'SP'
        };

        it('deve retornar 201 e cadastrar com sucesso', async () => {
            // Arrange
            const req = mockRequest(null, mockBody, null, null);
            const mockAuthData = { user: { id: MOCK_INSTITUICAO_ID } };
            mockAuthSignUp.mockResolvedValue({ data: mockAuthData, error: null });
            mockEnderecoInsertFinal.mockResolvedValue({ error: null });
            mockTelefoneInsertFinal.mockResolvedValue({ error: null });

            // Act
            await cadastrarInstituicao(req, res);

            // Assert
            expect(mockAuthSignUp).toHaveBeenCalled(); // 1. Auth
            expect(mockFrom).toHaveBeenCalledWith('endereco'); // 2. Endereco
            expect(mockFrom).toHaveBeenCalledWith('telefone'); // 3. Telefone
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Instituição cadastrada com sucesso!', userId: MOCK_INSTITUICAO_ID });
            expect(mockAdminAuthDeleteUser).not.toHaveBeenCalled(); // Rollback NÃO foi chamado
        });
        
        it('deve retornar 400 se campos obrigatórios faltarem', async () => {
            // Arrange
            const req = mockRequest(null, { email_contato: 'teste@ong.com' }, null, null); // Falta senha e nome

            // Act
            await cadastrarInstituicao(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Email, senha e nome da instituição são obrigatórios." });
            expect(mockAuthSignUp).not.toHaveBeenCalled();
        });

        it('deve retornar 409 se o email já estiver registrado', async () => {
            // Arrange
            const req = mockRequest(null, mockBody, null, null);
            const mockError = { message: "User already registered" };
            mockAuthSignUp.mockResolvedValue({ data: {}, error: mockError });

            // Act
            await cadastrarInstituicao(req, res);

            // Assert
            expect(mockAuthSignUp).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ message: 'Este endereço de email já está cadastrado.' });
            expect(mockAdminAuthDeleteUser).not.toHaveBeenCalled();
        });

        it('deve retornar 500 e FAZER ROLLBACK se a inserção de Endereço falhar', async () => {
            // Arrange
            const req = mockRequest(null, mockBody, null, null);
            const mockError = new Error('Falha no DB (Endereco)');
            const mockAuthData = { user: { id: MOCK_INSTITUICAO_ID } };
            
            mockAuthSignUp.mockResolvedValue({ data: mockAuthData, error: null }); // 1. Auth OK
            mockEnderecoInsertFinal.mockResolvedValue({ error: mockError }); // 2. Endereco FALHA
            mockAdminAuthDeleteUser.mockResolvedValue({ error: null }); // Rollback OK

            // Act
            await cadastrarInstituicao(req, res);

            // Assert
            expect(mockAuthSignUp).toHaveBeenCalled();
            expect(mockEnderecoInsertFinal).toHaveBeenCalled();
            expect(mockTelefoneInsertFinal).not.toHaveBeenCalled(); // Não tentou inserir telefone
            expect(res.status).toHaveBeenCalledWith(500);

            // 3. Rollback DEVE ser chamado
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Iniciando rollback'));
            expect(mockAdminAuthDeleteUser).toHaveBeenCalledWith(MOCK_INSTITUICAO_ID);
        });
        
        it('deve retornar 500 e FAZER ROLLBACK se a inserção de Telefone falhar', async () => {
            // Arrange
            const req = mockRequest(null, mockBody, null, null);
            const mockError = new Error('Falha no DB (Telefone)');
            const mockAuthData = { user: { id: MOCK_INSTITUICAO_ID } };
            
            mockAuthSignUp.mockResolvedValue({ data: mockAuthData, error: null }); // 1. Auth OK
            mockEnderecoInsertFinal.mockResolvedValue({ error: null }); // 2. Endereco OK
            mockTelefoneInsertFinal.mockResolvedValue({ error: mockError }); // 3. Telefone FALHA
            mockAdminAuthDeleteUser.mockResolvedValue({ error: null }); // Rollback OK

            // Act
            await cadastrarInstituicao(req, res);

            // Assert
            expect(mockAuthSignUp).toHaveBeenCalled();
            expect(mockEnderecoInsertFinal).toHaveBeenCalled();
            expect(mockTelefoneInsertFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);

            // 4. Rollback DEVE ser chamado
            expect(mockAdminAuthDeleteUser).toHaveBeenCalledWith(MOCK_INSTITUICAO_ID);
        });
    });

    // --- Testes para Postagens da Comunidade ---
    describe('Postagens da Comunidade (CRUD)', () => {
        const mockFile = {
            originalname: 'post.png',
            buffer: MOCK_FILE_BUFFER,
            mimetype: 'image/png',
        };
        const mockPost = {
            id: MOCK_POST_ID,
            instituicao_id: MOCK_INSTITUICAO_ID,
            titulo: 'Meu Post',
            conteudo: 'Conteúdo do post',
            caminho_imagem: MOCK_FILE_PATH,
        };

        // --- criarPostagemComunidade ---
        describe('criarPostagemComunidade', () => {
            it('deve retornar 201 e criar postagem (com imagem)', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockPost, null, mockFile);
                mockAdminStorageUpload.mockResolvedValue({ error: null });
                mockPostInsertFinal.mockResolvedValue({ data: mockPost, error: null });

                // Act
                await criarPostagemComunidade(req, res);

                // Assert
                expect(mockAdminStorageUpload).toHaveBeenCalled();
                // [CORREÇÃO] Testa o mock .insert() (mockAdd_Insert), não o mock .single() (mockPostInsertFinal)
                expect(mockAdd_Insert).toHaveBeenCalledWith(expect.objectContaining({
                    caminho_imagem: expect.stringContaining(MOCK_INSTITUICAO_ID)
                }));
                expect(res.status).toHaveBeenCalledWith(201);
                expect(res.json).toHaveBeenCalledWith(mockPost);
            });

            it('deve retornar 201 e criar postagem (sem imagem)', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { conteudo: 'Sem foto' }, null, null);
                mockPostInsertFinal.mockResolvedValue({ data: { ...mockPost, caminho_imagem: null }, error: null });

                // Act
                await criarPostagemComunidade(req, res);

                // Assert
                expect(mockAdminStorageUpload).not.toHaveBeenCalled(); // Sem upload
                // [CORREÇÃO] Testa o mock .insert()
                expect(mockAdd_Insert).toHaveBeenCalledWith(expect.objectContaining({
                    caminho_imagem: null // Confirma que foi nulo
                }));
                expect(res.status).toHaveBeenCalledWith(201);
            });
            
            it('deve retornar 400 se o conteúdo estiver faltando', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { titulo: 'Sem conteúdo' }, null, null);

                // Act
                await criarPostagemComunidade(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith({ message: 'O conteúdo da postagem é obrigatório.' });
            });
        });
        
        // --- buscarPostagemComunidade ---
        describe('buscarPostagemComunidade', () => {
            it('deve retornar 200 e a postagem com URL pública', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: MOCK_POST_ID });
                mockPostFetchFinal.mockResolvedValue({ data: mockPost, error: null });
                mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: MOCK_PUBLIC_IMG_URL } });

                // Act
                await buscarPostagemComunidade(req, res);

                // Assert
                expect(mockPostFetchFinal).toHaveBeenCalled();
                expect(mockStorageGetPublicUrl).toHaveBeenCalledWith(MOCK_FILE_PATH);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    ...mockPost,
                    url_imagem: MOCK_PUBLIC_IMG_URL
                }));
            });

            it('deve retornar 404 se a postagem não for encontrada', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: 404 });
                mockPostFetchFinal.mockResolvedValue({ data: null, error: null });

                // Act
                await buscarPostagemComunidade(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(404);
                expect(res.json).toHaveBeenCalledWith({ message: 'Postagem não encontrada.' });
            });
        });

        // --- atualizarPostagemComunidade ---
        describe('atualizarPostagemComunidade', () => {
            it('deve retornar 200 e atualizar a postagem (substituindo imagem)', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { conteudo: 'Novo conteúdo' }, { id: MOCK_POST_ID }, mockFile);
                
                // 1. Fetch
                mockPostFetchFinal.mockResolvedValue({ data: mockPost, error: null });
                // 2. Remove Imagem Antiga
                mockAdminStorageRemove.mockResolvedValue({ error: null });
                // 3. Upload Imagem Nova
                mockAdminStorageUpload.mockResolvedValue({ error: null });
                // 4. Update DB
                mockPostUpdateFinal.mockResolvedValue({ data: { ...mockPost, conteudo: 'Novo conteúdo' }, error: null });
                
                // Act
                await atualizarPostagemComunidade(req, res);

                // Assert
                expect(mockPostFetchFinal).toHaveBeenCalled(); // 1. Fetch
                expect(mockAdminStorageRemove).toHaveBeenCalledWith([MOCK_FILE_PATH]); // 2. Remove
                expect(mockAdminStorageUpload).toHaveBeenCalled(); // 3. Upload
                expect(mockPostUpdateFinal).toHaveBeenCalled(); // 4. Update
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    message: 'Postagem atualizada com sucesso!'
                }));
            });
            
            it('deve retornar 404 se o fetch inicial falhar', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { conteudo: '...' }, { id: 404 }, mockFile);
                mockPostFetchFinal.mockResolvedValue({ data: null, error: null }); // 1. Fetch falha

                // Act
                await atualizarPostagemComunidade(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(404);
                expect(mockAdminStorageUpload).not.toHaveBeenCalled(); // Não faz upload
                expect(mockPostUpdateFinal).not.toHaveBeenCalled(); // Não faz update
            });
        });
        
        // --- excluirPostagemComunidade ---
        describe('excluirPostagemComunidade', () => {
            it('deve retornar 200 e excluir postagem (e imagem do storage)', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: MOCK_POST_ID });
                
                // 1. Fetch
                mockPostFetchFinal.mockResolvedValue({ data: mockPost, error: null });
                // 2. Remove Storage
                mockAdminStorageRemove.mockResolvedValue({ error: null });
                // 3. Delete DB
                mockPostDeleteFinal.mockResolvedValue({ error: null });

                // Act
                await excluirPostagemComunidade(req, res);

                // Assert
                expect(mockPostFetchFinal).toHaveBeenCalled();
                expect(mockAdminStorageRemove).toHaveBeenCalledWith([MOCK_FILE_PATH]);
                expect(mockPostDeleteFinal).toHaveBeenCalled();
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({ message: 'Postagem excluída com sucesso!' });
            });

            it('deve retornar 200 (com warning) se a exclusão do storage falhar', async () => {
                // Arrange
                const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, null, { id: MOCK_POST_ID });
                const mockStorageError = new Error('Falha no Storage');
                
                // 1. Fetch
                mockPostFetchFinal.mockResolvedValue({ data: mockPost, error: null });
                // 2. Remove Storage (Falha)
                mockAdminStorageRemove.mockResolvedValue({ error: mockStorageError });
                // 3. Delete DB (Sucesso)
                mockPostDeleteFinal.mockResolvedValue({ error: null });

                // Act
                await excluirPostagemComunidade(req, res);

                // Assert
                expect(mockPostFetchFinal).toHaveBeenCalled();
                expect(mockAdminStorageRemove).toHaveBeenCalled();
                expect(mockPostDeleteFinal).toHaveBeenCalled(); // Continua mesmo com falha no storage
                expect(res.status).toHaveBeenCalledWith(200); // Sucesso para o usuário
                
                // [CORREÇÃO] Verifica o spy do console, não o mock do logger
                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    'Erro ao deletar imagem do storage:', mockStorageError
                );
            });
        });
    });
});