describe('Testes Funcionais de Interface - Documentos Comprobatórios', () => {
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
        
        // Aguardar redirecionamento e acessar a página de documentos
        cy.url().should('include', '/dashboard');
        cy.visit(`${BASE_URL}/transparencia/documentos-comprobatorios`);
        
        // Aguardar a página carregar completamente
        cy.get('#documentForm').should('be.visible');
    });

    // ===========================================
    // 1. TESTES DE VALIDAÇÃO DE FORMULÁRIO
    // ===========================================
    describe('1. Validação de Formulário (Client-Side)', () => {
        
        it('1.1 - Não deve permitir submissão com nome do documento muito curto', () => {
            // Mock da API
            cy.intercept('POST', '/api/documentos').as('adicionarDocumento');

            // Preencher formulário com nome curto (menos de 5 caracteres)
            cy.get('#companyName').type('Doc');
            cy.get('#documentType').select('Recibo de doação');
            cy.get('#documentValue').type('100');
            
            // Simular seleção de arquivo
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Tentar submeter
            cy.get('.add-btn').click();

            // Verificar que a mensagem de erro aparece
            cy.get('#companyName-error').should('be.visible');
            cy.get('#companyName-error').should('contain.text', 'O nome deve ter no mínimo 5 caracteres');
            
            // Verificar que o campo tem a classe de erro
            cy.get('#companyName').should('have.class', 'error');
            
            // Verificar que a API não foi chamada
            cy.get('@adicionarDocumento.all').should('have.length', 0);
        });

        it('1.2 - Não deve permitir submissão sem tipo de documento selecionado', () => {
            cy.intercept('POST', '/api/documentos').as('adicionarDocumento');

            // Preencher formulário sem selecionar tipo
            cy.get('#companyName').type('Documento Teste Válido');
            // Tipo não selecionado (fica na opção disabled)
            cy.get('#documentValue').type('100');
            
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Tentar submeter
            cy.get('.add-btn').click();

            // Verificar erro no tipo de documento
            cy.get('#documentType-error').should('be.visible');
            cy.get('#documentType-error').should('contain.text', 'Por favor, selecione um tipo de documento');
            cy.get('#documentType').should('have.class', 'error');
            
            cy.get('@adicionarDocumento.all').should('have.length', 0);
        });

        it('1.3 - Não deve permitir submissão com valor vazio ou zero', () => {
            cy.intercept('POST', '/api/documentos').as('adicionarDocumento');

            // Preencher formulário com valor zero
            cy.get('#companyName').type('Documento Teste Válido');
            cy.get('#documentType').select('Recibo de doação');
            cy.get('#documentValue').clear();
            
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Tentar submeter
            cy.get('.add-btn').click();

            // Verificar erro no valor
            cy.get('#documentValue-error').should('be.visible');
            cy.get('#documentValue-error').should('contain.text', 'O valor deve ser obrigatório');
            cy.get('#documentValue').should('have.class', 'error');
            
            cy.get('@adicionarDocumento.all').should('have.length', 0);
        });

        it('1.4 - Não deve permitir submissão sem arquivo selecionado', () => {
            cy.intercept('POST', '/api/documentos').as('adicionarDocumento');

            // Preencher formulário sem arquivo
            cy.get('#companyName').type('Documento Teste Válido');
            cy.get('#documentType').select('Nota fiscal');
            cy.get('#documentValue').type('250.50');
            // Arquivo não selecionado

            // Tentar submeter
            cy.get('.add-btn').click();

            // Verificar erro no arquivo
            cy.get('#documentFile-error').should('be.visible');
            cy.get('#documentFile-error').should('contain.text', 'Por favor, selecione um arquivo');
            cy.get('.file-upload').should('have.class', 'error');
            
            cy.get('@adicionarDocumento.all').should('have.length', 0);
        });

        it('1.5 - Deve validar em tempo real ao sair dos campos (blur)', () => {
            // Testar validação em tempo real no nome
            cy.get('#companyName').type('Doc').blur();
            cy.get('#companyName-error').should('be.visible');
            cy.get('#companyName').should('have.class', 'error');
            
            // Corrigir e verificar que o erro desaparece
            cy.get('#companyName').clear().type('Documento Válido').blur();
            cy.get('#companyName-error').should('not.be.visible');
            cy.get('#companyName').should('not.have.class', 'error');

            // Testar validação em tempo real no valor
            cy.get('#documentValue').type('0').blur();
            cy.get('#documentValue-error').should('be.visible');
            
            cy.get('#documentValue').clear().type('100').blur();
            cy.get('#documentValue-error').should('not.be.visible');
        });

        it('1.6 - Deve validar tipo de arquivo (apenas PDF, DOC, JPG, PNG)', () => {
            cy.get('#companyName').type('Documento Teste Válido');
            cy.get('#documentType').select('Recibo de doação');
            cy.get('#documentValue').type('100');
            
            // Tentar arquivo inválido (.txt)
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('texto simples'),
                fileName: 'documento.txt',
                mimeType: 'text/plain'
            }, { force: true });

            // Verificar que o arquivo não foi aceito
            cy.get('.file-upload p').should('contain.text', 'Clique para selecionar o arquivo ou arraste aqui');
        });

        it('1.7 - Modal de edição: não deve permitir nome curto', () => {
            // Mock para carregar documentos existentes
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Teste',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            }).as('carregarDocumentos');

            cy.wait('@carregarDocumentos');

            // Abrir modal de edição
            cy.get('.edit-btn-round').first().click();
            cy.get('#editModal').should('be.visible');

            // Tentar editar com nome curto
            cy.get('#edit-companyName').clear().type('Doc').blur();
            cy.get('#edit-companyName-error').should('be.visible');
            cy.get('#edit-companyName-error').should('contain.text', 'O nome deve ter no mínimo 5 caracteres');
            cy.get('#edit-companyName').should('have.class', 'error');
        });
    });

    // ===========================================
    // 2. TESTES DE INTERATIVIDADE E FEEDBACK
    // ===========================================
    describe('2. Interatividade e Feedback (Componentes Visuais)', () => {
        
        it('2.1 - Deve exibir mensagem de sucesso após adicionar documento', () => {
            cy.intercept('POST', '/api/documentos', {
                statusCode: 200,
                body: { message: 'Documento adicionado com sucesso!' }
            }).as('adicionarDocumento');

            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: []
            }).as('recarregarDocumentos');

            // Preencher formulário completo
            cy.get('#companyName').type('Documento Teste Completo');
            cy.get('#documentType').select('Recibo de doação');
            cy.get('#documentValue').type('500.00');
            
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Submeter
            cy.get('.add-btn').click();

            // Aguardar requisição
            cy.wait('@adicionarDocumento');

            // Verificar mensagem de sucesso
            cy.get('#success-message').should('be.visible');
            cy.get('#success-message').should('contain.text', 'Documento adicionado com sucesso!');
            
            // Verificar que o formulário foi resetado
            cy.get('#companyName').should('have.value', '');
            cy.get('#documentValue').should('have.value', '');
        });

        it('2.2 - Deve exibir mensagem de erro quando API falhar', () => {
            cy.intercept('POST', '/api/documentos', {
                statusCode: 400,
                body: { message: 'Erro ao processar documento' }
            }).as('adicionarDocumento');

            // Preencher formulário
            cy.get('#companyName').type('Documento Teste Completo');
            cy.get('#documentType').select('Nota fiscal');
            cy.get('#documentValue').type('300');
            
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Submeter
            cy.get('.add-btn').click();
            cy.wait('@adicionarDocumento');

            // Verificar mensagem de erro
            cy.get('#alert-message').should('be.visible');
            cy.get('#alert-message').should('contain.text', 'Erro ao processar documento');
        });

        it('2.3 - Deve atualizar texto ao selecionar arquivo', () => {
            // Verificar texto inicial
            cy.get('.file-upload p').should('contain.text', 'Clique para selecionar o arquivo ou arraste aqui');

            // Selecionar arquivo
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'meu-documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Verificar que o texto mudou
            cy.get('.file-upload p').should('contain.text', 'Arquivo: meu-documento.pdf');
            cy.get('.file-upload').should('have.class', 'valid');
        });

        it('2.4 - Deve desabilitar botão de submit durante envio', () => {
            cy.intercept('POST', '/api/documentos', (req) => {
                // Simular delay
                req.reply({
                    delay: 1000,
                    statusCode: 200,
                    body: { message: 'Sucesso' }
                });
            }).as('adicionarDocumento');

            // Preencher formulário
            cy.get('#companyName').type('Documento Teste');
            cy.get('#documentType').select('Recibo de doação');
            cy.get('#documentValue').type('100');
            
            cy.get('#documentFile').selectFile({
                contents: Cypress.Buffer.from('fake pdf content'),
                fileName: 'documento.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            // Submeter
            cy.get('.add-btn').click();

            // Verificar que o botão está desabilitado e o texto mudou
            cy.get('.add-btn').should('be.disabled');
            cy.get('.add-btn').should('contain.text', 'Enviando...');

            // Aguardar conclusão
            cy.wait('@adicionarDocumento');

            // Verificar que o botão voltou ao normal
            cy.get('.add-btn').should('not.be.disabled');
            cy.get('.add-btn').should('contain.text', 'Adicionar Documento');
        });

        it('2.5 - Deve carregar e exibir documentos existentes', () => {
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        titulo: 'Documento 1',
                        tipo_documento: 'Recibo de doação',
                        valor: 100,
                        caminho_arquivo: 'test/doc1.pdf'
                    },
                    {
                        id: 2,
                        titulo: 'Documento 2',
                        tipo_documento: 'Nota fiscal',
                        valor: 250.50,
                        caminho_arquivo: 'test/doc2.pdf'
                    }
                ]
            }).as('carregarDocumentos');

            cy.reload();
            cy.wait('@carregarDocumentos');

            // Verificar que os documentos foram renderizados
            cy.get('.uploaded-item').should('have.length', 2);
            cy.get('.document-title').first().should('contain.text', 'Documento 1');
            cy.get('.document-company').first().should('contain.text', 'Recibo de doação');
            cy.get('.document-value').first().should('contain.text', 'R$ 100');
        });

        it('2.6 - Deve exibir estado vazio quando não há documentos', () => {
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: []
            }).as('carregarDocumentos');

            cy.reload();
            cy.wait('@carregarDocumentos');

            // Verificar mensagem de estado vazio
            cy.get('#empty-state').should('be.visible');
            cy.get('#empty-state').should('contain.text', 'Nenhum documento adicionado ainda');
            cy.get('#documents-list').should('not.be.visible');
        });

        it('2.7 - Deve confirmar exclusão com modal e excluir documento', () => {
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento para Excluir',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            }).as('carregarDocumentos');

            cy.intercept('DELETE', '/api/documentos/1', {
                statusCode: 200,
                body: { message: 'Documento excluído com sucesso' }
            }).as('deletarDocumento');

            cy.reload();
            cy.wait('@carregarDocumentos');

            // Spy no window.confirm
            cy.window().then((win) => {
                cy.stub(win, 'confirm').returns(true);
            });

            // Clicar em excluir
            cy.get('.delete').first().click();

            // Verificar que o confirm foi chamado
            cy.window().its('confirm').should('be.called');

            // Aguardar requisição
            cy.wait('@deletarDocumento');

            // Verificar mensagem de sucesso
            cy.get('#success-message').should('be.visible');
            cy.get('#success-message').should('contain.text', 'Documento excluído com sucesso');
        });

        it('2.8 - Modal de edição: deve abrir com dados preenchidos', () => {
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Original',
                    tipo_documento: 'Nota fiscal',
                    valor: 350.75,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            }).as('carregarDocumentos');

            cy.wait('@carregarDocumentos');

            // Abrir modal de edição
            cy.get('.edit-btn-round').first().click();

            // Verificar que o modal está visível
            cy.get('#editModal').should('be.visible');

            // Verificar que os campos estão preenchidos
            cy.get('#edit-companyName').should('have.value', 'Documento Original');
            cy.get('#edit-documentType').should('have.value', 'Nota fiscal');
            cy.get('#edit-documentValue').should('have.value', '350.75');
            cy.get('#edit-id').should('have.value', '1');
        });

        it('2.9 - Modal de edição: deve salvar alterações', () => {
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Original',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            }).as('carregarDocumentos');

            cy.intercept('PUT', '/api/documentos/1', {
                statusCode: 200,
                body: { message: 'Documento atualizado com sucesso' }
            }).as('atualizarDocumento');

            cy.wait('@carregarDocumentos');

            // Abrir modal
            cy.get('.edit-btn-round').first().click();

            // Editar campos
            cy.get('#edit-companyName').clear().type('Documento Editado Novo');
            cy.get('#edit-documentValue').clear().type('500');

            // Salvar
            cy.get('#saveEditBtn').click();

            // Aguardar requisição
            cy.wait('@atualizarDocumento');

            // Verificar mensagem de sucesso
            cy.get('#success-message').should('be.visible');
            cy.get('#success-message').should('contain.text', 'Documento atualizado com sucesso');

            // Verificar que o modal fechou
            cy.get('#editModal').should('not.be.visible');
        });

        it('2.10 - Botão visualizar deve abrir documento em nova aba', () => {
            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Teste',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/documento.pdf'
                }]
            }).as('carregarDocumentos');

            cy.wait('@carregarDocumentos');

            // Spy no window.open
            cy.window().then((win) => {
                cy.stub(win, 'open').as('windowOpen');
            });

            // Clicar em visualizar
            cy.get('.view-btn').first().click();

            // Verificar que window.open foi chamado
            cy.get('@windowOpen').should('be.called');
        });
    });

    // ===========================================
    // 3. TESTES DE LAYOUT (RESPONSIVIDADE)
    // ===========================================
    describe('3. Testes de Layout (Responsividade)', () => {
        
        it('3.1 - Layout desktop deve exibir grid de 2 colunas', () => {
            cy.viewport(1920, 1080);

            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        titulo: 'Doc 1',
                        tipo_documento: 'Recibo de doação',
                        valor: 100,
                        caminho_arquivo: 'test/doc1.pdf'
                    },
                    {
                        id: 2,
                        titulo: 'Doc 2',
                        tipo_documento: 'Nota fiscal',
                        valor: 200,
                        caminho_arquivo: 'test/doc2.pdf'
                    }
                ]
            });

            cy.reload();

            // Verificar que o grid tem 2 colunas
            cy.get('.documents-cards').should('have.css', 'display', 'grid');
            cy.get('.documents-cards').should('have.css', 'grid-template-columns').and('include', 'fr');
        });

        it('3.2 - Layout tablet (768px) deve adaptar o grid', () => {
            cy.viewport(768, 1024);

            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Teste',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            });

            cy.reload();

            // Verificar que o container ajustou padding
            cy.get('.container').invoke('css', 'padding-left').then((padding) => {
                const paddingValue = parseFloat(padding);
                expect(paddingValue).to.be.within(10, 40); // Aceita variação
            });

            // Verificar que o grid muda para 1 coluna
            cy.get('.documents-cards').should('have.css', 'grid-template-columns').and('match', /1fr/);
        });

        it('3.3 - Layout mobile (480px) deve empilhar elementos', () => {
            cy.viewport(480, 812);

            cy.reload();

            // Verificar título responsivo
            cy.get('h1').should('be.visible');
            cy.get('h1').invoke('css', 'font-size').then((fontSize) => {
                const size = parseFloat(fontSize);
                expect(size).to.be.within(28, 36);
            });

            // Verificar que o form-grid vira coluna única
            cy.get('.form-grid').should('have.css', 'grid-template-columns', '1fr');

            // Verificar padding da upload section
            cy.get('.upload-section').invoke('css', 'padding').then((padding) => {
                const paddingValue = parseFloat(padding);
                expect(paddingValue).to.be.within(15, 25);
            });
        });

        it('3.4 - Modais devem ser responsivos', () => {
            cy.viewport(375, 667); // iPhone SE

            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Teste',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            });

            cy.reload();

            // Abrir modal de edição
            cy.get('.edit-btn-round').first().click();

            // Verificar que o modal está visível e responsivo
            cy.get('#editModal').should('be.visible');
            cy.get('.modal-dialog').invoke('outerWidth').should('be.lte', 375);
        });
        

        it('3.5 - Cards de documentos devem adaptar-se em mobile', () => {
            cy.viewport(375, 667);

            cy.intercept('GET', '/api/documentos', {
                statusCode: 200,
                body: [{
                    id: 1,
                    titulo: 'Documento Teste Mobile',
                    tipo_documento: 'Recibo de doação',
                    valor: 100,
                    caminho_arquivo: 'test/doc.pdf'
                }]
            });

            cy.reload();

            // Verificar que o card está visível e responsivo
            cy.get('.uploaded-item').should('be.visible');
            cy.get('.uploaded-item').invoke('outerWidth').should('be.lte', 375);

            // Verificar que os botões estão empilhados
            cy.get('.document-actions').should('have.css', 'flex-wrap', 'wrap');
        });

        it('3.6 - Área de upload deve ser responsiva', () => {
            const viewports = [
                [1920, 1080],
                [768, 1024],
                [480, 812]
            ];

            viewports.forEach(([width, height]) => {
                cy.viewport(width, height);
                cy.reload();

                // Verificar que a área de upload está visível
                cy.get('.file-upload').should('be.visible');

                // Verificar que está centralizada
                cy.get('.file-upload').should('have.css', 'text-align', 'center');

                // Verificar padding
                cy.get('.file-upload').invoke('css', 'padding').then((padding) => {
                    const paddingValue = parseFloat(padding);
                    expect(paddingValue).to.be.greaterThan(15);
                });
            });
        });
    });
});