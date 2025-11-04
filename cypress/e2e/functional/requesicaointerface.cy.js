describe('Validação do Formulário de Requisição', () => {
  beforeEach(() => {
    cy.visit('https://enchant.onrender.com/requisicao'); // ajuste o caminho conforme o seu servidor local
  });

  it('exibe erros ao tentar enviar com campos obrigatórios vazios', () => {
    cy.get('#req_botao_continuar_dados').click();
    cy.get('#req_nome_instituicao')
      .parent()
      .find('.req_error_message')
      
  });

  it('valida formato de e-mail incorreto', () => {
    cy.get('#req_email').type('testeemail.com');
    cy.get('#req_botao_continuar_dados').click();
    cy.get('#req_email')
      .parent()
      .find('.req_error_message')
      
  });

  it('valida CNPJ incorreto', () => {
    cy.get('#req_cnpj').type('123456789');
    cy.get('#req_botao_continuar_dados').click();
    cy.get('#req_cnpj')
      .parent()
      .find('.req_error_message')
      .should('contain', 'CNPJ inválido');
  });

  it('valida senhas diferentes', () => {
    cy.get('#req_senha').type('Senha123!');
    cy.get('#req_confirmar_senha').type('Senha321!');
    cy.get('#req_botao_continuar_dados').click();
    cy.get('#req_confirmar_senha')
      .parent()
      .find('.req_error_message')
      
  });

  it('permite envio quando todos os campos são válidos', () => {
    cy.get('#req_nome_instituicao').type('Instituição Exemplo');
    cy.get('#req_tipo_instituicao').select('ONG');
    cy.get('#req_cnpj').type('12.345.678/0001-95');
    cy.get('#req_email').type('teste@example.com');
    cy.get('#req_tel').type('(11) 91234-5678');
    cy.get('#req_cep').type('01001-000');
    cy.get('#req_estado').select('SP');
    cy.get('#req_cidade').select('São Paulo');
    cy.get('#req_bairro').type('Centro');
    cy.get('#req_senha').type('Senha123!');
    cy.get('#req_confirmar_senha').type('Senha123!');

    cy.get('#req_botao_continuar_dados').click();
    cy.url().should('include', '/requisicao'); // ajuste para a próxima rota real
  });
});
