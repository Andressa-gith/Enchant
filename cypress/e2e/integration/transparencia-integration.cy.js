/// <reference types="cypress" />

describe('Testes de Integração - Módulo de Transparência', () => {

  beforeEach(() => {
    cy.login('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('Jornada 4: Ciclo de Vida de Documentos (Upload/Delete)', () => {

    it('deve fazer upload, deletar e falhar ao tentar baixar o arquivo', () => {
      let uploadResponse;

      // 1. Criar arquivo de teste
      cy.writeFile('cypress/fixtures/relatorio_teste.pdf', 'Conteúdo do PDF de teste');

      // 2. Fazer upload usando XMLHttpRequest
      cy.fixture('relatorio_teste.pdf', 'binary').then((fileContent) => {
        const blob = Cypress.Blob.binaryStringToBlob(fileContent, 'application/pdf');
        
        return cy.window().then((win) => {
          return new Cypress.Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('arquivo_relatorio', blob, 'relatorio_anual_teste.pdf');
            formData.append('titulo', 'Relatório Anual (Teste Cypress)');
            formData.append('ano', '2025');

            const xhr = new win.XMLHttpRequest();
            xhr.open('POST', `${Cypress.config('baseUrl')}/api/relatorios`);
            xhr.setRequestHeader('Authorization', `Bearer ${Cypress.env('authToken')}`);
            
            xhr.onload = function() {
              if (xhr.status === 201) {
                resolve(JSON.parse(xhr.response));
              } else {
                reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
              }
            };
            
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
          });
        });
      }).then((response) => {
        // Ajuste: acessar response.data se existir, senão usar response diretamente
        cy.log('Response completo:', JSON.stringify(response));
        
        const responseData = response.data || response;
        
        expect(responseData).to.have.property('id');
        expect(responseData).to.have.property('caminho_arquivo');
        uploadResponse = responseData;

        // 3. Deletar
        return cy.request({
          method: 'DELETE',
          url: `/api/relatorios/${uploadResponse.id}`,
          headers: {
            'Authorization': `Bearer ${Cypress.env('authToken')}`
          }
        });
      }).then((deleteResponse) => {
        expect(deleteResponse.status).to.eq(200);

        // 4. Tentar download (deve falhar)
        const pathParts = uploadResponse.caminho_arquivo.split('/');
        return cy.request({
          method: 'GET',
          url: `/reports/download/${pathParts[0]}/${pathParts[1]}`,
          headers: {
            'Authorization': `Bearer ${Cypress.env('authToken')}`
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
        headers: { 'Authorization': `Bearer ${Cypress.env('authToken')}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('deve listar registros financeiros (gestaoFinanceira.controller.js)', () => {
      cy.request({
        url: '/api/financeiro',
        headers: { 'Authorization': `Bearer ${Cypress.env('authToken')}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('deve listar relatórios (relatorio.controller.js)', () => {
      cy.request({
        url: '/api/relatorios',
        headers: { 'Authorization': `Bearer ${Cypress.env('authToken')}` }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });
});