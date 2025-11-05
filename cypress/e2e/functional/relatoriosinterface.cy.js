/// <reference types="cypress" />

describe('Testes Funcionais - Página de Relatórios (transparencia1.html)', () => {
    // Armazena as credenciais de teste fornecidas
    const TEST_USER = {
        email: 'teste@gmail.com',
        password: 'Testando@123'
    };

    // Define os mocks de dados para a API
    const MOCK_REPORTS = [
        {
            id: 'uuid-123',
            titulo: 'Relatório Anual 2023',
            descricao: 'Descrição detalhada do relatório anual de 2023.',
            data_publicacao: '2023-10-25T10:00:00Z', // Corrigido para data_publicacao (baseado no JS)
            caminho_arquivo: 'path/to/relatorio_2023.pdf'
        },
        {
            id: 'uuid-456',
            titulo: 'Auditoria Interna Q3',
            descricao: 'Resultados da auditoria interna referente ao terceiro trimestre.',
            data_publicacao: '2023-09-15T14:30:00Z', // Corrigido para data_publicacao
            caminho_arquivo: 'path/to/auditoria_q3.pdf'
        }
    ];

    // Bloco executado antes de CADA teste (it)
    beforeEach(() => {
        // Intercepta a chamada inicial (GET /api/relatorios)
        cy.intercept('GET', '/api/relatorios', {
            statusCode: 200,
            body: MOCK_REPORTS
        }).as('getReports');

        // Automatiza o login
        cy.session(TEST_USER.email, () => {
            const LOGIN_PATH = 'entrar'; 
            cy.visit(`http://localhost:3080/${LOGIN_PATH}`);
            
            // Ajuste se o seletor de email estiver errado
            cy.get('input[name="email"]').type(TEST_USER.email);
            cy.get('input[name="senha"]').type(TEST_USER.password);
            cy.get('button[type="submit"]').click();
            
            cy.url().should('not.include', LOGIN_PATH); 
        });

        // Visita a página de relatórios
        cy.visit('http://localhost:3080/transparencia/relatorios');

        // Espera a chamada inicial de carregamento
        cy.wait('@getReports');
    });

    // 1. Testes de Layout
    context('Testes de Layout', () => {
        it('Deve exibir os elementos estáticos principais da página', () => {
            cy.title().should('eq', 'Enchant | Relatórios');
            cy.get('h1').should('be.visible').and('contain.text', 'Relatórios');
            cy.contains('p', 'Gerencie e publique relatórios de transparência').should('be.visible');
            cy.get('#reports-form').should('be.visible');
        });

        it('Deve exibir os campos do formulário de upload corretamente', () => {
            cy.get('label[for="report-title"]').should('contain.text', 'Título do relatório');
            cy.get('label[for="report-description"]').should('contain.text', 'Descrição');
            cy.get('.file-upload').should('be.visible');
            cy.get('#reports-form button[type="submit"]').should('be.visible').and('contain.text', 'Adicionar relatório');
        });
    });

    // 2. Testes de Validação
    context('Testes de Validação do Formulário', () => {
        it('Deve exibir mensagens de erro para todos os campos obrigatórios se o formulário for enviado vazio', () => {
            cy.get('#reports-form button[type="submit"]').click();
            cy.get('#report-title-error').should('be.visible');
            cy.get('#report-description-error').should('be.visible');
            cy.get('#report-file-error').should('be.visible');
        });

        it('Deve exibir mensagem de erro para tipo de arquivo inválido', () => {
            cy.get('#report-file').selectFile({
                contents: Cypress.Buffer.from('teste'),
                fileName: 'documento.txt',
                mimeType: 'text/plain'
            }, { force: true });
            cy.get('#reports-form button[type="submit"]').click();
            cy.get('#report-file-error').should('be.visible');
        });
    });

    // 3. Testes de Interatividade (Fluxos Dinâmicos)
    context('Testes de Interatividade', () => {

        it('Deve carregar e exibir a lista de relatórios existentes', () => {
            cy.get('#reports-list .card').should('have.length', 2);
            cy.get('#reports-list .card')
                .contains('Relatório Anual 2023')
                .should('be.visible');
            cy.get('#reports-list .card')
                .contains('Auditoria Interna Q3')
                .should('be.visible');
        });
        
        it('Deve exibir o modal de detalhes ao clicar no botão de descrição', () => {
            // !!!!! CORREÇÃO (Erro 1) !!!!!
            // 1. Encontra o card que CONTÉM o texto
            cy.contains('.card', 'Relatório Anual 2023')
              // 2. DENTRO dele, encontra o botão de descrição (pela classe)
              .find('button.view-description-btn') 
              // 3. Clica no botão
              .click();

            // Espera pelo TÍTULO do modal
            cy.get('#modal-title')
              .should('be.visible')
              .and('contain.text', 'Relatório Anual 2023');

            // Verifica a descrição
            cy.get('#modal-description').should('contain.text', 'Descrição detalhada');

            cy.get('#descriptionModal .close').click();
            cy.get('#descriptionModal').should('not.be.visible');
        });
        
        it('Deve atualizar o nome do arquivo ao selecionar via "clique"', () => {
            cy.get('#report-file').selectFile({
                contents: Cypress.Buffer.from('fake pdf'),
                fileName: 'meu-relatorio.pdf',
                mimeType: 'application/pdf'
            }, { force: true });
            cy.get('#report-file-error').should('not.be.visible');
        });

        it('Deve atualizar o nome do arquivo ao usar "drag-and-drop"', () => {
            cy.get('.file-upload').selectFile({
                contents: Cypress.Buffer.from('fake pdf'),
                fileName: 'drag-drop-file.pdf',
                mimeType: 'application/pdf'
            }, { action: 'drag-drop' });
            cy.get('#report-file-error').should('not.be.visible');
        });

        it('Deve enviar o formulário com sucesso, mostrar alerta e recarregar a lista', () => {
            
            // Intercept da API de POST (corrigido)
            cy.intercept('POST', '/api/relatorios', {
                statusCode: 201,
                // O seu JS espera uma mensagem de sucesso no 'result.message'
                body: { message: 'Relatório adicionado com sucesso!' } 
            }).as('postRelatorio');
            
            // Mock da API de 'GET' que é chamada DEPOIS do upload
            const newReport = { id: 'uuid-789', titulo: 'Novo Relatório Válido', descricao: '...', data_publicacao: new Date().toISOString(), caminho_arquivo: 'path/to/new.pdf' };
            cy.intercept('GET', '/api/relatorios', { 
                statusCode: 200, 
                body: [...MOCK_REPORTS, newReport] 
            }).as('getReportsAfterUpload');

            // Preenche o formulário
            cy.get('#report-title').type(newReport.titulo);
            cy.get('#report-description').type('Descrição válida para o teste');
            cy.get('#report-file').selectFile({
                contents: Cypress.Buffer.from('fake pdf'),
                fileName: 'novo_relatorio.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            cy.get('#reports-form button[type="submit"]').click();

            // Espera apenas pela única chamada POST
            cy.wait('@postRelatorio');

            // !!!!! CORREÇÃO (Erro 2) !!!!!
            // Espera pela DIV de SUCESSO, não pelo modal
            cy.get('#success-reports')
                .should('be.visible')
                // A mensagem vem do 'body' do intercept
                .and('contain.text', 'Relatório adicionado com sucesso!'); 

            // Verifica se o formulário foi resetado
            cy.get('#report-title').should('have.value', '');

            // Verifica se a lista foi recarregada
            cy.wait('@getReportsAfterUpload');
            cy.get('#reports-list .card').should('have.length', 3);
            cy.get('#reports-list .card').contains(newReport.titulo).should('be.visible');
        });
    });
});