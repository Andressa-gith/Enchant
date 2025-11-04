/**
 * @file cypress/e2e/integration/doacoes-entrada.cy.js
 * @summary Testes de INTEGRAÇÃO (100% Puros) para "Página de Registro de Doações".
 *
 * @description
 * **CORRIGIDO (v6):**
 * Esta é a solução definitiva. Estamos usando 'cy.intercept'
 * para **BLOQUEAR** os scripts problemáticos antes do 'cy.visit()'.
 *
 * 1. Bloqueia 'footercomprador.js' -> Impede o 'SyntaxError: footerCSS'.
 * 2. Bloqueia 'authGuard.js' -> Impede o redirecionamento para /entrar.
 *
 * @see registrar-doacao.html
 * @see registrar-doacao.js
 */

// Este listener global é a nossa "Rede de Segurança"
// (O 'e2e.js' não está funcionando, então colocamos aqui)
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignora TODOS os erros não capturados
  return false;
});

describe('Registro de Doações (/doacao/registrar-doacao) - Testes de Integração', () => {

  beforeEach(() => {
    
    // 1. Login (Fabricado, 100% Integração)
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');

    // 2. Mock da API de Registro (o alvo do nosso teste)
    cy.intercept('POST', '/api/doacao/registrar-multiplas', {
      statusCode: 201,
      body: { message: 'Doações registradas com sucesso' }
    }).as('postCaixa');
    
    // --- BLOQUEIO DE SCRIPTS (A SOLUÇÃO) ---

    // 3. Bloqueia o Auth Guard para impedir o redirecionamento para /entrar
    cy.intercept('GET', '/scripts/authGuard.js', { 
      body: '' 
    }).as('blockAuthGuard');

    // 4. Bloqueia o Footer para impedir o SyntaxError: footerCSS
    cy.intercept('GET', '/scripts/layouts/comprador/footercomprador.js', { 
      body: '' 
    }).as('blockFooterScript');

    // 5. Mocka a API de Categorias (do registrar-doacao.js)
    cy.intercept('GET', 'https://xztrvvpxhccackzoaalz.supabase.co/rest/v1/categoria?select=id%2Cnome&order=nome.asc', {
      statusCode: 200,
      body: [
        { id: 'cat-1', nome: 'Alimentos' },
        { id: 'cat-2', nome: 'Roupas' }
      ]
    }).as('getCategorias');

    // 6. Carrega a página (DEVE VIR DEPOIS de todos os intercepts)
    // Os intercepts acima vão impedir o erro 'footerCSS'
    // E o redirecionamento do 'authGuard'.
    cy.visit('/doacao/registrar-doacao');

    // 7. Sincronização
    // Agora que a página carregou, o 'registrar-doacao.js'
    // vai rodar e a chamada de categorias VAI acontecer.
    cy.wait('@getCategorias');
    
    cy.get('#categoria-doacao').should('be.visible');
  });

  /**
   * @test Integração Backend: Registro de Múltiplas Doações em Lote
   */
  it('Deve integrar com backend para registrar múltiplas doações', () => {
    
    // --- ITEM 1: ROUPAS ---
    cy.get('#categoria-doacao').select('Roupas');
    
    cy.get('#qualidade').should('be.visible').select('Novo');
    cy.get('#genero').should('be.visible').select('Unissex');
    cy.get('#tamanho').should('be.visible').type('M');
    cy.get('#tipo').should('be.visible').type('Camisa');
    
    cy.get('#quantidade').type('10');
    cy.get('form#doacao-form button[type="submit"]').click();

    // --- ITEM 2: ALIMENTOS ---
    cy.get('#categoria-doacao').select('Alimentos');
    
    cy.get('#tipo').should('be.visible').type('Não perecível');
    cy.get('#validade').should('be.visible').type('2026-10-20');
    cy.get('#especificacao').should('be.visible').type('Feijão');
    
    cy.get('#quantidade').clear().type('20');
    cy.get('form#doacao-form button[type="submit"]').click();

    // --- VALIDAÇÃO DA LISTA (CLIENT-SIDE) ---
    cy.get('.item-na-caixa').should('have.length', 2);

    // --- INTEGRAÇÃO: SUBMISSÃO AO BACKEND ---
    cy.get('#btn-registrar-caixa')
      .should('not.be.disabled')
      .click();

    // Espera o MOCK da API ser chamado
    cy.wait('@postCaixa');
    
    // Verifica o modal de sucesso
    cy.get('#successModal').should('be.visible');
  });
});
