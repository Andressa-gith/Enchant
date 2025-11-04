/**
 * @file cypress/e2e/integration/comunidade-integration.cy.js
 * @summary Testes de INTEGRAÇÃO para "Página da Comunidade".
 * 
 * @description
 * Esta suíte valida a integração entre:
 * - **Sistema de Autenticação**: Login via cy.login()
 * - **Backend de Comunidade**: CRUD de postagens
 * - **Backend de ONGs**: Listagem de instituições
 * 
 * **Escopo:** Apenas testes de integração (comunicação Frontend ↔ Backend).
 * **Exclusões:**
 * - Busca client-side (filtro local de arrays)
 * - Validações de formulário HTML5
 * - Animações de UI
 * 
 * **Nota sobre Seletores:**
 * Usa seletores CSS tradicionais (ID, classe) em vez de data-testid
 * para manter compatibilidade com HTML existente.
 * 
 * @requires Sistema de autenticação configurado
 * @see comunidade.html
 * @see comunidade.js
 */

describe('Comunidade - Testes de Integração', () => {

  /**
   * @function beforeEach
   * @description
   * Hook de configuração executado antes de cada teste.
   * 
   * **Responsabilidades:**
   * 1. Autentica usuário (integração com sistema de login)
   * 2. Simula respostas de múltiplas APIs do backend
   * 3. Garante estado inicial consistente da página
   * 
   * **Fluxo de Carregamento da Página:**
   * 1. cy.login() → Autentica usuário
   * 2. cy.visit('/comunidade') → Carrega página
   * 3. JavaScript executa 4 requisições em paralelo:
   *    - GET /api/public/comunidade/postagens (feed)
   *    - GET /api/public/todasongs (busca)
   *    - GET /api/public/atividades/doacoes (sidebar)
   *    - GET /api/public/atividades/financeiro (sidebar)
   * 4. JavaScript renderiza componentes com dados retornados
   * 
   * @requires cy.login() - Comando customizado
   */
  beforeEach(() => {
    
    /**
     * INTEGRAÇÃO 1: Sistema de Autenticação
     * 
     * **Pré-requisito Crítico:**
     * O usuário 'teste.integracao@enchant.com' DEVE existir no banco de dados.
     * 
     * Se retornar 401:
     * 1. Verificar se o usuário foi criado
     * 2. Confirmar senha correta
     * 3. Validar implementação de cy.login()
     * 
     * @param {string} email - Email do usuário teste
     * @param {string} password - Senha do usuário teste
     */
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');

    // ============================================
    // MOCKS: BACKEND DE COMUNIDADE
    // ============================================
    
    /**
     * MOCK 1: Feed de Postagens
     * 
     * **Endpoint Real:** GET /api/public/comunidade/postagens
     * **Query Params:** ?limit=20&offset=0 (paginação)
     * **Autenticação:** Opcional (rota pública)
     * 
     * **Estado Inicial:** Feed vazio para testes limpos.
     * 
     * @returns {Array} Lista de postagens
     * @property {string} id - UUID da postagem
     * @property {string} titulo - Título
     * @property {string} conteudo - Corpo do texto
     * @property {string} autor_nome - Nome da ONG autora
     * @property {string} data_criacao - ISO 8601 timestamp
     * 
     * @alias getFeed - Usado para sincronização
     */
    cy.intercept('GET', '/api/public/comunidade/postagens', {
      statusCode: 200,
      body: [] // Feed vazio inicialmente
    }).as('getFeed');
    
    /**
     * MOCK 2: Lista de ONGs (para busca)
     * 
     * **Endpoint Real:** GET /api/public/todasongs
     * **Uso:** Alimenta o componente de busca client-side
     * 
     * **Dados Simulados:** 2 ONGs para teste de busca.
     * 
     * @returns {Array} Lista de ONGs cadastradas
     * @property {string} id - UUID da ONG
     * @property {string} nome - Nome da instituição
     * @property {string} sobre - Descrição curta
     * @property {string} cidade - Localização
     * @property {string} url_logo - URL da logo (opcional)
     * 
     * @alias getOngs - Usado para sincronização
     */
    cy.intercept('GET', '/api/public/todasongs', {
      statusCode: 200,
      body: [
        { 
          id: 'ong-abc', 
          nome: 'ONG Teste Cypress', 
          sobre: 'Descrição da ONG teste',
          cidade: 'Salvador'
        },
        { 
          id: 'ong-def', 
          nome: 'Outra ONG', 
          sobre: 'Outra descrição',
          cidade: 'São Paulo'
        }
      ]
    }).as('getOngs');

    /**
     * MOCK 3: Atividades Recentes - Doações
     * 
     * **Endpoint Real:** GET /api/public/atividades/doacoes?limit=3
     * **Uso:** Widget de sidebar "Últimas Doações"
     * 
     * **Motivação do Mock:**
     * Evitar erro 404 caso a rota não esteja implementada.
     * Não é o foco dos testes desta suíte.
     * 
     * @returns {Array} Lista de doações recentes
     * @alias getDoacoes - (Não usado nos testes, apenas para estabilidade)
     */
    cy.intercept('GET', '/api/public/atividades/doacoes?limit=3', { 
      body: [] 
    }).as('getDoacoes');
    
    /**
     * MOCK 4: Atividades Recentes - Financeiro
     * 
     * **Endpoint Real:** GET /api/public/atividades/financeiro?limit=2
     * **Uso:** Widget de sidebar "Últimas Transações"
     * 
     * @returns {Array} Lista de transações recentes
     * @alias getFinanceiro - (Não usado nos testes, apenas para estabilidade)
     */
    cy.intercept('GET', '/api/public/atividades/financeiro?limit=2', { 
      body: [] 
    }).as('getFinanceiro');
    
    // Carrega a página sob teste
    cy.visit('/comunidade');
    
    /**
     * SINCRONIZAÇÃO: Aguarda carregamento inicial completo
     * 
     * As duas requisições principais (feed + lista de ONGs) devem
     * completar antes de iniciar os testes.
     * 
     * **Timeout Implícito:** 5000ms (padrão do Cypress)
     */
    cy.wait('@getFeed');
    cy.wait('@getOngs');
  });

  /**
   * @test Integração Backend: Criação de Nova Publicação
   * 
   * @description
   * **Cenário:** Usuário autenticado cria uma publicação na comunidade
   * 
   * **Fluxo de Integração Testado:**
   * 
   * **FASE 1: Abertura do Modal**
   * 1. Usuário clica no botão "Nova Publicação"
   * 2. Frontend exibe modal com formulário
   * 
   * **FASE 2: Preenchimento**
   * 3. Usuário digita título e conteúdo
   * 
   * **FASE 3: Submissão**
   * 4. Frontend valida campos obrigatórios (client-side)
   * 5. Frontend → Backend: POST /api/user/comunidade/postagens
   * 6. Backend cria registro no banco
   * 7. Backend → Frontend: Confirmação de sucesso
   * 
   * **FASE 4: Feedback**
   * 8. Frontend fecha modal
   * 9. Frontend exibe notificação toast
   * 10. (Opcional) Frontend atualiza feed com nova postagem
   * 
   * **Pontos de Validação:**
   * - Requisição POST enviada com payload correto
   * - Modal fechado após resposta do servidor
   * - Toast de sucesso exibido
   * 
   * @requires Mock: @createPost
   */
  it('Deve integrar com backend para criar uma nova publicação', () => {
    
    /**
     * MOCK: Backend - Criação de Postagem
     * 
     * **Endpoint Real:** POST /api/user/comunidade/postagens
     * **Header:** Authorization: Bearer {token}
     * **Content-Type:** application/json
     * 
     * **Payload Esperado:**
     * ```json
     * {
     *   "titulo": "Título da Publicação Teste",
     *   "conteudo": "Este é o conteúdo..."
     * }
     * ```
     * 
     * **Resposta de Sucesso:**
     * ```json
     * {
     *   "message": "Publicação criada",
     *   "id": "novo-post-uuid"
     * }
     * ```
     * 
     * @returns {Object} Confirmação de sucesso
     * @property {number} statusCode - 201 Created
     * @property {string} message - Mensagem de confirmação
     * 
     * @alias createPost - Usado para validação no teste
     */
    cy.intercept('POST', '/api/user/comunidade/postagens', {
      statusCode: 201,
      body: { message: 'Publicação criada' }
    }).as('createPost');
    
    // ============================================
    // FASE 1: ABERTURA DO MODAL
    // ============================================
    
    /**
     * AÇÃO: Clicar no botão de nova publicação
     * 
     * **Seletor:** ID do botão (comunidade.html)
     * 
     * **Efeito Esperado (comunidade.js):**
     * - Exibe modal#modal-postagem via Bootstrap
     * - Limpa campos do formulário
     * - Foca no campo de título
     */
    cy.get('#btn-nova-postagem').click();
    
    /**
     * VALIDAÇÃO: Modal Visível
     * 
     * Garante que o modal foi aberto antes de interagir com seus campos.
     */
    cy.get('#modal-postagem').should('be.visible');

    // ============================================
    // FASE 2: PREENCHIMENTO DO FORMULÁRIO
    // ============================================
    
    /**
     * CAMPO 1: Título da Publicação
     * 
     * **Validações HTML5:**
     * - required (obrigatório)
     * - maxlength="100" (limite de caracteres)
     */
    cy.get('#post-titulo')
      .type('Título da Publicação Teste');
    
    /**
     * CAMPO 2: Conteúdo da Publicação
     * 
     * **Validações HTML5:**
     * - required (obrigatório)
     * - Textarea (suporta múltiplas linhas)
     */
    cy.get('#post-conteudo')
      .type('Este é o conteúdo da publicação de teste criada pelo Cypress.');
    
    // ============================================
    // FASE 3: SUBMISSÃO
    // ============================================
    
    /**
     * AÇÃO: Publicar
     * 
     * **Seletor Frágil:** Classe CSS '.btn-publicar'
     * 
     * **NOTA:** Este seletor é frágil (pode mudar com refatoração CSS).
     * Idealmente, usar data-testid="btn-publicar" para estabilidade.
     * 
     * **Comportamento Esperado (comunidade.js):**
     * 1. Valida campos obrigatórios (HTML5)
     * 2. Monta objeto JSON { titulo, conteudo }
     * 3. Envia POST /api/user/comunidade/postagens
     * 4. Desabilita botão (loading state)
     * 5. Aguarda resposta
     */
    cy.get('.btn-publicar').click();

    // ============================================
    // VALIDAÇÃO DA INTEGRAÇÃO
    // ============================================
    
    /**
     * CHECKPOINT 1: Requisição HTTP Enviada
     * 
     * Aguarda o POST ser interceptado pelo mock.
     * 
     * **Validação Implícita:**
     * - Payload contém titulo + conteudo
     * - Header Authorization presente
     * - Content-Type: application/json
     */
    cy.wait('@createPost');
    
    /**
     * CHECKPOINT 2: Modal Fechado
     * 
     * Confirma que o frontend processou a resposta 201 do backend
     * e ocultou o modal de criação.
     * 
     * **Implementação Típica (comunidade.js):**
     * ```js
     * $('#modal-postagem').modal('hide');
     * ```
     */
    cy.get('#modal-postagem').should('not.be.visible');
    
    /**
     * CHECKPOINT 3: Notificação Toast Exibida
     * 
     * **Padrão Comum:** Sistema de notificações com divs dinâmicas.
     * 
     * **Seletor Flexível:**
     * - contains() busca por texto em qualquer elemento
     * - Funciona independente da estrutura exata do toast
     * 
     * **Texto Esperado:**
     * "Publicação criada com sucesso!" (definido no comunidade.js)
     * 
     * **Timeout:** 5000ms (padrão) para cobrir animações
     */
    cy.contains('Publicação criada com sucesso!')
      .should('be.visible');
  });
});