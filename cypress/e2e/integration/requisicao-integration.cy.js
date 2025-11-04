/**
 * @file cypress/e2e/integration/requisicao-integration.cy.js
 * @summary Testes de INTEGRAÇÃO para a "Página de Requisição" (/requisicao).
 * 
 * @description
 * Esta suíte valida a integração entre o Frontend e sistemas externos:
 * - **ViaCEP API**: Busca automática de endereço por CEP
 * - **IBGE API**: Carregamento de municípios por UF (requisição em cascata)
 * - **Backend**: Envio e processamento de requisição completa
 * 
 * **Escopo:** Apenas testes de integração (comunicação entre sistemas).
 * **Exclusões:** Validações client-side, regras de UI, formatação de campos.
 * 
 * @requires cypress/fixtures/documento-teste.pdf
 * @see requisicao.html
 * @see requisicao.js
 */

describe('Página de Requisição (/requisicao) - Testes de Integração', () => {

  /**
   * @function beforeEach
   * @description
   * Hook de configuração executado antes de cada teste.
   * 
   * **Responsabilidades:**
   * 1. Simula respostas de APIs externas (ViaCEP, IBGE)
   * 2. Simula resposta do backend de cadastro
   * 3. Garante estado limpo para cada teste
   * 
   * **Estratégia de Mocking:**
   * - APIs externas são mockadas para evitar dependências de rede
   * - Dados simulados refletem cenários reais de sucesso
   * - Aliases (@getCep, @getCidades) facilitam sincronização nos testes
   */
  beforeEach(() => {
    
    /**
     * MOCK 1: API ViaCEP
     * 
     * **Endpoint Real:** https://viacep.com.br/ws/{cep}/json/
     * **Motivação:** CEP '40000-000' retorna erro na API real
     * **Estratégia:** Simular resposta de sucesso com dados da Bahia
     * 
     * @returns {Object} Dados de endereço simulados
     * @property {string} cep - CEP formatado
     * @property {string} uf - UF para acionar busca de cidades (BA)
     * @property {string} localidade - Cidade pré-selecionada
     */
    cy.intercept('GET', 'https://viacep.com.br/ws/*/json/', {
      statusCode: 200,
      body: {
        "cep": "40000-000",
        "logradouro": "Avenida Teste Cypress",
        "bairro": "Centro",
        "localidade": "Salvador",
        "uf": "BA"
      }
    }).as('getCep');
    
    /**
     * MOCK 2: API IBGE - Municípios por Estado
     * 
     * **Endpoint Real:** https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios
     * **Padrão de Cascata:** Só é chamado após sucesso do ViaCEP
     * **Fluxo:** ViaCEP retorna "uf": "BA" → Script JS chama IBGE com BA
     * 
     * @requires Mock anterior retornar "uf": "BA"
     * @alias getCidades - Usado para sincronização em cascata
     */
    cy.intercept('GET', 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/BA/municipios')
      .as('getCidades');

    /**
     * MOCK 3: Backend - Envio de Requisição
     * 
     * **Endpoint:** POST /api/requisicao/enviar
     * **Payload:** FormData com dados cadastrais + arquivos
     * **Propósito:** Isolar teste de integração do processamento real do servidor
     * 
     * @returns {Object} Resposta de sucesso simulada
     */
    cy.intercept('POST', '/api/requisicao/enviar', {
      statusCode: 200,
      body: { message: 'A sua solicitação foi enviada.' }
    }).as('postRequisicao');

    // Carrega a página sob teste
    cy.visit('/requisicao');
  });

  /**
   * @test Integração com APIs Externas (ViaCEP + IBGE)
   * 
   * @description
   * **Cenário:** Usuário digita CEP válido e aguarda preenchimento automático
   * 
   * **Fluxo de Integração Testado:**
   * 1. Frontend captura evento blur do campo CEP
   * 2. Frontend → ViaCEP: Busca dados do endereço
   * 3. ViaCEP → Frontend: Retorna UF = "BA"
   * 4. Frontend → IBGE: Busca municípios da BA (cascata)
   * 5. IBGE → Frontend: Retorna lista de cidades
   * 6. Frontend atualiza campos Estado e Cidade automaticamente
   * 
   * **Pontos de Validação:**
   * - Requisições em cascata executadas na ordem correta
   * - Campos preenchidos com dados das APIs
   * - Campo Cidade habilitado após retorno do IBGE
   * 
   * @requires Mocks: @getCep, @getCidades
   */
  it('Deve integrar com APIs externas (ViaCEP + IBGE) e preencher campos', () => {
    
    /**
     * AÇÃO 1: Simula preenchimento de CEP pelo usuário
     * 
     * **Detalhe Crítico:** .blur() é ESSENCIAL
     * O requisicao.js só dispara a busca no evento 'blur' (ao sair do campo)
     */
    cy.get('#req_cep').type('40000-000').blur();
    
    /**
     * VALIDAÇÃO 1: Sincronização com APIs
     * 
     * Aguarda ambas as requisições em cascata completarem.
     * Sem os wait(), o teste pode verificar campos antes do preenchimento.
     */
    cy.wait('@getCep');      // Aguarda ViaCEP retornar
    cy.wait('@getCidades');  // Aguarda IBGE retornar (após ViaCEP)

    /**
     * VALIDAÇÃO 2: Efeitos Colaterais da Integração
     * 
     * Verifica que os dados das APIs foram processados corretamente:
     * - Campo Estado preenchido com "BA" (do ViaCEP)
     * - Campo Cidade preenchido com "Salvador" (do ViaCEP + validação IBGE)
     * - Campo Cidade habilitado (script JS remove 'disabled' após IBGE)
     */
    cy.get('#req_estado').should('have.value', 'BA');
    cy.get('#req_cidade').should('have.value', 'Salvador');
    cy.get('#req_cidade').should('not.be.disabled');
  });

  /**
   * @test Integração Completa: Frontend → Backend (Fluxo End-to-End)
   * 
   * @description
   * **Cenário:** Usuário completa o cadastro em duas etapas e envia para o servidor
   * 
   * **Fluxo Completo Testado:**
   * 
   * **ETAPA 1 - Dados Cadastrais:**
   * 1. Preenchimento de formulário
   * 2. Integração com APIs externas (CEP/Cidade)
   * 3. Validação e navegação para próxima etapa
   * 
   * **ETAPA 2 - Upload de Documentos:**
   * 1. Upload de múltiplos arquivos
   * 2. Validação de quantidade mínima (3 docs)
   * 3. Submissão via FormData
   * 
   * **INTEGRAÇÃO FINAL:**
   * - Frontend → Backend: POST com dados + arquivos
   * - Backend → Frontend: Confirmação de sucesso
   * - Frontend: Redirecionamento para /entrar
   * 
   * @requires cypress/fixtures/documento-teste.pdf
   * @requires Mocks: @getCep, @getCidades, @postRequisicao
   */
  it('Deve enviar formulário completo para o backend', () => {
    
    // ============================================
    // ETAPA 1: DADOS CADASTRAIS
    // ============================================
    
    /**
     * Preenchimento de Campos Obrigatórios
     * 
     * Ordem de preenchimento segue a lógica do formulário HTML.
     * Todos os campos são obrigatórios para passar na validação.
     */
    cy.get('#req_nome_instituicao').type('ONG Teste Cypress');
    cy.get('#req_tipo_instituicao').select('ONG');
    cy.get('#req_cnpj').type('12.345.678/0001-95');
    cy.get('#req_email').type('teste.integracao@enchant.com');
    cy.get('#req_tel').type('(71) 99999-9999');
    
    /**
     * Integração com APIs Externas (Subfluxo)
     * 
     * Reutiliza o mesmo padrão do teste anterior:
     * CEP → ViaCEP → IBGE → Preenchimento automático
     */
    cy.get('#req_cep').type('40000-000').blur();
    cy.wait('@getCep');      // Sincroniza com ViaCEP
    cy.wait('@getCidades');  // Sincroniza com IBGE

    /**
     * Validação de Senhas
     * 
     * **Requisito:** Senha forte + confirmação igual
     * Teste não valida regras de complexidade (escopo funcional)
     */
    cy.get('#req_senha').type('Teste123!@#');
    cy.get('#req_confirmar_senha').type('Teste123!@#');
    
    /**
     * Navegação para Próxima Etapa
     * 
     * Botão dispara validação client-side antes de mostrar a Etapa 2
     */
    cy.get('#req_botao_continuar_dados').click();

    // ============================================
    // ETAPA 2: UPLOAD DE DOCUMENTOS
    // ============================================
    
    /**
     * Validação de Transição de Etapa
     * 
     * Confirma que o script JS exibiu o bloco da segunda parte do formulário
     */
    cy.get('#req_segunda_parte').should('be.visible');

    /**
     * Upload de Múltiplos Arquivos
     * 
     * **Requisito Mínimo:** 3 documentos (incluindo o obrigatório)
     * 
     * **Estratégia:**
     * - Usamos o mesmo PDF 3 vezes (válido para testes de integração)
     * - 'force: true' contorna limitações de input[type="file"] ocultos
     * - data-categoria permite upload em campos específicos
     * 
     * @file cypress/fixtures/documento-teste.pdf - Deve existir
     */
    cy.get('[data-categoria="declaracao-renda"] input[type="file"]')
      .selectFile('cypress/fixtures/documento-teste.pdf', { force: true });
    cy.get('[data-categoria="estatuto"] input[type="file"]')
      .selectFile('cypress/fixtures/documento-teste.pdf', { force: true });
    cy.get('[data-categoria="cnpj"] input[type="file"]')
      .selectFile('cypress/fixtures/documento-teste.pdf', { force: true });

    /**
     * Submissão Final
     * 
     * Dispara a função de envio que:
     * 1. Valida campos obrigatórios
     * 2. Monta FormData com arquivos
     * 3. Envia POST para /api/requisicao/enviar
     */
    cy.get('#req_btn_enviar').click();

    // ============================================
    // VALIDAÇÃO DA INTEGRAÇÃO BACKEND
    // ============================================
    
    /**
     * CHECKPOINT 1: Requisição HTTP Enviada
     * 
     * Aguarda o POST ser interceptado pelo mock.
     * Sem este wait(), o teste pode falhar antes da requisição completar.
     */
    cy.wait('@postRequisicao');
    
    /**
     * CHECKPOINT 2: Redirecionamento Pós-Sucesso
     * 
     * **Comportamento Esperado (requisicao.js):**
     * - Backend retorna 200
     * - Frontend redireciona para /entrar
     * 
     * timeout: 5000ms para cobrir animações/modais antes do redirect
     */
    cy.url({ timeout: 5000 }).should('include', '/entrar');
  });
});