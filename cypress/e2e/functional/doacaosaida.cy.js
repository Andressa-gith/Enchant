describe('Testes Funcionais de Interface - Registrar Retirada', () => {
    const TEST_USER = {
        email: 'teste@gmail.com',
        password: 'Testando@123'
    };

    const BASE_URL = 'http://localhost:3080';

    // Helper para fazer login antes de cada teste
    beforeEach(() => {
        cy.visit(`${BASE_URL}/entrar`);
        
        // Preencher credenciais e fazer login
        cy.get('#email').type(TEST_USER.email);
        cy.get('#senha').type(TEST_USER.password);
        cy.get('button[type="submit"]').click();
        
        // Aguardar redirecionamento e acessar a página de retirada
        cy.url().should('include', '/dashboard');
        cy.visit(`${BASE_URL}/doacao/retirar-doacao`);
        
        // Aguardar a página carregar completamente
        cy.get('#retirada-form').should('be.visible');
    });

    // ===========================================
    // 1. TESTES DE VALIDAÇÃO DE FORMULÁRIO
    // ===========================================
    describe('1. Validação de Formulário (Client-Side)', () => {
        
       

        it('1.1 - Campo de quantidade deve estar desabilitado até selecionar item', () => {
            // Verificar que o campo está desabilitado inicialmente
            cy.get('#quantidade-retirada').should('be.disabled');
            
            // Mock de estoque
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.reload();

            // Selecionar um item
            cy.get('#item-estoque').select('1');
            
            // Verificar que o campo foi habilitado
            cy.get('#quantidade-retirada').should('not.be.disabled');
            cy.get('#quantidade-retirada').should('have.value', '1');
        });

        it('1.2 - Deve respeitar o atributo max do campo quantidade', () => {
            // Mock de estoque
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: [{
                    entrada_id: 1,
                    quantidade_retirada: 35
                }]
            });

            cy.reload();

            // Selecionar item (disponível: 15)
            cy.get('#item-estoque').select('1');
            
            // Verificar que o atributo max foi definido
            cy.get('#quantidade-retirada').should('have.attr', 'max', '15');
        });
    });

    // ===========================================
    // 2. TESTES DE INTERATIVIDADE E FEEDBACK
    // ===========================================
    describe('2. Interatividade e Feedback (Componentes Visuais)', () => {
        

        it('2.1 - Deve exibir modal de sucesso após registro bem-sucedido', () => {
            // Mock de estoque
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.intercept('POST', '/api/doacao/registrar-retirada', {
                statusCode: 200,
                body: { message: 'Retirada registrada com sucesso' }
            }).as('registrarRetirada');

            cy.reload();

            // Preencher formulário
            cy.get('#item-estoque').select('1');
            cy.get('#quantidade-retirada').clear().type('10');
            cy.get('#destinatario').type('Família Silva');
            cy.get('#observacao').type('Entrega urgente');
            
            // Submeter
            cy.get('button[type="submit"]').click();
            
            // Aguardar requisição
            cy.wait('@registrarRetirada');
            
            // Verificar modal de sucesso
            cy.get('#successModal').should('be.visible');
            cy.get('#successModalBody').should('contain.text', 'Retirada registrada com sucesso!');
        });

        it('2.2 - Deve exibir modal de erro quando a API falhar', () => {
            // Mock de estoque
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.intercept('POST', '/api/doacao/registrar-retirada', {
                statusCode: 400,
                body: { message: 'Erro ao processar retirada' }
            }).as('registrarRetirada');

            cy.reload();

            // Preencher formulário
            cy.get('#item-estoque').select('1');
            cy.get('#quantidade-retirada').clear().type('5');
            
            // Submeter
            cy.get('button[type="submit"]').click();
            
            // Aguardar requisição
            cy.wait('@registrarRetirada');
            
            // Verificar modal de erro
            cy.get('#errorModal').should('be.visible');
            cy.get('#errorModalBody').should('contain.text', 'Falha ao registrar');
        });

        it('2.3 - Deve limpar formulário após sucesso e fechar modal', () => {
            // Mock de estoque
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.intercept('POST', '/api/doacao/registrar-retirada', {
                statusCode: 200,
                body: { message: 'Sucesso' }
            }).as('registrarRetirada');

            cy.reload();

            // Preencher formulário
            cy.get('#item-estoque').select('1');
            cy.get('#quantidade-retirada').clear().type('10');
            cy.get('#destinatario').type('Família Silva');
            cy.get('#observacao').type('Teste');
            
            // Submeter
            cy.get('button[type="submit"]').click();
            cy.wait('@registrarRetirada');
            
            // Fechar modal
            cy.get('#successModal .btn-close').click();
            
            // Verificar que o formulário foi resetado
            cy.get('#destinatario').should('have.value', '');
            cy.get('#observacao').should('have.value', '');
            cy.get('#info-disponivel').should('have.text', '');
            cy.get('#quantidade-retirada').should('be.disabled');
        });

        it('2.4 - Botão Voltar deve redirecionar corretamente', () => {
            cy.get('.botaosem').first().should('contain.text', 'Voltar').click();
            cy.url().should('eq', `${BASE_URL}/doacao`);
        });

        it('2.5 - Deve carregar itens do estoque ao iniciar', () => {
            // Mock de estoque com múltiplos itens
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        quantidade: 50,
                        doador_origem_texto: 'Doador A',
                        categoria_id: 1,
                        categoria: { nome: 'Cesta Básica' },
                        instituicao_id: 'test-id'
                    },
                    {
                        id: 2,
                        quantidade: 30,
                        doador_origem_texto: 'Doador B',
                        categoria_id: 2,
                        categoria: { nome: 'Roupas' },
                        instituicao_id: 'test-id'
                    }
                ]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.reload();

            // Verificar que os itens foram carregados no select
            cy.get('#item-estoque option').should('have.length.greaterThan', 2);
            cy.get('#item-estoque').should('contain', 'Cesta Básica');
            cy.get('#item-estoque').should('contain', 'Roupas');
        });

        it('2.6 - Deve exibir mensagem quando não há itens em estoque', () => {
            // Mock de estoque vazio
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: []
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.reload();

            // Verificar mensagem de estoque vazio
            cy.get('#item-estoque option').should('contain', 'Nenhum item em estoque para retirada');
        });
    });

    // ===========================================
    // 3. TESTES DE LAYOUT (RESPONSIVIDADE)
    // ===========================================
    describe('3. Testes de Layout (Responsividade)', () => {
        
        it('3.1 - Layout desktop deve exibir todos os elementos corretamente', () => {
            cy.viewport(1920, 1080);
            
            // Verificar título
            cy.get('.title').should('be.visible');
            cy.get('.title').should('have.css', 'font-size', '32px');
            
            // Verificar imagem de fundo
            cy.get('.background-image').should('be.visible');
            
            // Verificar formulário
            cy.get('.section-card').should('be.visible');
            cy.get('.form-card-wrapper').should('have.css', 'max-width', '550px');
            
            // Verificar botões lado a lado
            cy.get('.button-container').should('have.css', 'display', 'flex');
            cy.get('.button-container').should('have.css', 'justify-content', 'space-between');
        });

        it('3.2 - Layout mobile (768px) deve adaptar elementos', () => {
            cy.viewport(768, 1024);
            
            // Mock de estoque
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.reload();
            
            // Verificar que o título reduziu
            cy.get('.title').should('have.css', 'font-size', '32px'); // 2rem
            
            // Verificar que o card está responsivo
            cy.get('.form-card-wrapper').invoke('outerWidth').should('be.lte', 768);
            
            // Verificar padding reduzido
            cy.get('.section-card').should('have.css', 'padding', '24px'); // 1.5rem
            
            // Verificar que os campos estão responsivos
            cy.get('.form-control').each(($el) => {
                cy.wrap($el).invoke('outerWidth').should('be.lte', 768);
            });
        });

        it('3.3 - Layout mobile (576px) deve comprimir ainda mais', () => {
            cy.viewport(576, 812);
            
            cy.reload();
            
            // Verificar título ainda menor
            cy.get('.title').should('have.css', 'font-size').and('match', /28\.8px|1\.8rem/);
            
            // Verificar padding ainda menor
            cy.get('.section-card').should('have.css', 'padding', '16px');
            
            // Verificar que a imagem se adapta
            cy.get('.background-image').should('have.css', 'max-height', '80vh');
        });

        it('3.4 - Modais devem ser responsivos em mobile', () => {
            cy.viewport(375, 667); // iPhone SE
            
            // Mock
            cy.intercept('GET', '**/doacao_entrada**', {
                statusCode: 200,
                body: [{
                    id: 1,
                    quantidade: 50,
                    doador_origem_texto: 'Doador Teste',
                    categoria_id: 1,
                    categoria: { nome: 'Cesta Básica' },
                    instituicao_id: 'test-id'
                }]
            });
            
            cy.intercept('GET', '**/doacao_saida**', {
                statusCode: 200,
                body: []
            });

            cy.intercept('POST', '/api/doacao/registrar-retirada', {
                statusCode: 200,
                body: { message: 'Sucesso' }
            });

            cy.reload();

            // Preencher e submeter
            cy.get('#item-estoque').select('1');
            cy.get('#quantidade-retirada').clear().type('5');
            cy.get('button[type="submit"]').click();
            
            // Verificar que o modal aparece e é responsivo
            cy.get('#successModal').should('be.visible');
            cy.get('.modal-dialog').invoke('outerWidth').should('be.lte', 375);
        });

        it('3.5 - Campos de formulário devem ser legíveis em todas as resoluções', () => {
            const viewports = [
                [1920, 1080], // Desktop
                [1024, 768],  // Tablet
                [768, 1024],  // Tablet portrait
                [375, 667]    // Mobile
            ];

            viewports.forEach(([width, height]) => {
                cy.viewport(width, height);
                cy.reload();
                
                // Verificar que os labels são visíveis
                cy.get('.form-label').each(($label) => {
                    cy.wrap($label).should('be.visible');
                    cy.wrap($label).should('have.css', 'color', 'rgb(245, 245, 245)');
                });
                
                // Verificar que os inputs são acessíveis
                cy.get('.form-control').each(($input) => {
                    cy.wrap($input).should('be.visible');
                });
            });
        });
    });
});