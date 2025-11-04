// cypress/support/commands.js

Cypress.Commands.add('login', (email, senha) => {
  cy.session([email, senha], () => {
    
    cy.visit('/entrar');

    cy.get('#email').type(email);
    cy.get('#senha').type(senha, { log: false });
    
    cy.get('.btn-entrar').click();

    cy.url({ timeout: 20000 }).should('include', '/dashboard'); 
  });
});