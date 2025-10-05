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
        // Modal de Edição
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('edit-form'),
        editIdInput: document.getElementById('edit-id'),
        editCategoriaSelect: document.getElementById('edit-categoria'),
        editOrcamentoInput: document.getElementById('edit-orcamentoPrevisto'),
        editExecutadoInput: document.getElementById('edit-valorExecutado'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        // Modal de Anexo
        attachReceiptModal: new bootstrap.Modal(document.getElementById('attachReceiptModal')),
        attachModalTitle: document.getElementById('attachModalTitle'),
        attachGestaoId: document.getElementById('attach-gestao-id'),
        attachValorInput: document.getElementById('attach-valor'),
        attachTituloInput: document.getElementById('attach-titulo'),
        attachTipoSelect: document.getElementById('attach-tipo'),
        attachFileInput: document.getElementById('attach-file'),
        attachFileText: document.getElementById('attach-file-text'),
        saveAttachmentBtn: document.getElementById('saveAttachmentBtn'),
    };

    setTimeout(() => { window.SiteLoader?.hide(); }, 500);
    
    let allFinancialData = [];
    let originChart, destinationChart;
    let attachedFile = null;
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
        if (ui.loader) ui.loader.style.display = isLoading ? 'block' : 'none';
        const tableWrapper = ui.tableBody.closest('.table-wrapper');
        if(tableWrapper) tableWrapper.style.display = isLoading ? 'none' : 'block';
    };
    
    // --- FUNÇÕES DE API (CRUD) ---
    const fetchData = async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/login';
            throw new Error('Sessão expirada.');
        }

        const headers = { 'Authorization': `Bearer ${session.access_token}`, ...options.headers };
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
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
            
            promptToAttachReceipt(result.data); 

        } catch (error) {
            showAlert(error.message);
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar';
        }
    };

    const saveEdit = async () => {
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

    const promptToAttachReceipt = (lancamento) => {
        if (confirm(`Lançamento "${lancamento.nome_categoria}" salvo com sucesso!\nDeseja anexar um comprovante agora?`)) {
            openAttachModal(lancamento);
        } else {
            loadFinancialData();
        }
    };

    const openAttachModal = (lancamento) => {
        ui.attachModalTitle.textContent = lancamento.nome_categoria;
        ui.attachGestaoId.value = lancamento.id;
        ui.attachTituloInput.value = `Comprovante - ${lancamento.nome_categoria}`;
        ui.attachValorInput.value = lancamento.valor_executado;
        
        attachedFile = null;
        ui.attachFileInput.value = '';
        ui.attachFileText.textContent = 'Clique para selecionar o arquivo';
        
        ui.attachReceiptModal.show();
    };

    const handleSaveAttachment = async () => {
        if (!attachedFile) {
            showAlert('Por favor, selecione um arquivo de comprovante.');
            return;
        }

        const formData = new FormData();
        formData.append('titulo', ui.attachTituloInput.value);
        formData.append('tipo_documento', ui.attachTipoSelect.value);
        formData.append('valor', ui.attachValorInput.value);
        formData.append('arquivo_documento', attachedFile);
        formData.append('gestao_financeira_id', ui.attachGestaoId.value);

        ui.saveAttachmentBtn.disabled = true;
        ui.saveAttachmentBtn.textContent = 'Enviando...';

        try {
            const result = await fetchData('/api/documentos', { method: 'POST', body: formData });
            showAlert('Comprovante anexado com sucesso!', false);
            ui.attachReceiptModal.hide();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.saveAttachmentBtn.disabled = false;
            ui.saveAttachmentBtn.textContent = 'Salvar Anexo';
            loadFinancialData();
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
            
            const hasAttachment = item.documento_comprobatorio && item.documento_comprobatorio.length > 0;
            const attachmentButtonHtml = hasAttachment
                ? `<button class="btn-icon view-attachment-btn" data-path="${item.documento_comprobatorio[0].caminho_arquivo}" title="Ver Comprovante Anexado"><i class="bi bi-paperclip"></i></button>`
                : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nome_categoria}</td>
                <td>${item.origem_recurso}</td>
                <td>${formatCurrency(orcamento)}</td>
                <td>${formatCurrency(executado)}</td>
                <td>${percentual.toFixed(1)}%</td>
                <td><span class="status-badge1 status-${statusClass}">${item.status}</span></td>
                <td class="actions-cell1">
                    ${attachmentButtonHtml}
                    <button class="editinho1 edit-btn" data-id="${item.id}" title="Editar">Editar</button>
                    <button class="exclusivo1 delete-btn" data-id="${item.id}" data-category="${item.nome_categoria}" title="Excluir">Excluir</button>
                </td>
            `;
            ui.tableBody.appendChild(row);
        });
    };

    ui.form.addEventListener('submit', addLancamento);
    ui.saveEditBtn.addEventListener('click', saveEdit);
    ui.saveAttachmentBtn.addEventListener('click', handleSaveAttachment);
    ui.attachFileInput.addEventListener('change', (e) => {
        attachedFile = e.target.files[0];
        if (attachedFile) {
            ui.attachFileText.textContent = `Arquivo: ${attachedFile.name}`;
        }
    });

    ui.tableBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            deleteItem(deleteBtn.dataset.id, deleteBtn.dataset.category);
        }
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const item = allFinancialData.find(d => d.id == editBtn.dataset.id);
            if (item) populateEditModal(item);
        }
        const viewAttachmentBtn = e.target.closest('.view-attachment-btn');
        if (viewAttachmentBtn) {
            const filePath = viewAttachmentBtn.dataset.path;
            try {
                const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
                if (!data || !data.publicUrl) throw new Error('URL pública não encontrada.');
                window.open(data.publicUrl, '_blank');
            } catch (error) {
                showAlert('Não foi possível gerar a URL do comprovante.');
            }
        }
    });

    loadFinancialData();
});