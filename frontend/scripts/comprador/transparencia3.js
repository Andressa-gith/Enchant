import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento de UI final, sem os elementos de descrição
    const ui = {
        form: document.getElementById('audits-form'),
        titleInput: document.getElementById('audit-title'),
        dateInput: document.getElementById('audit-date'),
        typeSelect: document.getElementById('audit-type'),
        statusSelect: document.getElementById('audit-status'),
        fileInput: document.getElementById('audit-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        submitBtn: document.querySelector('.upload-btn'),
        auditsList: document.getElementById('audits-list'),
        successMessage: document.getElementById('success-audits'),
        alertMessage: document.getElementById('alert-audits'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };

    let selectedFile = null;
    let auditIdToDelete = null;

    // Funções de controle de UI (loading, lista vazia, etc.)
    const showLoader = (isLoading) => { ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showAuditsGrid = (shouldShow) => { ui.auditsList.style.display = shouldShow ? 'grid' : 'none'; };

    // --- LÓGICA DE VALIDAÇÃO (adaptada para Auditorias) ---
    const validateField = (input, condition, errorMsg, errorElementId) => {
        const errorElement = document.getElementById(errorElementId);
        if (condition) {
            input.classList.remove('error');
            errorElement.style.display = 'none';
            return true;
        } else {
            input.classList.add('error');
            errorElement.textContent = errorMsg;
            errorElement.style.display = 'block';
            return false;
        }
    };
    
    const validateDate = () => {
        const inputDate = new Date(ui.dateInput.value);
        const today = new Date();
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(today.getFullYear() - 5);
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        fiveYearsAgo.setHours(0, 0, 0, 0);
        const isValid = ui.dateInput.value !== '' && inputDate <= today && inputDate >= fiveYearsAgo;
        return validateField(ui.dateInput, isValid, 'A data deve ser válida, não futura e de no máximo 5 anos atrás.', 'audit-date-error');
    };

    const validateForm = () => {
        return [
            validateField(ui.titleInput, ui.titleInput.value.length >= 10, 'O título deve ter no mínimo 10 caracteres.', 'audit-title-error'),
            validateDate(),
            validateField(ui.typeSelect, ui.typeSelect.value !== '', 'Por favor, selecione um tipo.', 'audit-type-error'),
            validateField(ui.statusSelect, ui.statusSelect.value !== '', 'Por favor, selecione um status.', 'audit-status-error'),
            validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.', 'audit-file-error')
        ].every(isValid => isValid);
    };

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        if (!file) return;
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 20 * 1024 * 1024; // 20MB
        const fileUploadText = ui.fileUploadArea.querySelector('p');
        const fileNameDisplay = ui.fileUploadArea.querySelector('small');

        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF ou DOC.', 'audit-file-error');
            selectedFile = null; return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'O arquivo é muito grande (máximo 20MB).', 'audit-file-error');
            selectedFile = null; return;
        }
        selectedFile = file;
        fileUploadText.textContent = `Arquivo selecionado:`;
        fileNameDisplay.textContent = file.name;
        validateField(ui.fileUploadArea, true, '', 'audit-file-error');
    };
    
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    // --- FUNÇÕES DE API ---
    const loadAudits = async () => {
        showLoader(true); showAuditsGrid(false); showEmptyState(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado.');
            const response = await fetch('/api/auditorias', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar auditorias.');
            const audits = await response.json();
            renderAudits(audits);
        } catch (error) {
            showAlert(error.message || 'Erro ao carregar auditorias.');
            showEmptyState(true);
        } finally {
            showLoader(false);
        }
    };
    
    const submitForm = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        ui.submitBtn.disabled = true; ui.submitBtn.textContent = 'Enviando...';
        const formData = new FormData();
        formData.append('titulo', ui.titleInput.value);
        formData.append('data_auditoria', ui.dateInput.value);
        formData.append('tipo', ui.typeSelect.value);
        formData.append('status', ui.statusSelect.value);
        formData.append('arquivo_auditoria', selectedFile);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch('/api/auditorias', { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao enviar.');
            showSuccess('Auditoria adicionada com sucesso!');
            ui.form.reset(); selectedFile = null;
            ui.fileUploadArea.querySelector('p').textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            ui.fileUploadArea.querySelector('small').textContent = 'PDF, DOC aceitos (máximo 20MB)';
            loadAudits();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false; ui.submitBtn.textContent = 'Adicionar auditoria';
        }
    };

    const deleteAudit = async (auditId) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/auditorias/${auditId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao deletar.');
            showSuccess('Auditoria excluída com sucesso!');
            loadAudits();
        } catch (error) {
            showAlert(error.message);
        }
    };

    const updateStatusInAPI = async (id, newStatus) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/auditorias/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao atualizar status.');
            showSuccess('Status atualizado com sucesso!');
        } catch (error) {
            showAlert(error.message);
            loadAudits();
        }
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    const showAlert = (message) => { ui.alertMessage.textContent = message; ui.alertMessage.style.display = 'block'; setTimeout(() => ui.alertMessage.style.display = 'none', 5000); };
    const showSuccess = (message) => { ui.successMessage.textContent = message; ui.successMessage.style.display = 'block'; setTimeout(() => ui.successMessage.style.display = 'none', 4000); };
    
    const renderAudits = (audits) => {
        ui.auditsList.innerHTML = '';
        if (audits.length === 0) {
            showEmptyState(true); showAuditsGrid(false); return;
        }
        showEmptyState(false); showAuditsGrid(true);
        const statusOptions = { 'Aprovado': 'Aprovado', 'Em andamento': 'Em andamento', 'Rejeitado': 'Rejeitado', 'Em revisão': 'Em revisão' };
        
        audits.forEach(audit => {
            const date = new Date(audit.data_auditoria).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            let optionsHTML = '';
            for (const [value, text] of Object.entries(statusOptions)) {
                optionsHTML += `<option value="${value}" ${value === audit.status ? 'selected' : ''}>${text}</option>`;
            }
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-content">
                    <h3>${audit.titulo}</h3>
                    <div class="card-meta">
                        <span>Data: <strong>${date}</strong></span>
                        <div class="audit-status-wrapper">
                            <label for="status-select-${audit.id}" class="status-label">Status:</label>
                            <select id="status-select-${audit.id}" class="status-select" data-id="${audit.id}">${optionsHTML}</select>
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="download-btn" data-path="${audit.caminho_arquivo}">
                        <i class="bi bi-download"></i> Baixar
                    </button>
                    <button class="delete-btn" data-id="${audit.id}">
                        <i class="bi bi-trash-fill"></i> Excluir
                    </button>
                </div>
            `;
            ui.auditsList.appendChild(card);
        });
    };

    // --- EVENT LISTENERS ---
    ui.auditsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            try {
                const { data, error } = await supabase.storage.from('audit').download(filePath);
                if (error) throw error;
                const url = URL.createObjectURL(data);
                const a = document.createElement('a');
                a.href = url;
                a.download = filePath.split(/-(.+)/)[1] || filePath;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch(error) { showAlert('Erro ao baixar o arquivo.'); }
        }
        
        if (deleteBtn) {
            auditIdToDelete = deleteBtn.dataset.id;
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteModal'));
            modal.show();
        }
    });

    ui.auditsList.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            updateStatusInAPI(e.target.dataset.id, e.target.value);
        }
    });

    ui.confirmDeleteBtn.addEventListener('click', () => {
        if (auditIdToDelete) {
            deleteAudit(auditIdToDelete);
            auditIdToDelete = null;
            bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
        }
    });

    ui.form.addEventListener('submit', submitForm);
    loadAudits();
});