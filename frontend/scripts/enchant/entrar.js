// VERSÃO FINAL CORRIGIDA - ARQUITETURA CORRETA

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO ---
    const SUPABASE_URL = 'https://xztrvvpxhccackzoaalz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dHJ2dnB4aGNjYWNrem9hYWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDYxNjUsImV4cCI6MjA3MDUyMjE2NX0.lNTBC-VzvHjvIydGUcg3uPb6leOIt78B6Zw6SeIa1zk';

    if (typeof supabase === 'undefined') {
        alert("Erro Crítico: A biblioteca do Supabase não foi carregada.");
        return;
    }
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 1. FUNÇÕES PARA MOSTRAR MENSAGENS ---
    const messageContainer = document.getElementById('message-container');

    function showErrorMessage(message) {
        clearMessages();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message-container';
        errorDiv.innerHTML = `
            <div class="error-message">
                <i class="bi bi-exclamation-triangle error-icon"></i>
                <span>${message}</span>
            </div>
        `;
        messageContainer.appendChild(errorDiv);
            
        // Animar a entrada da mensagem
        setTimeout(() => {
            errorDiv.classList.add('show');
        }, 10);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            hideMessage(errorDiv);
        }, 5000);
    }

    function showSuccessMessage(message) {
        clearMessages();
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <i class="bi bi-check-circle success-icon"></i>
            <span>${message}</span>
        `;
        messageContainer.appendChild(successDiv);
            
        // Animar a entrada da mensagem
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 10);
    }

    function clearMessages() {
        messageContainer.innerHTML = '';
    }

    function hideMessage(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }

    // --- 2. LÓGICA DO FORMULÁRIO ---
    const form = document.getElementById('form');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const senha = senhaInput.value.trim();

        if (!email || !senha) {
            showErrorMessage('Por favor, preencha o email e a senha.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';
        clearMessages();

        try {
            // --- A MUDANÇA PRINCIPAL ESTÁ AQUI ---
            // Fazemos o login diretamente no navegador com a biblioteca do Supabase
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha,
            });

            if (error) {
                // Se o Supabase retornar um erro (ex: senha errada), nós o mostramos
                throw error;
            }

            // Se chegou aqui, o login foi um sucesso e a sessão JÁ ESTÁ SALVA no navegador!
            // Agora podemos redirecionar com segurança.
            showSuccessMessage('Sucesso!');

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (error) {
            console.error('❌ Erro no login:', error.message);
            showErrorMessage(`Erro: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});