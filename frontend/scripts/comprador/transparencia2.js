import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona type="module" ao script dinamicamente se não existir
    if (!document.querySelector('script[src="/scripts/comprador/transparencia2.js"][type="module"]')) {
        const scriptTag = document.querySelector('script[src="/scripts/comprador/transparencia2.js"]');
        if (scriptTag) {
            scriptTag.type = 'module';
        }
    }

    // Mapeamento dos elementos da UI
    const ui = {
        form: document.getElementById('contracts-form'),
        titleInput: document.getElementById('contract-title'),
        descriptionInput: document.getElementById('contract-description'),
        yearSelect: document.getElementById('contract-year'),
        fileInput: document.getElementById('contract-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('.upload-btn'),
        contractsList: document.getElementById('contracts-list'),
        successMessage: document.getElementById('success-contracts'),
        alertMessage: document.getElementById('alert-contracts'),
        modal: document.getElementById('descriptionModal'),
        modalTitle: document.getElementById('modal-title'),
        modalDescription: document.getElementById('modal-description'),
        modalCloseBtn: document.querySelector('.modal .close'),
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

    const validateForm = () => {
        const isTitleValid = validateField(ui.titleInput, ui.titleInput.value.length >= 10, 'O nome deve ter no mínimo 10 caracteres.', 'contract-title-error');
        const isDescriptionValid = validateField(ui.descriptionInput, ui.descriptionInput.value.length >= 20, 'A descrição deve ter no mínimo 20 caracteres.', 'contract-description-error');
        const isYearValid = validateField(ui.yearSelect, ui.yearSelect.value !== '', 'Por favor, selecione um ano.', 'contract-year-error');
        const isFileValid = validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.', 'contract-file-error');
        return isTitleValid && isDescriptionValid && isYearValid && isFileValid;
    };

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 15 * 1024 * 1024; // 15MB

        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF ou DOC.', 'contract-file-error');
            selectedFile = null;
            return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'O arquivo é muito grande (máximo 15MB).', 'contract-file-error');
            selectedFile = null;
            return;
        }

        selectedFile = file;
        ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
        validateField(ui.fileUploadArea, true, '', 'contract-file-error');
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
    const loadContracts = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const response = await fetch('/api/contratos', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar contratos.');
            
            const contracts = await response.json();
            renderContracts(contracts);
        } catch (error) {
            showAlert('Erro ao carregar os contratos existentes.');
        }
    };
    
    const submitForm = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Enviando...';

        const formData = new FormData();
        formData.append('nome_contrato', ui.titleInput.value);
        formData.append('descricao', ui.descriptionInput.value);
        formData.append('ano_vigencia', ui.yearSelect.value);
        formData.append('arquivo_contrato', selectedFile);

        const { data: { session } } = await supabase.auth.getSession();

        try {
            const response = await fetch('/api/contratos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro no servidor.');

            showSuccess('Contrato adicionado com sucesso!');
            ui.form.reset();
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            loadContracts(); // Recarrega a lista

        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar contrato';
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
    
    const renderContracts = (contracts) => {
        ui.contractsList.innerHTML = '<h3>Contratos publicados</h3>'; 
        
        if (contracts.length === 0) {
            ui.contractsList.innerHTML += '<p>Nenhum contrato publicado ainda.</p>';
            return;
        }
        
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';

        contracts.forEach(contract => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${contract.nome_contrato}</h3>
                <div class="card-meta">
                    <div>Ano de Vigência: <strong>${contract.ano_vigencia}</strong></div>
                </div>
                <div class="card-actions">
                    <button class="download-btn" data-path="${contract.caminho_arquivo}">
                        <i class="bi bi-download"></i> Baixar
                    </button>
                    <button class="view-description-btn" data-title="${contract.nome_contrato}" data-description="${contract.descricao}">
                       Ver Descrição
                    </button>
                </div>
            `;
            cardsGrid.appendChild(card);
        });
        ui.contractsList.appendChild(cardsGrid);
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
    ui.contractsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');
        const viewBtn = e.target.closest('.view-description-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            const { data, error } = await supabase.storage.from('contracts').download(filePath);
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

        if (viewBtn) {
            openModal(viewBtn.dataset.title, viewBtn.dataset.description);
        }
    });

    // --- INICIALIZAÇÃO ---
    ui.form.addEventListener('submit', submitForm);
    loadContracts();
});