Cypress.Commands.add('login', (email, senha) => {
  cy.session([email, senha], () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, senha },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('token');
      Cypress.env('authToken', response.body.token);
    });
  });
});

/**
 * Comando NOVO (para testes de backend)
 * Usa nomenclatura mais clara
 */
Cypress.Commands.add('loginAPI', (email, senha) => {
  cy.session([email, senha], () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, senha },
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('token');
      Cypress.env('authToken', response.body.token);
    });
  });
});

/**
 * Comando para requisições autenticadas
 */
Cypress.Commands.add('apiRequest', (method, url, options = {}) => {
  const token = Cypress.env('authToken');
  
  return cy.request({
    method,
    url,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    },
    body: options.body,
    qs: options.qs,
    failOnStatusCode: false
  });
});
