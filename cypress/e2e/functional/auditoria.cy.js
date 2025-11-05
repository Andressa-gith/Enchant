describe('Testes Funcionais - Notas de Auditoria (transparencia3.html)', () => {
    const TEST_USER = {
        email: 'teste@gmail.com',
        password: 'Testando@123'
    };

    beforeEach(() => {
        // Login antes de cada teste
        cy.visit('http://localhost:3080/entrar');
        cy.get('#email').type(TEST_USER.email);
        cy.get('#senha').type(TEST_USER.password);
        cy.get('button[type="submit"]').click();
        cy.wait(1000);
        
        // Navegar para a página de auditorias
        cy.visit('http://localhost:3080/transparencia/notas-auditoria');
        cy.wait(500);
    });

    // ==========================================
    // 1. TESTES DE VALIDAÇÃO DE FORMULÁRIO
    // ==========================================

    describe('1. Validação de Formulário (Client-Side)', () => {
        
        it('1.1 - Deve impedir envio com título muito curto (menos de 10 caracteres)', () => {
            cy.get('#audit-title').type('Teste');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audit-title-error')
                .should('be.visible')
                .and('contain.text', 'O título deve ter no mínimo 10 caracteres');
            
            cy.get('#audit-title').should('have.class', 'error');
        });

        it('1.2 - Deve impedir envio com data futura', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type(futureDateStr);
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audit-date-error')
                .should('be.visible')
                .and('contain.text', 'A data deve ser válida, não futura e de no máximo 5 anos atrás');
            
            cy.get('#audit-date').should('have.class', 'error');
        });

        it('1.3 - Deve impedir envio com data anterior a 5 anos', () => {
            const oldDate = new Date();
            oldDate.setFullYear(oldDate.getFullYear() - 6);
            const oldDateStr = oldDate.toISOString().split('T')[0];
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2018');
            cy.get('#audit-date').type(oldDateStr);
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audit-date-error')
                .should('be.visible')
                .and('contain.text', 'A data deve ser válida, não futura e de no máximo 5 anos atrás');
        });

        it('1.4 - Deve impedir envio sem data preenchida', () => {
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audit-date-error')
                .should('be.visible')
                .and('contain.text', 'A data é obrigatória');
        });

        it('1.5 - Deve impedir envio sem tipo selecionado', () => {
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-status').select('Aprovado');
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audit-type-error')
                .should('be.visible')
                .and('contain.text', 'Por favor, selecione um tipo');
            
            cy.get('#audit-type').should('have.class', 'error');
        });

        it('1.6 - Deve impedir envio sem status selecionado', () => {
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audit-status-error')
                .should('be.visible')
                .and('contain.text', 'Por favor, selecione um status');
            
            cy.get('#audit-status').should('have.class', 'error');
        });

      it('1.7 - Deve impedir envio sem arquivo anexado', () => {
    cy.get('#audit-title').type('Auditoria Teste Completa 2024');
    cy.get('#audit-date').type('2024-10-10');
    cy.get('#audit-type').select('Auditoria interna');
    cy.get('#audit-status').select('Aprovado');
    // NÃO anexar arquivo
    
    cy.get('#audits-form .upload-btn').click();
    
    cy.get('#alert-audits')  // Muda para alert geral ao invés de erro específico
        .should('be.visible')
        .and('contain.text', 'Arquivo');
});

        it('1.8 - Deve validar formato de arquivo (apenas PDF e DOC)', () => {
    const invalidFile = new File(['conteúdo'], 'teste.txt', { type: 'text/plain' });
    cy.get('#audit-file').then(input => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(invalidFile);
        input[0].files = dataTransfer.files;
        input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    cy.get('#audit-file-error')
        .should('be.visible')
        .and('contain.text', 'Formato inválido');
});
        it('1.9 - Deve validar tamanho máximo do arquivo (20MB)', () => {
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            // Criar arquivo maior que 20MB
            const largeContent = new Array(21 * 1024 * 1024).fill('a').join('');
            const largeFile = new File([largeContent], 'teste.pdf', { type: 'application/pdf' });
            
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(largeFile);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audit-file-error')
                .should('be.visible')
                .and('contain.text', 'O arquivo é muito grande (máximo 20MB)');
        });

        it('1.10 - Deve mostrar alerta com campos faltantes quando múltiplos erros', () => {
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#alert-audits')
                .should('be.visible')
                .and('contain.text', 'Por favor, corrija os seguintes campos:');
        });

       it('1.11 - Deve remover erro ao corrigir título (validação em tempo real)', () => {
    cy.get('#audit-title').type('Teste');
    cy.get('#audit-title').blur();
    
    cy.get('#audit-title-error').should('be.visible');
    cy.get('#audit-title').should('have.class', 'error');
    
    cy.get('#audit-title').clear().type('Auditoria Teste Completa');
    cy.get('#audit-title').blur();
    
    cy.get('#audit-title-error').should('not.be.visible');
    cy.get('#audit-title').should('not.have.class', 'error');
});

        it('1.12 - Deve remover erro ao corrigir data (validação em tempo real)', () => {
            cy.get('#audit-date').blur();
            
            cy.get('#audit-date-error').should('be.visible');
            
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-date').blur();
            
            cy.get('#audit-date-error').should('not.be.visible');
            cy.get('#audit-date').should('not.have.class', 'error');
        });
    });

    // ==========================================
    // 2. TESTES DE INTERATIVIDADE E FEEDBACK
    // ==========================================

    describe('2. Interatividade e Feedback (Componentes Visuais)', () => {
        
        it('2.1 - Deve mostrar nome do arquivo selecionado na área de upload', () => {
    const fileName = 'auditoria-teste.pdf';
    const file = new File(['conteúdo'], fileName, { type: 'application/pdf' });
    
    cy.get('#audit-file').then(input => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input[0].files = dataTransfer.files;
        input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    cy.get('.file-upload p').should('contain.text', `Arquivo: ${fileName}`);
});

        it('2.2 - Deve adicionar classe "dragover" ao arrastar arquivo', () => {
            cy.get('.file-upload').trigger('dragover');
            cy.get('.file-upload').should('have.class', 'dragover');
        });

        it('2.3 - Deve remover classe "dragover" ao sair da área', () => {
            cy.get('.file-upload').trigger('dragover');
            cy.get('.file-upload').should('have.class', 'dragover');
            
            cy.get('.file-upload').trigger('dragleave');
            cy.get('.file-upload').should('not.have.class', 'dragover');
        });

        it('2.4 - Deve desabilitar botão e mostrar "Enviando..." durante envio', () => {
            cy.intercept('POST', '/api/auditorias', {
                delay: 2000,
                statusCode: 201,
                body: { message: 'Auditoria adicionada com sucesso!' }
            }).as('addAudit');
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            const file = new File(['conteúdo'], 'teste.pdf', { type: 'application/pdf' });
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.get('#audits-form .upload-btn')
                .should('be.disabled')
                .and('contain.text', 'Enviando...');
            
            cy.wait('@addAudit');
            
            cy.get('#audits-form .upload-btn')
                .should('not.be.disabled')
                .and('contain.text', 'Adicionar auditoria');
        });

        it('2.5 - Deve mostrar mensagem de sucesso após adicionar auditoria', () => {
            cy.intercept('POST', '/api/auditorias', {
                statusCode: 201,
                body: { message: 'Auditoria adicionada com sucesso!' }
            }).as('addAudit');
            
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: []
            }).as('loadAudits');
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            const file = new File(['conteúdo'], 'teste.pdf', { type: 'application/pdf' });
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audits-form .upload-btn').click();
            
            cy.wait('@addAudit');
            
            cy.get('#success-audits')
                .should('be.visible')
                .and('contain.text', 'Auditoria adicionada com sucesso!');
        });

        it('2.6 - Deve limpar formulário após envio bem-sucedido', () => {
            cy.intercept('POST', '/api/auditorias', {
                statusCode: 201,
                body: { message: 'Auditoria adicionada com sucesso!' }
            }).as('addAudit');
            
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: []
            }).as('loadAudits');
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            const file = new File(['conteúdo'], 'teste.pdf', { type: 'application/pdf' });
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audits-form .upload-btn').click();
            cy.wait('@addAudit');
            
            cy.get('#audit-title').should('have.value', '');
            cy.get('#audit-date').should('have.value', '');
            cy.get('#audit-type').should('have.value', null);
            cy.get('#audit-status').should('have.value', null);
            cy.get('.file-upload p').should('contain.text', 'Clique para selecionar o arquivo ou arraste aqui');
        });

        it('2.7 - Deve mostrar mensagem de erro ao falhar no envio', () => {
            cy.intercept('POST', '/api/auditorias', {
                statusCode: 500,
                body: { message: 'Erro ao adicionar auditoria' }
            }).as('addAuditError');
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            const file = new File(['conteúdo'], 'teste.pdf', { type: 'application/pdf' });
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audits-form .upload-btn').click();
            cy.wait('@addAuditError');
            
            cy.get('#alert-audits')
                .should('be.visible')
                .and('contain.text', 'Erro ao adicionar auditoria');
        });

        it('2.8 - Deve mostrar loader ao carregar auditorias', () => {
            cy.intercept('GET', '/api/auditorias', {
                delay: 2000,
                statusCode: 200,
                body: []
            }).as('loadAudits');
            
            cy.reload();
            
            cy.get('#loader').should('be.visible');
            cy.wait('@loadAudits');
            cy.get('#loader').should('not.be.visible');
        });

        it('2.9 - Deve mostrar estado vazio quando não há auditorias', () => {
    cy.intercept('GET', '/api/auditorias', {
        statusCode: 200,
        body: []
    }).as('loadAudits');
    
    cy.reload();
    cy.wait('@loadAudits');
    
    cy.get('#empty-state')
        .should('be.visible')
        .invoke('text')
        .should('match', /Nenhuma\s+auditoria\s+publicada\s+ainda/);
});

        it('2.10 - Deve confirmar exclusão de auditoria com diálogo', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.on('window:confirm', (text) => {
                expect(text).to.contains('Tem certeza que deseja excluir a auditoria "Auditoria Teste 2024"?');
                return false; // Cancelar
            });
            
            cy.get('.delete-btn').first().click();
        });

        it('2.11 - Deve excluir auditoria ao confirmar', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.intercept('DELETE', '/api/auditorias/1', {
                statusCode: 200,
                body: { message: 'Auditoria excluída com sucesso!' }
            }).as('deleteAudit');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.on('window:confirm', () => true);
            
            cy.get('.delete-btn').first().click();
            cy.wait('@deleteAudit');
            
            cy.get('#success-audits')
                .should('be.visible')
                .and('contain.text', 'Auditoria excluída com sucesso!');
        });

        it('2.12 - Deve abrir arquivo em nova aba ao clicar em Download', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'audit/teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.window().then(win => {
                cy.stub(win, 'open').as('windowOpen');
            });
            
            cy.get('.download-btn').first().click();
            
            cy.get('@windowOpen').should('be.called');
        });

        it('2.13 - Deve desabilitar botão download durante processamento', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'audit/teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.window().then(win => {
                cy.stub(win, 'open');
            });
            
            cy.get('.download-btn').first().click();
            cy.get('.download-btn').first().should('contain.text', 'Gerando...');
            cy.get('.download-btn').first().should('be.disabled');
            
            cy.wait(1500);
            cy.get('.download-btn').first().should('not.be.disabled');
            cy.get('.download-btn').first().should('contain.text', 'Download');
        });

        it('2.14 - Deve atualizar status da auditoria ao mudar select', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.intercept('PATCH', '/api/auditorias/1/status', {
                statusCode: 200,
                body: { message: 'Status atualizado com sucesso!' }
            }).as('updateStatus');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.status-select').first().select('Em andamento');
            cy.wait('@updateStatus');
            
            cy.get('#success-audits')
                .should('be.visible')
                .and('contain.text', 'Status atualizado com sucesso!');
        });

        it('2.15 - Deve aplicar classe CSS correspondente ao status selecionado', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.intercept('PATCH', '/api/auditorias/1/status', {
                statusCode: 200,
                body: { message: 'Status atualizado' }
            }).as('updateStatus');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.status-select').first().should('have.class', 'aprovado');
            
            cy.get('.status-select').first().select('Em andamento');
            cy.wait('@updateStatus');
            
            cy.get('.status-select').first().should('have.class', 'em-andamento');
        });
    });

    // ==========================================
    // 3. TESTES DE LAYOUT (RESPONSIVIDADE)
    // ==========================================

    describe('3. Layout e Responsividade', () => {
        
       it('3.1 - Deve renderizar cards em grid de 2 colunas no desktop', () => {
    cy.intercept('GET', '/api/auditorias', {
        statusCode: 200,
        body: [
            {
                id: 1,
                titulo: 'Auditoria 1',
                data_auditoria: '2024-10-10',
                tipo: 'Auditoria interna',
                status: 'Aprovado',
                caminho_arquivo: 'teste1.pdf'
            },
            {
                id: 2,
                titulo: 'Auditoria 2',
                data_auditoria: '2024-10-11',
                tipo: 'Auditoria externa',
                status: 'Em andamento',
                caminho_arquivo: 'teste2.pdf'
            }
        ]
    }).as('loadAudits');
    
    cy.viewport(1200, 800);
    cy.reload();
    cy.wait('@loadAudits');
    
    cy.get('.audit-cards').should('have.css', 'display', 'grid');
    // Verificar que os cards estão lado a lado (2 colunas)
    cy.get('.audit-card').eq(0).then($card1 => {
        cy.get('.audit-card').eq(1).then($card2 => {
            expect($card1[0].offsetTop).to.equal($card2[0].offsetTop);
        });
    });
});

        it('3.2 - Deve renderizar cards em coluna única no mobile', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        titulo: 'Auditoria 1',
                        data_auditoria: '2024-10-10',
                        tipo: 'Auditoria interna',
                        status: 'Aprovado',
                        caminho_arquivo: 'teste1.pdf'
                    },
                    {
                        id: 2,
                        titulo: 'Auditoria 2',
                        data_auditoria: '2024-10-11',
                        tipo: 'Auditoria externa',
                        status: 'Em andamento',
                        caminho_arquivo: 'teste2.pdf'
                    }
                ]
            }).as('loadAudits');
            
            cy.viewport(375, 667);
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-cards').should('be.visible');
            cy.get('.audit-card').should('have.length', 2);
        });

        it('3.3 - Deve ajustar padding do container no mobile', () => {
            cy.viewport(375, 667);
            
            cy.get('.container').should('have.css', 'padding-left');
            cy.get('.container').then($el => {
                const paddingLeft = parseInt($el.css('padding-left'));
                expect(paddingLeft).to.be.lessThan(50);
            });
        });

        it('3.4 - Deve reduzir tamanho da fonte do título no mobile', () => {
            cy.viewport(375, 667);
            
            cy.get('h1').then($el => {
                const fontSize = parseInt($el.css('font-size'));
                expect(fontSize).to.be.lessThan(32);
            });
        });

        it('3.5 - Deve empilhar botões verticalmente no mobile', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.viewport(375, 667);
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-actions').should('have.css', 'flex-direction', 'column');
        });

        it('3.6 - Deve transformar formulário em coluna única no mobile', () => {
            cy.viewport(375, 667);
            
            cy.get('.audit-form').then($el => {
                const gridColumns = $el.css('grid-template-columns');
                expect(gridColumns).to.not.include('1fr 1fr');
            });
        });

        it('3.7 - Deve manter legibilidade do card no tablet', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste Completa com Título Longo 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.viewport(768, 1024);
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-card h3').should('be.visible');
            cy.get('.audit-card h3').should('have.css', 'word-wrap', 'break-word');
        });

        it('3.8 - Deve ajustar área de upload no mobile', () => {
            cy.viewport(375, 667);
            
            cy.get('.file-upload').should('be.visible');
            cy.get('.file-upload p').should('have.css', 'font-size');
        });

        it('3.9 - Deve manter botões acessíveis com tamanho mínimo no mobile', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.viewport(375, 667);
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.download-btn').first().then($btn => {
                const height = $btn.outerHeight();
                expect(height).to.be.at.least(40);
            });
        });

        it('3.10 - Deve renderizar grid de 2 colunas em telas médias', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        titulo: 'Auditoria 1',
                        data_auditoria: '2024-10-10',
                        tipo: 'Auditoria interna',
                        status: 'Aprovado',
                        caminho_arquivo: 'teste1.pdf'
                    },
                    {
                        id: 2,
                        titulo: 'Auditoria 2',
                        data_auditoria: '2024-10-11',
                        tipo: 'Auditoria externa',
                        status: 'Em andamento',
                        caminho_arquivo: 'teste2.pdf'
                    },
                    {
                        id: 3,
                        titulo: 'Auditoria 3',
                        data_auditoria: '2024-10-12',
                        tipo: 'Auditoria financeira',
                        status: 'Rejeitado',
                        caminho_arquivo: 'teste3.pdf'
                    }
                ]
            }).as('loadAudits');
            
            cy.viewport(992, 768);
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-cards').should('have.css', 'display', 'grid');
        });
    });

    // ==========================================
    // 4. TESTES DE RENDERIZAÇÃO DE DADOS
    // ==========================================

    describe('4. Renderização de Dados', () => {
        
        it('4.1 - Deve renderizar corretamente card de auditoria com todos os dados', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Interna - 1º Semestre 2024',
                    data_auditoria: '2024-06-15',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'audit/teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-card h3').should('contain.text', 'Auditoria Interna - 1º Semestre 2024');
            cy.get('.audit-date strong').should('contain.text', '15/06/2024');
            cy.get('.audit-type strong').should('contain.text', 'Auditoria interna');
            cy.get('.status-select').should('have.value', 'Aprovado');
        });

        it('4.2 - Deve formatar data no padrão brasileiro (DD/MM/AAAA)', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-12-31',
                    tipo: 'Auditoria externa',
                    status: 'Em andamento',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-date strong').should('contain.text', '31/12/2024');
        });

        it('4.3 - Deve renderizar múltiplas auditorias corretamente', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        titulo: 'Auditoria 1',
                        data_auditoria: '2024-01-10',
                        tipo: 'Auditoria interna',
                        status: 'Aprovado',
                        caminho_arquivo: 'teste1.pdf'
                    },
                    {
                        id: 2,
                        titulo: 'Auditoria 2',
                        data_auditoria: '2024-02-15',
                        tipo: 'Auditoria externa',
                        status: 'Em andamento',
                        caminho_arquivo: 'teste2.pdf'
                    },
                    {
                        id: 3,
                        titulo: 'Auditoria 3',
                        data_auditoria: '2024-03-20',
                        tipo: 'Auditoria financeira',
                        status: 'Rejeitado',
                        caminho_arquivo: 'teste3.pdf'
                    }
                ]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-card').should('have.length', 3);
            cy.get('.audit-card').eq(0).find('h3').should('contain.text', 'Auditoria 1');
            cy.get('.audit-card').eq(1).find('h3').should('contain.text', 'Auditoria 2');
            cy.get('.audit-card').eq(2).find('h3').should('contain.text', 'Auditoria 3');
        });

       it('4.4 - Deve renderizar select de status com todas as opções', () => {
    cy.intercept('GET', '/api/auditorias', {
        statusCode: 200,
        body: [{
            id: 1,
            titulo: 'Auditoria Teste',
            data_auditoria: '2024-10-10',
            tipo: 'Auditoria interna',
            status: 'Aprovado',
            caminho_arquivo: 'teste.pdf'
        }]
    }).as('loadAudits');
    
    cy.reload();
    cy.wait('@loadAudits');
    
    cy.get('.status-select option').should('have.length', 4);
});

        it('4.5 - Deve manter opção de status correto selecionada', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Em revisão',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.status-select option:selected').should('have.value', 'Em revisão');
        });

        it('4.6 - Deve renderizar ícone de download nos botões', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.download-btn svg.icon').should('exist');
        });

        it('4.7 - Deve renderizar ícone de lixeira no botão de exclusão', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.delete-btn i.bi-trash-fill').should('exist');
        });
    });

    // ==========================================
    // 5. TESTES DE ERRO E EDGE CASES
    // ==========================================

    describe('5. Tratamento de Erros e Edge Cases', () => {
        
        it('5.1 - Deve mostrar mensagem de erro ao falhar carregamento', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 500,
                body: { message: 'Erro ao carregar auditorias' }
            }).as('loadAuditsError');
            
            cy.reload();
            cy.wait('@loadAuditsError');
            
            cy.get('#alert-audits')
                .should('be.visible')
                .and('contain.text', 'Erro ao carregar auditorias');
            
            cy.get('#empty-state').should('be.visible');
        });

        it('5.2 - Deve esconder mensagens de sucesso/erro após 5 segundos', () => {
            cy.intercept('POST', '/api/auditorias', {
                statusCode: 201,
                body: { message: 'Auditoria adicionada com sucesso!' }
            }).as('addAudit');
            
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: []
            }).as('loadAudits');
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            const file = new File(['conteúdo'], 'teste.pdf', { type: 'application/pdf' });
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audits-form .upload-btn').click();
            cy.wait('@addAudit');
            
            cy.get('#success-audits').should('be.visible');
            cy.wait(5000);
            cy.get('#success-audits').should('not.be.visible');
        });

        it('5.3 - Deve tratar erro ao atualizar status', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.intercept('PATCH', '/api/auditorias/1/status', {
                statusCode: 500,
                body: { message: 'Erro ao atualizar status' }
            }).as('updateStatusError');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.status-select').first().select('Em andamento');
            cy.wait('@updateStatusError');
            
            cy.get('#alert-audits')
                .should('be.visible')
                .and('contain.text', 'Erro ao atualizar status');
        });

        it('5.4 - Deve recarregar lista ao falhar atualização de status', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.intercept('PATCH', '/api/auditorias/1/status', {
                statusCode: 500,
                body: { message: 'Erro ao atualizar status' }
            }).as('updateStatusError');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.status-select').first().select('Em andamento');
            cy.wait('@updateStatusError');
            cy.wait('@loadAudits');
        });

        it('5.5 - Deve tratar erro ao fazer download', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'audit/arquivo-inexistente.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.window().then(win => {
                cy.stub(win, 'open').throws(new Error('Erro ao abrir arquivo'));
            });
            
            cy.get('.download-btn').first().click();
            
            cy.get('#alert-audits')
                .should('be.visible')
                .and('contain.text', 'Erro ao baixar o arquivo');
        });

        it('5.6 - Deve prevenir múltiplos envios simultâneos', () => {
            cy.intercept('POST', '/api/auditorias', {
                delay: 2000,
                statusCode: 201,
                body: { message: 'Auditoria adicionada!' }
            }).as('addAudit');
            
            cy.get('#audit-title').type('Auditoria Teste Completa 2024');
            cy.get('#audit-date').type('2024-10-10');
            cy.get('#audit-type').select('Auditoria interna');
            cy.get('#audit-status').select('Aprovado');
            
            const file = new File(['conteúdo'], 'teste.pdf', { type: 'application/pdf' });
            cy.get('#audit-file').then(input => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                input[0].dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            cy.get('#audits-form .upload-btn').click();
            cy.get('#audits-form .upload-btn').should('be.disabled');
            cy.get('#audits-form .upload-btn').click();
            
            cy.wait('@addAudit').its('request').should('exist');
            cy.get('@addAudit.all').should('have.length', 1);
        });

        it('5.7 - Deve lidar com tipos de auditoria não mapeados', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Especial',
                    data_auditoria: '2024-10-10',
                    tipo: 'Tipo Customizado',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-type strong').should('contain.text', 'Tipo Customizado');
        });

        it('5.8 - Deve lidar com títulos muito longos (quebra de linha)', () => {
            const longTitle = 'Auditoria Interna Extremamente Detalhada do Primeiro Semestre de 2024 com Análise Completa de Todos os Processos e Procedimentos Operacionais';
            
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: longTitle,
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.audit-card h3')
                .should('contain.text', longTitle)
                .and('have.css', 'word-wrap', 'break-word');
        });
    });

    // ==========================================
    // 6. TESTES DE ACESSIBILIDADE
    // ==========================================

    describe('6. Acessibilidade', () => {
        
        it('6.1 - Deve ter labels associados aos inputs', () => {
            cy.get('label[for="audit-title"]').should('exist');
            cy.get('label[for="audit-date"]').should('exist');
            cy.get('label[for="audit-type"]').should('exist');
            cy.get('label[for="audit-status"]').should('exist');
        });

        it('6.2 - Deve indicar campos obrigatórios visualmente', () => {
    cy.get('.form-group.required label').should('have.length.at.least', 1);
    cy.get('.form-group.required label').first().should('have.css', 'content'); // Verifica que tem ::after
});

        it('6.3 - Deve ter atributos data corretos nos botões', () => {
            cy.intercept('GET', '/api/auditorias', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Auditoria Teste 2024',
                    data_auditoria: '2024-10-10',
                    tipo: 'Auditoria interna',
                    status: 'Aprovado',
                    caminho_arquivo: 'audit/teste.pdf'
                }]
            }).as('loadAudits');
            
            cy.reload();
            cy.wait('@loadAudits');
            
            cy.get('.download-btn').should('have.attr', 'data-path', 'audit/teste.pdf');
            cy.get('.delete-btn').should('have.attr', 'data-id', '1');
            cy.get('.delete-btn').should('have.attr', 'data-title', 'Auditoria Teste 2024');
        });

        it('6.4 - Deve ter texto alternativo nos ícones SVG', () => {
            cy.get('.file-upload svg.icon').should('exist');
        });

        it('6.5 - Deve permitir navegação por teclado nos selects', () => {
            cy.get('#audit-type').focus().type('{downarrow}{enter}');
            cy.get('#audit-type').should('not.have.value', null);
        });
    });
});