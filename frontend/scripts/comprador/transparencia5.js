import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Garante que o script seja um módulo
    if (!document.querySelector('script[src="/scripts/comprador/transparencia5.js"][type="module"]')) {
        const scriptTag = document.querySelector('script[src="/scripts/comprador/transparencia5.js"]');
        if (scriptTag) scriptTag.type = 'module';
    }

    const ui = {
        form: document.getElementById('categoryForm'),
        tableBody: document.getElementById('budgetTableBody'),
        originChartCanvas: document.getElementById('originChart').getContext('2d'),
        destinationChartCanvas: document.getElementById('destinationChart').getContext('2d'),
    };

    let originChart = null;
    let destinationChart = null;
    let allFinancialData = [];

    const chartColors = ['#72330f', '#e2ccae', '#3d2106', '#EADBC8', '#694E4E'];

    const updateCharts = () => {
        const originData = allFinancialData.reduce((acc, item) => {
            acc[item.origem_recurso] = (acc[item.origem_recurso] || 0) + parseFloat(item.orcamento_previsto);
            return acc;
        }, {});

        if (originChart) originChart.destroy();
        originChart = new Chart(ui.originChartCanvas, {
            type: 'pie',
            data: {
                labels: Object.keys(originData),
                datasets: [{ data: Object.values(originData), backgroundColor: chartColors, borderColor: '#fff', borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        const destinationData = allFinancialData.reduce((acc, item) => {
            acc[item.nome_categoria] = (acc[item.nome_categoria] || 0) + parseFloat(item.valor_executado);
            return acc;
        }, {});
        
        if (destinationChart) destinationChart.destroy();
        destinationChart = new Chart(ui.destinationChartCanvas, {
            type: 'bar',
            data: {
                labels: Object.keys(destinationData),
                datasets: [{ label: 'Valor Executado (R$)', data: Object.values(destinationData), backgroundColor: chartColors[0], borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
        });
    };
    
    const formatCurrency = (value) => `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Objeto com as opções de status para o <select>
    const statusOptions = {
        'Planejado': 'Planejado',
        'Pendente': 'Pendente',
        'Executado': 'Executado'
    };

    const renderTable = () => {
        ui.tableBody.innerHTML = '';
        if (allFinancialData.length === 0) {
            ui.tableBody.innerHTML = `<tr><td colspan="7" class="no-data1">Nenhuma categoria adicionada para este ano.</td></tr>`;
            return;
        }

        allFinancialData.forEach(item => {
            const orcamento = parseFloat(item.orcamento_previsto);
            const executado = parseFloat(item.valor_executado);
            const percentual = orcamento > 0 ? ((executado / orcamento) * 100).toFixed(1) : '0.0';
            
            // Gera as opções de status para o dropdown
            let optionsHTML = '';
            for (const [value, text] of Object.entries(statusOptions)) {
                const isSelected = value === item.status ? 'selected' : '';
                optionsHTML += `<option value="${value}" ${isSelected}>${text}</option>`;
            }

            const row = document.createElement('tr');
            row.dataset.id = item.id;
            row.innerHTML = `
                <td class="category1">${item.nome_categoria}</td>
                <td>${item.origem_recurso}</td>
                <td>${formatCurrency(orcamento)}</td>
                <td class="valor-executado-cell">${formatCurrency(executado)}</td>
                <td class="percentual-cell">${percentual}%</td>
                <td>
                    <select class="form-control1 status-select-financeiro" data-id="${item.id}">
                        ${optionsHTML}
                    </select>
                </td>
                <td class="actions-cell1">
                    <button class="editinho1" data-id="${item.id}">Editar Valor</button>
                </td>
            `;
            ui.tableBody.appendChild(row);
        });
    };

    const loadFinancialData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const response = await fetch('/api/financeiro', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar dados financeiros.');
            allFinancialData = await response.json();
            renderTable();
            updateCharts();
        } catch (error) { console.error(error); }
    };

    const addCategory = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newCategory = Object.fromEntries(formData.entries());
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch('/api/financeiro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(newCategory),
            });
            if (!response.ok) throw new Error('Erro ao adicionar categoria.');
            e.target.reset();
            loadFinancialData();
        } catch (error) { console.error(error); }
    };

    const updateExecutedValue = async (id, newValue) => {
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch(`/api/financeiro/${id}/valor-executado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ valor_executado: newValue })
            });
            if (!response.ok) throw new Error('Falha ao atualizar valor.');
            const updatedItem = await response.json();
            const itemIndex = allFinancialData.findIndex(item => item.id == id);
            if (itemIndex > -1) allFinancialData[itemIndex] = updatedItem.data;
            updateRowInTable(id);
            updateCharts();
        } catch (error) { console.error(error); }
    };

    // NOVA FUNÇÃO para atualizar o status
    const updateStatus = async (id, newStatus) => {
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch(`/api/financeiro/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ status: newStatus })
            });
             if (!response.ok) throw new Error('Falha ao atualizar status.');
            
            // Atualiza o dado localmente e recarrega os gráficos
            const itemIndex = allFinancialData.findIndex(item => item.id == id);
            if (itemIndex > -1) allFinancialData[itemIndex].status = newStatus;
            updateCharts();
        } catch (error) {
            console.error(error);
            loadFinancialData(); // Recarrega tudo em caso de erro
        }
    };
    
    const updateRowInTable = (id) => {
        const row = ui.tableBody.querySelector(`tr[data-id='${id}']`);
        const item = allFinancialData.find(d => d.id == id);
        if (!row || !item) return;
        const orcamento = parseFloat(item.orcamento_previsto);
        const executado = parseFloat(item.valor_executado);
        const percentual = orcamento > 0 ? ((executado / orcamento) * 100).toFixed(1) : '0.0';
        row.querySelector('.valor-executado-cell').textContent = formatCurrency(executado);
        row.querySelector('.percentual-cell').textContent = `${percentual}%`;
    };

    const handleEditClick = (e) => {
        const button = e.target.closest('.editinho1');
        if (!button) return;
        const id = button.dataset.id;
        const row = button.closest('tr');
        const cell = row.querySelector('.valor-executado-cell');
        const currentTextValue = cell.textContent;
        const currentValue = parseFloat(currentTextValue.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        cell.innerHTML = `<input type="number" class="form-control1" value="${currentValue}" step="0.01" min="0">`;
        const input = cell.querySelector('input');
        input.focus();
        input.select();
        const saveChanges = () => {
            const newValue = input.value;
            cell.innerHTML = formatCurrency(newValue);
            updateExecutedValue(id, newValue);
        };
        input.addEventListener('blur', saveChanges);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            else if (e.key === 'Escape') cell.innerHTML = currentTextValue;
        });
    };

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', addCategory);
    ui.tableBody.addEventListener('click', handleEditClick);
    
    // NOVO EVENT LISTENER para a mudança de status
    ui.tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select-financeiro')) {
            const id = e.target.dataset.id;
            const newStatus = e.target.value;
            updateStatus(id, newStatus);
        }
    });

    loadFinancialData();
});