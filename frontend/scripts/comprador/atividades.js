import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO DOS ELEMENTOS DA UI ---
    const ui = {
        activityListContainer: document.getElementById('full-activity-list'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };

    // --- CÓDIGO PARA DESLIGAR O LOADER GLOBAL ---
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);

    // --- FUNÇÕES DE CONTROLE DE UI ---
    const showLoader = (isLoading) => { if (ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if (ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };

    // --- FUNÇÃO PARA FAZER REQUISIÇÕES AUTENTICADAS ---
    const fetchData = async (url) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/entrar'; // Redireciona se não estiver logado
            throw new Error('Sessão não encontrada.');
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Erro na requisição.');
        }
        return await response.json();
    };

    // --- FUNÇÃO PARA RENDERIZAR A LISTA DE ATIVIDADES ---
    const renderActivities = (atividades) => {
        if (!atividades || atividades.length === 0) {
            showEmptyState(true);
            return;
        }

        ui.activityListContainer.innerHTML = atividades.map(item => {
            const dataObj = new Date(item.data);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            let iconClass = 'bi-info-circle';
            if (item.tipo === 'entrada') iconClass = 'bi-box-arrow-in-down text-success';
            if (item.tipo === 'saida') iconClass = 'bi-box-arrow-up text-danger';
            if (item.tipo === 'parceria') iconClass = 'bi-people-fill text-primary';
            if (item.tipo === 'entrada-financeira') iconClass = 'bi-cash-stack text-success';
            if (item.tipo === 'saida-financeira') iconClass = 'bi-credit-card-2-front text-danger';
            
            return `
                <div class="atividade-item">
                    <i class="bi ${iconClass} atividade-icon"></i>
                    <div class="atividade-texto">${item.desc}</div>
                    <div class="atividade-data">
                        <span>${dataFormatada}</span>
                        <span>${horaFormatada}</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    // --- FUNÇÃO PRINCIPAL PARA CARREGAR OS DADOS ---
    const loadActivities = async () => {
        showLoader(true);
        showEmptyState(false);
        try {
            const todasAtividades = await fetchData('/api/dashboard/atividades');
            renderActivities(todasAtividades);
        } catch (error) {
            console.error("❌ Erro ao carregar o histórico de atividades:", error);
            showEmptyState(true); // Mostra estado vazio em caso de erro
        } finally {
            showLoader(false);
        }
    };

    // --- INICIALIZAÇÃO ---
    loadActivities();
});