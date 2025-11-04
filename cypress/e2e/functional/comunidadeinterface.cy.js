/// <reference types="cypress" />

describe('Página de Comunidade - Enchant', () => {

  beforeEach(() => {
    cy.visit('https://enchant.onrender.com/comunidade');
  });

  // ========================================
  // TESTES DE ELEMENTOS PRINCIPAIS
  // ========================================
  describe('Elementos Principais', () => {
    
    it('Deve exibir todos os elementos principais da página', () => {
      cy.get('.comunidade-main').should('be.visible');
      cy.get('.comunidade-header').should('exist');
      cy.get('.comunidade-header h1').should('contain', 'Comunidade');
      cy.get('.comunidade-header p').should('contain', 'Conecte-se com ONGs');
      cy.get('#feed-container').should('exist');
      cy.get('.sidebar-direita').should('exist');
    });

    it('Deve exibir o card de busca de ONGs', () => {
      cy.get('.search-card').should('be.visible');
      cy.get('.search-card h3').should('contain', 'Buscar ONGs');
      cy.get('#search-ongs').should('be.visible');
    });

    it('Deve exibir o card de atividades recentes', () => {
      cy.get('.atividades-card').should('be.visible');
      cy.get('.atividades-card h3').should('contain', 'Atividades Recentes');
      cy.get('#atividades-lista').should('exist');
    });

    it('Deve carregar o feed de postagens', () => {
      cy.wait(2000);
      cy.get('#feed-container').within(() => {
        cy.get('.post-card, .empty-state, .error-state').should('exist');
      });
    });
  });

  // ========================================
  // TESTES DE BUSCA DE ONGs
  // ========================================
  describe('Busca de ONGs', () => {
    
    it('Deve permitir digitar no campo de busca', () => {
      cy.get('#search-ongs').type('ONG Teste').should('have.value', 'ONG Teste');
    });

    it('Deve exibir resultados ao buscar', () => {
      cy.get('#search-ongs').type('ONG');
      cy.wait(500);
      cy.get('#search-results').should('be.visible');
    });

    it('Deve limpar resultados quando o campo estiver vazio', () => {
      cy.get('#search-ongs').type('ONG');
      cy.wait(500);
      cy.get('#search-ongs').clear();
      cy.wait(500);
      cy.get('#search-results').should('be.empty');
    });

    it('Deve exibir mensagem quando não encontrar resultados', () => {
      cy.get('#search-ongs').type('XYZABCNAOEXISTE123');
      cy.wait(500);
      cy.get('.empty-search').should('contain', 'Nenhuma ONG encontrada');
    });
  });

  // ========================================
  // TESTES DE ATIVIDADES RECENTES
  // ========================================
  describe('Atividades Recentes', () => {
    
    it('Deve carregar atividades ou exibir mensagem', () => {
      cy.wait(2500);
      cy.get('#atividades-lista').within(() => {
        cy.get('.atividade-item, .empty-search').should('exist');
      });
    });

    it('Deve exibir ícones nas atividades quando existirem', () => {
      cy.wait(2500);
      cy.get('.atividade-item').first().then(($item) => {
        if ($item.length) {
          cy.wrap($item).find('.atividade-icon i').should('exist');
          cy.wrap($item).find('small').should('exist');
        }
      });
    });
  });

  // ========================================
  // TESTES SEM AUTENTICAÇÃO
  // ========================================
  describe('Usuário Não Autenticado', () => {
    
    it('Não deve exibir o botão de criar postagem', () => {
      cy.get('#post-creator-container').should('not.be.visible');
    });

    it('Não deve exibir botões de edição nas postagens', () => {
      cy.get('.post-action-btn.edit').should('not.exist');
      cy.get('.post-action-btn.delete').should('not.exist');
    });

    it('Deve exibir botão de doar para ONGs com Mercado Pago', () => {
      cy.wait(2000);
      cy.get('.btn-doar').should('exist');
    });
  });

  // ========================================
  // TESTES COM AUTENTICAÇÃO REAL
  // ========================================
  describe('Usuário Autenticado', () => {
    
    beforeEach(() => {
      // Faz login real antes de cada teste
      cy.session('login', () => {
        cy.visit('https://enchant.onrender.com/entrar');
        cy.get('#email').type('celleabreu096@gmail.com');
        cy.get('#senha').type('@Celle123');
        cy.get('button[type="submit"]').click();
        cy.wait(3000); // Aguarda o login processar
      });
      
      cy.visit('https://enchant.onrender.com/comunidade');
      cy.wait(2000);
    });

    it('Deve exibir o botão de criar postagem', () => {
      cy.get('#post-creator-container').should('be.visible');
      cy.get('#btn-nova-postagem').should('be.visible');
    });

    it('Deve abrir o modal ao clicar em criar postagem', () => {
      cy.get('#btn-nova-postagem').click();
      cy.get('#modal-postagem').should('be.visible');
      cy.get('#modal-titulo').should('contain', 'Criar Nova Publicação');
    });

    it('Deve fechar o modal ao clicar no X', () => {
      cy.get('#btn-nova-postagem').click();
      cy.get('#modal-postagem').should('be.visible');
      cy.get('#btn-fechar-modal').click();
      cy.get('#modal-postagem').should('not.be.visible');
    });

    it('Deve fechar o modal ao clicar em Cancelar', () => {
      cy.get('#btn-nova-postagem').click();
      cy.get('#modal-postagem').should('be.visible');
      cy.get('#btn-cancelar').click();
      cy.get('#modal-postagem').should('not.be.visible');
    });
  });

  // ========================================
  // TESTES DO FORMULÁRIO DE POSTAGEM
  // ========================================
  describe('Formulário de Postagem', () => {
    
    beforeEach(() => {
      cy.visit('https://enchant.onrender.com/comunidade', {
        onBeforeLoad(win) {
          const authKey = 'sb-enchant-auth-token';
          const mockAuth = {
            access_token: 'mock-token-cypress-test',
            user: {
              id: 'test-user-123',
              email: 'teste@cypress.com'
            }
          };
          win.localStorage.setItem(authKey, JSON.stringify(mockAuth));
        }
      });
      cy.wait(1000);
      cy.get('#btn-nova-postagem').click();
    });

    it('Deve exibir todos os campos do formulário', () => {
      cy.get('#post-titulo').should('exist');
      cy.get('#post-conteudo').should('exist');
      cy.get('#post-imagem').should('exist');
      cy.get('.btn-publicar').should('be.visible');
    });

    it('Deve validar campo de conteúdo obrigatório', () => {
      cy.get('.btn-publicar').click();
      cy.get('#post-conteudo:invalid').should('exist');
    });

    it('Deve permitir digitar título e conteúdo', () => {
      cy.get('#post-titulo').type('Título de Teste')
        .should('have.value', 'Título de Teste');
      cy.get('#post-conteudo').type('Conteúdo de teste para a postagem')
        .should('have.value', 'Conteúdo de teste para a postagem');
    });

    it('Deve atualizar o contador de caracteres', () => {
      const texto = 'Teste de contagem de caracteres';
      cy.get('#post-conteudo').type(texto);
      cy.get('#char-count').should('contain', texto.length.toString());
    });

    it('Deve alertar quando próximo do limite (1800+ caracteres)', () => {
      const textoLongo = 'a'.repeat(1850);
      cy.get('#post-conteudo').invoke('val', textoLongo).trigger('input');
      cy.get('.char-counter').should('have.class', 'warning');
    });

    it('Deve alertar quando exceder o limite (2000+ caracteres)', () => {
      const textoMuitoLongo = 'a'.repeat(2050);
      cy.get('#post-conteudo').invoke('val', textoMuitoLongo).trigger('input');
      cy.get('.char-counter').should('have.class', 'error');
    });

    it('Deve limpar o formulário após fechar', () => {
      cy.get('#post-titulo').type('Título');
      cy.get('#post-conteudo').type('Conteúdo');
      cy.get('#btn-cancelar').click();
      
      cy.get('#btn-nova-postagem').click();
      cy.get('#post-titulo').should('have.value', '');
      cy.get('#post-conteudo').should('have.value', '');
    });
  });

  // ========================================
  // TESTES DE RESPONSIVIDADE
  // ========================================
  describe('Responsividade', () => {
    
    it('Deve adaptar layout em Mobile (375x667)', () => {
      cy.viewport(375, 667);
      cy.visit('https://enchant.onrender.com/comunidade');
      cy.get('.comunidade-main').should('be.visible');
      cy.get('.sidebar-direita').should('not.be.visible');
    });

    it('Deve adaptar layout em Tablet (768x1024)', () => {
      cy.viewport(768, 1024);
      cy.visit('https://enchant.onrender.com/comunidade');
      cy.get('.comunidade-main').should('be.visible');
      cy.get('.sidebar-direita').should('be.visible');
    });

    it('Deve adaptar layout em Desktop (1920x1080)', () => {
      cy.viewport(1920, 1080);
      cy.visit('https://enchant.onrender.com/comunidade');
      cy.get('.comunidade-main').should('be.visible');
      cy.get('.sidebar-direita').should('be.visible');
      cy.get('.feed-principal').should('be.visible');
    });

    it('Deve ter elementos legíveis em Mobile', () => {
      cy.viewport(375, 667);
      cy.visit('https://enchant.onrender.com/comunidade');
      cy.get('.comunidade-header h1').should('have.css', 'font-size')
        .then((fontSize) => {
          const size = parseInt(fontSize);
          expect(size).to.be.at.least(18);
        });
    });
  });

  // ========================================
  // TESTES DE ACESSIBILIDADE
  // ========================================
  describe('Acessibilidade', () => {
    
    it('Deve ter atributos alt em todas as imagens', () => {
      cy.wait(2000);
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt');
      });
    });

    it('Deve ter labels nos campos do formulário', () => {
      cy.visit('https://enchant.onrender.com/comunidade', {
        onBeforeLoad(win) {
          const authKey = 'sb-enchant-auth-token';
          const mockAuth = {
            access_token: 'mock-token-cypress-test',
            user: { id: 'test-user-123', email: 'teste@cypress.com' }
          };
          win.localStorage.setItem(authKey, JSON.stringify(mockAuth));
        }
      });
      cy.wait(1000);
      cy.get('#btn-nova-postagem').click();
      
      cy.get('label[for="post-titulo"]').should('exist');
      cy.get('label[for="post-conteudo"]').should('exist');
      cy.get('label[for="post-imagem"]').should('exist');
    });

    it('Deve ter ícones FontAwesome carregados', () => {
      cy.get('.fa-users-line, .fas').should('exist');
    });
  });

  // ========================================
  // TESTES DE LINKS E NAVEGAÇÃO
  // ========================================
  describe('Links e Navegação', () => {
    
    it('Deve ter links para páginas de transparência das ONGs', () => {
      cy.wait(2000);
      cy.get('.post-ong-link').first().should('have.attr', 'href')
        .and('include', '/transparencia?id=');
    });

    it('Deve ter links nos resultados de busca', () => {
      cy.get('#search-ongs').type('ONG');
      cy.wait(500);
      cy.get('.ong-result-item').first().should('have.attr', 'href')
        .and('include', '/transparencia?id=');
    });
  });

  // ========================================
  // TESTES DE PERFORMANCE
  // ========================================
  describe('Performance', () => {
    
    it('Deve carregar a página em tempo aceitável', () => {
      const startTime = Date.now();
      cy.visit('https://enchant.onrender.com/comunidade');
      cy.get('.comunidade-main').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(8000); // 8 segundos para servidor remoto
      });
    });

    it('Deve carregar o feed em tempo aceitável', () => {
      cy.visit('https://enchant.onrender.com/comunidade');
      const startTime = Date.now();
      
      cy.get('.post-card, .empty-state, .error-state', { timeout: 8000 })
        .should('exist')
        .then(() => {
          const loadTime = Date.now() - startTime;
          expect(loadTime).to.be.lessThan(8000);
        });
    });
  });

  // ========================================
  // TESTES DE ESTADOS DE ERRO
  // ========================================
  describe('Estados de Erro', () => {
    
    it('Deve exibir mensagem quando não há postagens', () => {
      cy.intercept('GET', '**/api/public/comunidade/postagens', {
        statusCode: 200,
        body: []
      }).as('feedVazio');

      cy.visit('https://enchant.onrender.com/comunidade');
      cy.wait('@feedVazio');
      
      cy.get('.empty-state').should('be.visible')
        .and('contain', 'Ainda não há publicações');
    });

    it('Deve exibir erro quando falhar ao carregar o feed', () => {
      cy.intercept('GET', '**/api/public/comunidade/postagens', {
        statusCode: 500,
        body: { message: 'Erro do servidor' }
      }).as('feedErro');

      cy.visit('https://enchant.onrender.com/comunidade');
      cy.wait('@feedErro');
      
      cy.get('.error-state').should('be.visible');
    });
  });

  // ========================================
  // TESTES DE MODAL DE CONFIRMAÇÃO
  // ========================================
  describe('Modal de Confirmação de Exclusão', () => {
    
    it('Deve existir o modal de confirmação de exclusão', () => {
      cy.get('#modal-confirmar-exclusao').should('exist');
    });

    it('Deve ter botões de ação no modal de exclusão', () => {
      cy.get('#btn-cancelar-exclusao').should('exist');
      cy.get('#btn-confirmar-exclusao').should('exist');
    });
  });
});