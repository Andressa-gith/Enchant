/// <reference types="cypress" />
// cypress/e2e/integration/dashboard-integration.cy.js

describe('Testes de Integração - API do Dashboard', () => {

  // A PORRA DA CHAVE. RODA ANTES DE CADA 'it'
  beforeEach(() => {
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('GET /api/dashboard', () => {
    it('deve retornar dados do dashboard com sucesso', () => {
      // O beforeEach logou, o cookie tá salvo.
      cy.request({
        method: 'GET',
        url: '/api/dashboard',
        failOnStatusCode: false // Pra gente ver o erro se der merda
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('boasVindas');
        expect(response.body).to.have.property('kpis');
      });
    });

    it('deve aceitar filtros de data', () => {
      cy.request({
        method: 'GET',
        url: '/api/dashboard?startDate=2024-01-01&endDate=2024-12-31',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('kpis');
      });
    });
  });

  describe('GET /api/dashboard/atividades', () => {
    it('deve retornar lista completa de atividades', () => {
      cy.request('/api/dashboard/atividades').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('GET /api/dashboard/alertas', () => {
    it('deve retornar todos os alertas', () => {
      cy.request('/api/dashboard/alertas').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  // AQUELE BLOCO 'Fluxo Completo com UI' FOI PRO LIXO
});