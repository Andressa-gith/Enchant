document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURAÇÃO ---
    const SUPABASE_URL = 'https://xztrvvpxhccackzoaalz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dHJ2dnB4aGNjYWNrem9hYWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDYxNjUsImV4cCI6MjA3MDUyMjE2NX0.lNTBC-VzvHjvIydGUcg3uPb6leOIt78B6Zw6SeIa1zk';

    if (typeof supabase === 'undefined') {
        document.body.innerHTML = "<h1>Erro Crítico: Biblioteca do Supabase não foi carregada.</h1>";
        return;
    }
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 2. "GUARDA" DE SEGURANÇA ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            if (!document.body.classList.contains('dashboard-inicializado')) {
                initializeApp(session);
            }
        } else {
            // Agora, quando isso acontecer, será por um motivo real (usuário não logado)
            window.location.href = '/entrar';
        }
    });
})

// --- 3. FUNÇÃO PRINCIPAL QUE MONTA O DASHBOARD COMPLETO ---
function initializeApp(session) {
    document.body.classList.add('dashboard-inicializado');

    let myChart = null;

    // Mapeamento de todos os IDs do seu HTML
    const ui = {
        boasVindas: document.getElementById('boas-vindas'),
        kpiItens: document.getElementById('kpi-total-itens'),
        kpiFinanceiro: document.getElementById('kpi-total-financeiro'),
        kpiDoadores: document.getElementById('kpi-doadores-unicos'),
        kpiCategoria: document.getElementById('kpi-principal-categoria'),
        chartCanvas: document.getElementById('doacoesChart')?.getContext('2d'),
        atividadesRecentes: document.getElementById('lista-atividades-recentes'),
        statAlimentos: document.getElementById('stat-alimentos'),
        statRoupas: document.getElementById('stat-roupas'),
        statHigiene: document.getElementById('stat-higiene'),
        statMoveis: document.getElementById('stat-moveis'),
        statBrinquedos: document.getElementById('stat-brinquedos'),
        statCama: document.getElementById('stat-cama'),
    };

    // Função para buscar TODOS os dados no back-end de uma só vez
    async function fetchDashboardData(periodo = 'mes') {
        const token = session.access_token;
        try {
            const response = await fetch(`/api/dashboard?periodo=${periodo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("❌ Falha ao buscar dados do dashboard:", error);
            ui.boasVindas.textContent = "Erro ao carregar dados. Verifique o console (F12).";
            return null;
        }
    }

    // Função para PREENCHER A PÁGINA INTEIRA com os dados recebidos
    function updateUI(data) {
        if (!data) return;

        const { kpis, totaisPorCategoria, atividades, grafico, boasVindas } = data;

        ui.boasVindas.textContent = `Bem-vinda, ${boasVindas}!`;
        
        // Preenche os 4 cards principais (KPIs)
        ui.kpiItens.textContent = kpis.totalItensRecebidos.toLocaleString('pt-BR');
        ui.kpiFinanceiro.textContent = kpis.totalFinanceiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        ui.kpiDoadores.textContent = kpis.doadoresUnicos;
        ui.kpiCategoria.textContent = kpis.principalCategoria;
        
        // Preenche os 6 cards de totais por categoria
        // ATENÇÃO: Os nomes aqui (ex: 'Alimentos') devem corresponder às categorias no seu banco
        if (totaisPorCategoria) {
            ui.statAlimentos.textContent = totaisPorCategoria['Alimentos'] || '0';
            ui.statRoupas.textContent = totaisPorCategoria['Roupas'] || '0';
            ui.statHigiene.textContent = totaisPorCategoria['Higiene'] || '0';
            ui.statMoveis.textContent = totaisPorCategoria['Móveis'] || '0';
            ui.statBrinquedos.textContent = totaisPorCategoria['Brinquedos/Livros'] || '0';
            ui.statCama.textContent = totaisPorCategoria['Roupas de Cama'] || '0';
        }

        // Preenche a sidebar de atividades recentes
        if (atividades && atividades.length > 0) {
            ui.atividadesRecentes.innerHTML = atividades.map(item => `
                <div class="atividade-item">
                    <span>${item.descricao} de <strong>${item.doador}</strong></span>
                </div>
            `).join('');
        } else {
            ui.atividadesRecentes.innerHTML = `<p class="text-muted">Nenhuma atividade recente no período.</p>`;
        }
        
        // Desenha o gráfico
        updateChart(grafico);
    }

    // Função para criar ou atualizar o gráfico
    function updateChart(graficoData) {
        if (!ui.chartCanvas || !graficoData) return;
        if (myChart) myChart.destroy();
        
        myChart = new Chart(ui.chartCanvas, {
            type: 'bar',
            data: {
                labels: graficoData.labels,
                datasets: [{
                    label: 'Quantidade Recebida',
                    data: graficoData.data,
                    backgroundColor: '#72330f',
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Deixa a função de filtro acessível para os botões no HTML
    window.filtrarPeriodo = async (periodo) => {
        document.querySelectorAll('.btn-date-filter').forEach(btn => btn.classList.remove('active'));
        // Corrigido para lidar com '3meses'
        const button = document.querySelector(`.btn-date-filter[onclick*="'${periodo}'"]`);
        if (button) button.classList.add('active');
        
        ui.boasVindas.textContent = 'Atualizando...';
        const data = await fetchDashboardData(periodo);
        updateUI(data);
    };

    // Carga inicial dos dados
    filtrarPeriodo('mes');
}