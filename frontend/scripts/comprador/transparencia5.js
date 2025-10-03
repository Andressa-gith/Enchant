import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO COMPLETO DA UI ---
    const ui = {
        form: document.getElementById('categoryForm'),
        categoriaSelect: document.getElementById('categoria'),
        origemRecursoSelect: document.getElementById('origemRecurso'),
        orcamentoPrevistoInput: document.getElementById('orcamentoPrevisto'),
        valorExecutadoInput: document.getElementById('valorExecutado'),
        submitBtn: document.querySelector('#categoryForm .primeirinho1'),
        tableBody: document.getElementById('budgetTableBody'),
        originChartCanvas: document.getElementById('originChart'),
        destinationChartCanvas: document.getElementById('destinationChart'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        loader: document.getElementById('loader'),
        emptyState: document.querySelector('.no-data1'),
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('edit-form'),
        editIdInput: document.getElementById('edit-id'),
        editCategoriaSelect: document.getElementById('edit-categoria'),
        editOrcamentoInput: document.getElementById('edit-orcamentoPrevisto'),
        editExecutadoInput: document.getElementById('edit-valorExecutado'),
        saveEditBtn: document.getElementById('saveEditBtn'),
    };

    // --- CÓDIGO PARA DESLIGAR O LOADER GLOBAL ---
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);
    
    let allFinancialData = [];
    let originChart, destinationChart;
    const chartColors = ['#8B4513', '#A0522D', '#D2B48C', '#DAA520', '#704010'];

    // --- FUNÇÕES DE CONTROLE DE UI ---
    const showAlert = (message, isError = true) => {
        const el = isError ? ui.alertMessage : ui.successMessage;
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
            setTimeout(() => { el.style.display = 'none'; }, 7000);
        }
    };
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const showLoader = (isLoading) => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = isLoading ? 'block' : 'none';
    };
    
    // --- LÓGICA DE VALIDAÇÃO ---
    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group1').querySelector('.error-message');
        
        input.classList.remove('error');
        if (errorElement) errorElement.style.display = 'none';

        if (condition) {
            return true;
        } else {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errorMsg;
                errorElement.style.display = 'block';
            }
            return false;
        }
    };
    
    const validateForm = (isEdit = false) => {
        const categoria = isEdit ? ui.editCategoriaSelect : ui.categoriaSelect;
        const origem = isEdit ? null : ui.origemRecursoSelect;
        const orcamento = isEdit ? ui.editOrcamentoInput : ui.orcamentoPrevistoInput;
        const executado = isEdit ? ui.editExecutadoInput : ui.valorExecutadoInput; // Adicionado para validação
        const errors = [];
        
        // As chamadas são independentes, então todas serão executadas
        const isCategoriaValid = validateField(categoria, !categoria.querySelector('option[disabled]:checked'), 'A categoria é obrigatória.');
        const isOrigemValid = isEdit ? true : validateField(origem, !origem.querySelector('option[disabled]:checked'), 'A origem do recurso é obrigatória.');
        const isOrcamentoValid = validateField(orcamento, orcamento.value !== '' && parseFloat(orcamento.value) >= 0, 'O orçamento previsto é obrigatório.');
        // VALIDAÇÃO DO VALOR EXECUTADO ADICIONADA AQUI
        const isExecutadoValid = validateField(executado, executado.value !== '' && parseFloat(executado.value) >= 0, 'O valor executado é obrigatório.');

        if (!isCategoriaValid) errors.push('Categoria');
        if (!isOrigemValid) errors.push('Origem do Recurso');
        if (!isOrcamentoValid) errors.push('Orçamento Previsto');
        if (!isExecutadoValid) errors.push('Valor Executado'); // Adicionado à lista de erros
        
        return { 
            isValid: errors.length === 0, 
            errors: [...new Set(errors)] 
        };
    };

    // --- NOVA FUNÇÃO DE VALIDAÇÃO EM TEMPO REAL ---
    const setupRealTimeValidation = () => {
        ui.categoriaSelect.addEventListener('blur', () => {
            validateField(ui.categoriaSelect, !ui.categoriaSelect.querySelector('option[disabled]:checked'), 'A categoria é obrigatória.');
        });
        ui.origemRecursoSelect.addEventListener('blur', () => {
            validateField(ui.origemRecursoSelect, !ui.origemRecursoSelect.querySelector('option[disabled]:checked'), 'A origem do recurso é obrigatória.');
        });
        ui.orcamentoPrevistoInput.addEventListener('blur', () => {
            validateField(ui.orcamentoPrevistoInput, ui.orcamentoPrevistoInput.value !== '' && parseFloat(ui.orcamentoPrevistoInput.value) >= 0, 'O orçamento previsto é obrigatório.');
        });
        ui.valorExecutadoInput.addEventListener('blur', () => {
            validateField(ui.valorExecutadoInput, ui.valorExecutadoInput.value !== '' && parseFloat(ui.valorExecutadoInput.value) >= 0, 'O valor executado é obrigatório.');
        });
    };

    // --- LÓGICA DE GRÁFICOS E TABELA ---
    const updateCharts = () => {
        if (originChart) originChart.destroy();
        if (destinationChart) destinationChart.destroy();
        if (!allFinancialData || allFinancialData.length === 0) return;

        const originData = allFinancialData.reduce((acc, item) => {
            acc[item.origem_recurso] = (acc[item.origem_recurso] || 0) + parseFloat(item.orcamento_previsto);
            return acc;
        }, {});
        originChart = new Chart(ui.originChartCanvas, { type: 'pie', data: { labels: Object.keys(originData), datasets: [{ data: Object.values(originData), backgroundColor: chartColors }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });

        const destinationData = allFinancialData.reduce((acc, item) => {
            acc[item.nome_categoria] = (acc[item.nome_categoria] || 0) + parseFloat(item.valor_executado);
            return acc;
        }, {});
        destinationChart = new Chart(ui.destinationChartCanvas, { type: 'bar', data: { labels: Object.keys(destinationData), datasets: [{ label: 'Valor Executado', data: Object.values(destinationData), backgroundColor: chartColors[0] }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } } });
    };

    const renderTable = () => {
        ui.tableBody.innerHTML = '';
        if (allFinancialData.length === 0) {
            ui.tableBody.innerHTML = `<tr><td colspan="7" class="no-data1">Nenhuma categoria adicionada ainda.</td></tr>`;
            return;
        }

        allFinancialData.forEach(item => {
            const orcamento = parseFloat(item.orcamento_previsto);
            const executado = parseFloat(item.valor_executado);
            const percentual = orcamento > 0 ? ((executado / orcamento) * 100) : 0;
            const statusClass = item.status ? item.status.toLowerCase().replace(' ', '-') + '1' : '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nome_categoria}</td>
                <td>${item.origem_recurso}</td>
                <td>${formatCurrency(orcamento)}</td>
                <td>${formatCurrency(executado)}</td>
                <td>${percentual.toFixed(1)}%</td>
                <td><span class="status-badge1 status-${statusClass}">${item.status}</span></td>
                <td class="actions-cell1">
                    <button class="editinho1 edit-btn" data-id="${item.id}" title="Editar">Editar</button>
                    <button class="exclusivo1 delete-btn" data-id="${item.id}" data-category="${item.nome_categoria}" title="Excluir">Excluir</button>
                </td>
            `;
            ui.tableBody.appendChild(row);
        });
    };
    
    // --- FUNÇÕES DE API (CRUD) ---
    const fetchData = async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada.');
        const headers = { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...options.headers };
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Ocorreu um erro.');
        return result;
    };
    
    const loadFinancialData = async () => {
        showLoader(true);
        try {
            allFinancialData = await fetchData('/api/financeiro');
            renderTable();
            updateCharts();
        } catch (error) {
            showAlert(error.message);
            allFinancialData = [];
            renderTable();
            updateCharts();
        } finally {
            showLoader(false);
        }
    };

    const addLancamento = async (e) => {
        e.preventDefault();
        const validation = validateForm();
        if (!validation.isValid) {
            showAlert(`Por favor, corrija os seguintes campos: ${validation.errors.join(', ')}`);
            return;
        }
        
        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Enviando...';

        const newLancamento = {
            nome_categoria: ui.categoriaSelect.value,
            origem_recurso: ui.origemRecursoSelect.value,
            orcamento_previsto: ui.orcamentoPrevistoInput.value,
            valor_executado: ui.valorExecutadoInput.value || 0,
        };

        try {
            const result = await fetchData('/api/financeiro', { method: 'POST', body: JSON.stringify(newLancamento) });
            showAlert(result.message, false);
            ui.form.reset();
            loadFinancialData();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar';
        }
    };

    const saveEdit = async () => {
        const validation = validateForm(true);
        if (!validation.isValid) {
            showAlert(`Por favor, corrija os seguintes campos: ${validation.errors.join(', ')}`);
            return;
        }
        const id = ui.editIdInput.value;
        const updatedData = {
            nome_categoria: ui.editCategoriaSelect.value,
            orcamento_previsto: ui.editOrcamentoInput.value,
            valor_executado: ui.editExecutadoInput.value || 0
        };
        
        try {
            const result = await fetchData(`/api/financeiro/${id}`, { method: 'PATCH', body: JSON.stringify(updatedData) });
            showAlert(result.message, false);
            ui.editModal.hide();
            loadFinancialData();
        } catch (error) {
            showAlert(error.message);
        }
    };

    const deleteItem = async (id, category) => {
        if (confirm(`Tem certeza que deseja excluir o lançamento "${category}"?`)) {
            try {
                const result = await fetchData(`/api/financeiro/${id}`, { method: 'DELETE' });
                showAlert(result.message, false);
                loadFinancialData();
            } catch (error) {
                showAlert(error.message);
            }
        }
    };
    
    const populateEditModal = (item) => {
        ui.editIdInput.value = item.id;
        ui.editCategoriaSelect.innerHTML = ui.categoriaSelect.innerHTML;
        ui.editCategoriaSelect.value = item.nome_categoria;
        ui.editOrcamentoInput.value = item.orcamento_previsto;
        ui.editExecutadoInput.value = item.valor_executado;
        ui.editModal.show();
    };

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', addLancamento);
    ui.saveEditBtn.addEventListener('click', saveEdit);
    ui.tableBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const category = deleteBtn.dataset.category;
            deleteItem(id, category);
        }
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const item = allFinancialData.find(d => d.id == id);
            if (item) populateEditModal(item);
        }
    });

    // --- INICIALIZAÇÃO ---
    setupRealTimeValidation(); // LIGA A VALIDAÇÃO EM TEMPO REAL
    loadFinancialData();
});