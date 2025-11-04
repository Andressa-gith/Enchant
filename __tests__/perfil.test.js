/* eslint-disable no-undef */

/**
 * @file Testes unitários para o perfil.controller.js
 * @description Suite de testes para o gerenciamento de perfil de usuário,
 * simulando o Supabase Admin Client (auth, storage, from) e o Logger.
 * @version 1.1.0 (Corrigidos mocks fluentes de update/upsert e fallback de getPublicUrl)
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_USUARIO_ID = 'user_123456';
const MOCK_USER_EMAIL = 'teste@exemplo.com';

const MOCK_PROFILE_DATA_DB = {
    nome: 'Instituição Teste',
    email_contato: 'contato@teste.com',
    cnpj: '12345678000190',
    caminho_foto_perfil: 'public/foto.png',
    caminho_logo: 'public/logo.png',
    telefone: { numero: '11999998888' }, // Supabase retorna como objeto (não array)
    endereco: { cidade: 'São Paulo', estado: 'SP' }, // Supabase retorna como objeto
    primeiro_login: true,
    sobre: 'Uma descrição sobre a instituição',
    mp_connected: false
};

const MOCK_PROFILE_DATA_DB_ARRAY_RELATIONS = {
    ...MOCK_PROFILE_DATA_DB,
    telefone: [{ numero: '11999998888' }], // Testando o fallback de array
    endereco: [{ cidade: 'São Paulo', estado: 'SP' }] // Testando o fallback de array
};

const MOCK_SIGNED_URL_FOTO = 'https://supabase.io/storage/foto_assinada?token=123';
const MOCK_SIGNED_URL_LOGO = 'https://supabase.io/storage/logo_assinada?token=456';
const MOCK_PUBLIC_URL_FOTO = 'https://supabase.io/storage/public/foto.png';
const MOCK_PUBLIC_URL_LOGO = 'https://supabase.io/storage/public/logo.png';

// --- [INÍCIO MOCKS] ---

// 1. Mock do Logger
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

const mockLogger = {
    info: mockLoggerInfo,
    debug: mockLoggerDebug,
    warn: mockLoggerWarn,
    error: mockLoggerError,
};

// 2. Mock do Supabase Admin
// Mocks FINAIS (Promises resolvidas)
const mockSelectSingleFinal = jest.fn();
const mockUpdateInstituicaoFinal = jest.fn();
const mockUpsertTelefoneFinal = jest.fn();
const mockUpsertEnderecoFinal = jest.fn();
const mockAuthAdminUpdateFinal = jest.fn();
const mockCreateSignedUrlFoto = jest.fn();
const mockGetPublicUrlFoto = jest.fn();
const mockCreateSignedUrlLogo = jest.fn();
const mockGetPublicUrlLogo = jest.fn();

// Mocks de CADEIA
// .from('instituicao').select(...).eq(...).single()
const mockSelectEq = jest.fn(() => ({ single: mockSelectSingleFinal }));
const mockSelect = jest.fn(() => ({ eq: mockSelectEq }));

// .from('instituicao').update(...).eq(...)
// [CORREÇÃO] A chamada .eq() É o mock final, não uma função que o retorna.
const mockUpdateEq = mockUpdateInstituicaoFinal;
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

// .from('telefone').upsert(...)
// [CORREÇÃO] A chamada .upsert() É o mock final.
const mockUpsertTelefone = mockUpsertTelefoneFinal;

// .from('endereco').upsert(...)
// [CORREÇÃO] A chamada .upsert() É o mock final.
const mockUpsertEndereco = mockUpsertEnderecoFinal;

// .storage.from('profile-photos')...
const mockStorageProfilePhotos = {
    createSignedUrl: mockCreateSignedUrlFoto,
    getPublicUrl: mockGetPublicUrlFoto,
};

// .storage.from('logos')...
const mockStorageLogos = {
    createSignedUrl: mockCreateSignedUrlLogo,
    getPublicUrl: mockGetPublicUrlLogo,
};

/**
 * Mock da função .from() do Supabase (para tabelas)
 */
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'instituicao') return { select: mockSelect, update: mockUpdate };
    if (tableName === 'telefone') return { upsert: mockUpsertTelefone };
    if (tableName === 'endereco') return { upsert: mockUpsertEndereco };
});

/**
 * Mock da função .from() do Supabase Storage
 */
const mockStorageFrom = jest.fn((bucketName) => {
    if (bucketName === 'profile-photos') return mockStorageProfilePhotos;
    if (bucketName === 'logos') return mockStorageLogos;
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
    auth: {
        admin: {
            updateUserById: mockAuthAdminUpdateFinal,
        }
    },
    storage: {
        from: mockStorageFrom,
    }
};

// --- [FIM MOCKS] ---

// --- Aplicação dos Mocks (Modo ESM) ---

// Mock do Supabase Admin Client
jest.unstable_mockModule('../backend/db/supabaseAdmin.js', () => ({
    default: mockSupabase,
}));

// Mock do Logger
jest.unstable_mockModule('../backend/utils/logger.js', () => ({
    default: mockLogger,
}));

// --- Helpers de Teste ---

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (user, body) => ({
    user: user || null,
    body: body || {},
});

// --- Suíte de Testes: UserProfile Controller ---

describe('UserProfile Controller', () => {
    let res;
    let UserProfileController;

    beforeAll(async () => {
        // Importa o controller (default export) APÓS os mocks
        const controllerModule = await import('../backend/controllers/perfil.controller.js');
        UserProfileController = controllerModule.default;
    });

    beforeEach(() => {
        // Limpa todos os mocks antes de cada teste
        jest.clearAllMocks();
        res = mockResponse();
    });

    // --- Testes para getProfile ---
    describe('getProfile', () => {
        it('deve retornar 200 e dados do perfil com URLs assinadas', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL });
            mockSelectSingleFinal.mockResolvedValue({ data: MOCK_PROFILE_DATA_DB, error: null });
            mockCreateSignedUrlFoto.mockResolvedValue({ data: { signedUrl: MOCK_SIGNED_URL_FOTO }, error: null });
            mockCreateSignedUrlLogo.mockResolvedValue({ data: { signedUrl: MOCK_SIGNED_URL_LOGO }, error: null });

            // Act
            await UserProfileController.getProfile(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('caminho_foto_perfil'));
            expect(mockSelectEq).toHaveBeenCalledWith('id', MOCK_USUARIO_ID);
            expect(mockStorageFrom).toHaveBeenCalledWith('profile-photos');
            expect(mockCreateSignedUrlFoto).toHaveBeenCalledWith('public/foto.png', 3600);
            expect(mockStorageFrom).toHaveBeenCalledWith('logos');
            expect(mockCreateSignedUrlLogo).toHaveBeenCalledWith('public/logo.png', 3600);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                id: MOCK_USUARIO_ID,
                email: MOCK_USER_EMAIL,
                nome: MOCK_PROFILE_DATA_DB.nome,
                telefone: MOCK_PROFILE_DATA_DB.telefone.numero,
                cidade: MOCK_PROFILE_DATA_DB.endereco.cidade,
                url_foto_perfil: MOCK_SIGNED_URL_FOTO,
                url_logo: MOCK_SIGNED_URL_LOGO,
            }));
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('enviados com sucesso'));
        });

        it('deve retornar 200 e usar URLs públicas como fallback se a URL assinada falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL });
            const mockUrlError = new Error('Falha ao assinar URL');
            mockSelectSingleFinal.mockResolvedValue({ data: MOCK_PROFILE_DATA_DB, error: null });
            
            // Foto falha e usa fallback
            mockCreateSignedUrlFoto.mockResolvedValue({ data: null, error: mockUrlError });
            mockGetPublicUrlFoto.mockReturnValue({ data: { publicUrl: MOCK_PUBLIC_URL_FOTO } });
            
            // Logo funciona
            mockCreateSignedUrlLogo.mockResolvedValue({ data: { signedUrl: MOCK_SIGNED_URL_LOGO }, error: null });

            // Act
            await UserProfileController.getProfile(req, res);

            // Assert
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Falha ao gerar URL assinada para foto'), mockUrlError);
            expect(mockGetPublicUrlFoto).toHaveBeenCalledWith('public/foto.png');
            expect(mockGetPublicUrlLogo).not.toHaveBeenCalled(); // Não deve chamar o fallback do logo

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                url_foto_perfil: MOCK_PUBLIC_URL_FOTO, // Usou o fallback
                url_logo: MOCK_SIGNED_URL_LOGO, // Usou a assinada
            }));
        });
        
        it('deve retornar 200 e lidar com relações (telefone/endereco) como arrays', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL });
            // Usa a constante que simula o Supabase retornando arrays
            mockSelectSingleFinal.mockResolvedValue({ data: MOCK_PROFILE_DATA_DB_ARRAY_RELATIONS, error: null });
            
            // Simula falha na assinatura de URL (para simplificar)
            mockCreateSignedUrlFoto.mockResolvedValue({ data: null, error: new Error('sem foto') });
            mockCreateSignedUrlLogo.mockResolvedValue({ data: null, error: new Error('sem logo') });

            // [CORREÇÃO] Adiciona os mocks de FALLBACK que estavam faltando
            // O teste falhou com 500 porque esta lógica de fallback não estava mockada
            mockGetPublicUrlFoto.mockReturnValue({ data: { publicUrl: MOCK_PUBLIC_URL_FOTO } });
            mockGetPublicUrlLogo.mockReturnValue({ data: { publicUrl: MOCK_PUBLIC_URL_LOGO } });

            // Act
            await UserProfileController.getProfile(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200); // Agora deve passar
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                // Verifica se ele pegou o primeiro item do array
                telefone: MOCK_PROFILE_DATA_DB_ARRAY_RELATIONS.telefone[0].numero,
                cidade: MOCK_PROFILE_DATA_DB_ARRAY_RELATIONS.endereco[0].cidade,
                url_foto_perfil: MOCK_PUBLIC_URL_FOTO, // Verifica o fallback
                url_logo: MOCK_PUBLIC_URL_LOGO,     // Verifica o fallback
            }));
        });

        it('deve retornar 404 se o perfil não for encontrado na tabela instituicao', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL });
            mockSelectSingleFinal.mockResolvedValue({ data: null, error: null }); // Data é nulo, sem erro

            // Act
            await UserProfileController.getProfile(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Usuário não encontrado.' });
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Perfil não encontrado'));
        });
        
        it('deve retornar 500 se a busca no Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL });
            const mockError = new Error('Falha no DB');
            mockSelectSingleFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await UserProfileController.getProfile(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao buscar dados do perfil.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao buscar dados do perfil'), mockError);
        });
    });

    // --- Testes para updateProfile ---
    describe('updateProfile', () => {
        it('deve retornar 200 após atualizar todos os campos (Auth, Instituicao, Telefone, Endereco)', async () => {
            // Arrange
            const req = mockRequest(
                { id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL },
                {
                    nome: 'Novo Nome',
                    email: 'novo@email.com', // Email diferente do req.user
                    senha: 'novasenha123',
                    telefone: '11988887777',
                    cidade: 'Recife',
                    estado: 'PE'
                }
            );
            // Mocks de sucesso para todas as chamadas
            mockAuthAdminUpdateFinal.mockResolvedValue({ error: null });
            mockUpdateInstituicaoFinal.mockResolvedValue({ error: null });
            mockUpsertTelefoneFinal.mockResolvedValue({ error: null });
            mockUpsertEnderecoFinal.mockResolvedValue({ error: null });

            // Act
            await UserProfileController.updateProfile(req, res);

            // Assert
            // 1. Verificou Auth
            expect(mockAuthAdminUpdateFinal).toHaveBeenCalledWith(MOCK_USUARIO_ID, {
                email: 'novo@email.com',
                password: 'novasenha123'
            });
            // 2. Verificou Instituicao
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Novo Nome' }));
            // 3. Verificou Telefone
            expect(mockFrom).toHaveBeenCalledWith('telefone');
            expect(mockUpsertTelefone).toHaveBeenCalledWith(
                { numero: '11988887777', instituicao_id: MOCK_USUARIO_ID },
                { onConflict: 'instituicao_id' }
            );
            // 4. Verificou Endereco
            expect(mockFrom).toHaveBeenCalledWith('endereco');
            expect(mockUpsertEndereco).toHaveBeenCalledWith(
                { cidade: 'Recife', estado: 'PE', instituicao_id: MOCK_USUARIO_ID },
                { onConflict: 'instituicao_id' }
            );
            
            // 5. Verificou Resposta
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Perfil atualizado com sucesso!' });
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Perfil do usuário ID: user_123456 atualizado com sucesso.'));
        });

        it('deve pular chamadas de update se os dados não forem fornecidos', async () => {
            // Arrange
            const req = mockRequest(
                { id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL },
                {
                    nome: 'Apenas o Nome', // Apenas um campo
                    email: MOCK_USER_EMAIL, // email é o mesmo do req.user, então não deve atualizar
                }
            );
            mockUpdateInstituicaoFinal.mockResolvedValue({ error: null });

            // Act
            await UserProfileController.updateProfile(req, res);

            // Assert
            // NÃO deve chamar Auth, Telefone ou Endereco
            expect(mockAuthAdminUpdateFinal).not.toHaveBeenCalled();
            expect(mockUpsertTelefone).not.toHaveBeenCalled();
            expect(mockUpsertEndereco).not.toHaveBeenCalled();

            // DEVE chamar apenas a atualização da Instituicao
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Apenas o Nome' }));

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('deve retornar 409 se o e-mail (auth) já estiver em uso', async () => {
            // Arrange
            const req = mockRequest(
                { id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL },
                { email: 'email@jaemuso.com' } // Email diferente
            );
            // Simula erro de conflito do Supabase Auth
            const mockConflictError = new Error('Email already in use');
            mockConflictError.message = 'unique constraint'; // O controller checa a mensagem
            mockAuthAdminUpdateFinal.mockResolvedValue({ error: mockConflictError });
            
            // Act
            await UserProfileController.updateProfile(req, res);

            // Assert
            expect(mockAuthAdminUpdateFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ message: 'Este e-mail já está em uso.' });
            expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('e-mail que já está em uso'));
            // Não deve tentar atualizar as outras tabelas
            expect(mockUpdate).not.toHaveBeenCalled(); 
        });
        
        it('deve retornar 500 se a atualização da instituicao falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID, email: MOCK_USER_EMAIL }, { nome: 'Novo Nome' });
            const mockError = new Error('Falha no update da instituicao');
            // [CORREÇÃO] O mock agora retorna o erro corretamente
            mockUpdateInstituicaoFinal.mockResolvedValue({ error: mockError }); // Falha aqui

            // Act
            await UserProfileController.updateProfile(req, res);

            // Assert
            expect(mockUpdate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500); // Agora deve passar
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao atualizar o perfil.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao atualizar o perfil'), mockError);
        });
    });

    // --- Testes para marcarTutorialVisto ---
    describe('marcarTutorialVisto', () => {
        it('deve retornar 200 ao marcar o tutorial como visto', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID });
            mockUpdateInstituicaoFinal.mockResolvedValue({ error: null });

            // Act
            await UserProfileController.marcarTutorialVisto(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockUpdate).toHaveBeenCalledWith({ primeiro_login: false });
            expect(mockUpdateEq).toHaveBeenCalledWith('id', MOCK_USUARIO_ID);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tutorial marcado como concluído.' });
            expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Status do tutorial atualizado'));
        });
        
        it('deve retornar 500 se o update do Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID });
            const mockError = new Error('Falha no DB');
            // [CORREÇÃO] O mock agora retorna o erro corretamente
            mockUpdateInstituicaoFinal.mockResolvedValue({ error: mockError });

            // Act
            await UserProfileController.marcarTutorialVisto(req, res);

            // Assert
            expect(mockUpdate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500); // Agora deve passar
            expect(res.json).toHaveBeenCalledWith({ message: 'Não foi possível atualizar o status do tutorial.' });
            expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('Erro ao marcar tutorial'), mockError);
        });
    });

    // --- Testes para logout ---
    describe('logout', () => {
        it('deve retornar 200 (função de sinalização)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_USUARIO_ID });

            // Act
            await UserProfileController.logout(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Logout sinalizado pelo servidor.' });
            expect(mockLoggerInfo).toHaveBeenCalledWith('Requisição de logout recebida no servidor.');
        });
    });
});