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

      // NÃO usar writeFile, criar blob direto
      cy.window().then((win) => {
        // Criar conteúdo fake de PDF
        const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF';
        const blob = new win.Blob([pdfContent], { type: 'application/pdf' });

        const formData = new win.FormData();
        formData.append('arquivo_relatorio', blob, 'relatorio_anual_teste.pdf');
        formData.append('titulo', 'Relatório Anual (Teste Cypress)');
        formData.append('ano', '2025');

        return cy.wrap(
          win.fetch('/api/relatorios', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          })
            .then(res => {
              if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
              return res.json();
            })
        );
      }).then((response) => {
        const responseData = response.data || response;

        expect(responseData).to.have.property('id');
        expect(responseData).to.have.property('caminho_arquivo');
        uploadResponse = responseData;

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
          url: `/reports/download/${pathParts[0]}/${pathParts[1]}`,
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