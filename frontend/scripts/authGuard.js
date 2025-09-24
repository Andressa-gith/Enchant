import supabaseClient from './supabaseClient.js';

// Função auto-executável (ela roda assim que o script é carregado)
(async () => {
    // Pega os dados do usuário logado
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Se NÃO houver um usuário logado...
    if (!user) {
        alert('Você precisa estar logado para acessar esta página.');
        window.location.href = '/entrar'; 
    }
})();