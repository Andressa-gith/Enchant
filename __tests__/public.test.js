/* eslint-disable no-undef */

/**
 * @file Testes unitários para o public.controller.js
 * @description Suite de testes para os endpoints públicos, simulando
 * Supabase (DB e Storage), MercadoPago SDK, crypto e geração de comprovantes.
 * @version 9.0.0 (Mock do Supabase reconstruído com implementações explícitas)
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_ONG_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';
const MOCK_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Para referencia_externa
const MOCK_LOGO_URL = 'https://supabase.io/public/logos/logo.png';
const MOCK_FOTO_URL = 'https://supabase.io/public/fotos/foto.png';
const MOCK_POST_IMG_URL = 'https://supabase.io/public/posts/post.png';
const MOCK_PDF_BUFFER = Buffer.from('fake-pdf-content');

// --- [INÍCIO MOCKS] ---

// 1. Mock do 'mercadopago' SDK
const mockPaymentCreate = jest.fn();
const mockPaymentGet = jest.fn();
const mockPaymentInstance = {
    create: mockPaymentCreate,
    get: mockPaymentGet,
};
const mockPayment = jest.fn(() => mockPaymentInstance);
const mockMercadoPagoConfig = jest.fn();

jest.unstable_mockModule('mercadopago', () => ({
    MercadoPagoConfig: mockMercadoPagoConfig,
    Payment: mockPayment,
}));

// 2. Mock do 'crypto'
const mockCryptoUUID = jest.fn(() => MOCK_UUID);
jest.unstable_mockModule('crypto', () => ({
    default: {
        randomUUID: mockCryptoUUID,
    },
}));

// 3. Mock do 'comprovante.js'
const mockGenerateDonationReceipt = jest.fn();
jest.unstable_mockModule('../backend/utils/comprovante.js', () => ({
    generateDonationReceipt: mockGenerateDonationReceipt,
}));

// 4. Mock do Supabase Client [RECONSTRUÍDO V9 - ESTÁVEL]
const mockStorageGetPublicUrl = jest.fn();
const mockStorageUpload = jest.fn(); // Async
const mockStorageFrom = jest.fn(() => ({
    getPublicUrl: mockStorageGetPublicUrl,
    upload: mockStorageUpload,
}));

// [A CORREÇÃO] Mock simples. Os testes vão definir o comportamento.
const mockFrom = jest.fn();
const mockSupabase = {
    from: mockFrom,
    storage: { from: mockStorageFrom }
};

jest.unstable_mockModule('../backend/db/supabaseClient.js', () => ({
    default: mockSupabase,
}));

// 5. Mocks do Console
let consoleLogSpy, consoleErrorSpy, consoleWarnSpy;
// --- [FIM MOCKS] ---

// --- Helpers de Teste ---
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.sendStatus = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (body, query, params) => ({
    body: body || {},
    query: query || {},
    params: params || {},
});

// --- Configuração de Ambiente (process.env) ---
const originalEnv = process.env;

beforeAll(() => {
    jest.resetModules();
    process.env = {
        ...originalEnv,
        MERCADO_PAGO_ACCESS_TOKEN: 'mock-global-access-token',
        BASE_URL: 'http://localhost:3000',
    };
});

afterAll(() => {
    process.env = originalEnv;
});

// --- Suíte de Testes: Public Controller ---
describe('Public Controller', () => {
    let res;
    let PublicController;

    beforeAll(async () => {
        const controllerModule = await import('../backend/controllers/public.controller.js');
        PublicController = controllerModule.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        
        // Limpa o mock principal
        mockFrom.mockReset();
        mockStorageGetPublicUrl.mockReset();
        mockStorageUpload.mockReset();
        
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    // --- Testes para listarOngsTodas ---
    describe('listarOngsTodas', () => {
        it('deve retornar 200 e ONGs formatadas (com e sem logo)', async () => {
            // Arrange
            const req = mockRequest();
            const mockData = [
                { id: 'ong1', nome: 'ONG 1', caminho_logo: 'logo1.png', sobre: '...' },
                { id: 'ong2', nome: 'ONG 2', caminho_logo: null, sobre: '...' }
            ];
            const mockChain = { select: jest.fn(() => Promise.resolve({ data: mockData, error: null })) };
            mockFrom.mockReturnValue(mockChain);
            mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: MOCK_LOGO_URL } });

            // Act
            await PublicController.listarOngsTodas(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockChain.select).toHaveBeenCalledWith('id, nome, caminho_logo, sobre');
            expect(mockStorageGetPublicUrl).toHaveBeenCalledTimes(1);
            expect(mockStorageGetPublicUrl).toHaveBeenCalledWith('logo1.png');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'ong1', caminho_logo: MOCK_LOGO_URL }),
                expect.objectContaining({ id: 'ong2', caminho_logo: null }),
            ]);
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest();
            const mockError = new Error('Falha no DB');
            const mockChain = { select: jest.fn(() => Promise.resolve({ data: null, error: mockError })) };
            mockFrom.mockReturnValue(mockChain);

            // Act
            await PublicController.listarOngsTodas(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao buscar organizações.' });
        });
    });
    
    // --- Testes para listarOngs ---
    describe('listarOngs', () => {
        it('deve retornar 200 e apenas ONGs conectadas ao MP', async () => {
            // Arrange
            const req = mockRequest();
            const mockData = [{ id: 'ong1', nome: 'ONG 1', caminho_logo: null, sobre: '...' }];
            const mockEq = jest.fn(() => Promise.resolve({ data: mockData, error: null }));
            const mockChain = { select: jest.fn(() => ({ eq: mockEq })) };
            mockFrom.mockReturnValue(mockChain);

            // Act
            await PublicController.listarOngs(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockChain.select).toHaveBeenCalledWith('id, nome, caminho_logo, sobre');
            expect(mockEq).toHaveBeenCalledWith('mp_connected', true);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'ong1' }),
            ]);
        });
    });

    // --- Testes para getDadosTransparencia ---
    describe('getDadosTransparencia', () => {
        // Mock de dados completo para evitar o TypeError
        const ongData = { id: MOCK_ONG_ID, nome: 'ONG Teste', caminho_logo: 'logo.png', caminho_foto_perfil: 'foto.png', endereco: { cidade: 'Recife', estado: 'PE' }, telefone: { numero: '11912345678' } };
        const ongDataIncompleta = { id: MOCK_ONG_ID, nome: 'ONG', endereco: null, telefone: null, caminho_logo: null, caminho_foto_perfil: null };

        // Mocks de cadeia individuais
        const mockOngRes = jest.fn();
        const mockDocRes = jest.fn();
        const mockRelRes = jest.fn();
        const mockGesRes = jest.fn();
        const mockDoeaRes = jest.fn();
        const mockDoesRes = jest.fn();
        const mockContRes = jest.fn();
        const mockParcRes = jest.fn();
        const mockAudRes = jest.fn();

        beforeEach(() => {
            // Reinicia todos os mocks de resultado do Promise.all
            mockOngRes.mockReset();
            mockDocRes.mockReset();
            mockRelRes.mockReset();
            mockGesRes.mockReset();
            mockDoeaRes.mockReset();
            mockDoesRes.mockReset();
            mockContRes.mockReset();
            mockParcRes.mockReset();
            mockAudRes.mockReset();

            // Configura o roteador mockFrom
            mockFrom.mockImplementation((tableName) => {
                switch (tableName) {
                    case 'instituicao':
                        return { select: () => ({ eq: () => ({ single: mockOngRes }) }) };
                    case 'documento_comprobatorio':
                        return { select: () => ({ eq: () => ({ eq: mockDocRes }) }) }; // .eq().eq()
                    case 'relatorio':
                        return { select: () => ({ eq: mockRelRes }) };
                    case 'gestao_financeira':
                        return { select: () => ({ eq: mockGesRes }) };
                    case 'doacao_entrada':
                        return { select: () => ({ eq: mockDoeaRes }) };
                    case 'doacao_saida':
                        return { select: () => ({ eq: mockDoesRes }) };
                    case 'contrato':
                        return { select: () => ({ eq: mockContRes }) };
                    case 'parceiro':
                        return { select: () => ({ eq: mockParcRes }) };
                    case 'nota_auditoria':
                        return { select: () => ({ eq: mockAudRes }) };
                    default:
                        return { select: () => ({ eq: () => ({ single: jest.fn() }) }) };
                }
            });
        });

        it('deve retornar 400 se o ID não for fornecido', async () => {
            // Arrange
            const req = mockRequest(null, {}, null);
            // Act
            await PublicController.getDadosTransparencia(req, res);
            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'ID da instituição não fornecido.' });
        });

        it('deve retornar 200 e todos os dados de transparência', async () => {
            // Arrange
            const req = mockRequest(null, { id: MOCK_ONG_ID }, null);
            
            // Enfileira as 9 respostas
            mockOngRes.mockResolvedValue({ data: ongData, error: null });
            mockDocRes.mockResolvedValue({ data: [{ id: 'doc1' }], error: null });
            mockRelRes.mockResolvedValue({ data: [{ id: 'rel1' }], error: null });
            mockGesRes.mockResolvedValue({ data: [{ id: 'fin1' }], error: null });
            mockDoeaRes.mockResolvedValue({ data: [{ id: 'in1' }], error: null });
            mockDoesRes.mockResolvedValue({ data: [{ id: 'out1' }], error: null });
            mockContRes.mockResolvedValue({ data: [{ id: 'cont1' }], error: null });
            mockParcRes.mockResolvedValue({ data: [{ id: 'parc1' }], error: null });
            mockAudRes.mockResolvedValue({ data: [{ id: 'aud1' }], error: null });

            mockStorageGetPublicUrl
                .mockReturnValueOnce({ data: { publicUrl: MOCK_LOGO_URL } })
                .mockReturnValueOnce({ data: { publicUrl: MOCK_FOTO_URL } });

            // Act
            await PublicController.getDadosTransparencia(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledTimes(9);
            expect(mockStorageFrom).toHaveBeenCalledWith('logos');
            expect(mockStorageFrom).toHaveBeenCalledWith('profile-photos');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                ong: expect.objectContaining({ nome: 'ONG Teste' }),
                documentos: [{ id: 'doc1' }],
            }));
        });
        
        it('deve retornar 500 se uma das buscas falhar', async () => {
            // Arrange
            const req = mockRequest(null, { id: MOCK_ONG_ID }, null);
            const mockError = new Error('Falha no DB');
            
            // [CORREÇÃO] Mock de dados completo para evitar TypeError
            mockOngRes.mockResolvedValue({ data: ongDataIncompleta, error: null }); // Sucesso
            mockDocRes.mockResolvedValue({ data: [{ id: 'doc1' }], error: null }); // Sucesso
            mockRelRes.mockResolvedValue({ data: null, error: mockError }); // FALHA
            // O restante não será chamado

            // Act
            await PublicController.getDadosTransparencia(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            // O erro agora é o erro correto (Falha no DB), não um TypeError
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Erro ao buscar relatórios') });
        });
    });

    // --- Testes para listarTodasPostagens ---
    describe('listarTodasPostagens', () => {
        it('deve retornar 200 e postagens formatadas', async () => {
            // Arrange
            const req = mockRequest();
            const mockData = [
                { id: 'post1', titulo: 'Post 1', caminho_imagem: 'img1.png', instituicao_id: 'ong1', instituicao: { id: 'ong1', nome: 'ONG 1', caminho_logo: 'logo1.png' } },
                { id: 'post2', titulo: 'Post 2', caminho_imagem: null, instituicao_id: 'ong2', instituicao: { id: 'ong2', nome: 'ONG 2', caminho_logo: null } }
            ];
            const mockOrder = jest.fn(() => Promise.resolve({ data: mockData, error: null }));
            const mockChain = { select: jest.fn(() => ({ order: mockOrder })) };
            mockFrom.mockReturnValue(mockChain);
            
            mockStorageGetPublicUrl
                .mockReturnValueOnce({ data: { publicUrl: MOCK_POST_IMG_URL } }) // img1.png
                .mockReturnValueOnce({ data: { publicUrl: MOCK_LOGO_URL } });   // logo1.png
                // Post 2 não chama, usa fallbacks

            // Act
            await PublicController.listarTodasPostagens(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('postagens_comunidade');
            expect(mockStorageFrom).toHaveBeenCalledWith('imagens-comunidade');
            expect(mockStorageFrom).toHaveBeenCalledWith('logos');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'post1', url_imagem: MOCK_POST_IMG_URL }),
                expect.objectContaining({ id: 'post2', url_imagem: null }),
            ]);
        });

        it('deve filtrar postagens sem instituição (órfãs)', async () => {
            // Arrange
            const req = mockRequest();
            const mockData = [
                { id: 'post1', titulo: 'Post 1', instituicao_id: 'ong1', instituicao: { id: 'ong1', nome: 'ONG 1', caminho_logo: null } },
                { id: 'post2', titulo: 'Post Órfão', instituicao_id: 'ong2', instituicao: null } // Instituição nula
            ];
            const mockOrder = jest.fn(() => Promise.resolve({ data: mockData, error: null }));
            const mockChain = { select: jest.fn(() => ({ order: mockOrder })) };
            mockFrom.mockReturnValue(mockChain);
            mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: MOCK_LOGO_URL } }); // Mock para o Post 1

            // Act
            await PublicController.listarTodasPostagens(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.length).toBe(1); // Filtrou o post órfão
            expect(responseData[0].id).toBe('post1');
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('não possui instituição associada'));
        });
    });

    // --- Testes para listarAtividadesDoacoes ---
    describe('listarAtividadesDoacoes', () => {
        it('deve retornar 200 e atividades formatadas', async () => {
            // Arrange
            const req = mockRequest(null, { limit: 3 }, null);
            const mockData = [
                { id: 'd1', quantidade: 10, data_entrada: '2023-01-01', categoria: { nome: 'Roupas' }, instituicao: { id: 'ong1', nome: 'ONG 1' } },
                { id: 'd2', quantidade: 5, data_entrada: '2023-01-02', categoria: null, instituicao: null } // Testa fallbacks
            ];
            const mockLimit = jest.fn(() => Promise.resolve({ data: mockData, error: null }));
            const mockOrder = jest.fn(() => ({ limit: mockLimit }));
            const mockChain = { select: jest.fn(() => ({ order: mockOrder })) };
            mockFrom.mockReturnValue(mockChain);

            // Act
            await PublicController.listarAtividadesDoacoes(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('doacao_entrada');
            expect(mockOrder).toHaveBeenCalledWith('data_entrada', { ascending: false });
            expect(mockLimit).toHaveBeenCalledWith(3);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ instituicao_nome: 'ONG 1', categoria_nome: 'Roupas' }),
                expect.objectContaining({ instituicao_nome: 'ONG', categoria_nome: 'itens' }), // Fallbacks
            ]);
        });
    });

    // --- Testes para criarCobrancaPix ---
    describe('criarCobrancaPix', () => {
        const mockPixResponse = { point_of_interaction: { transaction_data: { qr_code: 'PIX-QRCODE', qr_code_base64: 'PIX-BASE64' } } };
        const mockReqBody = { ongId: MOCK_ONG_ID, valor: 50.00, nomeDoador: 'Doador', emailDoador: 'doador@teste.com' };

        // Mocks de cadeia individuais
        const mockGetOng = jest.fn();
        const mockInsertDoc = jest.fn();

        beforeEach(() => {
            mockGetOng.mockReset();
            mockInsertDoc.mockReset();

            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'instituicao') {
                    return { select: () => ({ eq: () => ({ single: mockGetOng }) }) };
                }
                if (tableName === 'documento_comprobatorio') {
                    return { insert: mockInsertDoc };
                }
            });
        });

        it('deve retornar 201 com dados do PIX', async () => {
            // Arrange
            const req = mockRequest(mockReqBody);
            mockGetOng.mockResolvedValue({ data: { mp_access_token: 'ONG-TOKEN-123' }, error: null });
            mockInsertDoc.mockResolvedValue({ error: null }); 
            mockPaymentCreate.mockResolvedValue(mockPixResponse);

            // Act
            await PublicController.criarCobrancaPix(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockFrom).toHaveBeenCalledWith('documento_comprobatorio');
            expect(mockInsertDoc).toHaveBeenCalledWith(expect.objectContaining({
                referencia_externa: MOCK_UUID
            }));
            expect(mockMercadoPagoConfig).toHaveBeenCalledWith({ accessToken: 'ONG-TOKEN-123' });
            expect(mockPaymentCreate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                externalReference: MOCK_UUID
            }));
        });

        it('deve retornar 400 se a ONG não tiver token', async () => {
            // Arrange
            const req = mockRequest(mockReqBody);
            mockGetOng.mockResolvedValue({ data: null, error: null }); 
            
            // Act
            await PublicController.criarCobrancaPix(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
        });
        
        it('deve retornar 500 se o MercadoPago falhar', async () => {
            // Arrange
            const req = mockRequest(mockReqBody);
            const mockMpError = new Error('Falha no MP');
            
            mockGetOng.mockResolvedValue({ data: { mp_access_token: 'ONG-TOKEN-123' }, error: null });
            mockInsertDoc.mockResolvedValue({ error: null }); 
            mockPaymentCreate.mockRejectedValue(mockMpError);
            
            // Act
            await PublicController.criarCobrancaPix(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Não foi possível gerar o PIX.' });
        });
    });

    // --- Testes para receberWebhook ---
    describe('receberWebhook', () => {
        const mockReqBody = { type: 'payment', data: { id: 'payment-123' } };
        const mockPaymentInfo = { 
            status: 'approved', 
            external_reference: MOCK_UUID,
            transaction_amount: 100.00,
            id: 'payment-123',
            payer: { first_name: 'Doador' }
        };
        
        // Mocks de cadeia individuais
        const mockGetDoc = jest.fn();
        const mockGetOng = jest.fn();
        const mockUpdateDoc = jest.fn();

        beforeEach(() => {
            mockGetDoc.mockReset();
            mockGetOng.mockReset();
            mockUpdateDoc.mockReset();

            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'documento_comprobatorio') {
                    return { select: () => ({ eq: () => ({ single: mockGetDoc }) }), update: () => ({ eq: mockUpdateDoc }) };
                }
                if (tableName === 'instituicao') {
                    return { select: () => ({ eq: () => ({ single: mockGetOng }) }) };
                }
            });
        });

        it('deve retornar 200 e processar um pagamento aprovado', async () => {
            // Arrange
            const req = mockRequest(mockReqBody);
            mockPaymentGet.mockResolvedValue(mockPaymentInfo);
            
            mockGetDoc.mockResolvedValue({ data: { instituicao_id: MOCK_ONG_ID, titulo: 'Intenção de Doação de Doador' }, error: null });
            mockGetOng.mockResolvedValue({ data: { nome: 'ONG Teste', caminho_logo: 'logo.png' }, error: null });
            mockUpdateDoc.mockResolvedValue({ error: null });
            
            mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: MOCK_LOGO_URL } });
            mockStorageUpload.mockResolvedValue({ error: null });
            mockGenerateDonationReceipt.mockResolvedValue(MOCK_PDF_BUFFER);

            // Act
            await PublicController.receberWebhook(req, res);

            // Assert
            expect(mockPaymentGet).toHaveBeenCalledWith({ id: 'payment-123' });
            expect(mockFrom).toHaveBeenCalledWith('documento_comprobatorio');
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockGenerateDonationReceipt).toHaveBeenCalled();
            expect(mockStorageFrom).toHaveBeenCalledWith('comprovantes');
            expect(mockStorageUpload).toHaveBeenCalled();
            expect(mockUpdateDoc).toHaveBeenCalled();
            expect(res.sendStatus).toHaveBeenCalledWith(200);
        });
        
        it('deve retornar 500 se o upload do recibo falhar', async () => {
            // Arrange
            const req = mockRequest(mockReqBody);
            const mockUploadError = new Error('Falha no Storage Upload');

            mockPaymentGet.mockResolvedValue(mockPaymentInfo);
            mockGetDoc.mockResolvedValue({ data: { instituicao_id: MOCK_ONG_ID, titulo: 'Intenção' }, error: null });
            mockGetOng.mockResolvedValue({ data: { nome: 'ONG', caminho_logo: null }, error: null });
            mockGenerateDonationReceipt.mockResolvedValue(MOCK_PDF_BUFFER);
            mockStorageUpload.mockResolvedValue({ error: mockUploadError }); // Upload falha

            // Act
            await PublicController.receberWebhook(req, res);

            // Assert
            expect(mockGenerateDonationReceipt).toHaveBeenCalled();
            expect(mockStorageUpload).toHaveBeenCalled();
            expect(mockUpdateDoc).not.toHaveBeenCalled(); // Não deve atualizar o DB
            expect(res.sendStatus).toHaveBeenCalledWith(500);
        });
    });

    // --- Testes para verificarStatusDoacao ---
    describe('verificarStatusDoacao', () => {
        const mockGetStatus = jest.fn();
        
        beforeEach(() => {
            mockGetStatus.mockReset();
            mockFrom.mockImplementation((tableName) => {
                if (tableName === 'documento_comprobatorio') {
                    return { select: () => ({ eq: () => ({ single: mockGetStatus }) }) };
                }
            });
        });

        it('deve retornar 200 e o status "confirmado"', async () => {
            // Arrange
            const req = mockRequest(null, null, { refExterna: MOCK_UUID });
            mockGetStatus.mockResolvedValue({ data: { status: 'confirmado' }, error: null });

            // Act
            await PublicController.verificarStatusDoacao(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('documento_comprobatorio');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ status: 'confirmado' });
        });

        it('deve retornar 404 se a referência não for encontrada', async () => {
            // Arrange
            const req = mockRequest(null, null, { refExterna: 'uuid-ruim' });
            mockGetStatus.mockResolvedValue({ data: null, error: null }); // Não achou

            // Act
            await PublicController.verificarStatusDoacao(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ status: 'não encontrado' });
        });
    });
});