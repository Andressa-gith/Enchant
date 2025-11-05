/// <reference types="cypress" />

describe('Testes de Interface Funcional - Página Transparência (Notas de Auditoria)', () => {
  
    // --- DADOS MOCKADOS ---
    const mockAudits = [
        { 
            id: '1', 
            titulo: 'Auditoria Interna 2024', 
            data_auditoria: '2024-10-25',
            tipo_auditoria: 'Interna', 
            status: 'Publicado', 
            arquivo_url: '/uploads/fake-audit1.pdf', 
            nome_arquivo: 'fake-audit1.pdf' 
        },
        { 
            id: '2', 
            titulo: 'Auditoria Externa 2023', 
            data_auditoria: '2023-12-15',
            tipo_auditoria: 'Externa', 
            status: 'Pendente', 
            arquivo_url: '/uploads/fake-audit2.docx', 
            nome_arquivo: 'fake-audit2.docx' 
        }
    ];

    const newAudit = { 
        id: '3', 
        titulo: 'Nova Auditoria de Teste', 
        data_auditoria: '2025-01-10', 
        tipo_auditoria: 'Interna', 
        status: 'Pendente',
        arquivo_url: '/uploads/new-audit.pdf',
        nome_arquivo: 'new-audit.pdf'
    };

    // IMPORTANTE: Este teste assume que você tem um arquivo de exemplo
    // na pasta `cypress/fixtures/` com o nome 'test-audit.pdf'
    const fixtureFile = 'test-audit.pdf';

    // --- CREDENCIAIS DE LOGIN ---
    const TEST_USER = {
        email: 'teste@gmail.com',
        password: 'Testando@123'
    };

    beforeEach(() => {
        
        // --- PASSO 1: LOGIN (com cy.session para cache) ---
        cy.session(TEST_USER.email, () => {
            
            const loginPage = 'http://localhost:3080/entrar';
            
            // --- SELETORES DA PÁGINA DE LOGIN ---
            
            const loginApi = '/api/auth/login'; // Endpoint da API de login (ajuste se necessário)
            const emailSelector = '#email';     // Seletor do campo de email (ajuste se necessário)
            
            // **SELETOR DE SENHA ATUALIZADO**
            const passwordSelector = '#senha';  // <<-- AJUSTADO AQUI
            
            // --- FIM DA ÁREA DE ATUALIZAÇÃO ---

            cy.visit(loginPage);
            
            cy.intercept('POST', loginApi).as('loginRequest');
            
            cy.get(emailSelector).type(TEST_USER.email);
            cy.get(passwordSelector).type(TEST_USER.password);
            cy.get('form').submit(); // Se o login não for com <form>, mude para cy.get('button[type="submit"]').click()
            
            cy.wait('@loginRequest').its('response.statusCode').should('be.oneOf', [200, 204]);
            cy.url().should('not.contain', '/entrar'); 

        }, {
            cacheAcrossSpecs: true 
        });
        
        // --- PASSO 2: INTERCEPTS DA PÁGINA DE AUDITORIA ---
        cy.intercept('GET', '/api/auditorias', { 
            statusCode: 200, 
            body: mockAudits 
        }).as('getAudits');

        cy.intercept('POST', '/api/auditorias', { 
            statusCode: 201, 
            body: newAudit
        }).as('addAudit');

        cy.intercept('DELETE', `/api/auditorias/${mockAudits[0].id}`, { 
            statusCode: 204 
        }).as('deleteAudit');

        cy.intercept('PATCH', `/api/auditorias/${mockAudits[1].id}/status`, { 
            statusCode: 200, 
            body: { ...mockAudits[1], status: 'Publicado' }
        }).as('updateStatus');
        
        // --- PASSO 3: VISITAR A PÁGINA DE TESTE ---
        cy.visit('http://localhost:3080/transparencia/notas-auditoria');
    });

    // --- GRUPO 1: TESTES DE LAYOUT E ESTADO INICIAL ---
    context('Testes de Layout e Estado Inicial', () => {
        
        it('Deve exibir os títulos e seções principais da página', () => {
            cy.get('h2').should('contain.text', 'Adicionar nova auditoria');
            cy.get('.uploaded-items h3').should('contain.text', 'Auditorias publicadas');
        });

        it('Deve exibir o formulário de upload com todos os campos e labels corretos', () => {
            cy.get('#audits-form').should('be.visible');
            
            cy.get('label[for="audit-title"]').should('contain.text', 'Título da auditoria');
            cy.get('#audit-title').should('be.visible');
            
            cy.get('label[for="audit-date"]').should('contain.text', 'Data da auditoria');
            cy.get('#audit-date').should('be.visible');

            cy.get('label[for="audit-type"]').should('contain.text', 'Tipo');
            cy.get('#audit-type').should('be.visible').and('have.value', '');
            cy.get('#audit-type option[value="Interna"]').should('exist');
            cy.get('#audit-type option[value="Externa"]').should('exist');

            cy.get('label[for="audit-status"]').should('contain.text', 'Status');
            cy.get('#audit-status').should('be.visible').and('have.value', '');
            cy.get('#audit-status option[value="Publicado"]').should('exist');
            cy.get('#audit-status option[value="Pendente"]').should('exist');

            cy.get('.file-upload p').should('contain.text', 'Clique para selecionar o arquivo ou arraste aqui');
            cy.get('#audit-file').should('exist');
            
            cy.get('.upload-btn').should('contain.text', 'Adicionar auditoria');
        });

        it('Deve carregar e exibir a lista de auditorias (mockadas) ao carregar a página', () => {
            cy.wait('@getAudits');
            
            cy.get('#loader').should('not.be.visible');
            cy.get('#empty-state').should('not.be.visible');
            
            cy.get('.audit-card').should('have.length', mockAudits.length);
            
            cy.get('.audit-card').first().as('firstCard');
            cy.get('@firstCard').find('h3').should('contain.text', mockAudits[0].titulo);
            // Verifica a data formatada (o JS formata YYYY-MM-DD para DD/MM/YYYY)
            cy.get('@firstCard').find('.audit-date').should('contain.text', '25/10/2024'); 
            cy.get('@firstCard').find('.audit-type').should('contain.text', mockAudits[0].tipo_auditoria);
            cy.get('@firstCard').find('.status-select').should('have.value', mockAudits[0].status);
            cy.get('@firstCard').find('.status-select').should('have.class', 'publicado');
        });

        it('Deve exibir o estado de "lista vazia" se a API retornar um array vazio', () => {
            cy.intercept('GET', '/api/auditorias', { statusCode: 200, body: [] }).as('getEmptyAudits');
            // Re-visita a página para acionar o novo interceptor
            cy.visit('http://localhost:3080/transparencia/notas-auditoria');
            
            cy.wait('@getEmptyAudits');
            
            cy.get('#loader').should('not.be.visible');
            cy.get('#empty-state').should('be.visible')
                .and('contain.text', 'Nenhuma auditoria publicada ainda.');
            cy.get('#audits-list').should('be.empty');
        });
    });

    // --- GRUPO 2: TESTES DE VALIDAÇÃO DO FORMULÁRIO ---
    context('Testes de Validação (Formulário)', () => {

        it('Deve exibir mensagens de erro para todos os campos obrigatórios', () => {
            cy.get('.upload-btn').click();
            
            // As mensagens de erro são baseadas na função `validateForm` do transparencia3.js
            cy.get('#audit-title-error').should('be.visible').and('contain.text', 'O título é obrigatório.');
            cy.get('#audit-date-error').should('be.visible').and('contain.text', 'A data é obrigatória.');
            cy.get('#audit-type-error').should('be.visible').and('contain.text', 'O tipo é obrigatório.');
            cy.get('#audit-status-error').should('be.visible').and('contain.text', 'O status é obrigatório.');
            cy.get('#audit-file-error').should('be.visible').and('contain.text', 'O arquivo é obrigatório.');
        });

        it('Deve exibir erro para tipo de arquivo inválido', () => {
            // Usa um arquivo .js (inválido) da própria instalação do Cypress
            cy.get('#audit-file').selectFile('cypress.config.js', { force: true });
            cy.get('.upload-btn').click();
            
            // Mensagem de erro baseada na função `validateFile` do JS
            cy.get('#audit-file-error').should('be.visible').and('contain.text', 'Tipo de arquivo inválido. Apenas PDF, DOC e DOCX são aceitos.');
        });

        it('Deve exibir erro para arquivo maior que 20MB', () => {
            // Cria um "arquivo" falso em buffer com 21MB (limite é 20MB)
            const largeBuffer = new ArrayBuffer(21 * 1024 * 1024);
            cy.get('#audit-file').selectFile({
                contents: largeBuffer,
                fileName: 'large-file.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            cy.get('.upload-btn').click();
            
            // Mensagem de erro baseada na função `validateFile` do JS
            cy.get('#audit-file-error').should('be.visible').and('contain.text', 'O arquivo excede o limite de 20MB.');
        });
        
        it('Deve limpar um erro de validação após o campo ser preenchido e reenviado', () => {
            // 1. Envio inválido, gera erro no título
            cy.get('.upload-btn').click();
            cy.get('#audit-title-error').should('be.visible');

            // 2. Preenche o campo do título
            cy.get('#audit-title').type('Título de Teste Válido');

            // 3. Reenvia (outros campos ainda estão inválidos)
            cy.get('.upload-btn').click();

            // 4. Verifica se o erro do título sumiu
            cy.get('#audit-title-error').should('not.be.visible');
            cy.get('#audit-date-error').should('be.visible'); // Erro da data ainda deve existir
        });
    });

    // --- GRUPO 3: TESTES DE INTERATIVIDADE ---
    context('Testes de Interatividade', () => {
        
        it('Deve permitir o upload de um arquivo por drag-and-drop na área designada', () => {
            cy.get('.file-upload').selectFile(fixtureFile, { 
                action: 'drag-drop', 
                force: true
            });
            
            // Verifica se a UI atualizou para mostrar o nome do arquivo (baseado no JS `updateFileDisplay`)
            cy.get('.file-upload p').should('contain.text', fixtureFile);
            cy.get('.file-upload').should('have.class', 'file-selected');
        });

        it('Deve submeter o formulário com sucesso com dados válidos e atualizar a lista', () => {
            // Preenche o formulário
            cy.get('#audit-title').type(newAudit.titulo);
            cy.get('#audit-date').type(newAudit.data_auditoria); // Formato YYYY-MM-DD
            cy.get('#audit-type').select(newAudit.tipo_auditoria);
            cy.get('#audit-status').select(newAudit.status);
            cy.get('#audit-file').selectFile(fixtureFile, { force: true });

            // Clica em enviar
            cy.get('.upload-btn').click();

            // Verifica o estado de loading do botão (baseado no JS `submitForm`)
            cy.get('.upload-btn').should('be.disabled')
                .and('contain.html', 'spinner'); 

            // Espera a API mockada responder
            cy.wait('@addAudit');

            // Verifica se o formulário foi limpo (baseado no `form.reset()` do JS)
            cy.get('#audit-title').should('have.value', '');
            cy.get('#audit-date').should('have.value', '');
            cy.get('#audit-type').should('have.value', '');
            
            // Verifica se a mensagem de sucesso apareceu (baseado no JS `showSuccessMessage`)
            cy.get('#success-audits').should('be.visible')
                .and('contain.text', 'Auditoria adicionada com sucesso!');

            // Verifica se o novo item foi adicionado no topo da lista (JS faz prepend)
            cy.get('.audit-card').should('have.length', mockAudits.length + 1);
            cy.get('.audit-card').first().find('h3').should('contain.text', newAudit.titulo);
        });

        it('Deve permitir a exclusão de uma auditoria da lista', () => {
            cy.wait('@getAudits');
            cy.get('.audit-card').should('have.length', mockAudits.length);

            // Clica no botão de excluir do primeiro card
            cy.get('.audit-card').first().find('.delete-btn').click();
            
            // Espera a API de delete responder
            cy.wait('@deleteAudit');

            // Verifica se a mensagem de sucesso é exibida (baseado no JS `deleteAudit`)
            cy.get('#success-audits').should('be.visible')
                .and('contain.text', 'excluído com sucesso');
            
            // Verifica se o item foi removido da UI
            cy.get('.audit-card').should('have.length', mockAudits.length - 1);
            cy.get('#audits-list').should('not.contain.text', mockAudits[0].titulo);
        });

        it('Deve permitir a alteração do status de uma auditoria na lista', () => {
            cy.wait('@getAudits');

            // Pega o segundo card (que está com status "Pendente")
            cy.get('.audit-card').last().as('secondCard');
            cy.get('@secondCard').find('.status-select').should('have.value', 'Pendente');
            cy.get('@secondCard').find('.status-select').should('have.class', 'pendente');
            
            // Altera o status no select
            cy.get('@secondCard').find('.status-select').select('Publicado');

            // Espera a API de patch responder
            cy.wait('@updateStatus');

            // Verifica a mudança visual (baseado no JS `addEventListener 'change'`)
            cy.get('@secondCard').find('.status-select').should('have.value', 'Publicado');
            cy.get('@secondCard').find('.status-select').should('have.class', 'publicado');
            cy.get('@secondCard').find('.status-select').should('not.have.class', 'pendente');
        });

        it('Deve simular o clique no download e mostrar estado de "Baixando" temporariamente', () => {
            cy.wait('@getAudits');
            
            cy.get('.audit-card').first().find('.download-btn').as('downloadBtn');
            
            // Stub para impedir que o clique tente realmente baixar o arquivo
            cy.window().document.addEventListener('click', (e) => {
                if (e.target.tagName === 'A' && e.target.hasAttribute('download')) {
                    e.preventDefault();
                }
            });

            cy.get('@downloadBtn').click();
            
            // Verifica o estado de "Baixando..." conforme o JS (função `downloadFile`)
            cy.get('@downloadBtn').should('be.disabled')
                .and('contain.html', 'spinner-border'); // O JS troca o ícone por um spinner

            // Espera o timeout de 1.5s do JS (com uma margem) e verifica se o botão voltou ao normal
            cy.get('@downloadBtn', { timeout: 2000 }).should('not.be.disabled')
                .and('contain.html', 'Download'); // O JS restaura o texto/ícone original
        });
        
    });
});