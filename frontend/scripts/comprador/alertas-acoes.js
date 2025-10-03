import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        alertsListContainer: document.getElementById('full-alerts-list'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };

    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);

    const showLoader = (isLoading) => { if (ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if (ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };

    const fetchData = async (url) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/entrar';
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

    const renderAlerts = (alertas) => {
        if (!alertas || alertas.length === 0) {
            showEmptyState(true);
            return;
        }

        ui.alertsListContainer.innerHTML = alertas.map(item => {
            let iconClass = 'bi-info-circle';
            let specificIconClass = '';

            if (item.tipo === 'parceria') {
                iconClass = 'bi-calendar-x-fill';
                specificIconClass = 'icon-parceria';
            } else if (item.tipo === 'estoque') {
                iconClass = 'bi-box-seam';
                specificIconClass = 'icon-estoque';
            } else if (item.tipo === 'parceria-expirada') { // <-- MUDANÇA AQUI
                iconClass = 'bi-exclamation-octagon-fill';
                specificIconClass = 'icon-parceria-expirada';
            }
            
            return `
                <div class="alert-item">
                    <i class="bi ${iconClass} alert-icon ${specificIconClass}"></i>
                    <div class="alert-text">${item.texto}</div>
                </div>
            `;
        }).join('');
    };

    const loadAlerts = async () => {
        showLoader(true);
        showEmptyState(false);
        try {
            const todosAlertas = await fetchData('/api/dashboard/alertas');
            renderAlerts(todosAlertas);
        } catch (error) {
            console.error("❌ Erro ao carregar a lista de alertas:", error);
            showEmptyState(true);
        } finally {
            showLoader(false);
        }
    };

    loadAlerts();
});