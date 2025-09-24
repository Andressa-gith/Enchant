import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Garante que o script seja tratado como módulo
    if (!document.querySelector('script[src="/scripts/comprador/transparencia3.js"][type="module"]')) {
        const scriptTag = document.querySelector('script[src="/scripts/comprador/transparencia3.js"]');
        if (scriptTag) scriptTag.type = 'module';
    }

    // Mapeamento dos elementos da UI
    const ui = {
        form: document.getElementById('audits-form'),
        titleInput: document.getElementById('audit-title'),
        dateInput: document.getElementById('audit-date'),
        typeSelect: document.getElementById('audit-type'),
        statusSelect: document.getElementById('audit-status'),
        fileInput: document.getElementById('audit-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('.upload-btn'),
        auditsList: document.getElementById('audits-list'),
        successMessage: document.getElementById('success-audits'),
        alertMessage: document.getElementById('alert-audits'),
    };

    let selectedFile = null;

    // --- FUNÇÕES DE VALIDAÇÃO ---
    const validateField = (element, condition, errorMsg, errorElementId) => {
        const errorElement = document.getElementById(errorElementId);
        if (condition) {
            element.classList.remove('error');
            errorElement.style.display = 'none';
            return true;
        } else {
            element.classList.add('error');
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
        
        // Zera as horas para comparar apenas as datas
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        fiveYearsAgo.setHours(0, 0, 0, 0);

        const isValid = ui.dateInput.value !== '' && inputDate <= today && inputDate >= fiveYearsAgo;
        return validateField(ui.dateInput, isValid, 'A data deve ser válida, não futura e de no máximo 5 anos atrás.', 'audit-date-error');
    };

    const validateForm = () => {
        const isTitleValid = validateField(ui.titleInput, ui.titleInput.value.length >= 10, 'O título deve ter no mínimo 10 caracteres.', 'audit-title-error');
        const isDateValid = validateDate();
        const isTypeValid = validateField(ui.typeSelect, ui.typeSelect.value !== '', 'Por favor, selecione um tipo.', 'audit-type-error');
        const isStatusValid = validateField(ui.statusSelect, ui.statusSelect.value !== '', 'Por favor, selecione um status.', 'audit-status-error');
        const isFileValid = validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.', 'audit-file-error');
        return isTitleValid && isDateValid && isTypeValid && isStatusValid && isFileValid;
    };

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 20 * 1024 * 1024; // 20MB

        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF ou DOC.', 'audit-file-error');
            selectedFile = null;
            return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'O arquivo é muito grande (máximo 20MB).', 'audit-file-error');
            selectedFile = null;
            return;
        }

        selectedFile = file;
        ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
        validateField(ui.fileUploadArea, true, '', 'audit-file-error');
    };

    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        ui.fileUploadArea.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files[0]);
    });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    // --- FUNÇÕES DE API ---
    const loadAudits = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const response = await fetch('/api/auditorias', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar auditorias.');
            
            const audits = await response.json();
            renderAudits(audits);
        } catch (error) {
            showAlert('Erro ao carregar as auditorias existentes.');
        }
    };
    
    const submitForm = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Enviando...';

        const formData = new FormData();
        formData.append('titulo', ui.titleInput.value);
        formData.append('data_auditoria', ui.dateInput.value);
        formData.append('tipo', ui.typeSelect.value);
        formData.append('status', ui.statusSelect.value);
        formData.append('arquivo_auditoria', selectedFile);

        const { data: { session } } = await supabase.auth.getSession();

        try {
            const response = await fetch('/api/auditorias', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro no servidor.');

            showSuccess('Auditoria adicionada com sucesso!');
            ui.form.reset();
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            loadAudits();

        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar auditoria';
        }
    };
    
    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    const showAlert = (message) => {
        ui.alertMessage.textContent = message;
        ui.alertMessage.style.display = 'block';
        setTimeout(() => ui.alertMessage.style.display = 'none', 5000);
    };

    const showSuccess = (message) => {
        ui.successMessage.textContent = message;
        ui.successMessage.style.display = 'block';
        setTimeout(() => ui.successMessage.style.display = 'none', 4000);
    };

    const statusMap = {
        approved: { text: 'Aprovado', class: 'approved' },
        pending: { text: 'Em andamento', class: 'pending' },
        rejected: { text: 'Rejeitado', class: 'rejected' }, // Adicione classes CSS para estes se necessário
        review: { text: 'Em revisão', class: 'review' }
    };
    
    const renderAudits = (audits) => {
        ui.auditsList.innerHTML = '<h3>Auditorias publicadas</h3>'; 
        
        if (audits.length === 0) {
            ui.auditsList.innerHTML += '<p>Nenhuma auditoria publicada ainda.</p>';
            return;
        }
        
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'audit-cards'; // Usando a classe de grid específica para auditoria

        audits.forEach(audit => {
            const date = new Date(audit.data_auditoria).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const statusInfo = statusMap[audit.status] || { text: audit.status, class: '' };

            const card = document.createElement('div');
            card.className = 'audit-card';
            card.innerHTML = `
                <h3>${audit.titulo}</h3>
                <div class="audit-meta">
                    <span class="audit-date">Data da auditoria: <strong>${date}</strong></span>
                    <div class="audit-status">
                        <span class="status-label">Status:</span>
                        <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                    </div>
                </div>
                <div class="audit-actions">
                    <button class="download-btn" data-path="${audit.caminho_arquivo}">
                        <i class="bi bi-download"></i> Baixar Relatório
                    </button>
                </div>
            `;
            cardsGrid.appendChild(card);
        });
        ui.auditsList.appendChild(cardsGrid);
    };

    // --- DELEGAÇÃO DE EVENTOS PARA DOWNLOAD ---
    ui.auditsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            const { data, error } = await supabase.storage.from('audit').download(filePath);
            if (error) {
                showAlert('Erro ao baixar o arquivo.');
                return;
            }
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('-').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    // --- INICIALIZAÇÃO ---
    ui.form.addEventListener('submit', submitForm);
    loadAudits();
});