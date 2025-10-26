Cypress.Commands.add('login', (email, senha) => {
    cy.request({
        method: 'POST',
        url: '/api/auth/login', // Usa a URL relativa (sem o baseUrl)
        body: { email, senha },
    }).then((resp) => {
        // Assume que o teu token é guardado no localStorage
        // (Ajusta isto se guardares em cookies)
        window.localStorage.setItem('session_token', resp.body.token);
    });
});