/// <reference types="cypress" />

Cypress.Commands.add('login', (email, senha) => {
  cy.session([email, senha], () => {
       
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: email,
        senha: senha,
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('token');
      Cypress.env('authToken', response.body.token);
     
    });
  });
});