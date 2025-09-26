import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento de todos os elementos da interface
    const ui = {
        form: document.getElementById('reports-form'),
        titleInput: document.getElementById('report-title'),
        descriptionInput: document.getElementById('report-description'),
        fileInput: document.getElementById('report-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('.upload-btn'),
        reportsList: document.getElementById('reports-list'), // Agora é a grid
        successMessage: document.getElementById('success-reports'),
        alertMessage: document.getElementById('alert-reports'),
        modalTitle: document.getElementById('modal-title'),
        modalDescription: document.getElementById('modal-description'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        // NOVO: Seletores para os estados de UI
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };

    let selectedFile = null;
    let reportIdToDelete = null;

    const showLoader = (isLoading) => {
        ui.loader.style.display = isLoading ? 'block' : 'none';
    };

    const showEmptyState = (isEmpty) => {
        ui.emptyState.style.display = isEmpty ? 'flex' : 'none';
    };
    
    const showReportsGrid = (shouldShow) => {
        ui.reportsList.style.display = shouldShow ? 'grid' : 'none';
    };

    // --- LÓGICA DE VALIDAÇÃO ---
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
    
    const validateForm = () => {
        const isTitleValid = validateField(ui.titleInput, ui.titleInput.value.length >= 10, 'O título deve ter no mínimo 10 caracteres.', 'report-title-error');
        const isDescriptionValid = validateField(ui.descriptionInput, ui.descriptionInput.value.length >= 20, 'A descrição deve ter no mínimo 20 caracteres.', 'report-description-error');
        const isFileValid = validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.', 'report-file-error');
        return isTitleValid && isDescriptionValid && isFileValid;
    };

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        if (!file) return;
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const maxSize = 10 * 1024 * 1024;
        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF, DOC ou XLS.', 'report-file-error');
            selectedFile = null; return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'Arquivo muito grande (máx 10MB).', 'report-file-error');
            selectedFile = null; return;
        }
        selectedFile = file;
        ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
        validateField(ui.fileUploadArea, true, '', 'report-file-error');
    };
    
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    // --- FUNÇÕES DE API (INTEGRAÇÃO COM BACKEND) ---
    const loadReports = async () => {
        showLoader(true);
        showReportsGrid(false);
        showEmptyState(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { throw new Error('Não autenticado.'); }

            const response = await fetch('/api/relatorios', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) { throw new Error('Falha ao carregar relatórios.'); }

            const reports = await response.json();
            renderReports(reports);
        } catch (error) {
            showAlert(error.message || 'Erro ao carregar os relatórios.');
            showEmptyState(true); // Mostra estado de erro/vazio se falhar
        } finally {
            showLoader(false);
        }
    };
    
    const submitForm = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Enviando...';
        const formData = new FormData();
        formData.append('titulo', ui.titleInput.value);
        formData.append('descricao', ui.descriptionInput.value);
        formData.append('arquivo_relatorio', selectedFile);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');

            const response = await fetch('/api/relatorios', { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao enviar.');

            showSuccess('Relatório adicionado!');
            ui.form.reset();
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            loadReports();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar relatório';
        }
    };

    const deleteReport = async (reportId) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');

            const response = await fetch(`/api/relatorios/${reportId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao deletar.');
            
            showSuccess('Relatório excluído com sucesso!');
            loadReports();
        } catch (error) {
            showAlert(error.message);
        }
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO E FEEDBACK VISUAL ---
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
    
    const renderReports = (reports) => {
        ui.reportsList.innerHTML = '';

        if (reports.length === 0) {
            showEmptyState(true);
            showReportsGrid(false);
            return;
        }

        showEmptyState(false);
        showReportsGrid(true);

        reports.forEach(report => {
            const date = new Date(report.data_publicacao).toLocaleDateString('pt-BR');
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-content">
                    <h3>${report.titulo}</h3>
                    <div class="card-meta">Publicado em: ${date}</div>
                </div>
                <div class="card-actions">
                    <button class="view-description-btn" data-title="${report.titulo}" data-description="${report.descricao}">
                        <i class="bi bi-eye-fill"></i> Descrição
                    </button>
                    <button class="download-btn" data-path="${report.caminho_arquivo}">
                        <i class="bi bi-download"></i> Baixar
                    </button>
                    <button class="delete-btn" data-id="${report.id}">
                        <i class="bi bi-trash-fill"></i> Excluir
                    </button>
                </div>
            `;
            ui.reportsList.appendChild(card);
        });
    };

    // --- EVENT LISTENERS (OUVINTES DE AÇÕES) ---
    ui.reportsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');
        const viewBtn = e.target.closest('.view-description-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            try {
                const { data, error } = await supabase.storage.from('reports').download(filePath);
                if (error) throw error;
                const url = URL.createObjectURL(data);
                const a = document.createElement('a');
                a.href = url;
                a.download = filePath.split(/-(.+)/)[1] || filePath;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch(error) {
                showAlert('Erro ao baixar o arquivo.');
            }
        }

        if (viewBtn) {
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('descriptionModal'));
            ui.modalTitle.textContent = viewBtn.dataset.title;
            ui.modalDescription.textContent = viewBtn.dataset.description;
            modal.show();
        }
        
        if (deleteBtn) {
            reportIdToDelete = deleteBtn.dataset.id;
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteModal'));
            modal.show();
        }
    });

    ui.confirmDeleteBtn.addEventListener('click', () => {
        if (reportIdToDelete) {
            deleteReport(reportIdToDelete);
            reportIdToDelete = null;
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            modal.hide();
        }
    });

    ui.form.addEventListener('submit', submitForm);

    loadReports();
});