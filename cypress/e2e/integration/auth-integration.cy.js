/// <reference types="cypress" />

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
    it('deve fazer login com credenciais válidas e retornar status 200', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login', // Rota de auth.routes.js
        body: {
          email: testUser.email,
          senha: testUser.senha
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.include('Login bem-sucedido!');
        expect(response.body).to.have.property('token');
      });
    });

    it('deve retornar erro 401 com credenciais inválidas', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login', // Rota de auth.routes.js
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
    it('deve retornar 200 para um email válido existente', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/esqueci-senha', // Rota de auth.routes.js
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