describe('Testes Funcionais de Interface - Páginas de Doação', () => {
  
  // ============================================================
  // CREDENCIAIS DE TESTE
  // ============================================================
  const TEST_USER = {
    email: 'teste@gmail.com',
    password: 'Testando@123'
  };

  // ============================================================
  // SETUP: Mock de autenticação e dados
  // ============================================================
  beforeEach(() => {
    // Mock da API de login
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        session: {
          access_token: 'mock-token-cypress',
          refresh_token: 'mock-refresh-cypress',
          user: {
            id: 'user-123',
            email: TEST_USER.email,
            role: 'authenticated'
          }
        }
      }
    }).as('login');

    // Mock da sessão do Supabase (usuário autenticado)
    cy.intercept('GET', '**/auth/v1/user**', {
      statusCode: 200,
      body: {
        id: 'user-123',
        email: TEST_USER.email,
        role: 'authenticated'
      }
    }).as('getUser');

    // Mock para verificação de sessão
    cy.intercept('GET', '**/auth/v1/session**', {
      statusCode: 200,
      body: {
        access_token: 'mock-token-cypress',
        refresh_token: 'mock-refresh-cypress',
        user: {
          id: 'user-123',
          email: TEST_USER.email
        }
      }
    }).as('getSession');

    // Simula usuário autenticado no localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token-cypress',
        refresh_token: 'mock-refresh-cypress',
        user: {
          id: 'user-123',
          email: TEST_USER.email
        }
      }));
    });
  });

  // ============================================================
  // CATEGORIA 1: TESTES DE VALIDAÇÃO - registrar-doacao.html
  // ============================================================
  describe('1. Testes de Validação de Formulário - registrar-doacao.html', () => {
    
    beforeEach(() => {
      // Mock das categorias
      cy.intercept('GET', '**/rest/v1/categoria**', {
        statusCode: 200,
        body: [
          { id: 1, nome: 'Roupas' },
          { id: 2, nome: 'Alimentos' },
          { id: 3, nome: 'Móveis' }
        ]
      }).as('getCategorias');
    });

    it('3.1 - Deve impedir adicionar item com campos obrigatórios vazios', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Tenta adicionar sem preencher nada
      cy.get('#doacao-form').submit();
      
      // Verifica validação HTML5
      cy.get('#categoria-doacao:invalid').should('exist');
      cy.get('#quantidade:invalid').should('exist');
      
      // Caixa deve permanecer vazia
      cy.get('.caixa-vazia-mensagem')
        .should('be.visible')
        .and('contain.text', 'Sua caixa de doações está vazia');
      
      // Botão de registrar deve estar desabilitado
      cy.get('#btn-registrar-caixa').should('be.disabled');
    });

    it('3.2 - Deve validar quantidade mínima', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Tenta colocar quantidade 0
      cy.get('#quantidade').type('0');
      cy.get('#quantidade:invalid').should('exist');
      
      // Tenta colocar quantidade negativa
      cy.get('#quantidade').clear().type('-5');
      cy.get('#quantidade:invalid').should('exist');
    });

    it('3.3 - Deve carregar campos específicos ao selecionar categoria Roupas', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      cy.get('#categoria-doacao').select('Roupas');
      
      // Verifica se campos específicos foram criados
      cy.get('#qualidade').should('exist');
      cy.get('#genero').should('exist');
      cy.get('#tamanho').should('exist');
      cy.get('#tipo').should('exist');
    });

    it('3.4 - Deve carregar campos específicos ao selecionar categoria Alimentos', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      cy.get('#categoria-doacao').select('Alimentos');
      
      // Verifica campos específicos de alimentos
      cy.get('#tipo').should('exist');
      cy.get('#validade').should('exist').and('have.attr', 'type', 'date');
      cy.get('#especificacao').should('exist');
    });

    it('3.5 - Deve carregar campos específicos ao selecionar categoria Móveis', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      cy.get('#categoria-doacao').select('Móveis');
      
      // Verifica campos específicos de móveis
      cy.get('#qualidade').should('exist');
      cy.get('#especificacao').should('exist');
      cy.get('#precisa_reparo').should('exist');
    });
  });

  // ============================================================
  // CATEGORIA 4: TESTES DE INTERATIVIDADE - registrar-doacao.html
  // ============================================================
  describe('4. Testes de Interatividade - registrar-doacao.html', () => {
    
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/categoria**', {
        statusCode: 200,
        body: [
          { id: 1, nome: 'Roupas' },
          { id: 2, nome: 'Alimentos' }
        ]
      }).as('getCategorias');
    });

    it('4.1 - Deve adicionar item na caixa com dados válidos', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Preenche formulário
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('10');
      cy.get('#doador').clear().type('João Silva');
      
      // Preenche campos específicos
      cy.get('#qualidade').select('Novo');
      cy.get('#genero').select('Masculino');
      cy.get('#tamanho').type('M');
      cy.get('#tipo').type('Camiseta');
      
      // Submete formulário
      cy.get('#doacao-form').submit();
      
      // Verifica se item foi adicionado
      cy.get('.item-na-caixa').should('have.length', 1);
      cy.get('.item-na-caixa').first()
        .should('contain.text', '10x Roupas')
        .and('contain.text', 'Camiseta')
        .and('contain.text', 'João Silva');
      
      // Mensagem de caixa vazia não deve aparecer
      cy.get('.caixa-vazia-mensagem').should('not.exist');
      
      // Botão registrar deve estar habilitado
      cy.get('#btn-registrar-caixa').should('not.be.disabled');
    });

    it('4.2 - Deve adicionar múltiplos itens na caixa', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Adiciona primeiro item (Roupas)
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('5');
      cy.get('#qualidade').select('Novo');
      cy.get('#genero').select('Feminino');
      cy.get('#tamanho').type('P');
      cy.get('#tipo').type('Vestido');
      cy.get('#doacao-form').submit();
      
      // Adiciona segundo item (Alimentos)
      cy.get('#categoria-doacao').select('Alimentos');
      cy.get('#quantidade').type('20');
      cy.get('#tipo').type('Não perecível');
      cy.get('#validade').type('2025-12-31');
      cy.get('#especificacao').type('Arroz');
      cy.get('#doacao-form').submit();
      
      // Verifica se ambos os itens estão na caixa
      cy.get('.item-na-caixa').should('have.length', 2);
    });

    it('4.3 - Deve remover item da caixa ao clicar no botão remover', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Adiciona um item
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('10');
      cy.get('#qualidade').select('Novo');
      cy.get('#genero').select('Masculino');
      cy.get('#tamanho').type('M');
      cy.get('#tipo').type('Calça');
      cy.get('#doacao-form').submit();
      
      // Verifica que item foi adicionado
      cy.get('.item-na-caixa').should('have.length', 1);
      
      // Remove o item
      cy.get('.btn-remover-item').click();
      
      // Verifica que item foi removido
      cy.get('.item-na-caixa').should('have.length', 0);
      cy.get('.caixa-vazia-mensagem').should('be.visible');
      cy.get('#btn-registrar-caixa').should('be.disabled');
    });

    it('4.4 - Deve limpar campos após adicionar item mantendo categoria e doador', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Preenche formulário
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('5');
      cy.get('#doador').clear().type('Maria Santos');
      cy.get('#qualidade').select('Usado - Bom estado');
      cy.get('#genero').select('Feminino');
      cy.get('#tamanho').type('G');
      cy.get('#tipo').type('Blusa');
      
      cy.get('#doacao-form').submit();
      
      // Verifica que categoria e doador foram mantidos
      cy.get('#categoria-doacao').should('have.value', '1');
      cy.get('#doador').should('have.value', 'Maria Santos');
      
      // Verifica que quantidade foi limpa
      cy.get('#quantidade').should('have.value', '');
      
      // Verifica que campos específicos foram limpos
      cy.get('#campos-especificos-container').children().should('have.length.greaterThan', 0);
    });

    it('4.5 - Deve exibir modal de sucesso ao registrar doações', () => {
      // Mock da API de registro múltiplo
      cy.intercept('POST', '/api/doacao/registrar-multiplas', {
        statusCode: 200,
        body: { message: 'Doações registradas com sucesso!' }
      }).as('registrarDoacoes');
      
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Adiciona um item
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('3');
      cy.get('#qualidade').select('Novo');
      cy.get('#genero').select('Unissex');
      cy.get('#tamanho').type('M');
      cy.get('#tipo').type('Camiseta');
      cy.get('#doacao-form').submit();
      
      // Clica no botão de registrar
      cy.get('#btn-registrar-caixa').click();
      
      // Aguarda chamada da API
      cy.wait('@registrarDoacoes');
      
      // Verifica modal de sucesso
      cy.get('#successModal').should('be.visible');
      cy.get('#successModalBody')
        .should('contain.text', 'Doações registradas com sucesso!');
      
      // Fecha modal
      cy.get('#successModal .btn-close').click();
      
      // Verifica que caixa foi limpa
      cy.get('.caixa-vazia-mensagem').should('be.visible');
      cy.get('#btn-registrar-caixa').should('be.disabled');
    });

    it('4.6 - Deve exibir modal de erro quando API falhar', () => {
      // Mock de erro da API
      cy.intercept('POST', '/api/doacao/registrar-multiplas', {
        statusCode: 500,
        body: { message: 'Erro ao conectar com o servidor' }
      }).as('registrarDoacoesErro');
      
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Adiciona um item
      cy.get('#categoria-doacao').select('Alimentos');
      cy.get('#quantidade').type('10');
      cy.get('#tipo').type('Não perecível');
      cy.get('#validade').type('2025-12-31');
      cy.get('#especificacao').type('Feijão');
      cy.get('#doacao-form').submit();
      
      // Clica no botão de registrar
      cy.get('#btn-registrar-caixa').click();
      
      cy.wait('@registrarDoacoesErro');
      
      // Verifica modal de erro
      cy.get('#errorModal').should('be.visible');
      cy.get('#errorModalBody')
        .should('contain.text', 'Falha ao registrar');
      
      // Caixa não deve ser limpa
      cy.get('.item-na-caixa').should('have.length', 1);
    });

    it('4.7 - Deve desabilitar botão durante envio', () => {
      cy.intercept('POST', '/api/doacao/registrar-multiplas', (req) => {
        // Atrasa resposta para testar estado de loading
        req.reply((res) => {
          res.delay = 1000;
          res.send({ statusCode: 200, body: { message: 'Sucesso' } });
        });
      }).as('registrarDoacoesSlow');
      
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Adiciona item
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('5');
      cy.get('#qualidade').select('Novo');
      cy.get('#genero').select('Masculino');
      cy.get('#tamanho').type('M');
      cy.get('#tipo').type('Camisa');
      cy.get('#doacao-form').submit();
      
      // Clica no botão
      cy.get('#btn-registrar-caixa').click();
      
      // Verifica que botão está desabilitado e com texto alterado
      cy.get('#btn-registrar-caixa')
        .should('be.disabled')
        .and('contain.text', 'Registrando...');
    });

    it('4.8 - Deve voltar para página anterior ao clicar no botão Voltar', () => {
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      cy.get('.botaosem').contains('Voltar').click();
      
      cy.url().should('include', '/doacao');
    });
  });

  // ============================================================
  // CATEGORIA 5: TESTES DE LAYOUT - registrar-doacao.html
  // ============================================================
  describe('5. Testes de Layout Responsivo - registrar-doacao.html', () => {
    
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/categoria**', {
        statusCode: 200,
        body: [{ id: 1, nome: 'Roupas' }]
      }).as('getCategorias');
    });

    it('5.1 - Deve exibir layout de 2 colunas em desktop', () => {
      cy.viewport(1280, 720);
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Verifica grid com 2 colunas
      cy.get('.doacao-grid-layout')
        .should('have.css', 'grid-template-columns')
        .and('match', /1fr 1fr/);
      
      // Verifica divisor entre colunas
      cy.get('.form-column')
        .should('have.css', 'border-right-style', 'solid');
    });

    it('5.2 - Deve exibir layout de 1 coluna em tablet', () => {
      cy.viewport(768, 1024);
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Verifica que mudou para 1 coluna
      cy.get('.doacao-grid-layout')
        .should('have.css', 'grid-template-columns')
        .and('match', /^(?!.*1fr 1fr)/); // Não deve ter 2 colunas
      
      // Border deve ser inferior, não lateral
      cy.get('.form-column')
        .should('have.css', 'border-bottom-style', 'solid');
    });

    it('5.3 - Deve exibir layout de 1 coluna em mobile', () => {
      cy.viewport('iphone-6');
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      cy.wait('@getCategorias');
      
      // Todos os elementos devem estar visíveis e empilhados
      cy.get('.form-column').should('be.visible');
      cy.get('.caixa-column').should('be.visible');
      cy.get('.title').should('be.visible');
    });

    it('5.4 - Deve manter imagem de fundo responsiva', () => {
      cy.viewport(1280, 720);
      cy.visit('http://localhost:3080/doacao/registrar-doacao');
      
      cy.get('.background-image')
        .should('be.visible')
        .and('have.css', 'object-fit', 'contain');
    });
  });

  // ============================================================
  // CATEGORIA 6: TESTE DE FLUXO COMPLETO (E2E SIMULADO)
  // ============================================================
  describe('6. Teste de Fluxo Completo - Adicionar e Registrar Doações', () => {
    
    it('6.1 - Deve completar fluxo de adicionar múltiplas doações e registrar', () => {
      // Setup
      cy.intercept('GET', '**/rest/v1/categoria**', {
        statusCode: 200,
        body: [
          { id: 1, nome: 'Roupas' },
          { id: 2, nome: 'Alimentos' },
          { id: 3, nome: 'Móveis' }
        ]
      }).as('getCategorias');
      
      cy.intercept('POST', '/api/doacao/registrar-multiplas', {
        statusCode: 200,
        body: { message: '3 doações registradas com sucesso!' }
      }).as('registrarDoacoes');
      
      // Navega para página inicial
      cy.visit('http://localhost:3080/doacao');
      cy.get('.action-card').first().click();
      cy.url().should('include', '/doacao/registrar-doacao');
      
      cy.wait('@getCategorias');
      
      // Adiciona primeira doação (Roupas)
      cy.get('#categoria-doacao').select('Roupas');
      cy.get('#quantidade').type('15');
      cy.get('#doador').clear().type('Campanha do Agasalho');
      cy.get('#qualidade').select('Usado - Bom estado');
      cy.get('#genero').select('Unissex');
      cy.get('#tamanho').type('M');
      cy.get('#tipo').type('Casaco');
      cy.get('#doacao-form').submit();
      cy.get('.item-na-caixa').should('have.length', 1);
      
      // Adiciona segunda doação (Alimentos)
      cy.get('#categoria-doacao').select('Alimentos');
      cy.get('#quantidade').type('50');
      cy.get('#tipo').type('Não perecível');
      cy.get('#validade').type('2026-06-30');
      cy.get('#especificacao').type('Cesta Básica');
      cy.get('#doacao-form').submit();
      cy.get('.item-na-caixa').should('have.length', 2);
      
      // Adiciona terceira doação (Móveis)
      cy.get('#categoria-doacao').select('Móveis');
      cy.get('#quantidade').type('2');
      cy.get('#qualidade').select('Novo');
      cy.get('#especificacao').type('Mesa dobrável');
      cy.get('#precisa_reparo').select('Não');
      cy.get('#doacao-form').submit();
      cy.get('.item-na-caixa').should('have.length', 3);
      
      // Registra todas as doações
      cy.get('#btn-registrar-caixa').should('not.be.disabled').click();
      cy.wait('@registrarDoacoes');
      
      // Verifica sucesso
      cy.get('#successModal').should('be.visible');
      cy.get('#successModalBody').should('contain.text', '3 doações registradas');
      
      // Fecha modal e verifica limpeza
      cy.get('#successModal .botaozinho').click();
      cy.get('.caixa-vazia-mensagem').should('be.visible');
      cy.get('.item-na-caixa').should('have.length', 0);
    });
  });
});