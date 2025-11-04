/// <reference types="cypress" />

describe('Testes de Integração - API de Doações (Jornada 3)', () => {

  beforeEach(() => {
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');
  });

  it('deve registrar uma entrada e uma saida válida (Fluxo Padrão)', () => {
    const itemEntrada = {
      categoria_id: 1, 
      quantidade: 50,
      doador_origem_texto: 'Teste E2E - Entrada Válida'
    };

    // 1. Registra uma nova entrada de doação
    cy.request({
      method: 'POST',
      url: '/api/doacao/registrar-doacao', // Rota de doacao.routes.js
      headers: {
          // O middleware espera 'Bearer <token>'
          'Authorization': `Bearer ${Cypress.env('authToken')}`
      },
      body: itemEntrada
    }).then((entradaRes) => {
      expect(entradaRes.status).to.eq(201); 
      expect(entradaRes.body).to.have.property('id');
      
      const entradaId = entradaRes.body.id;
      const itemSaida = {
        entrada_id: entradaId, 
        quantidade_retirada: 20,
        destinatario: 'Teste E2E - Saída Válida'
      };

      // 2. Registra uma saída válida (20 de 50)
      return cy.request({
        method: 'POST',
        url: '/api/doacao/registrar-retirada', // Rota de doacao.routes.js
        headers: {
          // O middleware espera 'Bearer <token>'
          'Authorization': `Bearer ${Cypress.env('authToken')}`
        },
        body: itemSaida
      });

    }).then((saidaRes) => {
      expect(saidaRes.status).to.eq(201);
    });
  });

  it('deve falhar ao tentar registrar uma saída maior que o estoque (Teste de Falha Crítico)', () => {
    const itemEntrada = {
      categoria_id: 2, 
      quantidade: 30, // Estoque inicial de 30
      doador_origem_texto: 'Teste E2E - Validação de Estoque'
    };

    // 1. Registra a entrada de 30 unidades
    cy.request({
      method: 'POST',
      url: '/api/doacao/registrar-doacao', // Rota de doacao.routes.js
      headers: {
          // O middleware espera 'Bearer <token>'
          'Authorization': `Bearer ${Cypress.env('authToken')}`
      },
      body: itemEntrada
    }).then((entradaRes) => {
      expect(entradaRes.status).to.eq(201);
      const entradaId = entradaRes.body.id;

      const itemSaidaInvalida = {
        entrada_id: entradaId,
        quantidade_retirada: 40, // Tentando tirar 40 de 30
        destinatario: 'Teste E2E - Saída Inválida'
      };

      // 2. Tenta registrar a saída inválida
      return cy.request({
        method: 'POST',
        url: '/api/doacao/registrar-retirada', // Rota de doacao.routes.js
        headers: {
          // O middleware espera 'Bearer <token>'
          'Authorization': `Bearer ${Cypress.env('authToken')}`
        },
        body: itemSaidaInvalida,
        failOnStatusCode: false 
      });

    }).then((saidaRes) => {
      // 3. Verifica se a API bloqueou a ação corretamente (conforme Jornada 3) [cite: 154]
      expect(saidaRes.status).to.eq(400);
      expect(saidaRes.body.message).to.include('A quantidade solicitada');
      expect(saidaRes.body.message).to.include('maior que o estoque disponível');
    });
  });
});