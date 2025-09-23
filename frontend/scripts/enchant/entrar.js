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
            alert('Por favor, preencha o email e a senha.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';

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
            window.location.href = '/dashboard';

        } catch (error) {
            console.error('❌ Erro no login:', error.message);
            alert(`Erro: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});