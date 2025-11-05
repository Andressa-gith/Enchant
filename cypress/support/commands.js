/**
 * @command
 * @name loginAPI
 * @description
 * **TESTE DE BACKEND (API)**
 * Faz login via API REAL, espera um 'token' na resposta,
 * e o salva em Cypress.env('authToken') para ser usado
 * em comandos 'cy.request'.
 */
Cypress.Commands.add('loginAPI', (email, senha) => {
 cy.session([email, senha], () => {
 cy.request({
 method: 'POST',
 url: '/api/auth/login',
 body: { email, senha },
 failOnStatusCode: false
 }).then((response) => {
 expect(response.status, 'API de Login falhou ou não retornou 200').to.eq(200);
 expect(response.body, 'API de Login NÃO retornou um "token"').to.have.property('token');
 Cypress.env('authToken', response.body.token);
 });
 });
});

/**
 * @command
 * @name loginUI
 * @description
 * **TESTE DE FRONTEND (UI) 100% PURO**
 * NÃO chama nenhuma API. 'Fabrica' uma sessão de usuário
 * e a salva diretamente no localStorage para que os scripts
 * do frontend (ex: comunidade.js, authGuard.js)
 * reconheçam o usuário como logado ANTES do cy.visit().
 */
Cypress.Commands.add('loginUI', (email = 'teste.ui@enchant.com') => {
 cy.log(`[loginUI] Fabricando sessão no localStorage para ${email}. Nenhuma API foi chamada.`);

 // 1. Define os dados FALSOS do usuário que queremos simular
 const FAKE_USER_ID = 'uuid-do-usuario-de-teste-12345';
 const FAKE_TOKEN = 'fake-jwt-token-por-que-estamos-em-um-teste';
 
 // 2. Constrói o objeto FALSO do Supabase que o 'comunidade.js' espera.
 const supabaseAuthData = {
 access_token: FAKE_TOKEN, 
 user: {
 id: FAKE_USER_ID
 }
 };

 // 3. Salva no localStorage na chave que o 'comunidade.js' procura
 const authKey = 'sb-test-e2e-auth-token'; // A chave 'sb-' é o importante
 
 cy.window().then((win) => {
 // Salva o item ANTES da página (cy.visit) carregar
 win.localStorage.setItem(authKey, JSON.stringify(supabaseAuthData));
 });
});

/**
 * Comando para requisições autenticadas (TESTE DE BACKEND)
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
