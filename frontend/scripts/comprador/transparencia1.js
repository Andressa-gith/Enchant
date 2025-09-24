import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento dos elementos da UI
    const ui = {
        form: document.getElementById('reports-form'),
        titleInput: document.getElementById('report-title'),
        descriptionInput: document.getElementById('report-description'),
        fileInput: document.getElementById('report-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('.upload-btn'),
        reportsList: document.getElementById('reports-list'),
        successMessage: document.getElementById('success-reports'),
        alertMessage: document.getElementById('alert-reports'),
        modal: document.getElementById('descriptionModal'),
        modalTitle: document.getElementById('modal-title'),
        modalDescription: document.getElementById('modal-description'),
        modalCloseBtn: document.querySelector('.modal .close'),
    };

    let selectedFile = null;

    // --- FUNÇÕES DE VALIDAÇÃO ---
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
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato de arquivo inválido. Use PDF, DOC ou XLS.', 'report-file-error');
            selectedFile = null;
            return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'O arquivo é muito grande (máximo 10MB).', 'report-file-error');
            selectedFile = null;
            return;
        }

        selectedFile = file;
        ui.fileUploadText.textContent = `Arquivo selecionado: ${file.name}`;
        validateField(ui.fileUploadArea, true, '', 'report-file-error');
    };

    // Eventos de Drag & Drop
    ui.fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        ui.fileUploadArea.classList.add('dragover');
    });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        ui.fileUploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFileSelection(file);
    });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));


    // --- FUNÇÕES DE API ---
    const loadReports = async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
            console.error('Não autenticado.');
            return;
        }
        const token = sessionData.session.access_token;

        try {
            const response = await fetch('/api/relatorios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar relatórios.');
            
            const reports = await response.json();
            renderReports(reports);
        } catch (error) {
            showAlert('Erro ao carregar os relatórios existentes.');
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

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session.access_token;

        try {
            const response = await fetch('/api/relatorios', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Erro desconhecido.');

            showSuccess('Relatório adicionado com sucesso!');
            ui.form.reset();
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            loadReports(); // Recarrega a lista

        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar relatório';
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
    
    const renderReports = (reports) => {
        // Limpa a lista antes de adicionar os novos itens
        ui.reportsList.innerHTML = '<h3>Relatórios publicados</h3>'; 
        
        if (reports.length === 0) {
            ui.reportsList.innerHTML += '<p>Nenhum relatório publicado ainda.</p>';
            return;
        }
        
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';

        reports.forEach(report => {
            const date = new Date(report.data_publicacao).toLocaleDateString('pt-BR');
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${report.titulo}</h3>
                <div class="card-meta">
                    <div>Publicado em: ${date}</div>
                </div>
                <div class="card-actions">
                    <button class="download-btn" data-path="${report.caminho_arquivo}">
                        <i class="bi bi-download"></i> Baixar
                    </button>
                    <button class="view-description-btn" data-title="${report.titulo}" data-description="${report.descricao}">
                       Ver Descrição
                    </button>
                </div>
            `;
            cardsGrid.appendChild(card);
        });
        ui.reportsList.appendChild(cardsGrid);
    };

    // --- MODAL ---
    const openModal = (title, description) => {
        ui.modalTitle.textContent = title;
        ui.modalDescription.textContent = description;
        ui.modal.style.display = 'block';
    };

    const closeModal = () => {
        ui.modal.style.display = 'none';
    };

    ui.modalCloseBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === ui.modal) {
            closeModal();
        }
    });

    // --- DELEGAÇÃO DE EVENTOS ---
    ui.reportsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');
        const viewBtn = e.target.closest('.view-description-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            const { data, error } = await supabase.storage.from('reports').download(filePath);
            if (error) {
                showAlert('Erro ao baixar o arquivo.');
                return;
            }
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('-').pop(); // Pega o nome original do arquivo
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        if (viewBtn) {
            openModal(viewBtn.dataset.title, viewBtn.dataset.description);
        }
    });

    // --- INICIALIZAÇÃO ---
    ui.form.addEventListener('submit', submitForm);
    loadReports(); // Carrega os relatórios ao iniciar a página
});