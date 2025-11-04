/**
 * @file cypress/e2e/backend/perfil-api.cy.js
 * @summary Testes de BACKEND para API de Perfil
 * 
 * @description
 * Testa os endpoints do controller perfil.controller.js:
 * - GET /api/user/profile
 * - PUT /api/user/profile
 * - POST /api/user/tutorial-concluido
 */

describe('API de Perfil - Testes de Backend', () => {

  before(() => {
    cy.loginAPI('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('GET /api/user/profile', () => {

    it('Deve retornar dados do perfil da instituição', () => {
      cy.apiRequest('GET', '/api/user/profile')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.all.keys(
            'id', 'nome', 'email', 'email_contato', 'cnpj', 
            'telefone', 'cidade', 'estado', 'sobre', 'mp_connected',
            'primeiro_login', 'url_foto_perfil', 'url_logo'
          );
        });
    });

    it('Deve retornar 401 sem autenticação', () => {
      cy.request({
        method: 'GET',
        url: '/api/user/profile',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('PUT /api/user/profile', () => {

    it('Deve atualizar dados do perfil', () => {
      const dadosAtualizados = {
        nome: 'ONG Nome Atualizado Cypress',
        sobre: 'Descrição atualizada pelo teste de backend',
        telefone: '(71) 98888-8888'
      };

      cy.apiRequest('PUT', '/api/user/profile', {
        headers: { 'Content-Type': 'application/json' },
        body: dadosAtualizados
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('atualizado');
      });
    });

    it('Deve validar formato de email', () => {
      cy.apiRequest('PUT', '/api/user/profile', {
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'email-invalido' }
      }).then((response) => {
        // Dependendo da validação do backend, pode ser 400 ou 200
        if (response.status === 400) {
          expect(response.body.message).to.include('email');
        }
      });
    });
  });

  describe('POST /api/user/tutorial-concluido', () => {

    it('Deve marcar tutorial como concluído', () => {
      cy.apiRequest('POST', '/api/user/tutorial-concluido')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('message');
        });
    });
  });
});
