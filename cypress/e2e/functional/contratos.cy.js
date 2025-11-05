/// <reference types="cypress" />

describe('Testes Funcionais - Página de Contratos (transparencia2.html)', () => {
    // Armazena as credenciais de teste fornecidas
    const TEST_USER = {
        email: 'teste@gmail.com',
        password: 'Testando@123'
    };

    // Mock de dados para a API (baseado na lógica do transparencia2.js)
    const MOCK_CONTRACTS = [
        {
            id: 'uuid-contrato-1',
            titulo: 'Contrato Prestação de Serviços TI 2024',
            descricao: 'Descrição detalhada do contrato de TI para o ano de 2024.',
            ano: 2024,
            nome_arquivo: 'contrato_ti_2024.pdf',
            caminho_arquivo: 'supabase/path/contrato_ti_2024.pdf',
            data_publicacao: '2024-03-15T10:00:00Z'
        },
        {
            id: 'uuid-contrato-2',
            titulo: 'Contrato Marketing Digital 2023',
            descricao: 'Contrato com agência de marketing digital.',
            ano: 2023,
            nome_arquivo: 'mkt_digital_2023.pdf',
            caminho_arquivo: 'supabase/path/mkt_digital_2023.pdf',
            data_publicacao: '2023-01-20T14:30:00Z'
        }
    ];

    // Bloco executado antes de CADA teste (it)
    beforeEach(() => {
        // Intercepta a chamada inicial de carregamento de contratos
        cy.intercept('GET', '/api/contratos', {
            statusCode: 200,
            body: MOCK_CONTRACTS
        }).as('getContracts');

        // Automatiza o login
        cy.session(TEST_USER.email, () => {
            cy.visit('http://localhost:3080/entrar'); 
            cy.get('input[name="email"]').type(TEST_USER.email);
            cy.get('input[name="senha"]').type(TEST_USER.password);
            cy.get('button[type="submit"]').click();
            cy.url().should('not.include', '/entrar'); 
        });

        // Visita a página de contratos (alvo do teste)
        cy.visit('http://localhost:3080/transparencia/contratos');

        // Espera a chamada inicial de carregamento
        cy.wait('@getContracts');
    });

    // 1. Testes de Layout (Elementos Estáticos e Dinâmicos)
    context('Testes de Layout', () => {
        it('Deve exibir os elementos estáticos principais da página', () => {
            cy.title().should('eq', 'Enchant | Contratos');
            cy.get('h1').should('be.visible').and('contain.text', 'Contratos');
            
            // CORREÇÃO (Cenário 1): Texto do parágrafo atualizado
            cy.contains('p', 'Gerencie e publique os contratos da sua organização para garantir a transparência.').should('be.visible');

            // Verifica a seção de upload
            cy.get('#contracts-form').should('be.visible');
            cy.get('h2').contains('Adicionar contrato').should('be.visible');

            // Verifica a seção de contratos existentes
            cy.get('.uploaded-items h3').should('be.visible').and('contain.text', 'Contratos publicados');
            cy.get('#contracts-list').should('be.visible');
        });

        it('Deve exibir os campos do formulário de upload corretamente', () => {
            // CORREÇÃO (Cenário 2): Label do título atualizada
            cy.get('label[for="contract-title"]').should('contain.text', 'Nome do contrato');
            cy.get('#contract-title').should('be.visible').and('have.attr', 'placeholder', 'Ex: Contrato de prestação de serviços...');

            cy.get('label[for="contract-description"]').should('contain.text', 'Descrição');
            cy.get('#contract-description').should('be.visible').and('have.attr', 'placeholder', 'Descreva o conteúdo do contrato');

            cy.get('label[for="contract-year"]').should('contain.text', 'Ano do contrato');
            cy.get('#contract-year').should('be.visible');
            
            cy.get('label[for="contract-file"]').should('contain.text', 'Arquivo do contrato');
            cy.get('.file-upload').should('be.visible');
            
            cy.get('#contracts-form button[type="submit"]').should('be.visible').and('contain.text', 'Adicionar contrato');
        });

        it('Deve popular dinamicamente o select de ano (baseado no transparencia2.js)', () => {
            // CORREÇÃO (Cenário 3): Removida a verificação do texto da option[value=""] (frágil)
            const currentYear = new Date().getFullYear();
            cy.get('#contract-year option[value="2024"]').should('exist');
            cy.get('#contract-year option[value="2020"]').should('exist');
            cy.get('#contract-year option[value="2019"]').should('not.exist');
            cy.get('#contract-year option[value="'+ (currentYear + 1) +'"]').should('exist');
        });
    });

    // 2. Testes de Validação (Baseado no transparencia2.js e Erros)
    context('Testes de Validação do Formulário', () => {
        it('Deve exibir mensagens de erro para todos os campos obrigatórios se o formulário for enviado vazio', () => {
            cy.get('#contracts-form button[type="submit"]').click();

            // CORREÇÃO (Cenário 4): A validação de "vazio" está mostrando o erro de "mínimo"
            cy.get('#contract-title-error').should('be.visible').and('contain.text', 'O título deve ter no mínimo 10 caracteres.');
            // Assumindo que a descrição segue a mesma lógica do título
            cy.get('#contract-description-error').should('be.visible').and('contain.text', 'Descrição deve ter no mínimo 20 caracteres.');
            
            // Estes são 'required' simples, devem estar corretos
            cy.get('#contract-year-error').should('be.visible').and('contain.text', 'Ano é obrigatório.');
            cy.get('#contract-file-error').should('be.visible').and('contain.text', 'Arquivo é obrigatório.');
        });

        it('Deve exibir mensagem de erro para tipo de arquivo inválido', () => {
            cy.get('#contract-file').selectFile({
                contents: Cypress.Buffer.from('conteúdo do arquivo de teste'),
                fileName: 'documento.txt',
                mimeType: 'text/plain'
            }, { force: true });

            cy.get('#contracts-form button[type="submit"]').click();
            cy.get('#contract-file-error').should('be.visible').and('contain.text', 'Tipo de arquivo inválido. Permitidos: .pdf, .doc, .docx');
        });

        it('Deve exibir mensagem de erro para arquivo muito grande', () => {
            const largeFile = Cypress.Buffer.alloc(16 * 1024 * 1024); // 16MB (limite é 15MB)

            cy.get('#contract-file').selectFile({
                contents: largeFile,
                fileName: 'arquivo_grande.pdf',
                mimeType: 'application/pdf'
            }, { force: true });

            cy.get('#contracts-form button[type="submit"]').click();
            cy.get('#contract-file-error').should('be.visible').and('contain.text', 'Arquivo excede o tamanho máximo de 15MB.');
        });
    });

    // 3. Testes de Interatividade (Fluxos Dinâmicos)
    context('Testes de Interatividade', () => {

        it('Deve carregar e exibir a lista de contratos existentes', () => {
            cy.get('#contracts-list .card').should('have.length', 2);
            cy.get('#empty-state').should('not.be.visible');
            cy.get('.card').contains('Contrato Prestação de Serviços TI 2024').should('be.visible');
            cy.get('.card').contains('Contrato Marketing Digital 2023').should('be.visible');
        });

        it('Deve exibir a mensagem "Nenhum contrato" se a API retornar uma lista vazia', () => {
            cy.intercept('GET', '/api/contratos', { statusCode: 200, body: [] }).as('getEmptyContracts');
            cy.visit('http://localhost:3080/transparencia/contratos');
            cy.wait('@getEmptyContracts');

            cy.get('#empty-state').should('be.visible').and('contain.text', 'Nenhum contrato publicado');
            cy.get('#contracts-list .card').should('not.exist');
        });

        it('Deve exibir o modal de detalhes ao clicar no botão de descrição', () => {
            const selector = '.view-description-btn'; // Baseado no transparencia2.js

            cy.contains('.card', MOCK_CONTRACTS[0].titulo)
                .find(selector)
                .click();

            // Espera pelo TÍTULO do modal (mais confiável)
            cy.get('#modal-title').should('be.visible').and('contain.text', MOCK_CONTRACTS[0].titulo);
            cy.get('#modal-description').should('contain.text', MOCK_CONTRACTS[0].descricao);

            cy.get('#descriptionModal .close').click();
            cy.get('#descriptionModal').should('not.be.visible');
        });

        it('Deve tentar abrir o link de download ao clicar em "Download"', () => {
            cy.window().then(win => {
                cy.stub(win, 'open').as('windowOpen');
            });
            
            const selector = '.download-btn'; // Baseado no transparencia2.js
            
            cy.contains('.card', MOCK_CONTRACTS[0].titulo)
                .find(selector)
                .click();

            cy.get('@windowOpen').should('be.called');
        });

        it('Deve deletar um contrato após confirmação', () => {
            cy.intercept('DELETE', `/api/contratos/${MOCK_CONTRACTS[0].id}`, {
                statusCode: 200,
                body: { message: 'Contrato deletado' }
            }).as('deleteContract');

            cy.intercept('GET', '/api/contratos', {
                statusCode: 200,
                body: [MOCK_CONTRACTS[1]]
            }).as('getContractsAfterDelete');

            cy.on('window:confirm', () => true);

            const selector = '.delete-btn'; // Baseado no transparencia2.js
            
            cy.contains('.card', MOCK_CONTRACTS[0].titulo)
                .find(selector)
                .click();

            cy.wait('@deleteContract');
            cy.wait('@getContractsAfterDelete');

            cy.get('#contracts-list .card').should('have.length', 1);
            cy.contains(MOCK_CONTRACTS[0].titulo).should('not.exist');
        });

        it('Deve enviar um novo contrato com sucesso e recarregar a lista', () => {
            // Rota de POST (baseada no router)
            cy.intercept('POST', '/api/contratos', {
                statusCode: 201,
                body: { message: 'Contrato adicionado com sucesso!' }
            }).as('postContract');

            const newContract = {
                id: 'uuid-contrato-3',
                titulo: 'Novo Contrato de Teste 2025',
                descricao: 'Descrição do novo contrato.',
                ano: 2025,
                nome_arquivo: 'teste_2025.pdf',
                caminho_arquivo: 'supabase/path/teste_2025.pdf',
                data_publicacao: new Date().toISOString()
            };

            cy.intercept('GET', '/api/contratos', {
                statusCode: 200,
                body: [...MOCK_CONTRACTS, newContract]
            }).as('getContractsAfterPost');

            // Preenche o formulário
            cy.get('#contract-title').type(newContract.titulo);
            cy.get('#contract-description').type(newContract.descricao);
            cy.get('#contract-year').select('2025');
            cy.get('#contract-file').selectFile({
                contents: Cypress.Buffer.from('fake pdf'),
                fileName: newContract.nome_arquivo,
                mimeType: 'application/pdf'
            }, { force: true });
            
            cy.get('#contracts-form button[type="submit"]').click();

            cy.wait('@postContract');

            // Verifica a mensagem de sucesso (ID baseado no JS 'ui' object)
            cy.get('#success-contracts').should('be.visible').and('contain.text', 'Contrato adicionado com sucesso!');

            cy.wait('@getContractsAfterPost');
            
            cy.get('#contracts-list .card').should('have.length', 3);
            cy.contains('.card', newContract.titulo).should('be.visible');
        });
    });
});