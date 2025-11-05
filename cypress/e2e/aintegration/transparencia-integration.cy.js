/// <reference types="cypress" />

describe('Testes de Integração - Módulo de Transparência', () => {

  let authToken;

  beforeEach(() => {
    cy.clearCookies();

    cy.request({
      method: 'POST',
      url: '/api/auth/login', //
      body: {
        email: 'teste.integracao@enchant.com',
        senha: 'Teste123!@#'
      }
    }).then(response => {
      expect(response.status).to.eq(200);
      authToken = response.body.token; //
    });
  });

  describe('Jornada 4: Ciclo de Vida de Documentos (Upload/Delete)', () => {

    it('deve fazer upload, deletar e falhar ao tentar baixar o arquivo', () => {
      let uploadResponse;

      // Usar cy.window() para pegar o 'Blob' e 'FormData' nativos do navegador
      cy.window().then((win) => {
        // 1. Criar o Blob e o FormData (seu código estava correto)
        const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF';
        const blob = new win.Blob([pdfContent], { type: 'application/pdf' });

        const formData = new win.FormData();
        formData.append('arquivo_relatorio', blob, 'relatorio_anual_teste.pdf');
        formData.append('titulo', 'Relatório Anual (Teste Cypress)');
        formData.append('ano', '2025');

        // 2. RETORNAR O FETCH DIRETAMENTE (sem cy.wrap)
        // O Cypress vai esperar essa Promise ser resolvida.
        return win.fetch('/api/relatorios', { // URL relativa (usa a baseUrl)
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
            // Não defina 'Content-Type', o navegador faz isso
            // automaticamente para FormData
          },
          body: formData
        })
          .then(res => {
            // Tratar a resposta do fetch
            if (!res.ok) {
              throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
            }
            return res.json(); // Isso será o 'response' do próximo .then()
          });

      }).then((response) => {
        // 3. 'response' aqui é o JSON retornado do fetch
        const responseData = response.data || response;

        expect(responseData).to.have.property('id');
        expect(responseData).to.have.property('caminho_arquivo');
        uploadResponse = responseData;

        // 4. O resto do seu teste continua usando cy.request
        return cy.request({
          method: 'DELETE',
          url: `/api/relatorios/${uploadResponse.id}`,
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
      }).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(200);

        const pathParts = uploadResponse.caminho_arquivo.split('/');

        return cy.request({
          method: 'GET',
          url: `/reports/download/${pathParts[0]}/${pathParts[1]}`, // Cuidado aqui*
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          failOnStatusCode: false
        });
      }).then((downloadResponse) => {
        expect(downloadResponse.status).to.eq(404);
      });
    });
  });

  describe('Endpoints de Listagem (Transparência)', () => {

    it('deve listar documentos (documento.controller.js)', () => {
      cy.request({
        url: '/api/documentos',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('deve listar registros financeiros (gestaoFinanceira.controller.js)', () => {
      cy.request({
        url: '/api/financeiro',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('deve listar relatórios (relatorio.controller.js)', () => {
      cy.request({
        url: '/api/relatorios',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });
});