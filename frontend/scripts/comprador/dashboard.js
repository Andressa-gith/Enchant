import supabase from '/scripts/supabaseClient.js';
import { iniciarTutorial } from '/scripts/enchant/tutorial.js';

// Guarda reativo para inicializar a página após a autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => initializeApp(session));
        } else {
            initializeApp(session);
        }
    } else {
        window.location.href = '/entrar';
    }
});

function initializeApp(session) {
    if (document.body.classList.contains('dashboard-inicializado')) return;
    document.body.classList.add('dashboard-inicializado');

    let mainChart = null;
    let stockDoughnutChart = null;
    let originalChartData = null;
    let activeChartView = 'financeiro';

    const ui = {
        boasVindas: document.getElementById('boas-vindas'),
        startDateFilter: document.getElementById('startDateFilter'),
        endDateFilter: document.getElementById('endDateFilter'),
        filterBtn: document.getElementById('filterBtn'),
        resetBtn: document.getElementById('resetBtn'),
        kpiItens: document.getElementById('kpi-total-itens'),
        kpiFinanceiro: document.getElementById('kpi-total-financeiro'),
        kpiDoadores: document.getElementById('kpi-doadores-unicos'),
        kpiCategoria: document.getElementById('kpi-principal-categoria'),
        mainChartCanvas: document.getElementById('mainChart')?.getContext('2d'),
        stockDoughnutChartCanvas: document.getElementById('stockDoughnutChart')?.getContext('2d'),
        chartViewToggle: document.querySelector('.chart-view-toggle'),
        alertsPanel: document.getElementById('alertsPanel'),
        reportsPanel: document.getElementById('reportsPanel'),
        atividadesRecentes: document.getElementById('lista-atividades-recentes'),
        statAlimentos: document.getElementById('stat-alimentos'),
        statRoupas: document.getElementById('stat-roupas'),
        statCalcados: document.getElementById('stat-calcados'),
        statHigiene: document.getElementById('stat-higiene'),
        statLimpeza: document.getElementById('stat-limpeza'),
        statBrinquedos: document.getElementById('stat-brinquedos'),
        statMoveis: document.getElementById('stat-moveis'),
        statEletro: document.getElementById('stat-eletro'),
        statCama: document.getElementById('stat-cama'),
        statRacao: document.getElementById('stat-racao'),
    };

    async function fetchDashboardData(startDate, endDate) {
        const token = session.access_token;
        document.body.style.cursor = 'wait';
        ui.boasVindas.textContent = 'Buscando informações...';
        try {
            const response = await fetch(`/api/dashboard?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error("❌ Falha ao buscar dados do dashboard:", error);
            ui.boasVindas.textContent = "Erro ao carregar dados.";
            return null;
        } finally {
            document.body.style.cursor = 'default';
        }
    }
    
    function updateUI(data) {
        if (!data) return;
        const { kpis = {}, totaisPorCategoria = {}, atividades = [], graficos = {}, boasVindas = 'Instituição', alertas = {}, relatoriosRecentes = [] } = data;
        
        originalChartData = graficos;

        ui.boasVindas.textContent = `Bem-vinda, ${boasVindas}!`;
        ui.kpiItens.textContent = (kpis.totalItensEstoque || 0).toLocaleString('pt-BR');
        ui.kpiFinanceiro.textContent = (kpis.totalFinanceiro || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        ui.kpiDoadores.textContent = kpis.doadoresUnicos || 0;
        ui.kpiCategoria.textContent = kpis.principalCategoria || '--';
        
        ui.statAlimentos.textContent = totaisPorCategoria['Alimentos']?.toLocaleString('pt-BR') || '0';
        ui.statRoupas.textContent = totaisPorCategoria['Roupas']?.toLocaleString('pt-BR') || '0';
        ui.statCalcados.textContent = totaisPorCategoria['Calçados']?.toLocaleString('pt-BR') || '0';
        ui.statHigiene.textContent = totaisPorCategoria['Produtos de Higiene']?.toLocaleString('pt-BR') || '0';
        ui.statLimpeza.textContent = totaisPorCategoria['Produtos de Limpeza']?.toLocaleString('pt-BR') || '0';
        ui.statBrinquedos.textContent = totaisPorCategoria['Brinquedos e Livros']?.toLocaleString('pt-BR') || '0';
        ui.statMoveis.textContent = totaisPorCategoria['Móveis']?.toLocaleString('pt-BR') || '0';
        ui.statEletro.textContent = totaisPorCategoria['Eletrodomésticos']?.toLocaleString('pt-BR') || '0';
        ui.statCama.textContent = totaisPorCategoria['Cobertores']?.toLocaleString('pt-BR') || '0';
        ui.statRacao.textContent = totaisPorCategoria['Ração para Animais']?.toLocaleString('pt-BR') || '0';

        updateMainChart();
        renderStockDoughnut(totaisPorCategoria);
        renderAlerts(alertas, totaisPorCategoria);
        renderReports(relatoriosRecentes);
        renderActivityFeed(atividades);
    }

    function updateMainChart() {
        if (!ui.mainChartCanvas || !originalChartData) return;
        if (mainChart) mainChart.destroy();
    
        let chartConfig = {};
        let dataForChart;
    
        if (activeChartView === 'financeiro') {
            dataForChart = originalChartData.fluxoFinanceiro;
            chartConfig = { type: 'line', data: { labels: dataForChart.labels, datasets: [ { label: 'Receitas', data: dataForChart.datasets[0].data, backgroundColor: 'rgba(40, 167, 69, 0.2)', borderColor: '#28a745', fill: true, tension: 0.3 }, { label: 'Despesas', data: dataForChart.datasets[1].data, backgroundColor: 'rgba(220, 53, 69, 0.2)', borderColor: '#dc3545', fill: true, tension: 0.3 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } };
        } else if (activeChartView === 'fluxo') {
            dataForChart = originalChartData.fluxoDoacoes;
            chartConfig = { type: 'bar', data: { labels: dataForChart.labels, datasets: [ { label: 'Entradas', data: dataForChart.datasets[0].data, backgroundColor: 'rgba(54, 162, 235, 0.8)', borderRadius: 5 }, { label: 'Saídas', data: dataForChart.datasets[1].data, backgroundColor: 'rgba(255, 99, 132, 0.8)', borderRadius: 5 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } };
        } else { // estoque
            dataForChart = originalChartData.estoqueAtual;
            chartConfig = { type: 'bar', data: { labels: dataForChart.labels, datasets: [{ label: 'Itens em Estoque', data: dataForChart.data, backgroundColor: '#72330f', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } } };
        }
        mainChart = new Chart(ui.mainChartCanvas, chartConfig);
    }

    function renderStockDoughnut(data) {
        if (!ui.stockDoughnutChartCanvas) return;
        if (stockDoughnutChart) stockDoughnutChart.destroy();

        const filteredData = Object.fromEntries(Object.entries(data).filter(([_, value]) => value > 0));
        stockDoughnutChart = new Chart(ui.stockDoughnutChartCanvas, {
            type: 'doughnut',
            data: { labels: Object.keys(filteredData), datasets: [{ data: Object.values(filteredData), backgroundColor: ['#72330f', '#9a562d', '#c2794a', '#e99c68', '#f2b58b', '#f8ceae', '#a67b5b', '#4a2b00'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 20 } } } }
        });
    }

    function renderAlerts(alertas, estoque) {
        ui.alertsPanel.innerHTML = '';
        let hasAlerts = false;
        (alertas.parceriasAExpirar || []).forEach(p => { hasAlerts = true; ui.alertsPanel.innerHTML += `<div class="alert-item"><i class="bi bi-calendar-x-fill alert-icon text-warning"></i><div class="alert-text">Parceria com <b>${p.nome}</b> expira em breve.</div></div>`; });
        (alertas.estoqueBaixo || []).forEach(cat => { hasAlerts = true; ui.alertsPanel.innerHTML += `<div class="alert-item"><i class="bi bi-box-seam alert-icon text-danger"></i><div class="alert-text">Estoque de <b>${cat}</b> está baixo (${estoque[cat] || 0}).</div></div>`; });
        if (!hasAlerts) { ui.alertsPanel.innerHTML = `<p class="text-muted small p-2">Nenhum alerta no momento.</p>`; }
    }

    function renderReports(relatorios) {
        ui.reportsPanel.innerHTML = '';
        if (relatorios.length > 0) {
            ui.reportsPanel.innerHTML = relatorios.map(r => {
                const periodo = `${new Date(r.data_inicio_filtro).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${new Date(r.data_fim_filtro).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
                return `<div class="report-item"><i class="bi bi-file-earmark-pdf-fill report-icon"></i><div class="report-text">Relatório de ${periodo}</div><a href="#" data-path="${r.caminho_arquivo_pdf}" class="report-download-btn"><i class="bi bi-download"></i></a></div>`;
            }).join('');
        } else { ui.reportsPanel.innerHTML = `<p class="text-muted small p-2">Nenhum relatório recente.</p>`; }
    }

    function renderActivityFeed(atividades) {
        if (atividades.length > 0) {
            ui.atividadesRecentes.innerHTML = atividades.map(item => {
                // ===== CORREÇÃO DA DATA/HORA =====
                const dataObj = new Date(item.data);
                const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                // ===================================

                let iconClass = 'bi-info-circle';
                if (item.tipo === 'entrada') iconClass = 'bi-box-arrow-in-down text-success';
                if (item.tipo === 'saida') iconClass = 'bi-box-arrow-up text-danger';
                if (item.tipo === 'parceria') iconClass = 'bi-people-fill text-primary';
                if (item.tipo === 'entrada-financeira') iconClass = 'bi-cash-stack text-success';
                if (item.tipo === 'saida-financeira') iconClass = 'bi-credit-card-2-front text-danger';
                
                return `<div class="atividade-item"><i class="bi ${iconClass} atividade-icon"></i><div class="atividade-texto">${item.desc}</div><div class="atividade-data"><span>${dataFormatada}</span><span>${horaFormatada}</span></div></div>`;
            }).join('');
        } else { 
            ui.atividadesRecentes.innerHTML = `<p class="text-muted small p-2">Nenhuma atividade no período.</p>`; 
        }
    }

    async function handleFilter() {
        const startDate = ui.startDateFilter.value;
        const endDate = ui.endDateFilter.value;
        if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) { alert("Por favor, selecione um período de datas válido."); return; }
        const data = await fetchDashboardData(startDate, endDate);
        if (data && data.primeiro_login === true) {
            iniciarTutorial(session);
        }
        updateUI(data);
    }
    
    function setDefaultDates() {
        const hoje = new Date();
        const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        ui.endDateFilter.value = hoje.toISOString().split('T')[0];
        ui.startDateFilter.value = primeiroDiaDoMes.toISOString().split('T')[0];
    }
    
    setDefaultDates();
    ui.filterBtn.addEventListener('click', handleFilter);
    ui.resetBtn.addEventListener('click', () => { setDefaultDates(); handleFilter(); });
    
    ui.chartViewToggle.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('active')) {
            ui.chartViewToggle.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            activeChartView = e.target.dataset.view;
            updateMainChart(); 
        }
    });

    ui.reportsPanel.addEventListener('click', (e) => {
        const downloadBtn = e.target.closest('.report-download-btn');
        if (downloadBtn) {
            e.preventDefault();
            const filePath = downloadBtn.dataset.path;
            const { data } = supabase.storage.from('donation_report').getPublicUrl(filePath);
            if (data && data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else { alert('Não foi possível obter a URL do arquivo.'); }
        }
    });

    handleFilter();
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);
}