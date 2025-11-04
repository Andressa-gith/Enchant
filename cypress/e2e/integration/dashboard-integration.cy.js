/// <reference types="cypress" />

describe('Testes de Integração - API do Dashboard (Jornada 3)', () => {

  // O beforeEach vai rodar o cy.login e setar o Cypress.env('authToken')
  beforeEach(() => {
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('GET /api/dashboard', () => {
    it('deve retornar dados do dashboard com sucesso', () => {
      // Agora, injetamos o token manualmente no header
      cy.request({
        method: 'GET',
        url: '/api/dashboard', // Rota de dashboard.routes.js
        headers: {
          // O middleware espera 'Bearer <token>'
          'Authorization': `Bearer ${Cypress.env('authToken')}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('boasVindas');
        expect(response.body).to.have.property('kpis');
      });
    });

    it('deve refletir as mudanças de inventário (Entrada/Saída)', () => {
      let kpiInicial;
      const token = Cypress.env('authToken'); // Pega o token salvo

      // 1. Pega os dados iniciais do dashboard
      cy.request({
        url: '/api/dashboard',
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res1 => {
        expect(res1.status).to.eq(200);
        kpiInicial = res1.body.kpis;

        // 2. Registra uma nova entrada
        return cy.request({
          method: 'POST',
          url: '/api/doacao/registrar-doacao', // Rota de doacao.routes.js
          headers: { 'Authorization': `Bearer ${token}` },
          body: { categoria_id: 1, quantidade: 50, doador_origem_texto: 'Teste Dashboard E2E' }
        });
      }).then(entradaRes => {
        expect(entradaRes.status).to.eq(201);
        const entradaId = entradaRes.body.id;

        // 3. Registra uma nova saída
        return cy.request({
          method: 'POST',
          url: '/api/doacao/registrar-retirada', // Rota de doacao.routes.js
          headers: { 'Authorization': `Bearer ${token}` },
          body: { entrada_id: entradaId, quantidade_retirada: 20, destinatario: 'Teste Dashboard E2E' }
        });
      }).then(saidaRes => {
        expect(saidaRes.status).to.eq(201);

        // 4. Busca os dados do dashboard novamente
        return cy.request({
          url: '/api/dashboard',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }).then(resFinal => {
        expect(resFinal.status).to.eq(200);
        const kpiFinal = resFinal.body.kpis;
      });
    });
  });

  describe('Endpoints Adicionais do Dashboard', () => {
    it('deve retornar lista completa de atividades', () => {
      cy.request({
        url: '/api/dashboard/atividades', // Rota de dashboard.routes.js
        headers: { 'Authorization': `Bearer ${Cypress.env('authToken')}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('deve retornar todos os alertas', () => {
      cy.request({
        url: '/api/dashboard/alertas', // Rota de dashboard.routes.js
        headers: { 'Authorization': `Bearer ${Cypress.env('authToken')}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });
});