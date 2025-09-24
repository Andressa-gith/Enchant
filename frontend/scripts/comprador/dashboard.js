import supabase from '/scripts/supabaseClient.js';

// O "Guarda" reativo que inicializa a página
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => initializeApp(session));
        } else {
            initializeApp(session);
        }
    } else {
        alert('Você precisa estar logado para acessar essa página.');
        window.location.href = '/entrar';
    }
});

function initializeApp(session) {
    // Evita reinicialização
    if (document.body.classList.contains('dashboard-inicializado')) return;
    document.body.classList.add('dashboard-inicializado');

    let myChart = null;
    let originalChartData = null;
    let activeChartView = 'estoqueAtual'; // Controla qual gráfico está ativo: 'estoqueAtual' ou 'fluxoDoacoes'

    const ui = {
        boasVindas: document.getElementById('boas-vindas'),
        kpiItens: document.getElementById('kpi-total-itens'),
        kpiFinanceiro: document.getElementById('kpi-total-financeiro'),
        kpiDoadores: document.getElementById('kpi-doadores-unicos'),
        kpiCategoria: document.getElementById('kpi-principal-categoria'),
        chartCanvas: document.getElementById('doacoesChart')?.getContext('2d'),
        atividadesRecentes: document.getElementById('lista-atividades-recentes'),
        filtroGrafico: document.getElementById('filtro-grafico-categoria'),
        // Novos botões para controle do gráfico
        btnChartEstoque: document.getElementById('btn-chart-estoque'),
        btnChartFluxo: document.getElementById('btn-chart-fluxo'),
        statAlimentos: document.getElementById('stat-alimentos'),
        statRoupas: document.getElementById('stat-roupas'),
        statHigiene: document.getElementById('stat-higiene'),
        statMoveis: document.getElementById('stat-moveis'),
        statBrinquedos: document.getElementById('stat-brinquedos'),
        statCama: document.getElementById('stat-cama'),
        statLimpeza: document.getElementById('stat-limpeza'),
    };

    async function fetchDashboardData(periodo = 'mes') {
        const token = session.access_token;
        ui.boasVindas.textContent = 'Atualizando dados...';
        try {
            const response = await fetch(`/api/dashboard?periodo=${periodo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error("❌ Falha ao buscar dados do dashboard:", error);
            ui.boasVindas.textContent = "Erro ao carregar dados.";
            return null;
        }
    }
    
    function updateUI(data) {
        if (!data) return;

        const { kpis = {}, totaisPorCategoria = {}, atividades = [], graficos = {}, boasVindas = 'Instituição' } = data;

        ui.boasVindas.textContent = `Bem-vinda, ${boasVindas}!`;
        // KPI agora usa o total de itens em ESTOQUE
        ui.kpiItens.textContent = (kpis.totalItensEstoque || 0).toLocaleString('pt-BR');
        ui.kpiFinanceiro.textContent = (kpis.totalFinanceiro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        ui.kpiDoadores.textContent = kpis.doadoresUnicos || 0;
        ui.kpiCategoria.textContent = kpis.principalCategoria || '--';
        
        // Os cards de totais agora mostram o ESTOQUE ATUAL
        ui.statAlimentos.textContent = totaisPorCategoria['Alimentos']?.toLocaleString('pt-BR') || '0';
        ui.statRoupas.textContent = totaisPorCategoria['Roupas']?.toLocaleString('pt-BR') || '0';
        ui.statHigiene.textContent = totaisPorCategoria['Produtos de Higiene']?.toLocaleString('pt-BR') || '0';
        ui.statMoveis.textContent = totaisPorCategoria['Móveis']?.toLocaleString('pt-BR') || '0';
        ui.statBrinquedos.textContent = totaisPorCategoria['Brinquedos e Livros']?.toLocaleString('pt-BR') || '0';
        ui.statCama.textContent = totaisPorCategoria['Cobertores']?.toLocaleString('pt-BR') || '0'; // Assumindo o nome da categoria
        ui.statLimpeza.textContent = totaisPorCategoria['Produtos de Limpeza']?.toLocaleString('pt-BR') || '0';

        // Atualiza a lista de atividades recentes para mostrar entradas e saídas
        if (atividades.length > 0) {
            ui.atividadesRecentes.innerHTML = atividades.map(item => `
                <div class="atividade-item">
                    <i class="bi ${item.tipo === 'entrada' ? 'bi-box-arrow-in' : 'bi-box-arrow-out'} atividade-icon" style="color: ${item.tipo === 'entrada' ? '#28a745' : '#dc3545'};"></i>
                    <div class="atividade-texto">${item.descricao}</div>
                </div>
            `).join('');
        } else {
            ui.atividadesRecentes.innerHTML = `<p class="text-muted">Nenhuma atividade recente no período.</p>`;
        }
        
        originalChartData = graficos; // Salva os dados dos DOIS gráficos
        popularFiltroGrafico(); // Popula o filtro com as categorias disponíveis
        updateChart(); // Renderiza o gráfico inicial (estoque)
    }

    // Popula o <select> com as categorias do gráfico de estoque
    function popularFiltroGrafico() {
        if (!originalChartData || !originalChartData.estoqueAtual) return;
        
        const { labels } = originalChartData.estoqueAtual;
        const valorAtual = ui.filtroGrafico.value;
        
        ui.filtroGrafico.innerHTML = '<option value="todos" selected>Todas as Categorias</option>';
        
        labels.forEach(label => {
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            ui.filtroGrafico.appendChild(option);
        });
        
        // Mantém a seleção anterior se ela ainda existir
        if (Array.from(ui.filtroGrafico.options).some(opt => opt.value === valorAtual)) {
            ui.filtroGrafico.value = valorAtual;
        }
    }

    function updateChart() {
        if (!ui.chartCanvas || !originalChartData) return;
        
        const dataForChart = originalChartData[activeChartView];
        if (!dataForChart) return;

        const categoriaSelecionada = ui.filtroGrafico.value;
        let chartConfig = {};
        
        if (activeChartView === 'estoqueAtual') {
            let labels = dataForChart.labels || [];
            let data = dataForChart.data || [];

            // Lógica do filtro de categoria
            if (categoriaSelecionada && categoriaSelecionada !== 'todos') {
                const index = labels.indexOf(categoriaSelecionada);
                labels = (index > -1) ? [labels[index]] : [];
                data = (index > -1) ? [data[index]] : [];
            }
            
            chartConfig = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{ 
                        label: 'Itens em Estoque', 
                        data, 
                        backgroundColor: '#72330f', 
                        borderRadius: 5 
                    }]
                },
                options: {
                    plugins: { legend: { display: false } }, // Sem legenda para gráfico único
                }
            };
            ui.filtroGrafico.style.display = 'block'; // Mostra o filtro
        } else { // activeChartView === 'fluxoDoacoes'
            chartConfig = {
                type: 'bar',
                data: {
                    labels: dataForChart.labels,
                    datasets: [
                        { label: 'Entradas', data: dataForChart.datasets[0].data, backgroundColor: 'rgba(54, 162, 235, 0.8)', borderRadius: 5 },
                        { label: 'Saídas', data: dataForChart.datasets[1].data, backgroundColor: 'rgba(255, 99, 132, 0.8)', borderRadius: 5 }
                    ]
                },
                options: {
                    plugins: { legend: { display: true } }, // Mostra legenda para E x S
                }
            };
            ui.filtroGrafico.style.display = 'none'; // Esconde o filtro de categoria
        }

        if (myChart) myChart.destroy();
        
        myChart = new Chart(ui.chartCanvas, {
            ...chartConfig,
            options: {
                ...chartConfig.options,
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    y: { beginAtZero: true },
                    x: {}
                }
            }
        });
    }

    // Eventos para os botões de toggle do gráfico
    ui.btnChartEstoque.addEventListener('click', () => {
        activeChartView = 'estoqueAtual';
        ui.btnChartEstoque.classList.add('active');
        ui.btnChartFluxo.classList.remove('active');
        updateChart();
    });

    ui.btnChartFluxo.addEventListener('click', () => {
        activeChartView = 'fluxoDoacoes';
        ui.btnChartFluxo.classList.add('active');
        ui.btnChartEstoque.classList.remove('active');
        updateChart();
    });
    
    // Evento para o filtro de categoria
    ui.filtroGrafico.addEventListener('change', updateChart);
    
    // Função global para ser chamada pelos botões de período
    window.filtrarPeriodo = async (periodo) => {
        document.querySelectorAll('.btn-date-filter').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.btn-date-filter[onclick*="'${periodo}'"]`).classList.add('active');
        const data = await fetchDashboardData(periodo);
        updateUI(data);
    };

    // Carga inicial
    filtrarPeriodo('mes');
}