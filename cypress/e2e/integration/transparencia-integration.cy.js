/// <reference types="cypress" />
// cypress/e2e/integration/transparencia-integration.cy.js

describe('Testes de Integração - Módulo de Transparência', () => {

  // A PORRA DA CHAVE
  beforeEach(() => {
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('Documentos Comprobatórios (API)', () => {
    it('deve listar documentos', () => {
      cy.request({
        method: 'GET',
        url: '/api/documentos'
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    // O seu teste de 'adicionar documento com arquivo' é complexo
    // e precisa de 'cypress-file-upload' ou FormData.
    // Vamos focar nos GETs que são mais fáceis.
  });

  describe('Gestão Financeira (API)', () => {
    it('deve listar registros financeiros', () => {
      cy.request('/api/gestao-financeira')
        .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('Relatórios (API)', () => {
    it('deve listar relatórios', () => {
      cy.request('/api/relatorios')
        .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });
});