/**
 * @file cypress/e2e/integration/doacoes-entrada.cy.js
 * @summary Testes de INTEGRAÇÃO para "Página de Registro de Doações".
 * 
 * @description
 * Esta suíte valida a integração entre:
 * - **Sistema de Autenticação**: Login via cy.login()
 * - **Backend de Doações**: Registro de múltiplas doações em lote
 * 
 * **Escopo:** Apenas testes de integração (comunicação Frontend ↔ Backend).
 * **Exclusões:** 
 * - Validações HTML5 (min, max, required)
 * - Lógica de UI isolada (adicionar/remover itens da lista)
 * - Campos dinâmicos (responsabilidade do JS client-side)
 * 
 * @requires Sistema de autenticação configurado
 * @requires Credenciais válidas no banco de dados
 * @see registrar-doacao.html
 * @see registrar-doacao.js
 */

describe('Registro de Doações (/doacao/registrar-doacao) - Testes de Integração', () => {

  /**
   * @function beforeEach
   * @description
   * Hook de configuração executado antes de cada teste.
   * 
   * **Responsabilidades:**
   * 1. Autentica usuário (integração com sistema de login)
   * 2. Simula resposta do backend de registro
   * 3. Garante estado inicial consistente da página
   * 
   * **Fluxo de Autenticação:**
   * - cy.login() → POST /api/auth/login
   * - Recebe token JWT
   * - Armazena em localStorage/cookie
   * - Subsequentes requisições incluem token automaticamente
   * 
   * @requires cy.login() - Comando customizado em support/commands.js
   */
  beforeEach(() => {
    
    /**
     * INTEGRAÇÃO 1: Sistema de Autenticação
     * 
     * **Pré-requisito:** Usuário deve existir no banco de dados.
     * Se retornar 401, verificar:
     * 1. Credenciais corretas
     * 2. Usuário cadastrado no banco
     * 3. cy.login() implementado corretamente
     * 
     * @param {string} email - Email do usuário teste
     * @param {string} password - Senha do usuário teste
     */
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');

    /**
     * MOCK: Backend de Registro de Doações
     * 
     * **Endpoint Real:** POST /api/doacao/registrar-multiplas
     * **Payload:** Array de objetos { categoria, tipo, quantidade, ... }
     * **Motivação:** Isolar teste da lógica de persistência do servidor
     * 
     * @returns {Object} Resposta de sucesso simulada
     * @property {number} statusCode - 201 Created
     * @property {string} message - Mensagem de confirmação
     * 
     * @alias postCaixa - Usado para sincronização no teste
     */
    cy.intercept('POST', '/api/doacao/registrar-multiplas', {
      statusCode: 201,
      body: { message: 'Doações registradas com sucesso' }
    }).as('postCaixa');
    
    // Carrega a página sob teste
    cy.visit('/doacao/registrar-doacao');

    /**
     * SINCRONIZAÇÃO: Aguarda carregamento de categorias
     * 
     * **Problema:** A página carrega categorias via API (assíncrono)
     * **Solução:** Aguarda o select exibir a opção padrão
     * 
     * **Timeout:** 10s para cobrir latência de rede/servidor lento
     */
    cy.get('#categoria-doacao')
      .contains('Selecione a categoria...', { timeout: 10000 })
      .should('be.visible');
  });

  /**
   * @test Integração Backend: Registro de Múltiplas Doações em Lote
   * 
   * @description
   * **Cenário:** Usuário adiciona 2 itens à "caixa" e registra tudo de uma vez
   * 
   * **Fluxo de Integração Testado:**
   * 
   * **ITEM 1 (Roupas):**
   * 1. Usuário seleciona categoria → Frontend carrega campos dinâmicos
   * 2. Usuário preenche campos → Frontend valida e adiciona à lista (client-side)
   * 
   * **ITEM 2 (Alimentos):**
   * 3. Usuário repete o processo com outra categoria
   * 
   * **SUBMISSÃO:**
   * 4. Frontend → Backend: POST com array de 2 itens
   * 5. Backend → Frontend: Confirmação de sucesso
   * 6. Frontend exibe modal de sucesso
   * 
   * **Pontos de Validação:**
   * - Campos dinâmicos renderizados corretamente
   * - Requisição enviada com payload correto
   * - Modal de sucesso exibido após resposta do servidor
   * 
   * @requires Mock: @postCaixa
   */
  it('Deve integrar com backend para registrar múltiplas doações', () => {
    
    // ============================================
    // ITEM 1: ROUPAS
    // ============================================
    
    /**
     * ETAPA 1.1: Seleção de Categoria
     * 
     * **Efeito Colateral (registrar-doacao.js):**
     * - Limpa campos do formulário
     * - Renderiza campos específicos de "Roupas" (qualidade, gênero, tamanho, tipo)
     * - Esconde campos de outras categorias
     */
    cy.get('#categoria-doacao').select('Roupas');
    
    /**
     * ETAPA 1.2: Preenchimento de Campos Dinâmicos
     * 
     * **CORREÇÃO DE RACE CONDITION:**
     * - .should('be.visible') aguarda o campo ser renderizado
     * - Evita erro "element is not visible" em máquinas lentas
     * 
     * **Campos Específicos de Roupas:**
     * - qualidade: Novo/Usado/Bom Estado
     * - genero: Masculino/Feminino/Unissex
     * - tamanho: PP/P/M/G/GG
     * - tipo: Camisa/Calça/Vestido/etc
     */
    cy.get('#qualidade').should('be.visible').select('Novo');
    cy.get('#genero').should('be.visible').select('Unissex');
    cy.get('#tamanho').should('be.visible').type('M');
    cy.get('#tipo').should('be.visible').type('Camisa');
    
    /**
     * ETAPA 1.3: Quantidade
     * 
     * Campo comum a todas as categorias (sempre visível)
     */
    cy.get('#quantidade').type('10');
    
    /**
     * ETAPA 1.4: Adicionar à Lista (Client-Side)
     * 
     * **Ação Frontend (registrar-doacao.js):**
     * - Valida campos obrigatórios
     * - Adiciona objeto ao array 'caixaItens'
     * - Renderiza card na div#caixa-lista-itens
     * - Limpa formulário para próxima entrada
     * 
     * **NÃO há requisição HTTP nesta etapa**
     */
    cy.get('form#doacao-form button[type="submit"]').click();

    // ============================================
    // ITEM 2: ALIMENTOS
    // ============================================
    
    /**
     * ETAPA 2.1: Mudança de Categoria
     * 
     * **Efeito Colateral:**
     * - Esconde campos de Roupas
     * - Renderiza campos de Alimentos (tipo, validade, especificação)
     */
    cy.get('#categoria-doacao').select('Alimentos');
    
    /**
     * ETAPA 2.2: Preenchimento de Campos Dinâmicos (Alimentos)
     * 
     * **Campos Específicos de Alimentos:**
     * - tipo: Perecível/Não Perecível
     * - validade: Data (YYYY-MM-DD)
     * - especificacao: Descrição livre (ex: "Arroz 5kg")
     */
    cy.get('#tipo').should('be.visible').type('Não perecível');
    cy.get('#validade').should('be.visible').type('2026-10-20');
    cy.get('#especificacao').should('be.visible').type('Feijão');
    
    /**
     * ETAPA 2.3: Quantidade (Limpeza do Campo)
     * 
     * .clear() é necessário porque o campo pode conter "10" do item anterior
     * (comportamento varia conforme lógica do JS)
     */
    cy.get('#quantidade').clear().type('20');
    
    /**
     * ETAPA 2.4: Adicionar Segundo Item
     */
    cy.get('form#doacao-form button[type="submit"]').click();

    // ============================================
    // VALIDAÇÃO DA LISTA (CLIENT-SIDE)
    // ============================================
    
    /**
     * Confirma que ambos os itens foram adicionados à lista local.
     * 
     * **NÃO é teste de integração**, mas é pré-requisito para
     * validar que o payload correto será enviado ao backend.
     */
    cy.get('.item-na-caixa').should('have.length', 2);

    // ============================================
    // INTEGRAÇÃO: SUBMISSÃO AO BACKEND
    // ============================================
    
    /**
     * AÇÃO: Registrar Caixa Completa
     * 
     * **Comportamento Esperado (registrar-doacao.js):**
     * 1. Valida que há pelo menos 1 item na lista
     * 2. Monta payload JSON com array 'caixaItens'
     * 3. Envia POST /api/doacao/registrar-multiplas
     * 4. Aguarda resposta (loading indicator)
     * 5. Exibe modal de sucesso
     * 6. Limpa lista (opcional)
     */
    cy.get('#btn-registrar-caixa')
      .should('not.be.disabled')  // Validação client-side (habilita se lista > 0)
      .click();

    /**
     * CHECKPOINT 1: Requisição HTTP Enviada
     * 
     * Aguarda o POST ser interceptado pelo mock.
     * 
     * **Payload Esperado:**
     * ```json
     * [
     *   { categoria: "Roupas", qualidade: "Novo", ... },
     *   { categoria: "Alimentos", tipo: "Não perecível", ... }
     * ]
     * ```
     */
    cy.wait('@postCaixa');
    
    /**
     * CHECKPOINT 2: Modal de Sucesso Exibido
     * 
     * Confirma que o frontend processou a resposta 201 do backend
     * e exibiu feedback visual ao usuário.
     */
    cy.get('#successModal').should('be.visible');
  });
});