import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento completo dos elementos da UI, sem o statusSelect
    const ui = {
        form: document.getElementById('finance-form'),
        categoriaInput: document.getElementById('categoria'),
        origemRecursoSelect: document.getElementById('origemRecurso'),
        orcamentoPrevistoInput: document.getElementById('orcamentoPrevisto'),
        valorExecutadoInput: document.getElementById('valorExecutado'),
        submitBtn: document.querySelector('#finance-form .upload-btn'),
        tableBody: document.getElementById('budgetTableBody'),
        originChartCanvas: document.getElementById('originChart').getContext('2d'),
        destinationChartCanvas: document.getElementById('destinationChart').getContext('2d'),
        successMessage: document.getElementById('success-financeiro'),
        alertMessage: document.getElementById('alert-financeiro'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('edit-form'),
        editId: document.getElementById('edit-id'),
        editCategoria: document.getElementById('edit-categoria'),
        editOrcamento: document.getElementById('edit-orcamentoPrevisto'),
        editExecutado: document.getElementById('edit-valorExecutado'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        confirmDeleteModal: new bootstrap.Modal(document.getElementById('confirmDeleteModal')),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    };
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);
    let originChart, destinationChart;
    let allFinancialData = [];
    let itemToDeleteId = null;

    const chartColors = ['#4A2B00', '#DAA520', '#A0522D', '#D2B48C', '#8B4513'];
    
    // Funções de controle de UI
    const showLoader = (isLoading) => { ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showTable = (shouldShow) => { ui.tableBody.closest('.table-wrapper').style.display = shouldShow ? 'block' : 'none'; };

    // Lógica dos Gráficos (sem alteração)
    const updateCharts = () => {
        if (originChart) originChart.destroy();
        if (destinationChart) destinationChart.destroy();

        if (!allFinancialData || allFinancialData.length === 0) {
            ui.originChartCanvas.clearRect(0, 0, ui.originChartCanvas.canvas.width, ui.originChartCanvas.canvas.height);
            ui.destinationChartCanvas.clearRect(0, 0, ui.destinationChartCanvas.canvas.width, ui.destinationChartCanvas.canvas.height);
            return;
        }

        const originData = allFinancialData.reduce((acc, item) => {
            acc[item.origem_recurso] = (acc[item.origem_recurso] || 0) + parseFloat(item.orcamento_previsto);
            return acc;
        }, {});
        originChart = new Chart(ui.originChartCanvas, {
            type: 'pie',
            data: { labels: Object.keys(originData), datasets: [{ data: Object.values(originData), backgroundColor: chartColors, borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: {font: { family: 'Lexend Deca' }} } } }
        });

        const destinationData = allFinancialData.reduce((acc, item) => {
            acc[item.nome_categoria] = (acc[item.nome_categoria] || 0) + parseFloat(item.valor_executado);
            return acc;
        }, {});
        destinationChart = new Chart(ui.destinationChartCanvas, {
            type: 'bar',
            data: { labels: Object.keys(destinationData), datasets: [{ label: 'Valor Executado (R$)', data: Object.values(destinationData), backgroundColor: chartColors[0], borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: {font: { family: 'Lexend Deca' }} }, y: { ticks: {font: { family: 'Lexend Deca' }} } } }
        });
    };
    
    // Lógica da Tabela (com alteração no Status)
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const renderTable = () => {
        ui.tableBody.innerHTML = '';
        if (allFinancialData.length === 0) {
            showEmptyState(true);
            showTable(false);
            return;
        }
        showEmptyState(false);
        showTable(true);

        allFinancialData.forEach(item => {
            const orcamento = parseFloat(item.orcamento_previsto);
            const executado = parseFloat(item.valor_executado);
            const percentual = orcamento > 0 ? ((executado / orcamento) * 100).toFixed(1) : '0.0';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nome_categoria}</td>
                <td>${item.origem_recurso}</td>
                <td>${formatCurrency(orcamento)}</td>
                <td>${formatCurrency(executado)}</td>
                <td>${percentual}%</td>
                <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                <td class="actions-cell">
                    <button class="action-btn edit-btn" data-id="${item.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Excluir"><i class="bi bi-trash-fill"></i></button>
                </td>
            `;
            ui.tableBody.appendChild(row);
        });
    };

    // Funções de API (com alteração no addLancamento)
    const loadFinancialData = async () => {
        showLoader(true);
        showTable(false);
        showEmptyState(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado.');
            const response = await fetch('/api/financeiro', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar dados financeiros.');
            allFinancialData = await response.json();
            renderTable();
            updateCharts();
        } catch (error) {
            showAlert(error.message || 'Erro ao carregar os dados.');
            renderTable();
            updateCharts();
        } finally {
            showLoader(false);
        }
    };
    
    const addLancamento = async (e) => {
        e.preventDefault();
        
        const newLancamento = {
            nome_categoria: ui.categoriaInput.value.trim(),
            origem_recurso: ui.origemRecursoSelect.value,
            orcamento_previsto: ui.orcamentoPrevistoInput.value,
            valor_executado: ui.valorExecutadoInput.value || 0,
            // O campo 'status' foi removido daqui
        };

        if (!newLancamento.nome_categoria || !newLancamento.origem_recurso || !newLancamento.orcamento_previsto) {
            showAlert('Todos os campos marcados com * são obrigatórios.');
            return;
        }

        ui.submitBtn.disabled = true;
        ui.submitBtn.innerHTML = 'Enviando...';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch('/api/financeiro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(newLancamento),
            });
            if (!response.ok) throw new Error('Erro ao adicionar lançamento.');
            showSuccess('Lançamento adicionado com sucesso!');
            ui.form.reset();
            loadFinancialData();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.innerHTML = 'Adicionar Lançamento';
        }
    };

    const deleteItem = async (id) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/financeiro/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error('Erro ao excluir lançamento.');
            showSuccess('Lançamento excluído com sucesso!');
            loadFinancialData();
        } catch (error) {
            showAlert(error.message);
        }
    };
    
    const saveEdit = async (id, updatedData) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/financeiro/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) throw new Error('Falha ao salvar alterações.');
            showSuccess('Lançamento atualizado com sucesso!');
            ui.editModal.hide();
            loadFinancialData();
        } catch (error) {
            showAlert(error.message);
        }
    };
    
    const showAlert = (message) => { ui.alertMessage.textContent = message; ui.alertMessage.style.display = 'block'; setTimeout(() => ui.alertMessage.style.display = 'none', 5000); };
    const showSuccess = (message) => { ui.successMessage.textContent = message; ui.successMessage.style.display = 'block'; setTimeout(() => ui.successMessage.style.display = 'none', 4000); };

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', addLancamento);

    ui.saveEditBtn.addEventListener('click', () => {
        const id = ui.editId.value;
        const updatedData = {
            nome_categoria: ui.editCategoria.value.trim(),
            orcamento_previsto: ui.editOrcamento.value,
            valor_executado: ui.editExecutado.value
        };
        if (!updatedData.nome_categoria || !updatedData.orcamento_previsto || !updatedData.valor_executado) {
            showAlert('Todos os campos são obrigatórios na edição.');
            return; 
        }
        saveEdit(id, updatedData);
    });

    ui.tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const item = allFinancialData.find(d => d.id == id);
            if (item) {
                ui.editId.value = item.id;
                ui.editCategoria.value = item.nome_categoria;
                ui.editOrcamento.value = item.orcamento_previsto;
                ui.editExecutado.value = item.valor_executado;
                ui.editModal.show();
            }
        }
        if (deleteBtn) {
            itemToDeleteId = deleteBtn.dataset.id;
            ui.confirmDeleteModal.show();
        }
    });

    ui.confirmDeleteBtn.addEventListener('click', () => {
        if (itemToDeleteId) {
            deleteItem(itemToDeleteId);
            itemToDeleteId = null;
            ui.confirmDeleteModal.hide();
        }
    });

    loadFinancialData();
});