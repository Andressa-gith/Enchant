document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('formSenha');
    const emailInput = document.getElementById('email');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o envio padrão

        const email = emailInput.value.trim();

        // Validação simples de email
        if (!email) {
            showModalAviso('Por favor, insira um endereço de email.');
            return;
        }

        // Desabilita o botão para evitar cliques múltiplos
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            const response = await fetch('/esqueci-senha', { // Rota correta da API
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Informa que estamos enviando JSON
                },
                body: JSON.stringify({ email: email }) // Envia os dados como JSON
            });

            const data = await response.json();

            // O back-end sempre retorna sucesso, então mostramos a mensagem de sucesso
            showModalAviso(data.message, 'sucesso');
            form.reset();

        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            // Mensagem de erro genérica para problemas de rede, etc.
            showModalAviso('Não foi possível conectar ao servidor. Tente novamente mais tarde.', 'erro');
        } finally {
            // Reabilita o botão ao final do processo
            submitButton.disabled = false;
            submitButton.textContent = 'Continuar';
        }
    });

    /**
     * Exibe um modal de aviso para o usuário.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} [tipo='erro'] - O tipo de aviso ('sucesso' ou 'erro').
     */
    function showModalAviso(message, tipo = 'erro') {
        const modal = $('#mensagemModal'); // Usando jQuery que você já tem na página
        const modalTitle = modal.find('.modal-title');
        const modalBody = modal.find('.modal-body');

        modalTitle.text(tipo === 'sucesso' ? 'Sucesso!' : 'Atenção');
        modalBody.text(message);
        
        modal.modal('show');
    }
});