describe('Testes Funcionais - Página Index (Enchant)', () => {
  
  beforeEach(() => {
    cy.visit('http://localhost:3080/');
  });
  
  // ============================================
  // 1. TESTES DE INTERATIVIDADE E FEEDBACK
  // ============================================

  describe('1. Interatividade e Feedback Visual', () => {


    it('1.1 - Deve fechar modal ao clicar no botão de fechar', () => {
      cy.intercept('GET', '/api/public/ongs', {
        statusCode: 200,
        body: [
          {
            id: 'ong-test-1',
            nome: 'ONG Teste 1',
            sobre: 'Descrição teste',
            caminho_logo: '/assets/imgs/test.jpg'
          }
        ]
      });

      cy.get('.card-ong-link').first().click();
      cy.get('#doacaoModal').should('be.visible');
      
      cy.get('#doacaoModal .btn-close').click();
      
      // Aguarda a animação do Bootstrap
      cy.get('#doacaoModal').should('not.be.visible');
    });

    it('1.2 - Deve exibir área PIX após envio bem-sucedido', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [{
          id: 'ong-1',
          nome: 'ONG Teste',
          caminho_logo: '/test.jpg'
        }]
      });

      cy.intercept('POST', '/api/public/criar-cobranca', {
        statusCode: 200,
        body: {
          qr_code: 'PIX_CODE_MOCK',
          externalReference: 'ref-123'
        }
      }).as('criarCobranca');

      cy.get('.card-ong-link').first().click();
      
      cy.get('#doacao-nome').type('João Silva');
      cy.get('#doacao-email').type('joao@teste.com');
      cy.get('#doacao-valor').type('100');
      
      cy.get('#form-doacao button[type="submit"]').click();
      
      cy.wait('@criarCobranca');
      
      // Verifica se o formulário foi escondido
      cy.get('#form-doacao').should('not.be.visible');
      
      // Verifica se a área PIX apareceu
      cy.get('#area-pix-gerado').should('be.visible');
      cy.get('#pix-codigo').should('have.value', 'PIX_CODE_MOCK');
      cy.get('#qrcode-container').should('be.visible');
    });

    it('1.3 - Deve copiar código PIX ao clicar no botão', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [{ id: 'ong-1', nome: 'ONG Teste', caminho_logo: '/test.jpg' }]
      });

      cy.intercept('POST', '/api/public/criar-cobranca', {
        body: { qr_code: 'CODIGO_PIX_TESTE', externalReference: 'ref-123' }
      });

      cy.get('.card-ong-link').first().click();
      cy.get('#doacao-nome').type('João');
      cy.get('#doacao-email').type('joao@teste.com');
      cy.get('#doacao-valor').type('50');
      cy.get('#form-doacao button[type="submit"]').click();

      cy.get('#btn-copiar-pix').click();
      
      // Verifica feedback visual
      cy.get('#copiado-feedback').should('be.visible');
      cy.get('#copiado-feedback').should('contain.text', 'Copiado!');
      
      // Feedback deve desaparecer após 2 segundos
      cy.wait(2100);
      cy.get('#copiado-feedback').should('not.be.visible');
    });

    it('1.4 - Deve resetar formulário ao fechar modal', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [{ id: 'ong-1', nome: 'ONG Teste', caminho_logo: '/test.jpg' }]
      });

      cy.get('.card-ong-link').first().click();
      
      cy.get('#doacao-nome').type('João Silva');
      cy.get('#doacao-email').type('joao@teste.com');
      cy.get('#doacao-valor').type('100');
      
      cy.get('#doacaoModal .btn-close').click();
      cy.wait(500);
      
      cy.get('.card-ong-link').first().click();
      
      // Verifica se campos foram resetados
      cy.get('#doacao-nome').should('have.value', '');
      cy.get('#doacao-email').should('have.value', '');
      cy.get('#doacao-valor').should('have.value', '');
      cy.get('#form-doacao').should('be.visible');
      cy.get('#area-pix-gerado').should('not.be.visible');
    });

    it('1.5 - Deve mostrar loader durante processamento', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [{ id: 'ong-1', nome: 'ONG Teste', caminho_logo: '/test.jpg' }]
      });

      cy.intercept('POST', '/api/public/criar-cobranca', (req) => {
        req.reply({
          delay: 1000,
          statusCode: 200,
          body: { qr_code: 'PIX_CODE', externalReference: 'ref-123' }
        });
      }).as('criarCobranca');

      cy.get('.card-ong-link').first().click();
      cy.get('#doacao-nome').type('João');
      cy.get('#doacao-email').type('joao@teste.com');
      cy.get('#doacao-valor').type('50');
      
      cy.get('#form-doacao button[type="submit"]').click();
      
      // Verifica se o botão foi desabilitado e texto alterado
      cy.get('#form-doacao button[type="submit"]')
        .should('be.disabled')
        .and('contain.text', 'Gerando PIX...');
    });
  });

  // ============================================
  // 2. TESTES DE BUSCA E PAGINAÇÃO
  // ============================================

  describe('2. Sistema de Busca e Filtros', () => {

    it('2.1 - Deve filtrar ONGs por nome', () => {
      // Mock com múltiplas ONGs
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'Casa de Apoio Infantil', sobre: 'Cuida de crianças carentes', area_atuacao: 'crianças', caminho_logo: '/logo1.jpg' },
          { id: '2', nome: 'Abrigo de Animais Abandonados', sobre: 'Resgata e cuida de animais', area_atuacao: 'animais', caminho_logo: '/logo2.jpg' },
          { id: '3', nome: 'Lar dos Idosos Felizes', sobre: 'Cuidados com idosos', area_atuacao: 'idosos', caminho_logo: '/logo3.jpg' },
          { id: '4', nome: 'Proteção Animal Brasil', sobre: 'Defesa dos direitos animais', area_atuacao: 'animais', caminho_logo: '/logo4.jpg' },
          { id: '5', nome: 'Creche Esperança', sobre: 'Educação infantil gratuita', area_atuacao: 'crianças', caminho_logo: '/logo5.jpg' }
        ]
      }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      // Aguarda renderização
      cy.get('.card-ong').should('have.length', 5);
      
      cy.get('#input-busca').type('Animais');
      
      // Deve mostrar apenas ONGs que contêm "animais" no nome
      cy.get('.card-ong').should('have.length', 2);
      cy.get('.card-ong').eq(0).find('h3').should('contain.text', 'Abrigo de Animais');
      cy.get('.card-ong').eq(1).find('h3').should('contain.text', 'Proteção Animal');
    });

    it('2.2 - Deve filtrar ONGs por área de atuação', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'Casa de Apoio Infantil', sobre: 'Cuida de crianças carentes', area_atuacao: 'crianças', caminho_logo: '/logo1.jpg' },
          { id: '2', nome: 'Abrigo de Animais', sobre: 'Resgata animais', area_atuacao: 'animais', caminho_logo: '/logo2.jpg' },
          { id: '3', nome: 'Lar dos Idosos', sobre: 'Cuidados idosos', area_atuacao: 'idosos', caminho_logo: '/logo3.jpg' },
          { id: '4', nome: 'Creche Esperança', sobre: 'Educação infantil', area_atuacao: 'crianças', caminho_logo: '/logo4.jpg' }
        ]
      }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      cy.get('.card-ong').should('have.length', 4);
      
      cy.get('#input-busca').type('crianças');
      
      cy.get('.card-ong').should('have.length', 2);
      cy.get('.card-ong').eq(0).find('h3').should('contain.text', 'Casa de Apoio Infantil');
      cy.get('.card-ong').eq(1).find('h3').should('contain.text', 'Creche Esperança');
    });

    it('2.3 - Deve filtrar por conteúdo do campo "sobre"', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'ONG A', sobre: 'Trabalha com educação', area_atuacao: 'educação', caminho_logo: '/logo1.jpg' },
          { id: '2', nome: 'ONG B', sobre: 'Resgata e protege animais', area_atuacao: 'animais', caminho_logo: '/logo2.jpg' },
          { id: '3', nome: 'ONG C', sobre: 'Cuida de crianças', area_atuacao: 'crianças', caminho_logo: '/logo3.jpg' }
        ]
      }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      cy.get('.card-ong').should('have.length', 3);
      
      cy.get('#input-busca').type('resgata');
      
      cy.get('.card-ong').should('have.length', 1);
      cy.get('.card-ong h3').should('contain.text', 'ONG B');
    });

    it('2.4 - Deve mostrar mensagem quando nenhuma ONG é encontrada', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'ONG Teste', sobre: 'Descrição', area_atuacao: 'educação', caminho_logo: '/logo.jpg' }
        ]
      }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      cy.get('.card-ong').should('have.length', 1);
      
      cy.get('#input-busca').type('xyzabc123naoencontrado');
      
      cy.get('.card-ong').should('have.length', 0);
      cy.get('.mensagem-vazia').should('be.visible');
      cy.get('.mensagem-vazia h3').should('contain.text', 'Nenhuma ONG encontrada');
    });

    it('2.5 - Deve resetar busca ao limpar campo', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'ONG A', sobre: 'Descrição A', area_atuacao: 'crianças', caminho_logo: '/logo1.jpg' },
          { id: '2', nome: 'ONG B', sobre: 'Descrição B', area_atuacao: 'animais', caminho_logo: '/logo2.jpg' },
          { id: '3', nome: 'ONG C', sobre: 'Descrição C', area_atuacao: 'idosos', caminho_logo: '/logo3.jpg' }
        ]
      }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      cy.get('.card-ong').should('have.length', 3);
      
      cy.get('#input-busca').type('animais');
      cy.get('.card-ong').should('have.length', 1);
      
      cy.get('#input-busca').clear();
      
      // Deve mostrar todas as ONGs novamente
      cy.get('.card-ong').should('have.length', 3);
      cy.get('.mensagem-vazia').should('not.be.visible');
    });

    it('2.6 - Busca deve ser case-insensitive', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'Lar dos Idosos', sobre: 'Cuidados', area_atuacao: 'idosos', caminho_logo: '/logo.jpg' },
          { id: '2', nome: 'Casa de Apoio', sobre: 'Apoio social', area_atuacao: 'geral', caminho_logo: '/logo2.jpg' }
        ]
      }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      cy.get('.card-ong').should('have.length', 2);
      
      cy.get('#input-busca').type('IDOSOS');
      
      cy.get('.card-ong').should('have.length', 1);
      cy.get('.card-ong h3').should('contain.text', 'Lar dos Idosos');
    });
  });

  describe('3. Paginação', () => {

    it('3.1 - Deve mostrar apenas 6 ONGs na primeira página', () => {
      // Mock com 10 ONGs para testar paginação
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG Teste ${i + 1}`,
        sobre: `Descrição da ONG ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('.card-ong').should('have.length', 6);
      cy.get('.card-ong').eq(0).find('h3').should('contain.text', 'ONG Teste 1');
      cy.get('.card-ong').eq(5).find('h3').should('contain.text', 'ONG Teste 6');
    });

    it('3.2 - Deve mostrar paginação quando há mais de 6 ONGs', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('#paginacao-container').should('be.visible');
      cy.get('.btn-pagina').should('have.length.at.least', 4); // anterior, 1, 2, próximo
    });

    it('3.3 - Deve navegar para segunda página', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG Teste ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('.btn-pagina').contains('2').click();
      
      // Deve mostrar as ONGs 7 a 10 (4 ONGs)
      cy.get('.card-ong').should('have.length', 4);
      cy.get('.card-ong').eq(0).find('h3').should('contain.text', 'ONG Teste 7');
      cy.get('.card-ong').eq(3).find('h3').should('contain.text', 'ONG Teste 10');
    });

    it('3.4 - Deve desabilitar botão "anterior" na primeira página', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('.btn-pagina').first().should('be.disabled');
      cy.get('.btn-pagina').first().should('contain.text', '←');
    });

    it('3.5 - Deve desabilitar botão "próximo" na última página', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('.btn-pagina').contains('2').click();
      
      cy.get('.btn-pagina').last().should('be.disabled');
      cy.get('.btn-pagina').last().should('contain.text', '→');
    });

    it('3.6 - Deve destacar página atual', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('.btn-pagina').contains('1').should('have.class', 'active');
      
      cy.get('.btn-pagina').contains('2').click();
      
      cy.get('.btn-pagina').contains('1').should('not.have.class', 'active');
      cy.get('.btn-pagina').contains('2').should('have.class', 'active');
    });

    it('3.7 - Deve resetar para página 1 ao realizar busca', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG Teste ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      // Vai para página 2
      cy.get('.btn-pagina').contains('2').click();
      cy.get('.btn-pagina').contains('2').should('have.class', 'active');
      
      // Realiza busca
      cy.get('#input-busca').type('Teste');
      
      // Deve voltar para página 1
      cy.get('.btn-pagina').contains('1').should('have.class', 'active');
    });

    it('3.8 - Deve usar setas de navegação', () => {
      const ongs = Array.from({ length: 10 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      // Clica na seta "próximo"
      cy.get('.btn-pagina').last().click();
      
      cy.get('.card-ong').should('have.length', 4);
      
      // Clica na seta "anterior"
      cy.get('.btn-pagina').first().click();
      
      cy.get('.card-ong').should('have.length', 6);
    });

    it('3.9 - Não deve exibir paginação com 6 ou menos ONGs', () => {
      const ongs = Array.from({ length: 5 }, (_, i) => ({
        id: `ong-${i + 1}`,
        nome: `ONG ${i + 1}`,
        sobre: `Descrição ${i + 1}`,
        area_atuacao: 'geral',
        caminho_logo: `/logo${i + 1}.jpg`
      }));

      cy.intercept('GET', '/api/public/ongs', { body: ongs }).as('getOngs');
      
      cy.visit('http://localhost:3080/');
      cy.wait('@getOngs');
      
      cy.get('.card-ong').should('have.length', 5);
      cy.get('#paginacao-container').should('be.empty');
    });
  });

  // ============================================
  // 4. TESTES DE ACCORDION (FAQ)
  // ============================================

  describe('4. Accordion FAQ', () => {

    it('4.1 - Deve abrir item do accordion ao clicar', () => {
      cy.get('.accordion-header').first().click();
      
      cy.get('.accordion-header').first().should('have.class', 'active');
      cy.get('.accordion-content').first().should('have.class', 'active');
    });

    it('5.2 - Deve fechar outros accordions ao abrir um novo', () => {
      cy.get('.accordion-header').first().click();
      cy.get('.accordion-header').first().should('have.class', 'active');
      
      cy.get('.accordion-header').eq(1).click();
      
      // Primeiro deve estar fechado
      cy.get('.accordion-header').first().should('not.have.class', 'active');
      
      // Segundo deve estar aberto
      cy.get('.accordion-header').eq(1).should('have.class', 'active');
    });

    it('4.2 - Deve fechar accordion ao clicar novamente', () => {
      cy.get('.accordion-header').first().click();
      cy.get('.accordion-header').first().should('have.class', 'active');
      
      cy.get('.accordion-header').first().click();
      
      cy.get('.accordion-header').first().should('not.have.class', 'active');
    });
  });


  // ============================================
  // 5. TESTES DE LAYOUT RESPONSIVO
  // ============================================

  describe('5. Layout Responsivo', () => {

    it('5.1 - Deve adaptar grid de ONGs para mobile', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: '1', nome: 'ONG 1', sobre: 'Desc 1' },
          { id: '2', nome: 'ONG 2', sobre: 'Desc 2' }
        ]
      });

      cy.viewport('iphone-6');
      
      // Em mobile, os cards devem empilhar verticalmente
      cy.get('#ongs-grid').should('have.css', 'display', 'grid');
    });

    it('5.2 - Deve manter funcionalidade do modal em mobile', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [{ id: 'ong-1', nome: 'ONG Teste', caminho_logo: '/test.jpg' }]
      });

      cy.viewport('iphone-6');
      
      cy.get('.card-ong-link').first().click();
      cy.get('#doacaoModal').should('be.visible');
    });

    it('5.3 - Deve adaptar seção hero em tablets', () => {
      cy.viewport('ipad-2');
      
      cy.get('.hero').should('be.visible');
      cy.get('.hero-text h1').should('be.visible');
    });
  });

  // ============================================
  // 6. TESTES DE QUERY PARAMETERS (URL)
  // ============================================

  describe('6. Query Parameters na URL', () => {

    it('6.1 - Deve abrir modal automaticamente com ?ong=id', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: 'ong-abc-123', nome: 'ONG Especial', sobre: 'Descrição', caminho_logo: '/logo.jpg' }
        ]
      });

      cy.visit('http://localhost:3080/?ong=ong-abc-123');
      
      cy.wait(600); // Aguarda o setTimeout de 500ms
      
      cy.get('#doacaoModal').should('be.visible');
      cy.get('#modal-ong-nome').should('contain.text', 'ONG Especial');
    });

    it('6.2 - Deve filtrar ONG na lista quando há ?ong=id', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: 'ong-1', nome: 'ONG A', sobre: 'A' },
          { id: 'ong-2', nome: 'ONG B', sobre: 'B' }
        ]
      });

      cy.visit('http://localhost:3080/?ong=ong-2');
      
      // Deve mostrar apenas a ONG filtrada
      cy.get('.card-ong').should('have.length', 1);
      cy.get('.card-ong h3').should('contain.text', 'ONG B');
    });
  });

  // ============================================
  // 7. TESTES DE IMAGENS E FALLBACK
  // ============================================

  describe('7. Fallback de Imagens', () => {

    it('7.1 - Deve mostrar imagem padrão quando logo falha', () => {
      cy.intercept('GET', '/api/public/ongs', {
        body: [
          { id: 'ong-1', nome: 'ONG Teste', sobre: 'Descrição', caminho_logo: '/logo-inexistente.jpg' }
        ]
      });

      // Simula erro ao carregar imagem
      cy.get('.card-ong-imagem')
        .should('have.attr', 'onerror')
        .and('include', "this.src='/assets/imgs/comprador/avatar-padrao.jpg'");
    });
  });

});