/// <reference types="cypress" />

describe('Testes Funcionais - Página de Pagamento (paginapagamento.html)', () => {

    // --- DADOS MOCKADOS ---
    // Estes dados serão usados para simular as respostas das APIs
    const MOCK_ESTADOS = [
        { "id": 29, "sigla": "BA", "nome": "Bahia" },
        { "id": 35, "sigla": "SP", "nome": "São Paulo" }
    ];

    const MOCK_CIDADES_BA = [
        { "id": 2927408, "nome": "Salvador" },
        { "id": 2910727, "nome": "Feira de Santana" }
    ];

    const MOCK_CEP_INFO = {
        "cep": "40140-000",
        "logradouro": "Avenida Sete de Setembro",
        "complemento": "",
        "bairro": "Barra",
        "localidade": "Salvador",
        "uf": "BA"
    };
    
    // --- FUNÇÃO AUXILIAR ---
    /**
     * Preenche a primeira parte do formulário com dados válidos.
     */
    function preencherFormularioParte1_Valido() {
        cy.get('#nome').type('Usuário de Teste');
        cy.get('#email').type('teste@exemplo.com');
        cy.get('#cpf').type('123.456.789-00'); // A máscara será aplicada
        cy.get('#data_nascimento').type('01/01/1990');
        cy.get('#celular').type('(71) 99999-8888');
        
        // Simula o preenchimento automático do CEP
        cy.get('#cep').type(MOCK_CEP_INFO.cep);
        cy.wait('@viaCep'); // Espera a API mockada responder

        // Seleciona Estado e Cidade (que foram carregados pelas APIs mockadas)
        cy.wait('@getEstados');
        cy.get('#estado').select(MOCK_ESTADOS[0].nome); // Seleciona "Bahia"
        cy.wait('@getCidades');
        cy.get('#cidade').select(MOCK_CIDADES_BA[0].nome); // Seleciona "Salvador"

        cy.get('#numero').type('123');
        cy.get('#complemento').type('Apto 404');
        cy.get('#senha').type('SenhaForte123!');
        cy.get('#confirmar_senha').type('SenhaForte123!');
    }

    // --- CONFIGURAÇÃO INICIAL (BEFORE EACH) ---
    beforeEach(() => {
        // Interceptamos (mockamos) todas as chamadas de API externas
        // para isolar o teste ao frontend, conforme o PDF de Casos de Teste.
        
        // Mock API do IBGE (Estados)
        cy.intercept(
            'GET', 
            'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome', 
            { fixture: 'estados.json' } // Usa o arquivo de fixture
        ).as('getEstados');

        // Mock API do IBGE (Cidades) - Ex: Cidades da Bahia (ID 29)
        cy.intercept(
            'GET', 
            'https://servicodados.ibge.gov.br/api/v1/localidades/estados/29/municipios', 
            { fixture: 'cidades_ba.json' } // Usa o arquivo de fixture
        ).as('getCidades');

        // Mock API do ViaCEP
        cy.intercept(
            'GET', 
            `https://viacep.com.br/ws/${MOCK_CEP_INFO.cep}/json/`, 
            { fixture: 'cep.json' } // Usa o arquivo de fixture
        ).as('viaCep');

        // Visita a página de pagamento
        // Ajuste o caminho se a página não estiver na raiz do seu servidor.
        cy.visit('http://localhost:3080/pagamento');
    });

    // --- SUÍTE 1: VALIDAÇÃO DO FORMULÁRIO (PRIMEIRA PARTE) ---
    context('Validação do Formulário (Primeira Parte)', () => {
        
        it('deve estar com a segunda parte do formulário oculta inicialmente', () => {
            cy.get('#segunda-parte').should('not.be.visible');
        });

        it('deve exibir modal de erro ao tentar continuar com campos obrigatórios vazios', () => {
            cy.get('#continuar-pagamento').click();

            // Verifica se o modal de erro apareceu (baseado no paginapagamento.html)
            cy.get('#avisoModal').should('be.visible');
            cy.get('#errorModalBody').should('contain.text', 'Nome completo é obrigatório');
            cy.get('#errorModalBody').should('contain.text', 'Email é obrigatório');
            cy.get('#errorModalBody').should('contain.text', 'CPF é obrigatório');
            // Adicione outras verificações de campos vazios...

            // Garante que não avançou
            cy.get('#segunda-parte').should('not.be.visible');
        });

        it('deve exibir erro para email inválido', () => {
            preencherFormularioParte1_Valido(); // Preenche tudo certo
            cy.get('#email').clear().type('email-invalido.com'); // Sobrescreve com erro

            cy.get('#continuar-pagamento').click();
            
            cy.get('#avisoModal').should('be.visible');
            cy.get('#errorModalBody').should('contain.text', 'Formato de email inválido');
        });

        it('deve exibir erro para CPF inválido', () => {
            preencherFormularioParte1_Valido();
            cy.get('#cpf').clear().type('111.111.111-11'); // CPF inválido (formato JS)

            cy.get('#continuar-pagamento').click();
            
            cy.get('#avisoModal').should('be.visible');
            cy.get('#errorModalBody').should('contain.text', 'CPF inválido');
        });

        it('deve exibir erro para senha fraca', () => {
            preencherFormularioParte1_Valido();
            cy.get('#senha').clear().type('12345');
            cy.get('#confirmar_senha').clear().type('12345');

            cy.get('#continuar-pagamento').click();
            
            cy.get('#avisoModal').should('be.visible');
            cy.get('#errorModalBody').should('contain.text', 'A senha não atende aos requisitos');
        });

        it('deve exibir erro quando as senhas não coincidem', () => {
            preencherFormularioParte1_Valido();
            cy.get('#confirmar_senha').clear().type('SenhaDiferente123!');

            cy.get('#continuar-pagamento').click();
            
            cy.get('#avisoModal').should('be.visible');
            cy.get('#errorModalBody').should('contain.text', 'As senhas não coincidem');
        });

        it('deve navegar para a segunda parte do formulário com dados válidos', () => {
            preencherFormularioParte1_Valido();
            
            cy.get('#continuar-pagamento').click();

            // Modal de erro NÃO deve aparecer
            cy.get('#avisoModal').should('not.be.visible');

            // Navegação deve ocorrer
            cy.get('#primeira-parte').should('not.be.visible');
            cy.get('#segunda-parte').should('be.visible');
        });
    });

    // --- SUÍTE 2: INTERATIVIDADE E FEEDBACK ---
    context('Interatividade e Feedback', () => {
        
        it('deve preencher campos de endereço automaticamente após inserir CEP válido (mockado)', () => {
            // Verifica se os campos estão vazios
            cy.get('#logradouro').should('have.value', '');
            cy.get('#bairro').should('have.value', '');
            cy.get('#estado').should('have.value', ''); // O select
            
            // Digita o CEP mockado
            cy.get('#cep').type(MOCK_CEP_INFO.cep);

            // Espera a chamada da API (mockada) e a resposta
            cy.wait('@viaCep');

            // Verifica se os campos foram preenchidos pelo JS
            cy.get('#logradouro').should('have.value', MOCK_CEP_INFO.logradouro);
            cy.get('#bairro').should('have.value', MOCK_CEP_INFO.bairro);
            cy.get('#estado').should('have.value', MOCK_ESTADOS[0].id.toString()); // Deve selecionar "Bahia"
        });

        it('deve carregar cidades dinamicamente ao selecionar um estado (mockado)', () => {
            cy.wait('@getEstados'); // Espera os estados carregarem

            // Verifica se as cidades estão desabilitadas
            cy.get('#cidade').should('be.disabled');
            cy.get('#cidade').find('option').should('have.length', 1); // Apenas "Selecione a Cidade"

            // Seleciona o estado "Bahia"
            cy.get('#estado').select(MOCK_ESTADOS[0].nome);

            cy.wait('@getCidades'); // Espera a API de cidades (da Bahia)

            // Verifica se as cidades foram carregadas
            cy.get('#cidade').should('not.be.disabled');
            cy.get('#cidade').find('option').should('have.length', MOCK_CIDADES_BA.length + 1);
            cy.get('#cidade').should('contain', MOCK_CIDADES_BA[0].nome); // "Salvador"
        });

        it('deve alternar a visibilidade da senha ao clicar no ícone de olho', () => {
            const senhaInput = () => cy.get('#senha');
            const toggleButton = () => cy.get('#senha').siblings('.toggle-password'); // Baseado no HTML/CSS

            // 1. Verifica estado inicial
            senhaInput().should('have.attr', 'type', 'password');
            
            // 2. Clica para mostrar
            toggleButton().click();
            senhaInput().should('have.attr', 'type', 'text');

            // 3. Clica para esconder
            toggleButton().click();
            senhaInput().should('have.attr', 'type', 'password');
        });

        it('deve voltar para a primeira parte ao clicar em "Voltar" na segunda parte', () => {
            // 1. Avança para a segunda parte
            preencherFormularioParte1_Valido();
            cy.get('#continuar-pagamento').click();
            cy.get('#segunda-parte').should('be.visible');
            cy.get('#primeira-parte').should('not.be.visible');

            // 2. Clica em Voltar
            cy.get('#voltar-pagamento').click();

            // 3. Verifica se voltou
            cy.get('#segunda-parte').should('not.be.visible');
            cy.get('#primeira-parte').should('be.visible');
        });

        it('deve mostrar/ocultar detalhes do pagamento ao selecionar uma opção', () => {
            // Avança para a segunda parte
            preencherFormularioParte1_Valido();
            cy.get('#continuar-pagamento').click();

            // Estado inicial (baseado no paginapagamento.js)
            cy.get('#dados-pix').should('not.be.visible');
            cy.get('#dados-cartao').should('not.be.visible');
            cy.get('#dados-boleto').should('not.be.visible');

            // Clica em PIX
            cy.get('input[name="opcao"][value="pix"]').click({ force: true });
            cy.get('#dados-pix').should('be.visible');
            cy.get('#dados-cartao').should('not.be.visible');
            cy.get('#dados-boleto').should('not.be.visible');

            // Clica em Cartão
            cy.get('input[name="opcao"][value="credito"]').click({ force: true });
            cy.get('#dados-pix').should('not.be.visible');
            cy.get('#dados-cartao').should('be.visible');
            cy.get('#dados-boleto').should('not.be.visible');
        });
    });
    
    // --- SUÍTE 3: LAYOUT E RESPONSIVIDADE ---
    context('Layout e Responsividade', () => {
        
        // Define os viewports
        const viewports = {
            'mobile': [375, 667], // iPhone 6/7/8
            'desktop': [1280, 800] // Padrão
        };

        it('deve exibir layout empilhado em dispositivos móveis (max-width: 768px)', () => {
            cy.viewport(viewports.mobile[0], viewports.mobile[1]);
            
            // Avança para a segunda parte para ver o container de pagamento
            preencherFormularioParte1_Valido();
            cy.get('#continuar-pagamento').click();

            // Verifica CSS (baseado no paginapagamento.css)
            cy.get('.pagamento-container').should('have.css', 'flex-direction', 'column');
            cy.get('.escolher-pagamento').should('have.css', 'flex-direction', 'column');
            
            // Verifica se o botão "Continuar" (da parte 1) ocupa 100%
            cy.get('#voltar-pagamento').click(); // Volta
            
            // O CSS define .botao-continuar { width: 100%; }
            // O cypress 'calcula' o valor em pixels
            cy.get('.botao-continuar').should('have.css', 'width').and('eq', `${viewports.mobile[0]}px`);
        });

        it('deve exibir layout lado-a-lado em desktop', () => {
            cy.viewport(viewports.desktop[0], viewports.desktop[1]);

            preencherFormularioParte1_Valido();
            cy.get('#continuar-pagamento').click();

            // Em desktop, a direção NÃO deve ser 'column' (baseado no paginapagamento.css)
            cy.get('.pagamento-container').should('not.have.css', 'flex-direction', 'column');
            cy.get('.escolher-pagamento').should('not.have.css', 'flex-direction', 'column');
        });
    });
});