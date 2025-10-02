import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO COMPLETO DA UI ---
    const ui = {
        form: document.getElementById('partnershipForm'),
        partnerNameInput: document.getElementById('partnerName'),
        partnershipValueInput: document.getElementById('partnershipValue'),
        startDateInput: document.getElementById('startDate'),
        endDateInput: document.getElementById('endDate'),
        partnerTypeSelect: document.getElementById('partnerType'),
        statusSelect: document.getElementById('status'),
        objectiveTextarea: document.getElementById('objective'),
        submitBtn: document.querySelector('#partnershipForm .um'),
        totalValueCard: document.getElementById('totalValue'),
        totalPartnershipsCard: document.getElementById('totalPartnerships'),
        activePartnershipsCard: document.getElementById('activePartnerships'),
        partnershipsList: document.getElementById('partners-list'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('editPartnershipForm'),
        editPartnerIdInput: document.getElementById('editPartnerId'),
        editPartnerNameInput: document.getElementById('editPartnerName'),
        editPartnershipValueInput: document.getElementById('editPartnershipValue'),
        editStartDateInput: document.getElementById('editStartDate'),
        editEndDateInput: document.getElementById('editEndDate'),
        editPartnerTypeSelect: document.getElementById('editPartnerType'),
        editStatusSelect: document.getElementById('editStatus'),
        editObjectiveTextarea: document.getElementById('editObjective'),
        saveEditBtn: document.getElementById('saveEditBtn'),
    };

    let allPartnerships = [];

    // --- FUNÇÕES DE CONTROLE DE UI ---
    const showAlert = (message, isError = true) => {
        const el = isError ? ui.alertMessage : ui.successMessage;
        if (el) { el.textContent = message; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 5000); }
    };
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indefinida';
    const formatDateForInput = (dateString) => dateString ? dateString.split('T')[0] : '';
    const showLoader = (isLoading) => { if (ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if (ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showList = (shouldShow) => { if (ui.partnershipsList) ui.partnershipsList.style.display = shouldShow ? 'grid' : 'none'; };

    // --- LÓGICA DE VALIDAÇÃO ---
    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group').querySelector('.error-message');
        if (condition) {
            input.classList.remove('error');
            if (errorElement) errorElement.style.display = 'none';
            return true;
        } else {
            input.classList.add('error');
            if (errorElement) { errorElement.textContent = errorMsg; errorElement.style.display = 'block'; }
            return false;
        }
    };

    const validateForm = (isEdit = false) => {
        const elements = {
            name: isEdit ? ui.editPartnerNameInput : ui.partnerNameInput,
            value: isEdit ? ui.editPartnershipValueInput : ui.partnershipValueInput,
            start: isEdit ? ui.editStartDateInput : ui.startDateInput,
            end: isEdit ? ui.editEndDateInput : ui.endDateInput,
            type: isEdit ? ui.editPartnerTypeSelect : ui.partnerTypeSelect,
            status: isEdit ? ui.editStatusSelect : ui.statusSelect,
            objective: isEdit ? ui.editObjectiveTextarea : ui.objectiveTextarea
        };
    
        const errors = [];
    
        const nameIsValid = validateField(elements.name, elements.name.value.trim().length >= 5, 'O nome deve ter no mínimo 5 caracteres.');
        const valueIsValid = validateField(elements.value, elements.value.value !== '' && parseFloat(elements.value.value) >= 0, 'O valor é obrigatório.');
        const startIsValid = validateField(elements.start, elements.start.value !== '', 'A data de início é obrigatória.');
        const endIsValid = validateField(elements.end, !elements.start.value || !elements.end.value || new Date(elements.end.value) >= new Date(elements.start.value), 'A data de término deve ser igual ou após a data de início.');
        // CONDIÇÃO CORRIGIDA PARA OS SELECTS
        const typeIsValid = validateField(elements.type, elements.type.value !== 'Selecione...' && elements.type.value !== '', 'O tipo de parceiro é obrigatório.');
        const statusIsValid = validateField(elements.status, elements.status.value !== 'Selecione...' && elements.status.value !== '', 'O status é obrigatório.');
        const objectiveIsValid = validateField(elements.objective, elements.objective.value.trim().length >= 10, 'O objetivo deve ter no mínimo 10 caracteres.');
    
        if (!nameIsValid) errors.push('Nome');
        if (!valueIsValid) errors.push('Valor');
        if (!startIsValid) errors.push('Data de Início');
        if (!endIsValid) errors.push('Data de Término');
        if (!typeIsValid) errors.push('Tipo de Parceiro');
        if (!statusIsValid) errors.push('Status');
        if (!objectiveIsValid) errors.push('Objetivo');
        
        return { 
            isValid: errors.length === 0, 
            errors: [...new Set(errors)] 
        };
    };

    const setupRealTimeValidation = () => {
        ui.partnerNameInput.addEventListener('blur', () => validateField(ui.partnerNameInput, ui.partnerNameInput.value.trim().length >= 5, 'O nome deve ter no mínimo 5 caracteres.'));
        ui.partnershipValueInput.addEventListener('blur', () => validateField(ui.partnershipValueInput, ui.partnershipValueInput.value !== '' && parseFloat(ui.partnershipValueInput.value) >= 0, 'O valor é obrigatório.'));
        ui.objectiveTextarea.addEventListener('blur', () => validateField(ui.objectiveTextarea, ui.objectiveTextarea.value.trim().length >= 10, 'O objetivo deve ter no mínimo 10 caracteres.'));
        ui.startDateInput.addEventListener('blur', () => validateField(ui.startDateInput, ui.startDateInput.value !== '', 'A data de início é obrigatória.'));
        ui.endDateInput.addEventListener('blur', () => {
            const startDate = ui.startDateInput.value;
            const endDate = ui.endDateInput.value;
            validateField(ui.endDateInput, !startDate || !endDate || new Date(endDate) >= new Date(startDate), 'A data de término deve ser igual ou após a data de início.');
        });
        // CONDIÇÃO CORRIGIDA PARA OS SELECTS
        ui.partnerTypeSelect.addEventListener('change', () => validateField(ui.partnerTypeSelect, ui.partnerTypeSelect.value !== 'Selecione...' && ui.partnerTypeSelect.value !== '', 'O tipo de parceiro é obrigatório.'));
        ui.statusSelect.addEventListener('change', () => validateField(ui.statusSelect, ui.statusSelect.value !== 'Selecione...' && ui.statusSelect.value !== '', 'O status é obrigatório.'));
    };
    
    // --- LÓGICA DE DASHBOARD (KPIs) E RENDERIZAÇÃO ---
    const updateDashboard = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeAndCurrent = allPartnerships.filter(p => {
            const endDate = p.data_fim ? new Date(p.data_fim) : null;
            const isExpired = endDate && endDate < today;
            return p.status === 'Ativo' && !isExpired;
        });

        const totalValue = activeAndCurrent.reduce((sum, p) => sum + parseFloat(p.valor_total_parceria || 0), 0);
        
        ui.totalValueCard.textContent = formatCurrency(totalValue);
        ui.totalPartnershipsCard.textContent = allPartnerships.length;
        ui.activePartnershipsCard.textContent = activeAndCurrent.length;
    };

    const renderPartnerships = () => {
        showList(allPartnerships.length > 0);
        showEmptyState(allPartnerships.length === 0);
        ui.partnershipsList.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        allPartnerships.sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio));

        allPartnerships.forEach(partner => {
            const endDate = partner.data_fim ? new Date(partner.data_fim) : null;
            const isExpired = endDate && endDate < today;
            const displayStatus = isExpired ? 'Expirado' : partner.status;
            
            const card = document.createElement('div');
            card.className = 'partnership-card';
            card.innerHTML = `
                <div class="partnership-header">
                    <span class="partnership-name">${partner.nome}</span>
                    <span class="status-badge status-${displayStatus.toLowerCase().replace(/ /g, '-').replace('ç', 'c')}">${displayStatus}</span>
                </div>
                <p class="partnership-objective">${partner.objetivos || 'Sem objetivos definidos.'}</p>
                <div class="partnership-details">
                    <div class="detail-item"><span class="detail-label">Tipo</span><span class="detail-value">${partner.tipo_setor}</span></div>
                    <div class="detail-item"><span class="detail-label">Valor Total</span><span class="detail-value">${formatCurrency(partner.valor_total_parceria)}</span></div>
                    <div class="detail-item"><span class="detail-label">Início</span><span class="detail-value">${formatDate(partner.data_inicio)}</span></div>
                    <div class="detail-item"><span class="detail-label">Fim</span><span class="detail-value">${formatDate(partner.data_fim)}</span></div>
                </div>
                <div class="action-buttons">
                    ${!isExpired ? `<button class="edit-btn" data-id="${partner.id}"><i class="bi bi-pencil-square"></i> Editar</button>` : ''}
                    <button class="delete-btn" data-id="${partner.id}" data-name="${partner.nome}"><i class="bi bi-trash-fill"></i> Excluir</button>
                </div>
            `;
            ui.partnershipsList.appendChild(card);
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

    const loadPartnerships = async () => {
        showLoader(true);
        try {
            allPartnerships = await fetchData('/api/parcerias');
            renderPartnerships();
            updateDashboard();
        } catch (error) {
            showAlert(error.message);
        } finally {
            showLoader(false);
        }
    };

    const addPartnership = async (e) => {
        e.preventDefault();
        const validation = validateForm();
        if (!validation.isValid) {
            showAlert(`Corrija os campos: ${validation.errors.join(', ')}`);
            return;
        }
        
        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Enviando...';
        const formData = new FormData(ui.form);
        const newPartner = Object.fromEntries(formData.entries());

        try {
            const result = await fetchData('/api/parcerias', { method: 'POST', body: JSON.stringify(newPartner) });
            showAlert(result.message, false);
            ui.form.reset();
            loadPartnerships();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar Parceria';
        }
    };

    const saveEdit = async () => {
        const validation = validateForm(true);
        if (!validation.isValid) {
            showAlert(`Corrija os campos: ${validation.errors.join(', ')}`);
            return;
        }
        
        const id = ui.editPartnerIdInput.value;
        const formData = new FormData(ui.editForm);
        const updatedPartner = Object.fromEntries(formData.entries());
        delete updatedPartner.id;

        try {
            const result = await fetchData(`/api/parcerias/${id}`, { method: 'PUT', body: JSON.stringify(updatedPartner) });
            showAlert(result.message, false);
            ui.editModal.hide();
            loadPartnerships();
        } catch (error) {
            showAlert(error.message);
        }
    };

    const deletePartnership = async (id, name) => {
        if (confirm(`Tem certeza que deseja excluir a parceria "${name}"?`)) {
            try {
                const result = await fetchData(`/api/parcerias/${id}`, { method: 'DELETE' });
                showAlert(result.message, false);
                loadPartnerships();
            } catch (error) {
                showAlert(error.message);
            }
        }
    };
    
    const populateEditModal = (item) => {
        ui.editPartnerIdInput.value = item.id;
        ui.editPartnerNameInput.value = item.nome;
        ui.editPartnershipValueInput.value = item.valor_total_parceria;
        ui.editStartDateInput.value = formatDateForInput(item.data_inicio);
        ui.editEndDateInput.value = formatDateForInput(item.data_fim);
        ui.editPartnerTypeSelect.value = item.tipo_setor;
        ui.editStatusSelect.value = item.status;
        ui.editObjectiveTextarea.value = item.objetivos;
        ui.editModal.show();
    };

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', addPartnership);
    ui.saveEditBtn.addEventListener('click', saveEdit);
    ui.partnershipsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const item = allPartnerships.find(p => p.id == id);
            if (item) populateEditModal(item);
        }
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            deletePartnership(id, name);
        }
    });

    // --- INICIALIZAÇÃO ---
    setupRealTimeValidation();
    loadPartnerships();
});