import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO DOS ELEMENTOS DA UI ---
    const ui = {
        form: document.getElementById('audits-form'),
        titleInput: document.getElementById('audit-title'),
        dateInput: document.getElementById('audit-date'),
        typeSelect: document.getElementById('audit-type'),
        statusSelect: document.getElementById('audit-status'),
        fileInput: document.getElementById('audit-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        submitBtn: document.querySelector('#audits-form .upload-btn'),
        auditsList: document.getElementById('audits-list'),
        successMessage: document.getElementById('success-audits'),
        alertMessage: document.getElementById('alert-audits'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };

    let selectedFile = null;

    // --- CÓDIGO PARA DESLIGAR O LOADER GLOBAL ---
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);

    // --- FUNÇÕES DE CONTROLE DE UI ---
    const showLoader = (isLoading) => { if (ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if (ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showAuditsGrid = (shouldShow) => { if (ui.auditsList) ui.auditsList.style.display = shouldShow ? 'grid' : 'none'; };
    const showAlert = (message, isError = true) => {
        const el = isError ? ui.alertMessage : ui.successMessage;
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
            setTimeout(() => el.style.display = 'none', 5000);
        }
    };

    // --- LÓGICA DE VALIDAÇÃO PADRONIZADA ---
    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group, .file-upload').querySelector('.error-message');
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

    const validateDate = () => {
        const inputDate = new Date(ui.dateInput.value);
        const today = new Date();
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(today.getFullYear() - 5);
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        fiveYearsAgo.setHours(0, 0, 0, 0);

        if (ui.dateInput.value === '') return validateField(ui.dateInput, false, 'A data é obrigatória.');
        return validateField(ui.dateInput, inputDate <= today && inputDate >= fiveYearsAgo, 'A data deve ser válida, não futura e de no máximo 5 anos atrás.');
    };
    
    const validateForm = () => {
        const errors = [];
        if (!validateField(ui.titleInput, ui.titleInput.value.trim().length >= 10, 'O título deve ter no mínimo 10 caracteres.')) errors.push('Título');
        if (!validateDate()) errors.push('Data');
        if (!validateField(ui.typeSelect, ui.typeSelect.selectedIndex !== 0, 'Por favor, selecione um tipo.')) errors.push('Tipo');
        if (!validateField(ui.statusSelect, ui.statusSelect.selectedIndex !== 0, 'Por favor, selecione um status.')) errors.push('Status');
        if (!validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.')) errors.push('Arquivo');
        
        return { 
            isValid: errors.length === 0, 
            errors: [...new Set(errors)] 
        };
    };

    const setupRealTimeValidation = () => {
        ui.titleInput.addEventListener('blur', () => validateField(ui.titleInput, ui.titleInput.value.trim().length >= 10, 'O título deve ter no mínimo 10 caracteres.'));
        ui.dateInput.addEventListener('blur', validateDate);
        ui.typeSelect.addEventListener('blur', () => validateField(ui.typeSelect, ui.typeSelect.selectedIndex !== 0, 'Por favor, selecione um tipo.'));
        ui.statusSelect.addEventListener('blur', () => validateField(ui.statusSelect, ui.statusSelect.selectedIndex !== 0, 'Por favor, selecione um status.'));
    };

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        validateField(ui.fileUploadArea, true, '');
        const fileUploadText = ui.fileUploadArea.querySelector('p');
        if (!file) {
            selectedFile = null;
            fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            return;
        }
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 20 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF ou DOC.');
            selectedFile = null; return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'O arquivo é muito grande (máximo 20MB).');
            selectedFile = null; return;
        }
        
        selectedFile = file;
        fileUploadText.textContent = `Arquivo: ${file.name}`;
        validateField(ui.fileUploadArea, true, '');
    };
    
    // --- FUNÇÕES DE API ---
    const fetchData = async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada.');
        const headers = { 'Authorization': `Bearer ${session.access_token}`, ...options.headers };
        if (!(options.body instanceof FormData)) { headers['Content-Type'] = 'application/json'; }
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Ocorreu um erro.');
        return result;
    };

    const loadAudits = async () => {
        showLoader(true); showAuditsGrid(false); showEmptyState(false);
        try {
            const audits = await fetchData('/api/auditorias');
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
        const validation = validateForm();
        if (!validation.isValid) {
            showAlert(`Por favor, corrija os seguintes campos: ${validation.errors.join(', ')}`);
            return;
        }

        ui.submitBtn.disabled = true; ui.submitBtn.textContent = 'Enviando...';
        const formData = new FormData();
        formData.append('titulo', ui.titleInput.value);
        formData.append('data_auditoria', ui.dateInput.value);
        formData.append('tipo', ui.typeSelect.value);
        formData.append('status', ui.statusSelect.value);
        formData.append('arquivo_auditoria', selectedFile);

        try {
            const result = await fetchData('/api/auditorias', { method: 'POST', body: formData });
            showAlert(result.message, false);
            ui.form.reset(); 
            selectedFile = null;
            ui.fileUploadArea.querySelector('p').textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            loadAudits();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false; 
            ui.submitBtn.textContent = 'Adicionar auditoria';
        }
    };

    const deleteAudit = async (auditId, auditTitle) => {
        if (confirm(`Tem certeza que deseja excluir a auditoria "${auditTitle}"?`)) {
            try {
                const result = await fetchData(`/api/auditorias/${auditId}`, { method: 'DELETE' });
                showAlert(result.message, false);
                loadAudits();
            } catch (error) {
                showAlert(error.message);
            }
        }
    };

    const updateStatusInAPI = async (id, newStatus) => {
        try {
            const result = await fetchData(`/api/auditorias/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            showAlert(result.message, false);
        } catch (error) {
            showAlert(error.message);
            loadAudits();
        }
    };

    // --- RENDERIZAÇÃO E UI ---
    const renderAudits = (audits) => {
        ui.auditsList.innerHTML = '';
        if (!audits || audits.length === 0) {
            showEmptyState(true); showAuditsGrid(false); return;
        }
        showEmptyState(false); showAuditsGrid(true);
        const statusMap = { 'Aprovado': 'Aprovado', 'Em andamento': 'Em andamento', 'Rejeitado': 'Rejeitado', 'Em revisão': 'Em revisão' };
        
        audits.forEach(audit => {
            const date = new Date(audit.data_auditoria).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            let optionsHTML = '';
            for (const value of Object.values(statusMap)) {
                optionsHTML += `<option value="${value}" ${value === audit.status ? 'selected' : ''}>${value}</option>`;
            }
            const card = document.createElement('div');
            card.className = 'audit-card';
            card.innerHTML = `
                <h3>${audit.titulo}</h3>
                <div class="audit-meta">
                    <span class="audit-date">Data: <strong>${date}</strong></span>
                    <span class="audit-type">Tipo: <strong>${audit.tipo}</strong></span> 
                    <div class="audit-status">
                        <label for="status-select-${audit.id}" class="status-label">Status:</label>
                        <select id="status-select-${audit.id}" class="status-select status-badge ${audit.status.toLowerCase().replace(' ', '-')}" data-id="${audit.id}">${optionsHTML}</select>
                    </div>
                </div>
                <div class="audit-actions">
                    <button class="download-btn" data-path="${audit.caminho_arquivo}">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" fill="currentColor"/></svg> Download
                    </button>
                    <button class="delete-btn" data-id="${audit.id}" data-title="${audit.titulo}">
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
            downloadBtn.innerHTML = 'Gerando...';
            downloadBtn.disabled = true;
            try {
                const { data } = supabase.storage.from('audit').getPublicUrl(filePath);
                if (!data || !data.publicUrl) throw new Error('URL pública não encontrada.');
                window.open(data.publicUrl, '_blank');
            } catch(error) { 
                showAlert('Erro ao baixar o arquivo.'); 
            } finally {
                setTimeout(() => {
                    downloadBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" fill="currentColor"/></svg> Download';
                    downloadBtn.disabled = false;
                }, 1500);
            }
        }
        
        if (deleteBtn) {
            const auditId = deleteBtn.dataset.id;
            const auditTitle = deleteBtn.dataset.title;
            deleteAudit(auditId, auditTitle);
        }
    });

    ui.auditsList.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            const select = e.target;
            updateStatusInAPI(select.dataset.id, select.value);
            select.className = 'status-select status-badge';
            select.classList.add(select.value.toLowerCase().replace(' ', '-'));
        }
    });
    
    ui.form.addEventListener('submit', submitForm);
    
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    // --- INICIALIZAÇÃO ---
    setupRealTimeValidation();
    loadAudits();
});