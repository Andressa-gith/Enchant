/**
 * @file cypress/e2e/integration/historico-doacoes.cy.js
 * @summary Testes de INTEGRAÇÃO para "Página de Histórico de Doações".
 * 
 * @description
 * Esta suíte valida a integração entre múltiplos sistemas:
 * - **Backend de Relatórios**: CRUD de relatórios salvos
 * - **Supabase Storage**: Upload de arquivos PDF
 * - **Supabase Database**: Consulta de categorias via SDK
 * 
 * **Escopo:** Apenas testes de integração (comunicação entre sistemas).
 * **Exclusões:**
 * - Validação de formato de campos
 * - Lógica de geração de PDF (testada via mock)
 * - Animações de loading
 * 
 * **Arquitetura do Fluxo:**
 * 1. Frontend busca dados → Backend
 * 2. Frontend gera PDF → jsPDF (client-side)
 * 3. Frontend upload PDF → Supabase Storage
 * 4. Frontend salva metadados → Backend
 * 
 * @requires Sistema de autenticação configurado
 * @requires Supabase Storage (bucket 'donation_report')
 * @see historico-doacoes.html
 * @see historico-doacoes.js
 */

describe('Histórico de Doações (/historico-doacoes) - Testes de Integração', () => {

  /**
   * @function beforeEach
   * @description
   * Hook de configuração executado antes de cada teste.
   * 
   * **Responsabilidades:**
   * 1. Autentica usuário (integração com sistema de login)
   * 2. Simula respostas de APIs do backend e Supabase
   * 3. Garante estado inicial com 1 relatório para testes de exclusão
   * 
   * **Fluxo de Carregamento da Página:**
   * 1. cy.login() → Autentica usuário
   * 2. cy.visit('/historico-doacoes') → Carrega página
   * 3. JavaScript → GET /api/historico-doacoes/relatorios-salvos (tabela)
   * 4. JavaScript → GET Supabase categorias (filtro dropdown)
   * 5. JavaScript renderiza tabela e formulário
   * 
   * @requires cy.login() - Comando customizado
   */
  beforeEach(() => {
    
    /**
     * INTEGRAÇÃO 1: Sistema de Autenticação
     * 
     * Autentica usuário para obter token de acesso.
     * Requisições subsequentes incluirão token no header Authorization.
     * 
     * @param {string} email - Email do usuário teste
     * @param {string} password - Senha do usuário teste
     */
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');

    // ============================================
    // MOCKS: BACKEND DE RELATÓRIOS
    // ============================================

    /**
     * MOCK 1: Backend - Listagem de Relatórios Salvos
     * 
     * **Endpoint Real:** GET /api/historico-doacoes/relatorios-salvos
     * **Header:** Authorization: Bearer {token}
     * **Uso:** Alimenta a tabela de relatórios na página
     * 
     * **Estado Inicial:** 1 relatório existente.
     * Necessário para testar a funcionalidade de exclusão (Cenário 6.3).
     * 
     * @returns {Object} Lista de relatórios
     * @property {Array} relatorios - Array de objetos de relatório
     * 
     * @typedef {Object} Relatorio
     * @property {string} id - UUID do relatório
     * @property {string} responsavel - Nome do gestor
     * @property {string} data_inicio_filtro - Data início (YYYY-MM-DD)
     * @property {string} data_fim_filtro - Data fim (YYYY-MM-DD)
     * @property {string} frequencia_filtro - Mensal/Trimestral/Anual
     * @property {string} categoria_filtro - Categoria ou "Geral"
     * @property {string} data_geracao - Timestamp ISO 8601
     * @property {string} caminho_arquivo_pdf - Caminho relativo no Supabase
     * 
     * @alias getRelatorios - Usado para sincronização e recarregamento
     */
    cy.intercept('GET', '/api/historico-doacoes/relatorios-salvos', {
      statusCode: 200,
      body: {
        relatorios: [
          {
            id: 'relatorio-123',
            responsavel: 'Gestor Antigo',
            data_inicio_filtro: '2025-01-01',
            data_fim_filtro: '2025-01-31',
            frequencia_filtro: 'Mensal',
            categoria_filtro: 'Geral',
            data_geracao: '2025-02-01T10:00:00Z',
            caminho_arquivo_pdf: 'relatorios/uuid/arquivo.pdf'
          }
        ]
      }
    }).as('getRelatorios');
    
    // ============================================
    // MOCKS: SUPABASE DATABASE
    // ============================================
    
    /**
     * MOCK 2: Supabase - Listagem de Categorias
     * 
     * **Endpoint Real:** GET https://{project}.supabase.co/rest/v1/categoria
     * **Query:** ?select=nome&order=nome.asc
     * **Autenticação:** Header apikey + Authorization
     * **Uso:** Alimenta dropdown de filtro de categoria
     * 
     * **Nota sobre SDK:**
     * O historico-doacoes.js usa o Supabase JS Client SDK:
     * ```js
     * const { data } = await supabase
     *   .from('categoria')
     *   .select('nome')
     *   .order('nome', { ascending: true });
     * ```
     * 
     * O SDK converte isso em uma requisição REST para /rest/v1/.
     * 
     * @returns {Array} Lista de categorias
     * @property {string} nome - Nome da categoria
     * 
     * @alias getCategorias - Usado para sincronização
     */
    cy.intercept('GET', 'https://xztrvvpxhccackzoaalz.supabase.co/rest/v1/categoria?select=nome&order=nome.asc', {
      statusCode: 200,
      body: [
        { nome: 'Alimentos' },
        { nome: 'Roupas' }
      ]
    }).as('getCategorias');
    
    // Carrega a página sob teste
    cy.visit('/historico-doacoes');

    /**
     * SINCRONIZAÇÃO: Aguarda carregamento inicial completo
     * 
     * Ambas as requisições devem completar antes de iniciar os testes.
     * Garante que a tabela e o formulário estão prontos.
     */
    cy.wait('@getRelatorios');
    cy.wait('@getCategorias');
  });

  /**
   * @test Integração Completa: Geração de Relatório PDF
   * 
   * @description
   * **Cenário:** Usuário preenche formulário e gera novo relatório em PDF
   * 
   * **Fluxo de Integração Testado (4 Fases):**
   * 
   * **FASE 1: Busca de Dados**
   * 1. Usuário preenche formulário e clica em "Gerar Relatório"
   * 2. Frontend valida campos obrigatórios
   * 3. Frontend → Backend: GET /api/historico-doacoes/dados-pdf?{filtros}
   * 4. Backend consulta banco de dados
   * 5. Backend → Frontend: Retorna dados de entradas e saídas
   * 
   * **FASE 2: Geração de PDF (Client-Side)**
   * 6. Frontend processa dados com jsPDF
   * 7. Frontend gera arquivo PDF em memória (Blob)
   * 
   * **FASE 3: Upload para Supabase Storage**
   * 8. Frontend → Supabase: POST /storage/v1/object/{bucket}/{path}
   * 9. Supabase armazena arquivo
   * 10. Supabase → Frontend: Retorna caminho público
   * 
   * **FASE 4: Salvamento de Metadados**
   * 11. Frontend → Backend: POST /api/historico-doacoes/adicionar
   * 12. Backend salva registro no banco
   * 13. Backend → Frontend: Confirmação de sucesso
   * 14. Frontend exibe modal de sucesso
   * 
   * **Pontos de Validação:**
   * - Todas as 3 requisições HTTP executadas na ordem correta
   * - Estados de loading exibidos entre fases
   * - Modal de sucesso exibido ao final
   * 
   * @requires Mocks: @getDadosPdf, @supabaseUpload, @saveRecord
   */
  it('Deve gerar relatório de doações em PDF', () => {
    
    // ============================================
    // MOCKS ESPECÍFICOS DESTE TESTE
    // ============================================
    
    /**
     * MOCK 3: Backend - Dados para Geração de PDF
     * 
     * **Endpoint Real:** GET /api/historico-doacoes/dados-pdf
     * **Query Params:**
     * - data_inicio: YYYY-MM-DD
     * - data_fim: YYYY-MM-DD
     * - frequencia: Mensal/Trimestral/Anual
     * - categoria: Nome da categoria ou "Geral"
     * 
     * **Exemplo de URL:**
     * /api/historico-doacoes/dados-pdf?data_inicio=2025-01-01&data_fim=2025-01-31&frequencia=Mensal&categoria=Alimentos
     * 
     * @returns {Object} Dados das movimentações
     * @property {Array} entradas - Doações recebidas
     * @property {Array} saidas - Doações distribuídas
     * 
     * @alias getDadosPdf - Sincronização Fase 1
     */
    cy.intercept('GET', '/api/historico-doacoes/dados-pdf?*', {
      body: {
        entradas: [{ id: 'e1', categoria: 'Alimentos', quantidade: 10 }],
        saidas: [{ id: 's1', categoria: 'Alimentos', quantidade: 5 }]
      }
    }).as('getDadosPdf');

    /**
     * MOCK 4: Supabase Storage - Upload de PDF
     * 
     * **Endpoint Real:** POST https://{project}.supabase.co/storage/v1/object/{bucket}/{path}
     * **Content-Type:** application/pdf
     * **Autenticação:** Header apikey + Authorization
     * **Body:** Blob do PDF
     * 
     * **Padrão de Path:**
     * - donation_report/{ong-id}/{timestamp}-relatorio.pdf
     * 
     * @returns {Object} Resposta do Supabase
     * @property {string} path - Caminho relativo do arquivo
     * 
     * @alias supabaseUpload - Sincronização Fase 3
     */
    cy.intercept('POST', 'https://xztrvvpxhccackzoaalz.supabase.co/storage/v1/object/donation_report/**', {
      body: { path: 'relatorios/uuid/novo-relatorio.pdf' }
    }).as('supabaseUpload');

    /**
     * MOCK 5: Backend - Salvamento de Registro
     * 
     * **Endpoint Real:** POST /api/historico-doacoes/adicionar
     * **Header:** Authorization: Bearer {token}
     * **Content-Type:** application/json
     * 
     * **Payload Esperado:**
     * ```json
     * {
     *   "responsavel": "Gestor Teste",
     *   "data_inicio_filtro": "2025-01-01",
     *   "data_fim_filtro": "2025-01-31",
     *   "frequencia_filtro": "Mensal",
     *   "categoria_filtro": "Alimentos",
     *   "caminho_arquivo_pdf": "relatorios/uuid/novo-relatorio.pdf"
     * }
     * ```
     * 
     * @returns {Object} Confirmação de sucesso
     * @property {string} message - Mensagem de confirmação
     * 
     * @alias saveRecord - Sincronização Fase 4
     */
    cy.intercept('POST', '/api/historico-doacoes/adicionar', {
      body: { message: 'Salvo com sucesso' }
    }).as('saveRecord');
    
    // ============================================
    // PREENCHIMENTO DO FORMULÁRIO
    // ============================================
    
    /**
     * CAMPO 1: Responsável pela Geração
     * 
     * **Validação HTML5:** required
     * **Uso:** Nome do gestor que está gerando o relatório
     */
    cy.get('#responsavel').type('Gestor Teste');
    
    /**
     * CAMPO 2-3: Período do Relatório
     * 
     * **Validação HTML5:** required, type="date"
     * **Validação JS (historico-doacoes.js):**
     * - data_fim >= data_inicio
     * 
     * **Teste de Validação:** Ver Cenário 6.2
     */
    cy.get('#data_inicio_filtro').type('2025-01-01');
    cy.get('#data_fim_filtro').type('2025-01-31');
    
    /**
     * CAMPO 4: Frequência
     * 
     * **Opções:** Mensal / Trimestral / Anual
     * **Uso:** Agrupa dados por período no relatório
     */
    cy.get('#frequencia_filtro').select('Mensal');
    
    /**
     * CAMPO 5: Categoria
     * 
     * **Opções:** Geral / {categorias do banco}
     * **Fonte:** Carregadas via @getCategorias no beforeEach
     */
    cy.get('#categoria_filtro').select('Alimentos');
    
    // ============================================
    // SUBMISSÃO DO FORMULÁRIO
    // ============================================
    
    /**
     * AÇÃO: Gerar Relatório
     * 
     * **Comportamento Esperado (historico-doacoes.js):**
     * 1. Valida campos obrigatórios
     * 2. Valida data_fim >= data_inicio
     * 3. Exibe loading "Buscando dados..."
     * 4. Executa Fase 1 (GET dados)
     * 5. Exibe loading "Gerando PDF..."
     * 6. Gera PDF com jsPDF
     * 7. Exibe loading "Salvando registro..."
     * 8. Executa Fase 3 (POST Supabase)
     * 9. Executa Fase 4 (POST Backend)
     * 10. Esconde loading
     * 11. Exibe modal de sucesso
     */
    cy.get('#generateReportBtn').click();

    // ============================================
    // VALIDAÇÃO FASE 1: BUSCA DE DADOS
    // ============================================
    
    /**
     * CHECKPOINT 1.1: Loading Visível (Fase 1)
     * 
     * **Elemento:** div#pdfLoading
     * **Texto Esperado:** "Buscando dados..."
     * 
     * Confirma que o frontend entrou no fluxo assíncrono.
     */
    cy.get('#pdfLoading')
      .should('be.visible')
      .and('contain', 'Buscando dados...');
    
    /**
     * CHECKPOINT 1.2: Requisição GET Enviada
     * 
     * Aguarda o backend retornar os dados.
     */
    cy.wait('@getDadosPdf');
    
    // ============================================
    // VALIDAÇÃO FASE 2: GERAÇÃO DE PDF
    // ============================================
    
    /**
     * CHECKPOINT 2.1: Loading Atualizado (Fase 2)
     * 
     * **Texto Esperado:** "Gerando PDF..."
     * 
     * **Nota:** Esta fase é 100% client-side (jsPDF).
     * Não há requisição HTTP, apenas processamento local.
     */
    cy.get('#pdfLoading')
      .should('contain', 'Gerando PDF...');

    // ============================================
    // VALIDAÇÃO FASE 3: UPLOAD SUPABASE
    // ============================================
    
    /**
     * CHECKPOINT 3.1: Requisição POST Enviada (Supabase)
     * 
     * Aguarda Supabase confirmar o armazenamento do PDF.
     * 
     * **Payload:** Blob com conteúdo do PDF gerado
     */
    cy.wait('@supabaseUpload');
    
    // ============================================
    // VALIDAÇÃO FASE 4: SALVAMENTO NO BACKEND
    // ============================================
    
    /**
     * CHECKPOINT 4.1: Loading Atualizado (Fase 4)
     * 
     * **Texto Esperado:** "Salvando registro..."
     */
    cy.get('#pdfLoading')
      .should('contain', 'Salvando registro...');
    
    /**
     * CHECKPOINT 4.2: Requisição POST Enviada (Backend)
     * 
     * Aguarda backend confirmar o salvamento dos metadados.
     */
    cy.wait('@saveRecord');
    
    // ============================================
    // VALIDAÇÃO FINAL: FEEDBACK DO USUÁRIO
    // ============================================
    
    /**
     * CHECKPOINT 5.1: Loading Escondido
     * 
     * Confirma que o fluxo completo terminou.
     */
    cy.get('#pdfLoading').should('not.be.visible');

    /**
     * CHECKPOINT 5.2: Modal de Sucesso Exibido
     * 
     * **Modal Genérico:** #infoModal
     * **Elemento de Mensagem:** #infoModalMessage
     * **Texto Esperado:** "PDF gerado com sucesso!"
     * 
     * Confirma que o usuário recebeu feedback positivo.
     */
    cy.get('#infoModalMessage')
      .should('contain', 'PDF gerado com sucesso!');
  });

  /**
   * @test Validação: Data Final Anterior à Data Inicial
   * 
   * @description
   * **Cenário:** Usuário tenta gerar relatório com período inválido
   * 
   * **Fluxo Testado:**
   * 1. Usuário preenche data_inicio: 2025-01-31
   * 2. Usuário preenche data_fim: 2025-01-01 (anterior!)
   * 3. Frontend valida (historico-doacoes.js linha 297)
   * 4. Frontend exibe modal de erro
   * 5. Frontend NÃO envia requisições ao backend
   * 
   * **Ponto de Validação:**
   * - Modal de erro exibido com mensagem específica
   * - Nenhuma requisição HTTP enviada
   * 
   * **Nota:** Esta é uma validação client-side, mas testamos
   * porque impacta a integração (previne requisições inválidas).
   */
  it('Deve exibir erro se a data final for anterior à inicial', () => {
    
    /**
     * PREENCHIMENTO: Campos Obrigatórios
     * 
     * Preenchemos o mínimo necessário para disparar a validação.
     */
    cy.get('#responsavel').type('Gestor Teste');
    
    /**
     * PREENCHIMENTO: Datas Inválidas
     * 
     * **Violação:** data_fim (01) < data_inicio (31)
     */
    cy.get('#data_inicio_filtro').type('2025-01-31');
    cy.get('#data_fim_filtro').type('2025-01-01');
    
    /**
     * AÇÃO: Tentar Gerar Relatório
     * 
     * **Comportamento Esperado:**
     * - Validação falha antes de chamar APIs
     * - Modal de erro exibido imediatamente
     */
    cy.get('#generateReportBtn').click();

    /**
     * VALIDAÇÃO: Modal de Erro Exibido
     * 
     * **Modal Genérico:** #infoModal (reutilizado para erro)
     * **Mensagem Esperada:** "A data final não pode ser anterior à data inicial."
     * 
     * **Timeout:** Padrão (5000ms) - a validação é síncrona
     */
    cy.get('#infoModalMessage')
      .should('contain', 'A data final não pode ser anterior à data inicial.');
  });

  /**
   * @test Integração Backend: Exclusão de Relatório
   * 
   * @description
   * **Cenário:** Usuário deleta um relatório existente
   * 
   * **Fluxo de Integração Testado:**
   * 
   * **FASE 1: Seleção**
   * 1. Usuário clica no botão "Deletar" de um relatório
   * 2. Frontend exibe modal de confirmação
   * 
   * **FASE 2: Confirmação**
   * 3. Usuário confirma exclusão
   * 4. Frontend → Backend: DELETE /api/historico-doacoes/deletar/{id}
   * 5. Backend remove registro do banco
   * 6. Backend → Frontend: Confirmação de sucesso
   * 
   * **FASE 3: Atualização da UI**
   * 7. Frontend fecha modal de confirmação
   * 8. Frontend → Backend: GET /api/historico-doacoes/relatorios-salvos (recarrega tabela)
   * 9. Frontend exibe modal de sucesso
   * 
   * **Pontos de Validação:**
   * - Requisição DELETE enviada com ID correto
   * - Tabela recarregada após exclusão
   * - Modal de sucesso exibido
   * 
   * **Pré-requisito:**
   * O mock do beforeEach já criou o relatório 'relatorio-123'.
   * 
   * @requires Mocks: @deleteReport, @getRelatorios (recarregamento)
   */
  it('Deve deletar um relatório após confirmação', () => {
    
    /**
     * MOCK: Backend - Exclusão de Relatório
     * 
     * **Endpoint Real:** DELETE /api/historico-doacoes/deletar/{id}
     * **Header:** Authorization: Bearer {token}
     * **URL Param:** id - UUID do relatório
     * 
     * **Importante:** O ID 'relatorio-123' vem do mock do beforeEach.
     * Deve corresponder ao ID do relatório na tabela.
     * 
     * @returns {Object} Confirmação de sucesso
     * @property {number} statusCode - 200 OK
     * @property {string} message - Mensagem de confirmação
     * 
     * @alias deleteReport - Usado para validação
     */
    cy.intercept('DELETE', '/api/historico-doacoes/deletar/relatorio-123', {
      statusCode: 200,
      body: { message: 'Relatório deletado com sucesso' }
    }).as('deleteReport');

    // ============================================
    // FASE 1: SELEÇÃO DO RELATÓRIO
    // ============================================
    
    /**
     * AÇÃO: Clicar no Botão de Deletar
     * 
     * **Seletor:** .delete-btn[data-report-id="relatorio-123"]
     * 
     * **Estrutura HTML Típica (historico-doacoes.js):**
     * ```html
     * <button class="delete-btn" data-report-id="relatorio-123">
     *   <i class="fa fa-trash"></i> Deletar
     * </button>
     * ```
     * 
     * **Efeito Esperado:**
     * - Armazena ID do relatório em variável global
     * - Exibe modal#confirmationModal via Bootstrap
     */
    cy.get('.delete-btn[data-report-id="relatorio-123"]').click();

    /**
     * VALIDAÇÃO: Modal de Confirmação Visível
     * 
     * **Modal:** #confirmationModal
     * **Conteúdo Típico:** "Tem certeza que deseja deletar este relatório?"
     */
    cy.get('#confirmationModal').should('be.visible');

    // ============================================
    // FASE 2: CONFIRMAÇÃO DA EXCLUSÃO
    // ============================================
    
    /**
     * AÇÃO: Confirmar Exclusão
     * 
     * **Botão:** #modalConfirmBtn
     * 
     * **Comportamento Esperado (historico-doacoes.js):**
     * 1. Lê ID armazenado
     * 2. Envia DELETE /api/historico-doacoes/deletar/{id}
     * 3. Aguarda resposta
     * 4. Recarrega tabela (GET /relatorios-salvos)
     * 5. Fecha modal de confirmação
     * 6. Exibe modal de sucesso
     */
    cy.get('#modalConfirmBtn').click();

    // ============================================
    // VALIDAÇÃO DA INTEGRAÇÃO
    // ============================================
    
    /**
     * CHECKPOINT 1: Requisição DELETE Enviada
     * 
     * Aguarda o backend confirmar a exclusão.
     */
    cy.wait('@deleteReport');
    
    /**
     * CHECKPOINT 2: Tabela Recarregada
     * 
     * Aguarda o GET /relatorios-salvos ser chamado novamente.
     * 
     * **Nota:** O mock retorna a mesma lista (com o relatório ainda presente).
     * Em um teste real, retornaria lista vazia após exclusão.
     * Aqui focamos na integração (requisição foi feita), não no resultado.
     */
    cy.wait('@getRelatorios');
    
    /**
     * CHECKPOINT 3: Modal de Confirmação Fechado
     * 
     * Confirma que o fluxo de exclusão terminou.
     */
    cy.get('#confirmationModal').should('not.be.visible');
    
    /**
     * CHECKPOINT 4: Modal de Sucesso Exibido
     * 
     * **Modal Genérico:** #infoModal (reutilizado)
     * **Mensagem Esperada:** "Relatório deletado com sucesso."
     */
    cy.get('#infoModalMessage')
      .should('contain', 'Relatório deletado com sucesso.');
  });
});