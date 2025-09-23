document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO DO CLIENTE SUPABASE ---
    // Coloque suas chaves públicas aqui.
    SUPABASE_URL="https://xztrvvpxhccackzoaalz.supabase.co";
    SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dHJ2dnB4aGNjYWNrem9hYWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDYxNjUsImV4cCI6MjA3MDUyMjE2NX0.lNTBC-VzvHjvIydGUcg3uPb6leOIt78B6Zw6SeIa1zk";

    // CORREÇÃO DEFINITIVA: Criamos uma variável com nome diferente ('supabaseClient')
    // para não dar conflito com o objeto global 'supabase' que vem do CDN.
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. SELETORES DOS ELEMENTOS DO HTML ---
    const form = document.getElementById('passwordForm');
    const pass1Input = document.getElementById('pass1');
    const pass2Input = document.getElementById('pass2');
    const submitButton = form.querySelector('button[type="submit"]');
    
    const reqLength = document.getElementById('reqLength');
    const reqNumbers = document.getElementById('reqNumbers');
    const reqSpecial = document.getElementById('reqSpecial');
    const reqUpper = document.getElementById('reqUpper');

    // --- 3. "OUVINTE" DO SUPABASE ---
    // Usa o 'supabaseClient' que acabamos de criar.
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            console.log('Sessão de recuperação de senha estabelecida! Pode redefinir.');
        } else if (event === "SIGNED_IN") {
            console.log('Usuário logado com a nova senha.');
        }
    });

    // --- 4. VALIDAÇÃO EM TEMPO REAL ---
    pass1Input.addEventListener('input', validarSenhaEmTempoReal);
    pass2Input.addEventListener('input', validarSenhaEmTempoReal);

    function validarSenhaEmTempoReal() {
        const password = pass1Input.value;
        
        // Efeito "verdinho" nos requisitos
        updateRequirementUI(reqLength, password.length >= 8);
        updateRequirementUI(reqNumbers, (password.match(/\d/g) || []).length >= 2);
        updateRequirementUI(reqSpecial, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password));
        updateRequirementUI(reqUpper, /[A-Z]/.test(password));

        // Confere se as duas senhas são iguais
        if (pass1Input.value && pass2Input.value && pass1Input.value === pass2Input.value) {
            pass2Input.classList.add('password-match');
        } else {
            pass2Input.classList.remove('password-match');
        }
    }

    function updateRequirementUI(element, isMet) {
        if (element) {
            element.classList.toggle('valid', isMet);
            element.classList.toggle('invalid', !isMet);
        }
    }

    // --- 5. SUBMISSÃO DO FORMULÁRIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        const novaSenha = pass1Input.value;
        const confirmarSenha = pass2Input.value;

        if (novaSenha !== confirmarSenha) {
            showFeedbackModal('As senhas não coincidem.');
            reabilitarBotao();
            return;
        }

        const isPasswordValid = reqLength.classList.contains('valid') && reqNumbers.classList.contains('valid') && reqSpecial.classList.contains('valid') && reqUpper.classList.contains('valid');
        if (!isPasswordValid) {
            showFeedbackModal('A senha não atende a todos os requisitos de segurança.');
            reabilitarBotao();
            return;
        }

        // Usa o 'supabaseClient' que criamos
        const { error } = await supabaseClient.auth.updateUser({
            password: novaSenha
        });

        if (error) {
            showFeedbackModal(`Erro ao atualizar a senha: ${error.message}`);
            reabilitarBotao();
        } else {
            // Sucesso! Mostra o modal e agenda o redirecionamento.
            showFeedbackModal('Senha redefinida com sucesso!', 'sucesso');
            setTimeout(() => {
                window.location.href = '/entrar';
            }, 2500);
        }
    });
    
    function reabilitarBotao() {
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar';
    }

    // --- 6. FUNÇÃO PARA EXIBIR OS MODAIS ---
    function showFeedbackModal(message, type = 'erro') {
        if (type === 'sucesso') {
            $('#successModal').modal('show');
        } else {
            const modalBody = document.getElementById('errorModalBody');
            if (modalBody) modalBody.textContent = message;
            $('#errorModal').modal('show');
        }
    }
});