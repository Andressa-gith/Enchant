/**
 * @file cypress/e2e/backend/comunidade-api.cy.js
 * @summary Testes de BACKEND para API de Comunidade
 * 
 * @description
 * Testa os endpoints do controller public.controller.js:
 * - GET /api/public/comunidade/postagens (listagem pública)
 * - POST /api/user/comunidade/postagens (criação autenticada)
 * - PUT /api/user/comunidade/postagens/:id (edição)
 * - DELETE /api/user/comunidade/postagens/:id (exclusão)
 */

describe('API de Comunidade - Testes de Backend', () => {

  before(() => {
    // Autentica uma vez antes de todos os testes
    cy.loginAPI('teste.integracao@enchant.com', 'Teste123!@#');
  });

  describe('GET /api/public/comunidade/postagens', () => {
    
    it('Deve retornar lista de postagens públicas (sem autenticação)', () => {
      cy.request({
        method: 'GET',
        url: '/api/public/comunidade/postagens'
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        
        // Valida estrutura dos objetos
        if (response.body.length > 0) {
          const post = response.body[0];
          expect(post).to.have.all.keys(
            'id', 'titulo', 'conteudo', 'created_at', 
            'instituicao_id', 'url_imagem', 'instituicao'
          );
          expect(post.instituicao).to.have.property('nome');
          expect(post.instituicao).to.have.property('mp_connected');
        }
      });
    });

    it('Deve retornar array vazio se não houver postagens', () => {
      // Esse teste assume que o banco pode estar vazio
      cy.request('GET', '/api/public/comunidade/postagens')
        .its('body')
        .should('be.an', 'array');
    });
  });

  describe('POST /api/user/comunidade/postagens', () => {

    it('Deve criar uma nova postagem (autenticado)', () => {
      const novaPostagem = {
        titulo: 'Postagem de Teste Cypress',
        conteudo: 'Este é o conteúdo da postagem criada automaticamente pelo Cypress.'
      };

      cy.apiRequest('POST', '/api/user/comunidade/postagens', {
        headers: { 'Content-Type': 'application/json' },
        body: novaPostagem
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body).to.have.property('id');
        expect(response.body).to.have.property('instituicao_id');
        
        // Armazena o ID para testes posteriores
        Cypress.env('postagemTestId', response.body.id);
      });
    });

    it('Deve rejeitar postagem sem conteúdo', () => {
      cy.apiRequest('POST', '/api/user/comunidade/postagens', {
        headers: { 'Content-Type': 'application/json' },
        body: { titulo: 'Apenas Título' }
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('conteúdo');
      });
    });

    it('Deve rejeitar postagem sem autenticação', () => {
      cy.request({
        method: 'POST',
        url: '/api/user/comunidade/postagens',
        headers: { 'Content-Type': 'application/json' },
        body: {
          titulo: 'Teste',
          conteudo: 'Tentativa sem autenticação'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('PUT /api/user/comunidade/postagens/:id', () => {

    before(() => {
      // Cria uma postagem para editar
      cy.apiRequest('POST', '/api/user/comunidade/postagens', {
        headers: { 'Content-Type': 'application/json' },
        body: {
          titulo: 'Postagem para Editar',
          conteudo: 'Conteúdo original'
        }
      }).then((response) => {
        Cypress.env('postagemEditId', response.body.id);
      });
    });

    it('Deve editar uma postagem existente', () => {
      const postagemId = Cypress.env('postagemEditId');

      cy.apiRequest('PUT', `/api/user/comunidade/postagens/${postagemId}`, {
        headers: { 'Content-Type': 'application/json' },
        body: {
          titulo: 'Postagem Editada',
          conteudo: 'Conteúdo atualizado pelo Cypress'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('atualizada');
      });
    });

    it('Deve retornar 404 ao editar postagem inexistente', () => {
      cy.apiRequest('PUT', '/api/user/comunidade/postagens/00000000-0000-0000-0000-000000000000', {
        headers: { 'Content-Type': 'application/json' },
        body: {
          titulo: 'Teste',
          conteudo: 'Teste'
        }
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });

  describe('DELETE /api/user/comunidade/postagens/:id', () => {

    before(() => {
      // Cria uma postagem para deletar
      cy.apiRequest('POST', '/api/user/comunidade/postagens', {
        headers: { 'Content-Type': 'application/json' },
        body: {
          titulo: 'Postagem para Deletar',
          conteudo: 'Será removida'
        }
      }).then((response) => {
        Cypress.env('postagemDeleteId', response.body.id);
      });
    });

    it('Deve deletar uma postagem existente', () => {
      const postagemId = Cypress.env('postagemDeleteId');

      cy.apiRequest('DELETE', `/api/user/comunidade/postagens/${postagemId}`)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('message');
          expect(response.body.message).to.include('excluída');
        });
    });

    it('Deve retornar 404 ao deletar postagem já removida', () => {
      const postagemId = Cypress.env('postagemDeleteId');

      cy.apiRequest('DELETE', `/api/user/comunidade/postagens/${postagemId}`)
        .then((response) => {
          expect(response.status).to.eq(404);
        });
    });
  });
});
