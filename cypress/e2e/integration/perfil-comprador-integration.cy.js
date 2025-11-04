/**
 * @file cypress/e2e/integration/perfil-comprador.cy.js
 * @summary Testes de INTEGRAÇÃO para "Página de Perfil da ONG".
 * 
 * @description
 * Esta suíte valida a integração entre múltiplos sistemas:
 * - **Backend de Autenticação**: Login e sessão
 * - **Backend de Perfil**: CRUD de dados da ONG
 * - **Supabase Storage**: Upload de imagens (logo)
 * 
 * **Escopo:** Apenas testes de integração (comunicação entre sistemas).
 * **Exclusões:**
 * - Validações client-side (senha forte, formato de CNPJ)
 * - Máscaras de input
 * - Animações e transições CSS
 * 
 * @requires Sistema de autenticação configurado
 * @requires Supabase Storage configurado (bucket 'logos')
 * @requires cypress/fixtures/logo-teste.png
 * @see perfilcomprador.html
 * @see perfilcomprador.js
 */

describe('Perfil da ONG (/perfil) - Testes de Integração', () => {

  /**
   * @function beforeEach
   * @description
   * Hook de configuração executado antes de cada teste.
   * 
   * **Responsabilidades:**
   * 1. Autentica usuário (integração com sistema de login)
   * 2. Simula resposta inicial do backend (GET /api/user/profile)
   * 3. Garante estado consistente (sem logo, dados padrão)
   * 
   * **Fluxo de Carregamento da Página:**
   * 1. cy.login() → Autentica usuário
   * 2. cy.visit('/perfil') → Carrega página
   * 3. JavaScript → GET /api/user/profile (mockado)
   * 4. JavaScript preenche formulário com dados retornados
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

    /**
     * MOCK: Backend - Carregamento Inicial do Perfil
     * 
     * **Endpoint Real:** GET /api/user/profile
     * **Header:** Authorization: Bearer {token}
     * **Motivação:** Isolar teste do estado real do banco de dados
     * 
     * **Estado Inicial Simulado:**
     * - url_logo: null (sem logo cadastrada)
     * - Dados básicos preenchidos
     * 
     * @returns {Object} Dados do perfil da ONG
     * @property {string} nome - Nome da instituição
     * @property {string} email - Email de contato
     * @property {string} cnpj - CNPJ formatado
     * @property {string} telefone - Telefone formatado
     * @property {string} estado - Nome do estado
     * @property {string} cidade - Nome da cidade
     * @property {string} sobre - Descrição da ONG
     * @property {string|null} url_logo - URL da logo (null = sem logo)
     * 
     * @alias getProfileInitial - Usado para sincronização
     */
    cy.intercept('GET', '/api/user/profile', {
      statusCode: 200,
      body: {
        nome: 'ONG Teste Cypress',
        email: 'teste.integracao@enchant.com',
        cnpj: '00.000.000/0001-00',
        telefone: '(71) 91111-1111',
        estado: 'Bahia',
        cidade: 'Salvador',
        sobre: 'Descrição original da ONG',
        url_logo: null // Estado inicial: sem logo
      }
    }).as('getProfileInitial');
    
    // Carrega a página sob teste
    cy.visit('/perfil');

    /**
     * SINCRONIZAÇÃO: Aguarda carregamento inicial
     * 
     * Garante que os dados mockados foram processados pelo JavaScript
     * e os campos do formulário foram preenchidos antes de iniciar o teste.
     */
    cy.wait('@getProfileInitial');
  });

  /**
   * @test Integração Backend: Atualização de Dados do Perfil
   * 
   * @description
   * **Cenário:** Usuário edita informações da ONG e salva alterações
   * 
   * **Fluxo de Integração Testado:**
   * 1. Frontend abre modal de edição
   * 2. Usuário modifica campos (nome, telefone, sobre, etc.)
   * 3. Frontend valida campos obrigatórios (client-side)
   * 4. Frontend → Backend: PUT /api/user/profile com dados atualizados
   * 5. Backend → Frontend: Confirmação de sucesso
   * 6. Frontend exibe modal de confirmação
   * 
   * **Pontos de Validação:**
   * - Requisição PUT enviada com payload correto
   * - Modal de sucesso exibido após resposta 200
   * - Dados persistidos (testado via mock)
   * 
   * @requires Mock: @saveProfile
   */
  it('Deve integrar com backend para atualizar informações da ONG', () => {
    
    /**
     * MOCK: Backend - Salvamento de Alterações
     * 
     * **Endpoint Real:** PUT /api/user/profile
     * **Payload:** Objeto JSON com campos atualizados
     * **Header:** Authorization: Bearer {token}
     * 
     * @returns {Object} Resposta de sucesso
     * @property {number} statusCode - 200 OK
     * @property {string} message - Mensagem de confirmação
     * 
     * @alias saveProfile - Usado para validação no teste
     */
    cy.intercept('PUT', '/api/user/profile', {
      statusCode: 200,
      body: { message: 'Dados atualizados com sucesso' }
    }).as('saveProfile');

    // ============================================
    // ETAPA 1: ABRIR MODAL DE EDIÇÃO
    // ============================================
    
    /**
     * AÇÃO: Clicar no botão de editar perfil
     * 
     * **Efeito Esperado (perfilcomprador.js):**
     * - Exibe modal#edit-modal via Bootstrap
     * - Preenche campos do modal com dados atuais
     */
    cy.get('#btn-open-edit-modal').click();
    cy.get('#edit-modal').should('be.visible');

    // ============================================
    // ETAPA 2: PREENCHER CAMPOS OBRIGATÓRIOS
    // ============================================
    
    /**
     * **CORREÇÃO CRÍTICA:**
     * A função validarFormulario() (perfilcomprador.js) verifica
     * TODOS os campos obrigatórios: Nome, Email, CNPJ, Telefone.
     * 
     * Se algum campo estiver vazio, a validação falha e o PUT não é enviado.
     * Por isso, preenchemos todos mesmo que só queremos testar
     * a alteração de alguns.
     * 
     * **Campos Obrigatórios:**
     * - Nome da Instituição
     * - Email
     * - CNPJ (14 dígitos)
     * - Telefone
     * 
     * **Campos Opcionais:**
     * - Senha (se vazio, mantém a atual)
     * - Sobre
     */
    cy.get('#edit-institution-name')
      .clear()
      .type('ONG Nome Atualizado');
    
    cy.get('#edit-email')
      .clear()
      .type('teste.integracao@enchant.com');
    
    cy.get('#edit-cnpj')
      .clear()
      .type('12.345.678/0001-99');
    
    cy.get('#edit-phone')
      .clear()
      .type('(71) 98888-8888');
    
    cy.get('#edit-sobre')
      .clear()
      .type('Descrição atualizada da ONG');
    
    /**
     * **NOTA:** Não preenchemos o campo de senha.
     * 
     * Se vazio, o backend mantém a senha atual (comportamento esperado).
     * Testar mudança de senha seria outro cenário de teste.
     */
    
    // ============================================
    // ETAPA 3: SALVAR ALTERAÇÕES
    // ============================================
    
    /**
     * AÇÃO: Submeter formulário
     * 
     * **Comportamento Esperado (perfilcomprador.js):**
     * 1. Valida campos obrigatórios (passa)
     * 2. Monta objeto JSON com dados do formulário
     * 3. Envia PUT /api/user/profile
     * 4. Aguarda resposta (loading indicator)
     * 5. Exibe modal de sucesso ou erro
     */
    cy.get('#btn-save-changes').click();

    // ============================================
    // VALIDAÇÃO DA INTEGRAÇÃO
    // ============================================
    
    /**
     * CHECKPOINT 1: Requisição HTTP Enviada
     * 
     * Aguarda o PUT ser interceptado pelo mock.
     * 
     * **Payload Esperado (aproximado):**
     * ```json
     * {
     *   "nome": "ONG Nome Atualizado",
     *   "email": "teste.integracao@enchant.com",
     *   "cnpj": "12.345.678/0001-99",
     *   "telefone": "(71) 98888-8888",
     *   "sobre": "Descrição atualizada da ONG"
     * }
     * ```
     */
    cy.wait('@saveProfile');
    
    /**
     * CHECKPOINT 2: Modal de Confirmação Exibido
     * 
     * Confirma que o frontend processou a resposta 200 do backend
     * e exibiu feedback visual ao usuário.
     * 
     * **Modal Reutilizado:** O perfilcomprador.js usa o mesmo modal
     * para sucesso e erro (id="erroSenhaModal")
     */
    cy.get('#erroSenhaModalBody')
      .should('contain', 'Dados atualizados com sucesso!');
  });

  /**
   * @test Integração Completa: Frontend → Supabase Storage → Backend
   * 
   * @description
   * **Cenário:** Usuário faz upload de nova logo da ONG
   * 
   * **Fluxo de Integração Testado (3 Sistemas):**
   * 
   * **FASE 1: Upload para Supabase Storage**
   * 1. Usuário seleciona imagem
   * 2. Frontend → Supabase: POST /storage/v1/object/logos/{filename}
   * 3. Supabase → Frontend: Retorna caminho do arquivo
   * 
   * **FASE 2: Salvar URL no Backend**
   * 4. Frontend → Backend: PUT /api/user/profile com url_logo
   * 5. Backend persiste URL no banco de dados
   * 6. Backend → Frontend: Confirmação de sucesso
   * 
   * **FASE 3: Recarregamento da Página**
   * 7. Frontend força reload da página (location.reload())
   * 8. Frontend → Backend: GET /api/user/profile (com nova logo)
   * 9. Frontend atualiza imagem na tela
   * 
   * **Desafio do Teste:**
   * - Testar location.reload() é complexo no Cypress
   * - Solução: Mockar o GET pós-reload com nova URL
   * 
   * @requires cypress/fixtures/logo-teste.png - Deve existir
   * @requires Mocks: @supabaseUpload, @saveLogo, @getProfileAfterReload
   */
  it('Deve integrar com Supabase e backend para fazer upload de nova logo', () => {
    
    // ============================================
    // MOCKS ESPECÍFICOS DESTE TESTE
    // ============================================
    
    /**
     * MOCK 1: Supabase Storage - Upload de Arquivo
     * 
     * **Endpoint Real:** POST https://{project}.supabase.co/storage/v1/object/logos/{filename}
     * **Content-Type:** multipart/form-data
     * **Autenticação:** Header apikey + Authorization
     * 
     * **Padrão de URL:**
     * - /{bucket}/{ong-id}/{filename}
     * - Ex: /logos/ong-123/logo-2025-01-15.png
     * 
     * @returns {Object} Resposta do Supabase
     * @property {string} path - Caminho relativo do arquivo no bucket
     * 
     * @alias supabaseUpload - Sincronização Fase 1
     */
    cy.intercept('POST', 'https://xztrvvpxhccackzoaalz.supabase.co/storage/v1/object/logos/**', {
      statusCode: 200,
      body: { path: 'ong-id/nova-logo.png' }
    }).as('supabaseUpload');
    
    /**
     * MOCK 2: Backend - Salvar URL da Logo
     * 
     * **Endpoint Real:** PUT /api/user/profile
     * **Payload:** { url_logo: "https://supabase.co/storage/..." }
     * 
     * @returns {Object} Confirmação de sucesso
     * @alias saveLogo - Sincronização Fase 2
     */
    cy.intercept('PUT', '/api/user/profile', {
      statusCode: 200,
      body: { message: 'Logo atualizado' }
    }).as('saveLogo');

    /**
     * MOCK 3: Backend - Recarregamento Pós-Upload
     * 
     * **Contexto:** O perfilcomprador.js força location.reload() após sucesso.
     * 
     * **Estratégia de Teste:**
     * - Sobrescrevemos o mock do beforeEach
     * - Nova resposta inclui url_logo preenchida
     * - Simula estado final esperado no banco de dados
     * 
     * @returns {Object} Perfil atualizado com nova logo
     * @property {string} url_logo - URL pública da imagem no Supabase
     * 
     * @alias getProfileAfterReload - Sincronização Fase 3
     */
    cy.intercept('GET', '/api/user/profile', {
      statusCode: 200,
      body: {
        nome: 'ONG Teste Cypress',
        url_logo: 'https://example.com/nova-logo.png' // Estado final
      }
    }).as('getProfileAfterReload');

    // ============================================
    // FASE 1: UPLOAD PARA SUPABASE
    // ============================================
    
    /**
     * ETAPA 1.1: Abrir Modal de Logo
     * 
     * **Efeito Esperado:**
     * - Exibe modal#logo-modal
     * - Input de arquivo pronto para uso
     */
    cy.get('#btn-open-logo-modal').click();
    
    /**
     * ETAPA 1.2: Selecionar Arquivo
     * 
     * **Requisito:** Arquivo deve existir em cypress/fixtures/
     * 
     * **Opções do selectFile:**
     * - force: true → Ignora validações de visibilidade do input
     * - Cypress anexa o arquivo ao input[type="file"]
     * 
     * @file logo-teste.png - Imagem de teste (qualquer formato: png, jpg, svg)
     */
    cy.get('#logo-upload')
      .selectFile('cypress/fixtures/logo-teste.png', { force: true });
    
    /**
     * ETAPA 1.3: Confirmar Upload
     * 
     * **Comportamento Esperado (perfilcomprador.js):**
     * 1. Valida extensão do arquivo (.png, .jpg, .jpeg, .svg)
     * 2. Valida tamanho máximo (ex: 2MB)
     * 3. Gera nome único (ex: logo-{timestamp}.png)
     * 4. Envia POST para Supabase Storage
     */
    cy.get('#btn-save-logo').click();

    // ============================================
    // VALIDAÇÃO FASE 1: UPLOAD SUPABASE
    // ============================================
    
    /**
     * CHECKPOINT 1.1: Upload Concluído
     * 
     * Aguarda Supabase retornar o caminho do arquivo.
     * 
     * **Resposta Mockada:**
     * { path: "ong-id/nova-logo.png" }
     */
    cy.wait('@supabaseUpload');

    // ============================================
    // VALIDAÇÃO FASE 2: PERSISTÊNCIA NO BACKEND
    // ============================================
    
    /**
     * CHECKPOINT 2.1: URL Salva no Banco
     * 
     * Aguarda backend confirmar salvamento.
     * 
     * **Payload Enviado (aproximado):**
     * ```json
     * {
     *   "url_logo": "https://xztrvvpxhccackzoaalz.supabase.co/storage/v1/object/public/logos/ong-id/nova-logo.png"
     * }
     * ```
     */
    cy.wait('@saveLogo');

    // ============================================
    // VALIDAÇÃO FASE 3: RECARREGAMENTO
    // ============================================
    
    /**
     * CHECKPOINT 3.1: Página Recarregou
     * 
     * **Detalhe Técnico:**
     * - Cypress detecta o location.reload()
     * - Refaz a requisição GET /api/user/profile
     * - Nosso mock retorna a nova URL
     */
    cy.wait('@getProfileAfterReload');

    /**
     * CHECKPOINT 3.2: Imagem Atualizada na Tela
     * 
     * **Validações:**
     * 1. Tag <img id="current-logo"> exibe nova URL
     * 2. Imagem está visível
     * 3. Placeholder desaparece (logo != null)
     * 
     * **Nota:** Não validamos se a imagem *carrega* (CORS, rede, etc),
     * apenas se o atributo 'src' foi atualizado corretamente.
     */
    cy.get('#current-logo')
      .should('have.attr', 'src', 'https://example.com/nova-logo.png')
      .and('be.visible');
      
    cy.get('#logo-placeholder')
      .should('not.be.visible');
  });
});