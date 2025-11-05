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

      // Pega a URL base das variáveis de ambiente do Cypress
      const baseUrl = Cypress.env('BASE_URL') || 'http://localhost:3080';

      cy.window().then((win) => {
        // 1. Criar o Blob e o FormData (seu código aqui está correto)
        const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF';
        const blob = new win.Blob([pdfContent], { type: 'application/pdf' });

        const formData = new win.FormData();
        formData.append('arquivo_relatorio', blob, 'relatorio_anual_teste.pdf');
        formData.append('titulo', 'Relatório Anual (Teste Cypress)');
        formData.append('ano', '2025');

        // 2. Retornar uma Promise que o Cypress aguardará (usando XHR)
        return new Promise((resolve, reject) => {
          const xhr = new win.XMLHttpRequest();

          // Usar a URL absoluta e completa
          xhr.open('POST', `${baseUrl}/api/relatorios`);
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Importante: parsear a resposta
              resolve(JSON.parse(xhr.response));
            } else {
              reject(new Error(`Upload XHR falhou com status: ${xhr.status} ${xhr.responseText}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Erro de rede durante o upload XHR.'));
          };

          xhr.send(formData);
        });

      }).then((response) => {
        // 3. 'response' aqui é o JSON retornado do XHR
        const responseData = response.data || response;

        expect(responseData).to.have.property('id');
        expect(responseData).to.have.property('caminho_arquivo');
        uploadResponse = responseData;

        // 4. O resto do seu teste continua normalmente
        return cy.request({
          method: 'DELETE',
          url: `${baseUrl}/api/relatorios/${uploadResponse.id}`, // URL absoluta por segurança
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
      }).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(200);

        const pathParts = uploadResponse.caminho_arquivo.split('/');
        return cy.request({
          method: 'GET',
          url: `${baseUrl}/reports/download/${pathParts[0]}/${pathParts[1]}`, // URL absoluta
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