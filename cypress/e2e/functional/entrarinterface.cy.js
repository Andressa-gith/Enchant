/// <reference types="cypress" />

describe('Tela de Login - Enchant', () => {

  beforeEach(() => {
    // Carrega a página localmente (ajuste a URL conforme o ambiente)
    cy.visit('https://enchant.onrender.com/entrar'); // exemplo de URL local
  });

  it('Deve exibir todos os elementos principais do formulário', () => {
    cy.get('h1').should('contain', 'Entrar');
    cy.get('form#form').should('exist');
    cy.get('#email').should('be.visible');
    cy.get('#senha').should('be.visible');
    cy.get('button[type="submit"]').should('contain', 'Enviar');
    cy.get('.toggle-password').should('exist');
    cy.get('#message-container').should('exist');
  });

  it('Deve mostrar mensagem de erro se tentar enviar vazio', () => {
    cy.get('button[type="submit"]').click();
    cy.get('.error-message-container')
      .should('contain.text', 'Por favor, preencha o email e a senha.');
  });

  it('Deve permitir digitar email e senha', () => {
    cy.get('#email').type('usuario@teste.com').should('have.value', 'usuario@teste.com');
    cy.get('#senha').type('123456').should('have.value', '123456');
  });

  it('Deve alternar a visibilidade da senha ao clicar no ícone de olho', () => {
    cy.get('#senha').should('have.attr', 'type', 'password');
    cy.get('.toggle-password').click();
    cy.get('#senha').should('have.attr', 'type', 'text');
    cy.get('.toggle-password').click();
    cy.get('#senha').should('have.attr', 'type', 'password');
  });

  it('Deve mostrar mensagem de erro se o Supabase retornar erro de login', () => {
    // Intercepta a chamada do Supabase e força um erro
    cy.intercept('POST', '**/auth/v1/token?grant_type=password', {
      statusCode: 400,
      body: { error: 'invalid_grant', message: 'Invalid login credentials' }
    });

    cy.get('#email').type('email@teste.com');
    cy.get('#senha').type('senhaerrada');
    cy.get('button[type="submit"]').click();

    cy.get('.error-message-container')
      .should('contain.text', 'E-mail ou senha inválidos.');
  });

  it('Deve mostrar mensagem de sucesso e redirecionar após login correto', () => {
    // Intercepta o login e retorna sucesso
    cy.intercept('POST', '**/auth/v1/token?grant_type=password', {
      statusCode: 200,
      body: {
        access_token: 'fake-token',
        user: { email: 'email@teste.com' }
      }
    });

    cy.get('#email').type('email@teste.com');
    cy.get('#senha').type('123456');
    cy.get('button[type="submit"]').click();

    cy.get('.success-message')
      .should('contain.text', 'Sucesso!');

    // Verifica se o redirecionamento ocorre
    cy.url().should('include', '/dashboard');
  });
});
