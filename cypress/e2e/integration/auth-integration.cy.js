/// <reference types="cypress" />
// cypress/e2e/integration/auth-integration.cy.js

describe('Testes de Integração - API de Autenticação', () => {
  const testUser = {
    email: 'teste.integracao@enchant.com',
    senha: 'Teste123!@#'
  };
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('POST /api/auth/login', () => {
    it('deve fazer login com credenciais válidas', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: testUser.email,
          senha: testUser.senha
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.include('Login bem-sucedido!');
      });
    });

    it('deve retornar erro 401 com credenciais inválidas', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'errado@teste.com',
          senha: 'senhaerrada'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('POST /api/auth/esqueci-senha', () => {
    it('deve retornar 200 para email válido', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/esqueci-senha',
        body: {
          email: testUser.email
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.include('link para redefinição');
      });
    });
  });
});