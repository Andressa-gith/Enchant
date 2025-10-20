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

    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);

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
            showErrorMessage(`E-mail ou senha inválidos.`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });

});

function togglePassword(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const passwordField = document.getElementById('senha');
    const eyeIcon = document.getElementById('eyeIcon');
    
    // Salva a posição do cursor antes de mudar o tipo
    const cursorPosition = passwordField.selectionStart;
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`;
    } else {
        passwordField.type = 'password';
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    }
    
    // Restaura a posição do cursor
    passwordField.setSelectionRange(cursorPosition, cursorPosition);
    
    // Remove o foco do input
    passwordField.blur();
    
    // Retorna o foco imediatamente (isso evita o efeito visual de mudança)
    setTimeout(() => {
        passwordField.focus();
        passwordField.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
}