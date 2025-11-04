/* eslint-disable no-undef */

/**
 * @file Testes unitários para o doacao.controller.js
 * @description Suite de testes para registrar entradas, múltiplas entradas e retiradas,
 * simulando o Supabase e a lógica de validação de estoque.
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

// --- [INÍCIO] Mocks Fluentes Específicos para Doação ---

// Mocks FINAIS (os que retornam os dados/erros)
const mockEntradaInsertSingleFinal = jest.fn();
const mockEntradaInsertMultiFinal = jest.fn();
const mockEntradaSelectValidationFinal = jest.fn();
const mockSaidaSelectValidationFinal = jest.fn();
const mockSaidaInsertSingleFinal = jest.fn();

// Contadores para rotear as chamadas
let entradaSelectCount = 0;
let saidaSelectCount = 0;

/**
 * Mock da função .from() que age como um "roteador" para este controller.
 * Ele inspeciona a tabela e retorna um objeto de mock com as
 * funções exatas que o controller espera (`insert` ou `select`).
 */
const mockFrom = jest.fn((tableName) => {
    if (tableName === 'doacao_entrada') {
        return {
            /**
             * Mock do .insert() que diferencia entre um objeto (single)
             * e um array (multi).
             */
            insert: (data) => {
                const insertChain = {};
                if (Array.isArray(data)) {
                    // registrarMultiplasDoacoesController chama .insert(arr).select()
                    insertChain.select = mockEntradaInsertMultiFinal;
                } else {
                    // registrarDoacaoController chama .insert(obj).select().single()
                    insertChain.select = () => ({ single: mockEntradaInsertSingleFinal });
                }
                return insertChain;
            },
            /**
             * Mock do .select() para 'doacao_entrada'.
             * Usado pelo registrarRetiradaController para validar o estoque.
             */
            select: () => {
                entradaSelectCount++;
                const selectChain = {};
                selectChain.eq = () => selectChain; // Permite .eq('id', ...).eq('instituicao_id', ...)
                selectChain.single = mockEntradaSelectValidationFinal; // Termina em .single()
                return selectChain;
            }
        };
    }
    if (tableName === 'doacao_saida') {
        return {
            /**
             * Mock do .insert() para 'doacao_saida'.
             * Usado pelo registrarRetiradaController para salvar a retirada.
             */
            insert: () => {
                const insertChain = {};
                insertChain.select = () => ({ single: mockSaidaInsertSingleFinal });
                return insertChain;
            },
            /**
             * Mock do .select() para 'doacao_saida'.
             * Usado pelo registrarRetiradaController para calcular o total já retirado.
             */
            select: () => {
                saidaSelectCount++;
                const selectChain = {};
                // Esta chamada termina em .eq(), não em .single()
                selectChain.eq = mockSaidaSelectValidationFinal; 
                return selectChain;
            }
        };
    }
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
};
// --- [FIM] Mocks ---


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

const mockRequest = (user, body) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    body: body || {},
});


// --- Suíte de Testes: Doacao Controller ---

describe('Doacao Controller', () => {
    /** @type {object} */
    let res;
    let registrarDoacaoController, registrarMultiplasDoacoesController, registrarRetiradaController;

    beforeAll(async () => {
        const controller = await import('../backend/controllers/doacao.controller.js');
        registrarDoacaoController = controller.registrarDoacaoController;
        registrarMultiplasDoacoesController = controller.registrarMultiplasDoacoesController;
        registrarRetiradaController = controller.registrarRetiradaController;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();

        // Reseta os contadores
        entradaSelectCount = 0;
        saidaSelectCount = 0;
    });

    // --- Testes para registrarDoacaoController (Entrada Única) ---
    describe('registrarDoacaoController', () => {
        const mockBody = { categoria_id: 1, quantidade: 10, doador_origem_texto: 'Doador Anônimo' };
        
        it('deve retornar 201 e a doação registrada', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            const mockResult = { id: 1, ...mockBody, instituicao_id: MOCK_INSTITUICAO_ID };
            mockEntradaInsertSingleFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await registrarDoacaoController(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('doacao_entrada');
            expect(mockEntradaInsertSingleFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('deve retornar 400 se a quantidade não for fornecida', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { categoria_id: 1 }); // Sem quantidade
            
            // Act
            await registrarDoacaoController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Dados incompletos. Categoria e quantidade são obrigatórios.' });
            expect(mockEntradaInsertSingleFinal).not.toHaveBeenCalled();
        });

        it('deve retornar 500 se o Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            const mockError = new Error('Falha no DB');
            mockEntradaInsertSingleFinal.mockResolvedValue({ data: null, error: mockError });

            // Act
            await registrarDoacaoController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno no servidor ao registrar a doação.' });
            expect(mockLogger.error).toHaveBeenCalledWith('Erro ao registrar doação de entrada.', mockError);
        });
    });

    // --- Testes para registrarMultiplasDoacoesController (Múltiplas Entradas) ---
    describe('registrarMultiplasDoacoesController', () => {
        const mockBody = [
            { categoria_id: 1, quantidade: 10 },
            { categoria_id: 2, quantidade: 5 }
        ];

        it('deve retornar 201 e a lista de doações registradas', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            const mockResult = [
                { id: 1, ...mockBody[0], instituicao_id: MOCK_INSTITUICAO_ID },
                { id: 2, ...mockBody[1], instituicao_id: MOCK_INSTITUICAO_ID }
            ];
            mockEntradaInsertMultiFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await registrarMultiplasDoacoesController(req, res);

            // Assert
            expect(mockFrom).toHaveBeenCalledWith('doacao_entrada');
            expect(mockEntradaInsertMultiFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: '2 doações registradas com sucesso!', data: mockResult });
        });

        it('deve retornar 400 se o body não for um array', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { not: 'an array' }); // Body inválido
            
            // Act
            await registrarMultiplasDoacoesController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Dados inválidos. É esperado um array de doações.' });
            expect(mockEntradaInsertMultiFinal).not.toHaveBeenCalled();
        });

        it('deve retornar 400 se o array estiver vazio', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, []); // Array vazio
            
            // Act
            await registrarMultiplasDoacoesController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Dados inválidos. É esperado um array de doações.' });
            expect(mockEntradaInsertMultiFinal).not.toHaveBeenCalled();
        });
    });

    // --- Testes para registrarRetiradaController (Saída) ---
    describe('registrarRetiradaController', () => {
        const mockBody = { entrada_id: 10, quantidade_retirada: 20, destinatario: 'Comunidade X' };

        it('deve retornar 201 e registrar a retirada (estoque suficiente)', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            
            // 1. Mock da 1ª chamada (Validação da Entrada)
            const mockEntrada = { quantidade: 100 };
            mockEntradaSelectValidationFinal.mockResolvedValue({ data: mockEntrada, error: null });
            
            // 2. Mock da 2ª chamada (Validação das Saídas Anteriores)
            const mockSaidasAnteriores = [
                { quantidade_retirada: 30 }, { quantidade_retirada: 15 } // Total 45
            ];
            mockSaidaSelectValidationFinal.mockResolvedValue({ data: mockSaidasAnteriores, error: null });
            // Lógica: 100 (total) - 45 (usado) = 55 disponível. Pedido de 20. OK.

            // 3. Mock da 3ª chamada (Insert da Nova Saída)
            const mockResult = { id: 5, ...mockBody, instituicao_id: MOCK_INSTITUICAO_ID };
            mockSaidaInsertSingleFinal.mockResolvedValue({ data: mockResult, error: null });

            // Act
            await registrarRetiradaController(req, res);

            // Assert
            expect(mockEntradaSelectValidationFinal).toHaveBeenCalled();
            expect(mockSaidaSelectValidationFinal).toHaveBeenCalled();
            expect(mockSaidaInsertSingleFinal).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockResult);
        });

        it('deve retornar 400 se a quantidade solicitada for maior que o estoque', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { ...mockBody, quantidade_retirada: 60 });
            
            // 1. Mock da 1ª chamada (Validação da Entrada)
            const mockEntrada = { quantidade: 100 };
            mockEntradaSelectValidationFinal.mockResolvedValue({ data: mockEntrada, error: null });
            
            // 2. Mock da 2ª chamada (Validação das Saídas Anteriores)
            const mockSaidasAnteriores = [
                { quantidade_retirada: 30 }, { quantidade_retirada: 15 } // Total 45
            ];
            mockSaidaSelectValidationFinal.mockResolvedValue({ data: mockSaidasAnteriores, error: null });
            // Lógica: 100 - 45 = 55 disponível. Pedido de 60. FALHA.

            // Act
            await registrarRetiradaController(req, res);

            // Assert
            expect(mockEntradaSelectValidationFinal).toHaveBeenCalled();
            expect(mockSaidaSelectValidationFinal).toHaveBeenCalled();
            expect(mockSaidaInsertSingleFinal).not.toHaveBeenCalled(); // Não deve tentar inserir
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'A quantidade solicitada (60) é maior que o estoque disponível (55).' });
        });

        it('deve retornar 404 se o item de entrada (entrada_id) não for encontrado', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, mockBody);
            
            // 1. Mock da 1ª chamada (Falha)
            mockEntradaSelectValidationFinal.mockResolvedValue({ data: null, error: { message: 'not found' } });
            
            // Act
            await registrarRetiradaController(req, res);

            // Assert
            expect(mockEntradaSelectValidationFinal).toHaveBeenCalled();
            expect(mockSaidaSelectValidationFinal).not.toHaveBeenCalled(); // Não deve continuar
            expect(mockSaidaInsertSingleFinal).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('não encontrado') }));
        });

        it('deve retornar 400 se a quantidade for zero ou negativa', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, { ...mockBody, quantidade_retirada: 0 });
            
            // Act
            await registrarRetiradaController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('maior que zero') }));
            expect(mockEntradaSelectValidationFinal).not.toHaveBeenCalled();
        });
    });
});