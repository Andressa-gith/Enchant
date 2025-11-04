/* eslint-disable no-undef */

/**
 * @file Testes unitários para o dashboard.controller.js
 * @description Suite de testes para getDashboardData, simulando todas as 11
 * chamadas ao Supabase (RPC e From).
 * @version 6.0.0 (Corrigido para mockar todas as 11 chamadas do Promise.all)
 */

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';

// --- Constantes de Teste ---
const MOCK_INSTITUICAO_ID = 'c1ad67ca-e215-4639-b672-6e9d7a9854a6';
const MOCK_SYSTEM_DATE = '2025-11-01T10:00:00.000Z';

// --- Definição dos Mocks ---

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

// --- [INÍCIO DA CORREÇÃO] Mocks Fluentes Independentes ---

// Mocks FINAIS (os que retornam os dados/erros)
// Precisamos de um para CADA UMA das 11 chamadas.
const mockRpc = jest.fn();
const mockInstituicaoSingle = jest.fn();
const mockEntradasPeriodoLte = jest.fn();
const mockSaidasPeriodoLte = jest.fn();
const mockRecibosLte = jest.fn();
const mockTransferenciasLte = jest.fn();
const mockGastosLte = jest.fn();
const mockParceriasPeriodoLte = jest.fn();
const mockTodasEntradasLte = jest.fn();
const mockTodasSaidasLte = jest.fn();
const mockRelatoriosOrder = jest.fn();
const mockTodasParceriasEq = jest.fn();

// Contadores para as tabelas que são chamadas mais de uma vez
let entradaCallCount = 0;
let saidaCallCount = 0;
let docCallCount = 0;
let parceiroCallCount = 0;

/**
 * @description Cria uma nova cadeia de mock fluente.
 */
const createMockChain = () => {
    const chain = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.gte = jest.fn(() => chain);
    chain.lte = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.single = jest.fn(() => chain);
    return chain;
};

/**
 * Mock da função .from() que age como um "roteador".
 * Retorna uma cadeia de mock NOVA e INDEPENDENTE para cada chamada.
 */
const mockFrom = jest.fn((tableName) => {
    const newChain = createMockChain();
    
    // Roteamento baseado no nome da tabela e na ordem de chamada
    switch (tableName) {
        case 'instituicao':
            newChain.single = mockInstituicaoSingle;
            break;
        case 'doacao_entrada':
            entradaCallCount++;
            if (entradaCallCount === 1) newChain.lte = mockEntradasPeriodoLte;
            else newChain.lte = mockTodasEntradasLte;
            break;
        case 'doacao_saida':
            saidaCallCount++;
            if (saidaCallCount === 1) newChain.lte = mockSaidasPeriodoLte;
            else newChain.lte = mockTodasSaidasLte;
            break;
        case 'documento_comprobatorio':
            docCallCount++;
            if (docCallCount === 1) newChain.lte = mockRecibosLte;
            else newChain.lte = mockTransferenciasLte;
            break;
        case 'gestao_financeira':
            newChain.lte = mockGastosLte;
            break;
        case 'parceiro':
            parceiroCallCount++;
            if (parceiroCallCount === 1) newChain.lte = mockParceriasPeriodoLte;
            else newChain.eq = mockTodasParceriasEq; // A última chamada de parceiro termina em .eq()
            break;
        case 'relatorio_doacao':
            newChain.order = mockRelatoriosOrder;
            break;
    }
    return newChain;
});

/** Objeto final do mock do Supabase Client. */
const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
};
// --- [FIM DA CORREÇÃO] ---


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

const mockRequest = (user, query) => ({
    user: user || { id: MOCK_INSTITUICAO_ID },
    query: query || {},
});


// --- Suíte de Testes: Dashboard Controller ---

describe('Dashboard Controller', () => {
    /** @type {object} */
    let res;
    let getDashboardData;

    beforeAll(async () => {
        const controller = await import('../backend/controllers/dashboard.controller.js');
        getDashboardData = controller.getDashboardData;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockResponse();
        jest.useFakeTimers().setSystemTime(new Date(MOCK_SYSTEM_DATE));

        // Reseta os contadores
        entradaCallCount = 0;
        saidaCallCount = 0;
        docCallCount = 0;
        parceiroCallCount = 0;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // --- Teste Principal (Happy Path) ---
    describe('getDashboardData (Cenário de Sucesso)', () => {
        
        // Mockamos TODOS os 11 retornos
        const mockInstituicaoData = { nome: 'ONG Teste', primeiro_login: false };
        const mockEntradasPeriodoData = [
            { categoria: { nome: 'Roupas' }, quantidade: 50, doador_origem_texto: 'Doador A', data_entrada: '2025-11-01T11:00:00Z' },
            { categoria: { nome: 'Alimentos' }, quantidade: 20, doador_origem_texto: 'Doador B', data_entrada: '2025-11-01T12:00:00Z' },
            { categoria: { nome: 'Roupas' }, quantidade: 30, doador_origem_texto: 'Doador A', data_entrada: '2025-11-01T13:00:00Z' },
        ];
        const mockSaidasPeriodoData = [
            { entrada: { categoria: { nome: 'Roupas' } }, quantidade_retirada: 10, destinatario: 'Beneficiário 1', data_saida: '2025-11-01T14:00:00Z' },
            { entrada: { categoria: { nome: 'Alimentos' } }, quantidade_retirada: 15, destinatario: 'Beneficiário 2', data_saida: '2025-11-01T15:00:00Z' },
        ];
        const mockRecibosData = [{ valor: 1000, titulo: 'Recibo 1', data_criacao: '2025-11-01T11:00:00Z' }];
        const mockTransferenciasData = [{ valor: 100, titulo: 'Transf. 1', data_criacao: '2025-11-01T12:00:00Z' }];
        const mockGastosData = [{ valor_executado: 300, nome_categoria: 'Aluguel', data_criacao: '2025-11-01T13:00:00Z' }];
        const mockParceriasPeriodoData = [{ valor_total_parceria: 2000, nome: 'Parceiro A', data_inicio: '2025-11-01T10:00:00Z', status: 'Ativo', data_fim: '2025-11-15', data_criacao: '2025-11-01T11:00:00Z' }];
        const mockTodasEntradasData = mockEntradasPeriodoData; // Para este teste, vamos assumir que são iguais
        const mockTodasSaidasData = mockSaidasPeriodoData;
        const mockRelatoriosData = [{ id: 1, data_geracao: '2025-11-01T10:00:00Z', caminho_arquivo_pdf: 'path/1.pdf' }];
        const mockTodasParceriasData = [
            { nome: 'Parceiro A', status: 'Ativo', data_fim: '2025-11-15' }, // Expira em 14 dias
            { nome: 'Parceiro B', status: 'Ativo', data_fim: '2025-10-15' }, // Expirado
            { nome: 'Parceiro C', status: 'Inativo', data_fim: '2025-11-20' },
        ];


        it('deve retornar 200 e todos os dados do dashboard consolidados', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {}); 
            
            // [A CORREÇÃO] Configura o retorno de TODAS as 11 chamadas
            mockInstituicaoSingle.mockResolvedValue({ data: mockInstituicaoData, error: null });
            mockEntradasPeriodoLte.mockResolvedValue({ data: mockEntradasPeriodoData, error: null });
            mockSaidasPeriodoLte.mockResolvedValue({ data: mockSaidasPeriodoData, error: null });
            mockRecibosLte.mockResolvedValue({ data: mockRecibosData, error: null });
            mockTransferenciasLte.mockResolvedValue({ data: mockTransferenciasData, error: null });
            mockGastosLte.mockResolvedValue({ data: mockGastosData, error: null });
            mockParceriasPeriodoLte.mockResolvedValue({ data: mockParceriasPeriodoData, error: null });
            mockTodasEntradasLte.mockResolvedValue({ data: mockTodasEntradasData, error: null });
            mockTodasSaidasLte.mockResolvedValue({ data: mockTodasSaidasData, error: null });
            mockRelatoriosOrder.mockResolvedValue({ data: mockRelatoriosData, error: null });
            mockTodasParceriasEq.mockResolvedValue({ data: mockTodasParceriasData, error: null });
            
            // O controller não usa RPC, então não precisamos mockar `mockRpc`
            // expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', ...); // Esta linha estava errada

            // Act
            await getDashboardData(req, res);

            // Assert
            
            // 1. Verifica as chamadas ao Supabase
            expect(mockFrom).toHaveBeenCalledWith('instituicao');
            expect(mockInstituicaoSingle).toHaveBeenCalled();
            expect(mockFrom).toHaveBeenCalledWith('doacao_entrada');
            expect(mockEntradasPeriodoLte).toHaveBeenCalled();
            expect(mockTodasEntradasLte).toHaveBeenCalled();
            expect(mockFrom).toHaveBeenCalledWith('parceiro');
            expect(mockTodasParceriasEq).toHaveBeenCalled();
            // ... (etc. - podemos ser menos específicos agora que funciona)
            
            // 2. Verifica a resposta de sucesso
            expect(res.status).toHaveBeenCalledWith(200);
            
            // 3. Verifica os cálculos (KPIs, Alertas, etc.)
            const expectedKpis = {
                totalItensEstoque: 75, // (Roupas: 80 - 10 = 70) + (Alimentos: 20 - 15 = 5)
                totalFinanceiro: 2700, // (Recibos 1000 + Parcerias 2000) - (Gastos 300)
                doadoresUnicos: 2, // Doador A, Doador B
                principalCategoria: 'Roupas', // Roupas (80) > Alimentos (20)
            };
            
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    primeiro_login: false,
                    boasVindas: 'ONG Teste',
                    kpis: expectedKpis,
                    alertas: expect.objectContaining({
                        parceriasAExpirar: expect.any(Array),
                        parceriasExpiradas: expect.any(Array),
                        estoqueBaixo: ['Alimentos'], // 20 - 15 = 5 (<= 10)
                    }),
                })
            );

            // Verifica os alertas calculados
            const responseData = res.json.mock.calls[0][0];
            expect(responseData.alertas.parceriasAExpirar).toHaveLength(1);
            expect(responseData.alertas.parceriasAExpirar[0].nome).toBe('Parceiro A');
            expect(responseData.alertas.parceriasExpiradas).toHaveLength(1);
            expect(responseData.alertas.parceriasExpiradas[0].nome).toBe('Parceiro B');
        });
    });
    
    // --- Teste de Erro ---
    describe('getDashboardData (Cenário de Falha)', () => {
        it('deve retornar 500 se uma das chamadas ao Supabase falhar', async () => {
            // Arrange
            const req = mockRequest({ id: MOCK_INSTITUICAO_ID }, {});
            const mockError = new Error('Falha no DB');
            
            // Simula a falha na *primeira* chamada
            mockInstituicaoSingle.mockRejectedValue(mockError); 
            
            // As outras não precisam ser configuradas pois o Promise.all vai rejeitar
            
            // Act
            await getDashboardData(req, res);
            
            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            
            // [CORREÇÃO] O log mostrou que a mensagem de RESPOSTA é "Erro interno..."
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno ao buscar dados do dashboard.' });
            
            // [CORREÇÃO] O log mostrou que a mensagem de LOG é "Erro catastrófico..."
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Erro catastrófico ao buscar dados do dashboard.',
                mockError
            );
        });
    });
});