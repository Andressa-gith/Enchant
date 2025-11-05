/// <reference types="cypress" />

describe('Tela de Login - Enchant', () => {

  beforeEach(() => {
    // Carrega a página localmente (ajuste a URL conforme o ambiente)
    cy.visit('https://enchant.onrender.com/entrar');
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

  describe('Testes de Responsividade', () => {
    
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone XR', width: 414, height: 896 },
      { name: 'iPhone 12 Pro', width: 390, height: 844 },
      { name: 'Pixel 5', width: 393, height: 851 },
      { name: 'Samsung Galaxy S8+', width: 360, height: 740 },
      { name: 'Samsung Galaxy S20 Ultra', width: 412, height: 915 },
      { name: 'iPad Mini', width: 768, height: 1024 },
      { name: 'iPad Air', width: 820, height: 1180 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Tablet Android', width: 800, height: 1280 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Desktop HD', width: 1920, height: 1080 },
      { name: 'Desktop Full HD', width: 1920, height: 1200 },
      { name: 'Desktop 4K', width: 2560, height: 1440 }
    ];

    devices.forEach(({ name, width, height }) => {
      it(`Deve funcionar corretamente em ${name} (${width}x${height})`, () => {
        cy.viewport(width, height);
        
        // Verificar que elementos principais estão visíveis
        cy.get('h1').should('be.visible').and('contain', 'Entrar');
        cy.get('form#form').should('be.visible');
        cy.get('#email').should('be.visible');
        cy.get('#senha').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible');
        
        // Verificar que o formulário é utilizável
        cy.get('#email').click().should('be.focused');
        cy.get('#email').type('teste@email.com').should('have.value', 'teste@email.com');
        cy.get('#senha').click().type('senha123').should('have.value', 'senha123');
        
        // Verificar que o botão de toggle de senha está acessível
        cy.get('.toggle-password').should('be.visible').click();
        cy.get('#senha').should('have.attr', 'type', 'text');
        
        // Verificar link "Esqueceu a senha"
        cy.get('.esqueceu').should('be.visible').and('contain', 'Esqueceu a senha?');
      });
    });

   

  
    describe('Orientação de Tela', () => {
      it('Deve funcionar em modo portrait mobile', () => {
        cy.viewport(375, 667); // Portrait
        cy.get('form#form').should('be.visible');
        cy.get('#email').should('be.visible');
        cy.get('#senha').should('be.visible');
      });

      it('Deve funcionar em modo landscape mobile', () => {
        cy.viewport(667, 375); // Landscape
        cy.get('form#form').should('be.visible');
        cy.get('#email').should('be.visible');
        cy.get('#senha').should('be.visible');
      });

      it('Deve funcionar em modo portrait tablet', () => {
        cy.viewport(768, 1024); // Portrait
        cy.get('form#form').should('be.visible');
        cy.get('.containerloginprincipal').should('be.visible');
      });

      it('Deve funcionar em modo landscape tablet', () => {
        cy.viewport(1024, 768); // Landscape
        cy.get('form#form').should('be.visible');
        cy.get('.containerloginprincipal').should('be.visible');
      });
    });

    

    describe('Teste de Zoom', () => {
      it('Deve funcionar com zoom de 200%', () => {
        cy.viewport(1920, 1080);
        cy.visit('https://enchant.onrender.com/entrar', {
          onBeforeLoad(win) {
            // Simular zoom
            Object.defineProperty(win.navigator, 'userAgent', {
              value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
          }
        });
        
        // Reduzir viewport para simular zoom 200%
        cy.viewport(960, 540);
        
        cy.get('form#form').should('be.visible');
        cy.get('#email').should('be.visible');
        cy.get('#senha').should('be.visible');
      });

      it('Deve manter funcionalidade com zoom de 150%', () => {
        cy.viewport(1280, 720); // 1920/1.5
        
        cy.get('#email').type('zoom@teste.com').should('have.value', 'zoom@teste.com');
        cy.get('#senha').type('senha123').should('have.value', 'senha123');
        cy.get('button[type="submit"]').should('be.visible').click();
      });
    });

    describe('Teste de Performance em Diferentes Resoluções', () => {
      it('Deve carregar rapidamente em mobile', () => {
        cy.viewport(375, 667);
        
        const startTime = Date.now();
        cy.visit('https://enchant.onrender.com/entrar');
        cy.get('form#form').should('be.visible').then(() => {
          const loadTime = Date.now() - startTime;
          cy.log(`Tempo de carregamento mobile: ${loadTime}ms`);
          expect(loadTime).to.be.lessThan(5000); // Deve carregar em menos de 5s
        });
      });

      it('Deve carregar rapidamente em desktop', () => {
        cy.viewport(1920, 1080);
        
        const startTime = Date.now();
        cy.visit('https://enchant.onrender.com/entrar');
        cy.get('form#form').should('be.visible').then(() => {
          const loadTime = Date.now() - startTime;
          cy.log(`Tempo de carregamento desktop: ${loadTime}ms`);
          expect(loadTime).to.be.lessThan(5000);
        });
      });
    });

    describe('Testes de Layout Quebrado', () => {
      it('Não deve ter overflow horizontal em mobile', () => {
        cy.viewport(375, 667);
        
        cy.document().then($doc => {
          const bodyWidth = $doc.body.scrollWidth;
          const windowWidth = Cypress.config('viewportWidth');
          
          // Não deve ter scroll horizontal
          expect(bodyWidth).to.be.at.most(windowWidth + 1); // +1 para tolerância
        });
      });

      it('Não deve ter elementos cortados em mobile', () => {
        cy.viewport(375, 667);
        
        // Verificar que todos elementos principais estão dentro do viewport
        cy.get('h1').should('be.visible').isInViewport();
        cy.get('#email').should('be.visible').isInViewport();
        cy.get('#senha').should('be.visible').isInViewport();
        cy.get('button[type="submit"]').should('be.visible').isInViewport();
      });

      it('Não deve ter sobreposição de elementos', () => {
        cy.viewport(375, 667);
        
        cy.get('#email').then($email => {
          cy.get('#senha').then($senha => {
            const emailBottom = $email.offset().top + $email.height();
            const senhaTop = $senha.offset().top;
            
            // Senha deve estar abaixo do email
            expect(senhaTop).to.be.greaterThan(emailBottom);
          });
        });
      });
    });
  });
});

// Comando customizado para verificar se elemento está no viewport
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect();
  const windowHeight = Cypress.config('viewportHeight');
  const windowWidth = Cypress.config('viewportWidth');

  expect(rect.top).to.be.at.least(0);
  expect(rect.left).to.be.at.least(0);
  expect(rect.bottom).to.be.at.most(windowHeight);
  expect(rect.right).to.be.at.most(windowWidth);

  return subject;
});
