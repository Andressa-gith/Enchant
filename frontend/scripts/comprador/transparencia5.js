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
        // Modal de Edição
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('edit-form'),
        editIdInput: document.getElementById('edit-id'),
        editCategoriaSelect: document.getElementById('edit-categoria'),
        editOrcamentoInput: document.getElementById('edit-orcamentoPrevisto'),
        editExecutadoInput: document.getElementById('edit-valorExecutado'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        // Modal Gerenciador de Anexos
        manageAttachmentsModal: new bootstrap.Modal(document.getElementById('manageAttachmentsModal')),
        manageAttachmentsTitle: document.getElementById('manageAttachmentsTitle'),
        existingAttachmentsList: document.getElementById('existing-attachments-list'),
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
            setTimeout(() => { el.style.display = 'none'; }, 5000);
        }
    };
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // --- LÓGICA DE VALIDAÇÃO (NOVA) ---
    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group1').querySelector('.error-message');
        if (condition) {
            input.classList.remove('error');
            if (errorElement) errorElement.style.display = 'none';
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
        const elements = {
            categoria: isEdit ? ui.editCategoriaSelect : ui.categoriaSelect,
            origem: isEdit ? null : ui.origemRecursoSelect, // origem só existe no form principal
            orcamento: isEdit ? ui.editOrcamentoInput : ui.orcamentoPrevistoInput,
            executado: isEdit ? ui.editExecutadoInput : ui.valorExecutadoInput
        };

        const errors = [];

        // Validação: Categoria
        if (!validateField(elements.categoria, elements.categoria.selectedIndex !== 0, 'A categoria é obrigatória.')) {
            errors.push('Categoria');
        }

        // Validação: Origem do Recurso (apenas no form principal)
        if (!isEdit && elements.origem) {
            if (!validateField(elements.origem, elements.origem.selectedIndex !== 0, 'A origem do recurso é obrigatória.')) {
                errors.push('Origem do Recurso');
            }
        }

        // Validação: Orçamento Previsto
        if (!validateField(elements.orcamento, elements.orcamento.value !== '' && parseFloat(elements.orcamento.value) > 0, 'O orçamento previsto é obrigatório.')) {
            errors.push('Orçamento Previsto');
        }

        // Validação: Valor Executado (obrigatório e deve ser >= 0)
        if (!validateField(elements.executado, elements.executado.value !== '' && parseFloat(elements.executado.value) >= 0, 'O valor executado é obrigatório.')) {
            errors.push('Valor Executado');
        }

        return { 
            isValid: errors.length === 0, 
            errors: [...new Set(errors)] 
        };
    };

    const setupRealTimeValidation = () => {
        // Validação em tempo real para o formulário principal
        ui.categoriaSelect.addEventListener('blur', () => 
            validateField(ui.categoriaSelect, ui.categoriaSelect.selectedIndex !== 0, 'A categoria é obrigatória.')
        );
        ui.origemRecursoSelect.addEventListener('blur', () => 
            validateField(ui.origemRecursoSelect, ui.origemRecursoSelect.selectedIndex !== 0, 'A origem do recurso é obrigatória.')
        );
        ui.orcamentoPrevistoInput.addEventListener('blur', () => 
            validateField(ui.orcamentoPrevistoInput, ui.orcamentoPrevistoInput.value !== '' && parseFloat(ui.orcamentoPrevistoInput.value) > 0, 'O orçamento previsto deve ser maior que zero.')
        );
        ui.valorExecutadoInput.addEventListener('blur', () => 
            validateField(ui.valorExecutadoInput, ui.valorExecutadoInput.value !== '' && parseFloat(ui.valorExecutadoInput.value) >= 0, 'O valor executado é obrigatório e deve ser maior ou igual a zero.')
        );

        // Validação em tempo real para o modal de edição
        ui.editCategoriaSelect.addEventListener('blur', () => 
            validateField(ui.editCategoriaSelect, ui.editCategoriaSelect.selectedIndex !== 0, 'A categoria é obrigatória.')
        );
        ui.editOrcamentoInput.addEventListener('blur', () => 
            validateField(ui.editOrcamentoInput, ui.editOrcamentoInput.value !== '' && parseFloat(ui.editOrcamentoInput.value) > 0, 'O orçamento previsto deve ser maior que zero.')
        );
        ui.editExecutadoInput.addEventListener('blur', () => 
            validateField(ui.editExecutadoInput, ui.editExecutadoInput.value !== '' && parseFloat(ui.editExecutadoInput.value) >= 0, 'O valor executado é obrigatório e deve ser maior ou igual a zero.')
        );
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
        try {
            allFinancialData = await fetchData('/api/financeiro');
            renderTable();
            updateCharts();
        } catch (error) {
            showAlert(error.message);
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

    const openManageAttachmentsModal = (item) => {
        ui.manageAttachmentsTitle.textContent = item.nome_categoria;
        ui.attachGestaoId.value = item.id;
        ui.attachValorInput.value = item.valor_executado;
        
        renderExistingAttachments(item.documento_comprobatorio || []);

        ui.attachTituloInput.value = `Comprovante - ${item.nome_categoria}`;
        attachedFile = null;
        ui.attachFileInput.value = '';
        ui.attachFileText.textContent = 'Clique para selecionar o arquivo';
        
        ui.manageAttachmentsModal.show();
    };

    const renderExistingAttachments = (attachments) => {
        if (attachments.length === 0) {
            ui.existingAttachmentsList.innerHTML = '<p class="text-muted">Nenhum comprovante anexado ainda.</p>';
            return;
        }
        ui.existingAttachmentsList.innerHTML = attachments.map(doc => `
            <div class="existing-attachment-item">
                <span title="${doc.titulo}">${doc.titulo}</span>
                <div class="actions">
                    <button class="btn btn-sm btn-outline-secondary view-attachment-btn" data-path="${doc.caminho_arquivo}">Ver</button>
                    <button class="btn btn-sm btn-outline-danger delete-attachment-btn" data-doc-id="${doc.id}"><i class="bi bi-trash3-fill"></i></button>
                </div>
            </div>
        `).join('');
    };

    const handleAddNewAttachment = async () => {
        if (!attachedFile || !ui.attachTituloInput.value) {
            showAlert('Por favor, preencha o título e selecione um arquivo.');
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
            await fetchData('/api/documentos', { method: 'POST', body: formData });
            showAlert('Comprovante anexado com sucesso!', false);
            ui.manageAttachmentsModal.hide();
            loadFinancialData();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.saveAttachmentBtn.disabled = false;
            ui.saveAttachmentBtn.textContent = 'Salvar Novo Anexo';
        }
    };
    
    const handleDeleteAttachment = async (docId) => {
        if (confirm('Tem certeza que deseja excluir este anexo?')) {
            try {
                await fetchData(`/api/documentos/${docId}`, { method: 'DELETE' });
                showAlert('Anexo excluído com sucesso.', false);
                ui.manageAttachmentsModal.hide();
                loadFinancialData();
            } catch (error) {
                showAlert(error.message);
            }
        }
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
        if (!allFinancialData || allFinancialData.length === 0) {
            ui.tableBody.innerHTML = `<tr><td colspan="7" class="no-data1">Nenhuma categoria adicionada ainda.</td></tr>`;
            return;
        }
        allFinancialData.forEach(item => {
            const row = document.createElement('tr');
            const attachments = item.documento_comprobatorio || [];
            const attachmentCount = attachments.length;
            const statusClass = item.status ? item.status.toLowerCase().replace(' ', '-') + '1' : '';
            
            const attachmentButtonHtml = `
                <button class="btn-icon manage-attachments-btn" data-id="${item.id}" title="Gerenciar Anexos">
                    <i class="bi bi-paperclip"></i>
                    ${attachmentCount > 0 ? `<span class="attachment-badge">${attachmentCount}</span>` : ''}
                </button>
            `;
            row.innerHTML = `
                <td>${item.nome_categoria}</td>
                <td>${item.origem_recurso}</td>
                <td>${formatCurrency(item.orcamento_previsto)}</td>
                <td>${formatCurrency(item.valor_executado)}</td>
                <td>${(item.orcamento_previsto > 0 ? (item.valor_executado / item.orcamento_previsto) * 100 : 0).toFixed(1)}%</td>
                <td><span class="status-badge1 status-${statusClass}">${item.status}</span></td>
                <td class="actions-cell1">
                    ${attachmentButtonHtml}
                    <button class="editinho1 edit-btn" data-id="${item.id}" title="Editar">Editar</button>
                    <button class="exclusivo1 delete-btn" data-id="${item.id}" data-category="${item.nome_categoria}" title="Excluir"><i class="bi bi-trash-fill"></i> Excluir</button>
               </td>
            `;
            ui.tableBody.appendChild(row);
        });
    };

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', addLancamento);
    ui.saveEditBtn.addEventListener('click', saveEdit);
    ui.saveAttachmentBtn.addEventListener('click', handleAddNewAttachment);
    ui.attachFileInput.addEventListener('change', (e) => {
        attachedFile = e.target.files[0];
        if (attachedFile) ui.attachFileText.textContent = `Arquivo: ${attachedFile.name}`;
    });

    ui.tableBody.addEventListener('click', (e) => {
        const manageBtn = e.target.closest('.manage-attachments-btn');
        if (manageBtn) {
            const item = allFinancialData.find(d => d.id == manageBtn.dataset.id);
            if (item) openManageAttachmentsModal(item);
        }
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            deleteItem(deleteBtn.dataset.id, deleteBtn.dataset.category);
        }
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const item = allFinancialData.find(d => d.id == editBtn.dataset.id);
            if (item) populateEditModal(item);
        }
    });

    document.getElementById('manageAttachmentsModal').addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-attachment-btn');
        if (viewBtn) {
            const filePath = viewBtn.dataset.path;
            const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
            window.open(data.publicUrl, '_blank');
        }

        const deleteBtn = e.target.closest('.delete-attachment-btn');
        if (deleteBtn) {
            handleDeleteAttachment(deleteBtn.dataset.docId);
        }
    });

    // --- INICIALIZAÇÃO ---
    setupRealTimeValidation();
    loadFinancialData();
});