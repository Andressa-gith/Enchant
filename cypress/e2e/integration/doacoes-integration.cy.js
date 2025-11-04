/// <reference types="cypress" />
// cypress/e2e/integration/doacoes-integration.cy.js

describe('Testes de Integração - API de Doações', () => {

  // A PORRA DA CHAVE
  beforeEach(() => {
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('POST /api/doacao/registrar-doacao', () => {
    it('deve registrar uma doação com sucesso', () => {
      cy.request({
        method: 'POST',
        url: '/api/doacao/registrar-doacao',
        // SEM HEADER, SEU ANIMAL
        body: {
          categoria_id: 1, // Assumindo que categoria 1 existe
          quantidade: 50,
          doador_origem_texto: 'Teste de Integração Cypress'
        }
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body).to.have.property('id');
      });
    });
  });

  describe('POST /api/doacao/registrar-retirada', () => {
    it('deve registrar uma retirada (depende de uma doação)', () => {
      // Teste complexo, precisa criar uma doação primeiro
      cy.request({
        method: 'POST',
        url: '/api/doacao/registrar-doacao',
        body: { categoria_id: 2, quantidade: 100, doador_origem_texto: 'Item para Retirada' }
      }).then((doacaoRes) => {
        const entradaId = doacaoRes.body.id;
        
        cy.request({
          method: 'POST',
          url: '/api/doacao/registrar-retirada',
          // SEM HEADER DE NOVO, BURRO
          body: {
            entrada_id: entradaId,
            quantidade_retirada: 40,
            destinatario: 'Teste Cypress'
          }
        }).then((retiradaRes) => {
          expect(retiradaRes.status).to.eq(201);
        });
      });
    });
  });
});