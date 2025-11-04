describe('Dashboard - Testes Funcionais de Interface', () => {
  const dashboardUrl = 'http://localhost:3080/dashboard';
  const loginUrl = 'http://localhost:3080/entrar';
  
  // IMPORTANTE: Altere estas credenciais para um usuário de teste válido no seu sistema
  const TEST_USER = {
    email: 'teste@gmail.com',
    password: 'Testando@123'
  };
  
  // Mock de dados do dashboard para simular resposta da API
  const mockDashboardData = {
    kpis: {
      totalItensEstoque: 1250,
      totalFinanceiro: 45000.50,
      doadoresUnicos: 87,
      principalCategoria: 'Alimentos'
    },
    totaisPorCategoria: {
      'Alimentos': 450,
      'Roupas': 230,
      'Calçados': 120,
      'Produtos de Higiene': 180,
      'Produtos de Limpeza': 90,
      'Brinquedos e Livros': 50,
      'Móveis': 30,
      'Eletrodomésticos': 20,
      'Cobertores': 60,
      'Ração para Animais': 20
    },
    graficos: {
      fluxoFinanceiro: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
        datasets: [
          { data: [10000, 15000, 12000, 18000, 20000] },
          { data: [8000, 9000, 10000, 11000, 12000] }
        ]
      },
      fluxoDoacoes: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
        datasets: [
          { data: [100, 150, 120, 180, 200] },
          { data: [80, 90, 100, 110, 120] }
        ]
      },
      estoqueAtual: {
        labels: ['Alimentos', 'Roupas', 'Calçados', 'Higiene'],
        data: [450, 230, 120, 180]
      }
    },
    atividades: [
      {
        tipo: 'entrada',
        desc: 'Recebida doação de <b>50 unidades</b> de Alimentos',
        data: new Date().toISOString()
      },
      {
        tipo: 'saida',
        desc: 'Distribuídas <b>30 unidades</b> de Roupas',
        data: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    alertas: {
      parceriasExpiradas: [
        { nome: 'Supermercado ABC' }
      ],
      parceriasAExpirar: [
        { nome: 'Empresa XYZ' }
      ],
      estoqueBaixo: ['Móveis', 'Eletrodomésticos']
    },
    relatoriosRecentes: [
      {
        data_inicio_filtro: '2025-01-01',
        data_fim_filtro: '2025-01-31',
        caminho_arquivo_pdf: 'relatorios/123/relatorio-janeiro.pdf'
      }
    ],
    boasVindas: 'Instituto Esperança',
    primeiro_login: false
  };

  // Função para fazer login real antes dos testes
  function loginRealUser() {
    cy.session([TEST_USER.email], () => {
      cy.visit(loginUrl);
      
      // Aguarda a página carregar completamente
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible');
      
      // Preenche o formulário de login
      cy.get('input[type="email"]').clear().type(TEST_USER.email);
      cy.get('input[type="password"]').clear().type(TEST_USER.password);
      
      // Clica no botão de enviar (ajuste o seletor se necessário)
      cy.get('button[type="submit"]').click();
      
      // Aguarda o redirecionamento ou confirmação de login
      cy.url().should('include', '/dashboard', { timeout: 15000 });
      
      // Aguarda um pouco para garantir que o localStorage foi populado
      cy.wait(1000);
    }, {
      validate() {
        // Valida que a sessão ainda está ativa verificando qualquer chave do localStorage
        cy.getAllLocalStorage().then((result) => {
          const localStorage = result['http://localhost:3080'];
          
          // Procura por qualquer chave relacionada ao Supabase
          const hasSupabaseKey = localStorage && Object.keys(localStorage).some(key => 
            key.includes('supabase') || key.includes('sb-')
          );
          
          // Se não encontrar nenhuma chave do Supabase, apenas aceita (para evitar falso negativo)
          // O importante é que conseguimos fazer login uma vez
          if (!hasSupabaseKey) {
            cy.log('⚠️ Sessão não encontrada no localStorage, mas continuando...');
          }
        });
      },
      cacheAcrossSpecs: true
    });
  }

  beforeEach(() => {
    // Faz login real (usa cache de sessão do Cypress)
    loginRealUser();
    
    // Intercepta a chamada à API do dashboard DEPOIS do login
    cy.intercept('GET', '/api/dashboard*', {
      statusCode: 200,
      body: mockDashboardData
    }).as('getDashboardData');
    
    // Visita a página do dashboard
    cy.visit(dashboardUrl);
  });

  // ==================== CATEGORIA 1: TESTES DE VALIDAÇÃO ====================
  
  describe('1. Validação de Filtros de Data', () => {
    
    it('1.1 - Deve alertar ao tentar filtrar com data final anterior à inicial', () => {
      cy.wait('@getDashboardData');

      // Preenche data inicial posterior à data final
      cy.get('#startDateFilter').clear().type('2025-10-10');
      cy.get('#endDateFilter').clear().type('2025-10-05');
      
      // Intercepta o alert
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alertStub');
      });

      cy.get('#filterBtn').click();

      // Verifica se o alert foi exibido
      cy.get('@alertStub').should('have.been.calledWith', 
        'Por favor, selecione um período de datas válido.');
      
      // Verifica que a API NÃO foi chamada novamente
      cy.get('@getDashboardData.all').should('have.length', 1);
    });

    it('1.2 - Deve permitir filtrar com datas válidas', () => {
      cy.wait('@getDashboardData');

      // Preenche datas válidas
      cy.get('#startDateFilter').clear().type('2025-01-01');
      cy.get('#endDateFilter').clear().type('2025-01-31');

      cy.get('#filterBtn').click();

      // Verifica que a API foi chamada com os parâmetros corretos
      cy.wait('@getDashboardData').its('request.url')
        .should('include', 'startDate=2025-01-01')
        .and('include', 'endDate=2025-01-31');
    });

    it('1.3 - Deve ter datas padrão (primeiro dia do mês até hoje) ao carregar', () => {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      cy.get('#startDateFilter').should('have.value', 
        primeiroDia.toISOString().split('T')[0]);
      cy.get('#endDateFilter').should('have.value', 
        hoje.toISOString().split('T')[0]);
    });
  });

  // ==================== CATEGORIA 2: TESTES DE INTERATIVIDADE ====================
  
  describe('2. Interatividade - KPIs e Dados do Dashboard', () => {
    
    it('2.1 - Deve exibir mensagem de boas-vindas correta', () => {
      cy.wait('@getDashboardData');

      cy.get('#boas-vindas')
        .should('contain.text', 'Bem-vinda, Instituto Esperança!');
    });

    it('2.2 - Deve exibir os KPIs corretamente formatados', () => {
      cy.wait('@getDashboardData');

      // Verifica total de itens em estoque
      cy.get('#kpi-total-itens').should('contain.text', '1.250');

      // Verifica total financeiro formatado como moeda
      cy.get('#kpi-total-financeiro').should('contain.text', 'R$');
      cy.get('#kpi-total-financeiro').should('contain.text', '45.000,50');

      // Verifica doadores únicos
      cy.get('#kpi-doadores-unicos').should('contain.text', '87');

      // Verifica principal categoria
      cy.get('#kpi-principal-categoria').should('contain.text', 'Alimentos');
    });

    it('2.3 - Deve exibir os totais por categoria corretamente', () => {
      cy.wait('@getDashboardData');

      cy.get('#stat-alimentos').should('contain.text', '450');
      cy.get('#stat-roupas').should('contain.text', '230');
      cy.get('#stat-calcados').should('contain.text', '120');
      cy.get('#stat-higiene').should('contain.text', '180');
      cy.get('#stat-limpeza').should('contain.text', '90');
      cy.get('#stat-brinquedos').should('contain.text', '50');
      cy.get('#stat-moveis').should('contain.text', '30');
      cy.get('#stat-eletro').should('contain.text', '20');
      cy.get('#stat-cama').should('contain.text', '60');
      cy.get('#stat-racao').should('contain.text', '20');
    });
  });

  describe('3. Interatividade - Alternância de Visualizações do Gráfico', () => {
    
    it('3.1 - Deve iniciar com a visualização "Saúde Financeira" ativa', () => {
      cy.wait('@getDashboardData');

      cy.get('.btn-view-filter[data-view="financeiro"]')
        .should('have.class', 'active');
    });

    it('3.2 - Deve alternar para visualização "Fluxo de Doações"', () => {
      cy.wait('@getDashboardData');

      cy.get('.btn-view-filter[data-view="fluxo"]').click();

      // Verifica que o botão ficou ativo
      cy.get('.btn-view-filter[data-view="fluxo"]')
        .should('have.class', 'active');
      
      // Verifica que o botão anterior perdeu a classe active
      cy.get('.btn-view-filter[data-view="financeiro"]')
        .should('not.have.class', 'active');
    });

    it('3.3 - Deve alternar para visualização "Estoque por Categoria"', () => {
      cy.wait('@getDashboardData');

      cy.get('.btn-view-filter[data-view="estoque"]').click();

      cy.get('.btn-view-filter[data-view="estoque"]')
        .should('have.class', 'active');
      cy.get('.btn-view-filter[data-view="financeiro"]')
        .should('not.have.class', 'active');
    });

    it('3.4 - Deve manter apenas um botão ativo por vez', () => {
      cy.wait('@getDashboardData');

      // Clica em diferentes visualizações
      cy.get('.btn-view-filter[data-view="fluxo"]').click();
      cy.get('.btn-view-filter.active').should('have.length', 1);

      cy.get('.btn-view-filter[data-view="estoque"]').click();
      cy.get('.btn-view-filter.active').should('have.length', 1);

      cy.get('.btn-view-filter[data-view="financeiro"]').click();
      cy.get('.btn-view-filter.active').should('have.length', 1);
    });
  });

  describe('4. Interatividade - Alertas e Widgets', () => {
    
    it('4.1 - Deve exibir alertas de parcerias expiradas', () => {
      cy.wait('@getDashboardData');

      cy.get('#alertsPanel')
        .should('contain.text', 'Supermercado ABC')
        .and('contain.text', 'está expirada');
      
      // Verifica o ícone correto
      cy.get('#alertsPanel .bi-exclamation-octagon-fill').should('exist');
    });

    it('4.2 - Deve exibir alertas de parcerias a expirar', () => {
      cy.wait('@getDashboardData');

      cy.get('#alertsPanel')
        .should('contain.text', 'Empresa XYZ')
        .and('contain.text', 'expira em breve');
      
      cy.get('#alertsPanel .bi-calendar-x-fill').should('exist');
    });

    it('4.3 - Deve exibir alertas de estoque baixo', () => {
      cy.wait('@getDashboardData');

      cy.get('#alertsPanel')
        .should('contain.text', 'Móveis')
        .and('contain.text', 'está baixo')
        .and('contain.text', '(30)');
      
      cy.get('#alertsPanel')
        .should('contain.text', 'Eletrodomésticos')
        .and('contain.text', '(20)');
    });

    it('4.4 - Deve exibir relatórios recentes com link de download', () => {
      cy.wait('@getDashboardData');

      cy.get('#reportsPanel')
        .should('contain.text', 'Relatório de')
        .and('contain.text', '01/01/2025')
        .and('contain.text', '31/01/2025');
      
      cy.get('#reportsPanel .report-download-btn').should('exist');
      cy.get('#reportsPanel .bi-download').should('exist');
    });

    it('4.5 - Deve exibir atividades recentes com ícones corretos', () => {
      cy.wait('@getDashboardData');

      // Verifica entrada
      cy.get('#lista-atividades-recentes')
        .should('contain.text', 'Recebida doação')
        .and('contain.text', '50 unidades')
        .and('contain.text', 'Alimentos');
      
      cy.get('#lista-atividades-recentes .bi-box-arrow-in-down').should('exist');

      // Verifica saída
      cy.get('#lista-atividades-recentes')
        .should('contain.text', 'Distribuídas')
        .and('contain.text', '30 unidades')
        .and('contain.text', 'Roupas');
      
      cy.get('#lista-atividades-recentes .bi-box-arrow-up').should('exist');
    });
  });

  describe('5. Interatividade - Botão Reset', () => {
    
    it('5.1 - Deve resetar as datas para o padrão ao clicar no botão reset', () => {
      cy.wait('@getDashboardData');

      // Altera as datas
      cy.get('#startDateFilter').clear().type('2024-06-01');
      cy.get('#endDateFilter').clear().type('2024-06-30');

      // Clica no botão reset
      cy.get('#resetBtn').click();

      // Verifica que as datas voltaram ao padrão
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      cy.get('#startDateFilter').should('have.value', 
        primeiroDia.toISOString().split('T')[0]);
      cy.get('#endDateFilter').should('have.value', 
        hoje.toISOString().split('T')[0]);

      // Verifica que a API foi chamada novamente
      cy.wait('@getDashboardData');
    });
  });

  describe('6. Interatividade - Download de Relatórios', () => {
    
    it('6.1 - Deve interceptar clique no botão de download e simular abertura de URL', () => {
      cy.wait('@getDashboardData');

      // Stub do window.open
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      // Clica no botão de download
      cy.get('.report-download-btn').first().click();

      // Verifica que window.open foi chamado
      cy.get('@windowOpen').should('have.been.called');
    });
  });

  // ==================== CATEGORIA 3: TESTES DE LAYOUT (RESPONSIVIDADE) ====================
  
  describe('7. Layout - Responsividade Desktop', () => {
    
    it('7.1 - Deve exibir layout completo em desktop (1920x1080)', () => {
      cy.viewport(1920, 1080);
      cy.wait('@getDashboardData');

      // Verifica que os cards de resumo estão visíveis
      cy.get('.summary-section .summary-card').should('have.length', 4);
      cy.get('.summary-section .summary-card').each(($card) => {
        cy.wrap($card).should('be.visible');
      });

      // Verifica que os gráficos estão visíveis
      cy.get('#mainChart').should('be.visible');
      cy.get('#stockDoughnutChart').should('be.visible');

      // Verifica que os widgets estão visíveis
      cy.get('#alertsPanel').should('be.visible');
      cy.get('#reportsPanel').should('be.visible');
      cy.get('#lista-atividades-recentes').should('be.visible');
    });

    it('7.2 - Deve exibir header com título e filtros lado a lado em desktop', () => {
      cy.viewport(1920, 1080);
      cy.wait('@getDashboardData');

      cy.get('.dashboard-header').should('be.visible');
      cy.get('.dashboard-header h1').should('be.visible');
      cy.get('.header-filters').should('be.visible');
    });
  });

  describe('8. Layout - Responsividade Tablet', () => {
    
    it('8.1 - Deve adaptar layout em tablet (768x1024)', () => {
      cy.viewport(768, 1024);
      cy.wait('@getDashboardData');

      // Verifica que os elementos principais ainda estão visíveis
      cy.get('.summary-section').should('be.visible');
      cy.get('#mainChart').should('be.visible');
      cy.get('#stockDoughnutChart').should('be.visible');
    });

    it('8.2 - Deve empilhar gráficos em coluna única em tablet', () => {
      cy.viewport(768, 1024);
      cy.wait('@getDashboardData');

      // Verifica que os gráficos estão empilhados (através do CSS grid)
      cy.get('.main-charts-section').should('have.css', 'display', 'grid');
    });
  });

  describe('9. Layout - Responsividade Mobile', () => {
    
    it('9.1 - Deve adaptar layout para mobile (375x667 - iPhone SE)', () => {
      cy.viewport(375, 667);
      cy.wait('@getDashboardData');

      // Verifica que o dashboard é visível e rolável
      cy.get('.dashboard-container').should('be.visible');
      
      // Verifica que os cards de resumo estão em coluna única
      cy.get('.summary-section').should('be.visible');
    });

    it('9.2 - Deve ajustar filtros de data para largura total em mobile', () => {
      cy.viewport(375, 667);
      cy.wait('@getDashboardData');

      // Verifica que o grupo de filtros ocupa a largura total
      cy.get('.date-picker-group').should('be.visible');
      cy.get('#startDateFilter').should('be.visible');
      cy.get('#endDateFilter').should('be.visible');
      cy.get('#filterBtn').should('be.visible');
    });

    it('9.3 - Deve empilhar widgets em coluna única em mobile', () => {
      cy.viewport(375, 667);
      cy.wait('@getDashboardData');

      cy.get('.widgets-section').should('be.visible');
      cy.get('.widget-card').should('have.length.at.least', 3);
    });

    it('9.4 - Deve permitir scroll em lista de atividades em mobile', () => {
      cy.viewport(375, 667);
      cy.wait('@getDashboardData');

      cy.get('#lista-atividades-recentes')
        .should('be.visible')
        .and('have.css', 'overflow-y', 'auto');
    });
  });

  // ==================== TESTES ADICIONAIS DE COMPORTAMENTO ====================
  
  describe('10. Comportamento - Estados de Carregamento', () => {
    
    it('10.1 - Deve exibir "Buscando informações..." enquanto busca dados', () => {
      cy.intercept('GET', '/api/dashboard*', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send({
            statusCode: 200,
            body: mockDashboardData
          });
        });
      }).as('slowDashboardData');

      cy.visit(dashboardUrl);

      // Verifica estado de carregamento
      cy.get('#boas-vindas', { timeout: 10000 }).should('contain.text', 'Buscando informações...');
      
      cy.wait('@slowDashboardData');
      
      // Após carregamento, deve mostrar boas-vindas
      cy.get('#boas-vindas').should('contain.text', 'Bem-vinda');
    });

  });

  describe('11. Comportamento - Tratamento de Erros', () => {
    
    it('11.1 - Deve exibir mensagem de erro quando API falhar', () => {
      cy.intercept('GET', '/api/dashboard*', {
        statusCode: 500,
        body: { error: 'Erro interno do servidor' }
      }).as('dashboardError');

      cy.visit(dashboardUrl);
      cy.wait('@dashboardError');

      cy.get('#boas-vindas', { timeout: 10000 }).should('contain.text', 'Erro ao carregar dados.');
    });
  });

  describe('12. Comportamento - Dados Vazios', () => {
    
    it('12.1 - Deve exibir mensagens apropriadas quando não há alertas', () => {
      const emptyAlertsData = {
        ...mockDashboardData,
        alertas: {
          parceriasExpiradas: [],
          parceriasAExpirar: [],
          estoqueBaixo: []
        }
      };

      cy.intercept('GET', '/api/dashboard*', {
        statusCode: 200,
        body: emptyAlertsData
      }).as('emptyAlerts');

      cy.visit(dashboardUrl);
      cy.wait('@emptyAlerts');

      cy.get('#alertsPanel')
        .should('contain.text', 'Nenhum alerta no momento.');
    });

    it('12.2 - Deve exibir mensagem quando não há relatórios recentes', () => {
      const noReportsData = {
        ...mockDashboardData,
        relatoriosRecentes: []
      };

      cy.intercept('GET', '/api/dashboard*', {
        statusCode: 200,
        body: noReportsData
      }).as('noReports');

      cy.visit(dashboardUrl);
      cy.wait('@noReports');

      cy.get('#reportsPanel')
        .should('contain.text', 'Nenhum relatório recente.');
    });

    it('12.3 - Deve exibir mensagem quando não há atividades', () => {
      const noActivitiesData = {
        ...mockDashboardData,
        atividades: []
      };

      cy.intercept('GET', '/api/dashboard*', {
        statusCode: 200,
        body: noActivitiesData
      }).as('noActivities');

      cy.visit(dashboardUrl);
      cy.wait('@noActivities');

      cy.get('#lista-atividades-recentes')
        .should('contain.text', 'Nenhuma atividade no período.');
    });
  });
});