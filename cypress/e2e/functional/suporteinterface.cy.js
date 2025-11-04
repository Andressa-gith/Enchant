/* eslint-disable cypress/no-unnecessary-waiting */
/// <reference types="cypress" />

/**
 * ESTE ARQUIVO TESTA O CÓDIGO 100% CORRIGIDO
 */

describe("Teste Funcional de Interface - Página de Suporte", () => {
  beforeEach(() => {
    // Ignora erros relacionados ao conflito de versões do Bootstrap
    cy.on("uncaught:exception", (err) => {
      if (
        err.message.includes(
          "Cannot read properties of undefined (reading 'fn')"
        )
      ) {
        return false;
      }
      return true;
    });

    // Visita o localhost diretamente.
    cy.visit("http://localhost:3080/suporte");

    // --- 
    // *** CORREÇÃO APLICADA ***
    // Removido o cy.wait(600). Esperas fixas são más práticas.
    // É melhor esperar por um elemento específico, se necessário.
    // ---
    cy.get('button.enviar[type="submit"]').should('be.visible');
  });

  /**
   * Categoria 1: Testes de Validação de Formulário (Client-Side)
   */
  context("Categoria 1: Testes de Validação de Formulário", () => {
    it("Cenário 1.1: Deve exibir modal de erro ao tentar enviar formulário vazio", () => {
      cy.get('button.enviar[type="submit"]').click();
      cy.get("#erroModal", { timeout: 10000 }).should("be.visible");
      cy.get("#erroModalBody").should(
        "contain.text",
        "O campo de assunto está vazio."
      );
      cy.get("#erroModalBody").should(
        "contain.text",
        "O campo de e-mail está vazio."
      );
      cy.get("#erroModalBody").should(
        "contain.text",
        "O campo de descrição está vazio."
      );
    });

    it("Cenário 1.3: Deve exibir modal de erro para campos com texto inadequado", () => {
      cy.get("#assunto").type("teste");
      cy.get("#email").type("valido@email.com");
      cy.get("#descricao").type("Isto é apenas um teste de zoeira");
      cy.get('button.enviar[type="submit"]').click();
      cy.get("#erroModal").should("be.visible");
      cy.get("#erroModalBody").should(
        "contain.text",
        "O campo de assunto contém palavras ou caracteres inválidos."
      );
      cy.get("#erroModalBody").should(
        "contain.text",
        "A descrição contém palavras ou caracteres inválidos."
      );
    });

    it("Cenário 1.4: Deve exibir modal de erro para descrição muito curta", () => {
      cy.get("#assunto").type("Assunto válido");
      cy.get("#email").type("valido@email.com");
      cy.get("#descricao").type("curto");
      cy.get('button.enviar[type="submit"]').click();
      cy.get("#erroModal").should("be.visible");
      cy.get("#erroModalBody").should(
        "contain.text",
        "A descrição deve conter pelo menos 10 caracteres."
      );
    });

    it("Cenário 1.5: Deve exibir modal de SUCESSO e limpar o formulário após envio válido", () => {
      cy.get("#assunto").type("Dúvida sobre Faturamento");
      cy.get("#email").type("ong.parceira@email.com");
      cy.get("#descricao").type(
        "Gostaria de saber como emitir a nota fiscal da doação que recebemos."
      );
      cy.get('button.enviar[type="submit"]').click();

      // Agora o teste espera pelo modal de sucesso que existe no HTML
      cy.get("#sucessoModal").should("be.visible");
      cy.get("#sucessoModalBody").should(
        "contain.text",
        "Formulário enviado com sucesso!"
      );

      // Verifica se os campos foram limpos
      cy.get("#assunto").should("have.value", "");
      cy.get("#email").should("have.value", "");
      cy.get("#descricao").should("have.value", "");
    });
  });

  /**
   * Categoria 2: Testes de Interatividade e Feedback
   */
  context("Categoria 2: Testes de Interatividade e Feedback", () => {
    
    it('Cenário 2.2: Modal de sucesso deve fechar ao clicar em "Entendi"', () => {
  // Preenche o formulário
  cy.get("#assunto").type("Dúvida sobre Faturamento");
  cy.get("#email").type("ong.parceira@email.com");
  cy.get("#descricao").type(
    "Gostaria de saber como emitir a nota fiscal da doação."
  );

  // Envia
  cy.get('button.enviar[type="submit"]').click();

  // Espera o modal aparecer
  cy.get("#sucessoModal").should("be.visible");

  // Clica no botão "Entendi" com o ID correto
  cy.get("#sucessoEntendiBtn").click();

  // Espera o modal desaparecer (sem cy.wait)
  cy.get("#sucessoModal").should("not.be.visible");
});

    it("Cenário 2.3: Interatividade do Upload - Deve atualizar o texto ao selecionar arquivo", () => {
      const fileName = "exemplo.png";
      // O {force: true} é necessário porque o input está 'hidden'
      cy.get('input#anexos[type="file"]').selectFile(
        `cypress/fixtures/${fileName}`,
        { force: true }
      );
      cy.get("#uploadText").should(
        "contain.text",
        `Arquivos selecionados: ${fileName}`
      );
    });

    it('Cenário 2.4: Interatividade do Upload - Deve mostrar feedback visual de "dragover"', () => {
      cy.get("#uploadBox").trigger("dragover");
      cy.get("#uploadBox").should("have.class", "dragover");
      cy.get("#uploadBox").trigger("dragleave");
      cy.get("#uploadBox").should("not.have.class", "dragover");
    });

    it('Cenário 2.5: Interatividade do Upload - Deve aceitar arquivo por "drop"', () => {
      const fileName = "exemplo.png";
      cy.get("#uploadBox").selectFile(`cypress/fixtures/${fileName}`, {
        action: "drag-drop",
        force: true, // Necessário pois o input está por baixo
      });
      cy.get("#uploadText").should(
        "contain.text",
        `Arquivos selecionados: ${fileName}`
      );
    });
  });

  /**
   * Categoria 3: Testes de Layout (Responsividade)
   */
  context("Categoria 3: Testes de Layout (Responsividade)", () => {
    // Nota: Os valores exatos de 'font-size' podem variar ligeiramente
    // dependendo do navegador. Use 'px' para ser exato.
    
    it("Cenário 3.1: Deve aplicar layout de Desktop (default > 1024px)", () => {
      cy.viewport("macbook-15"); // 1440x900
      cy.get(".titulo").should("have.css", "font-size", "32px");
    });

    it("Cenário 3.2: Deve aplicar layout de Tablet (@media max-width: 1024px)", () => {
      cy.viewport(1024, 768);
      cy.get(".titulo").should("have.css", "font-size", "28px");
    });

    it("Cenário 3.3: Deve aplicar layout de Celular (@media max-width: 768px)", () => {
      cy.viewport(768, 1024); // ipad-2
      cy.get(".titulo").should("have.css", "font-size", "26px");
      cy.get(".form-container").should("have.css", "padding", "20px");
    });

    it("Cenário 3.4: Deve aplicar layout de Celular Pequeno (@media max-width: 480px)", () => {
      cy.viewport(375, 667); // iphone-6
      cy.get(".titulo").should("have.css", "font-size", "24px");
      cy.get(".form-container").should("have.css", "padding", "20px");
    });
  });
});