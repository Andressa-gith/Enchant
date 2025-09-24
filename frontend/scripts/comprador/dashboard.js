// ATENÇÃO: O caminho do import assume que o dashboard está em /scripts/comprador/
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

// --- FUNÇÃO PRINCIPAL QUE MONTA O DASHBOARD COMPLETO ---
function initializeApp(session) {
    document.body.classList.add('dashboard-inicializado');

    let myChart = null;
    let originalChartData = null; // << NOVO: Guarda os dados originais do gráfico para o filtro

    // Mapeamento de todos os IDs do seu HTML (seu código, já correto)
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
        statLimpeza: document.getElementById('stat-limpeza'),
        filtroGrafico: document.getElementById('filtro-grafico-categoria'),
    };

    // Função para buscar TODOS os dados no back-end (seu código, já correto)
    async function fetchDashboardData(periodo = 'mes') {
        const token = session.access_token;
        ui.boasVindas.textContent = 'Atualizando...';
        try {
            const response = await fetch(`/api/dashboard?periodo=${periodo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro na API: ${response.status}. Resposta: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error("❌ Falha ao buscar ou processar dados do dashboard:", error);
            ui.boasVindas.textContent = "Erro ao carregar dados. Verifique o console (F12).";
            return null;
        }
    }
    
    // Função para PREENCHER A PÁGINA INTEIRA com os dados recebidos
    function updateUI(data) {
        if (!data) return;

        const { kpis = {}, totaisPorCategoria = {}, atividades = [], grafico = {}, boasVindas = 'Instituição' } = data;

        // Preenche os dados (seu código, já correto)
        ui.boasVindas.textContent = `Bem-vinda, ${boasVindas}!`;
        ui.kpiItens.textContent = (kpis.totalItensRecebidos || 0).toLocaleString('pt-BR');
        ui.kpiFinanceiro.textContent = (kpis.totalFinanceiro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        ui.kpiDoadores.textContent = kpis.doadoresUnicos || 0;
        ui.kpiCategoria.textContent = kpis.principalCategoria || '--';
        ui.statAlimentos.textContent = totaisPorCategoria['Alimentos'] || '0';
        ui.statRoupas.textContent = totaisPorCategoria['Roupas'] || '0';
        ui.statHigiene.textContent = totaisPorCategoria['Produtos de Higiene'] || '0';
        ui.statMoveis.textContent = totaisPorCategoria['Móveis'] || '0';
        ui.statBrinquedos.textContent = totaisPorCategoria['Brinquedos e Livros'] || '0';
        ui.statCama.textContent = totaisPorCategoria['Cobertores'] || '0';
        ui.statLimpeza.textContent = totaisPorCategoria['Produtos de Limpeza'] || '0';
        
        if (atividades.length > 0) {
            ui.atividadesRecentes.innerHTML = atividades.map(item => `
                <div class="atividade-item">
                    <span>${item.descricao} de <strong>${item.doador}</strong></span>
                </div>`).join('');
        } else {
            ui.atividadesRecentes.innerHTML = `<p class="text-muted">Nenhuma atividade recente no período.</p>`;
        }
        
        // << NOVO: Guarda os dados e prepara o gráfico e o filtro >>
        originalChartData = grafico;
        popularFiltroGrafico(); // Popula o menu de seleção
        updateChart();        // Desenha o gráfico com base na seleção atual
    }

    // << NOVA FUNÇÃO: Popula o filtro de categorias dinamicamente >>
    function popularFiltroGrafico() {
        if (!originalChartData || !originalChartData.labels) return;

        const valorAtual = ui.filtroGrafico.value;
        ui.filtroGrafico.innerHTML = '<option value="todos">Todas as Categorias</option>'; // Opção padrão

        originalChartData.labels.forEach(label => {
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            ui.filtroGrafico.appendChild(option);
        });

        // Tenta manter a seleção do usuário se ela ainda for válida
        if (Array.from(ui.filtroGrafico.options).some(opt => opt.value === valorAtual)) {
            ui.filtroGrafico.value = valorAtual;
        }
    }

    // << FUNÇÃO ATUALIZADA: Agora ela lê o filtro para desenhar o gráfico >>
    function updateChart() {
        if (!ui.chartCanvas || !originalChartData) return;
        
        const categoriaSelecionada = ui.filtroGrafico.value;
        
        let labelsFiltrados = originalChartData.labels || [];
        let dataFiltrada = originalChartData.data || [];

        // Filtra os dados se uma categoria específica for selecionada
        if (categoriaSelecionada && categoriaSelecionada !== 'todos') {
            const index = originalChartData.labels.indexOf(categoriaSelecionada);
            if (index > -1) {
                labelsFiltrados = [originalChartData.labels[index]];
                dataFiltrada = [originalChartData.data[index]];
            } else { // Se não encontrar, mostra o gráfico vazio
                labelsFiltrados = [];
                dataFiltrada = [];
            }
        }

        if (myChart) myChart.destroy();
        
        myChart = new Chart(ui.chartCanvas, {
            type: 'bar',
            data: {
                labels: labelsFiltrados,
                datasets: [{
                    label: 'Quantidade Recebida',
                    data: dataFiltrada,
                    backgroundColor: '#72330f',
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Deixa a função de filtro de PERÍODO acessível para os botões no HTML
    window.filtrarPeriodo = async (periodo) => {
        document.querySelectorAll('.btn-date-filter').forEach(btn => btn.classList.remove('active'));
        const button = document.querySelector(`.btn-date-filter[onclick*="'${periodo}'"]`);
        if (button) button.classList.add('active');
        
        const data = await fetchDashboardData(periodo);
        updateUI(data); // A função updateUI já vai cuidar de redesenhar tudo
    };

    // << ADICIONADO: Event listener para o filtro do gráfico >>
    ui.filtroGrafico.addEventListener('change', updateChart);

    // Carga inicial dos dados
    filtrarPeriodo('mes');
}