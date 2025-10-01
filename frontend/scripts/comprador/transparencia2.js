import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO DOS ELEMENTOS DA UI ---
    const ui = {
        form: document.getElementById('contracts-form'),
        titleInput: document.getElementById('contract-title'),
        descriptionInput: document.getElementById('contract-description'),
        yearSelect: document.getElementById('contract-year'),
        fileInput: document.getElementById('contract-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('#contracts-form .upload-btn'),
        contractsList: document.getElementById('contracts-list'),
        successMessage: document.getElementById('success-contracts'),
        alertMessage: document.getElementById('alert-contracts'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
        
        // O modal agora é controlado manualmente, então removemos a inicialização do Bootstrap
        modal: document.getElementById('descriptionModal'),
        modalTitle: document.getElementById('modal-title'),
        modalDescription: document.getElementById('modal-description'),
    };
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);
    let selectedFile = null;

    // --- FUNÇÕES DE CONTROLE DE UI ---
    const showLoader = (isLoading) => { ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showContractsGrid = (shouldShow) => { ui.contractsList.style.display = shouldShow ? 'grid' : 'none'; };

    const showAlert = (message, isError = true) => {
        const alertElement = isError ? ui.alertMessage : ui.successMessage;
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => { alertElement.style.display = 'none'; }, 4000);
    };

    // --- LÓGICA DE VALIDAÇÃO (sem alterações) ---
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
        const isTitleValid = validateField(ui.titleInput, ui.titleInput.value.length >= 10, 'O nome deve ter no mínimo 10 caracteres.', 'contract-title-error');
        const isDescriptionValid = validateField(ui.descriptionInput, ui.descriptionInput.value.length >= 20, 'A descrição deve ter no mínimo 20 caracteres.', 'contract-description-error');
        const isYearValid = validateField(ui.yearSelect, ui.yearSelect.value !== '', 'Por favor, selecione um ano.', 'contract-year-error');
        const isFileValid = validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.', 'contract-file-error');
        return isTitleValid && isDescriptionValid && isYearValid && isFileValid;
    };

    // --- LÓGICA DE UPLOAD DE ARQUIVO (sem alterações) ---
    const handleFileSelection = (file) => {
        if (!file) return;
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 15 * 1024 * 1024;
        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF ou DOC.', 'contract-file-error');
            selectedFile = null; return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'Arquivo muito grande (máx 15MB).', 'contract-file-error');
            selectedFile = null; return;
        }
        selectedFile = file;
        ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
        validateField(ui.fileUploadArea, true, '', 'contract-file-error');
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

    const loadContracts = async () => {
        showLoader(true);
        showContractsGrid(false);
        showEmptyState(false);
        try {
            const contracts = await fetchData('/api/contratos');
            renderContracts(contracts);
        } catch (error) {
            showAlert(error.message);
            showEmptyState(true);
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
        formData.append('nome_contrato', ui.titleInput.value);
        formData.append('descricao', ui.descriptionInput.value);
        formData.append('ano_vigencia', ui.yearSelect.value);
        formData.append('arquivo_contrato', selectedFile);
        try {
            const result = await fetchData('/api/contratos', { method: 'POST', body: formData });
            showAlert(result.message, false);
            ui.form.reset();
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            validateField(ui.fileUploadArea, true, '', 'contract-file-error');
            loadContracts();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar contrato';
        }
    };

    const deleteContract = async (contractId) => {
        try {
            const result = await fetchData(`/api/contratos/${contractId}`, { method: 'DELETE' });
            showAlert(result.message, false);
            loadContracts();
        } catch (error) {
            showAlert(error.message);
        }
    };
    
    // --- RENDERIZAÇÃO ---
    const renderContracts = (contracts) => {
        ui.contractsList.innerHTML = '';
        if (!contracts || contracts.length === 0) {
            showEmptyState(true);
            showContractsGrid(false);
            return;
        }
        showEmptyState(false);
        showContractsGrid(true);
        contracts.sort((a, b) => b.ano_vigencia - a.ano_vigencia || a.nome_contrato.localeCompare(b.nome_contrato));
        contracts.forEach(contract => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-content">
                    <h3>${contract.nome_contrato}</h3>
                </div>
                <div class="card-meta">
                    <div>Ano de Vigência: <strong>${contract.ano_vigencia}</strong></div>
                </div>
                <div class="card-actions">
                    <button class="download-btn" data-path="${contract.caminho_arquivo}">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" fill="currentColor"/></svg> Download
                    </button>
                    <button class="view-description-btn" data-title="${contract.nome_contrato}" data-description="${contract.descricao}">
                        <i class="bi bi-eye-fill"></i> Descrição
                    </button>
                    <button class="delete-btn" data-id="${contract.id}" data-title="${contract.nome_contrato}">
                        <i class="bi bi-trash-fill"></i> Excluir
                    </button>
                </div>
            `;
            ui.contractsList.appendChild(card);
        });
    };

    // --- LÓGICA DO MODAL PERSONALIZADO ---
    function setupCustomModal() {
        const modal = ui.modal;
        if (!modal) return;
        const closeBtn = modal.querySelector('.close');
        
        if(closeBtn) {
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            }
        }
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    }

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', submitForm);
    
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    ui.contractsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');
        const viewBtn = e.target.closest('.view-description-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            downloadBtn.innerHTML = 'Gerando...';
            downloadBtn.disabled = true;
            try {
                const { data } = supabase.storage.from('contracts').getPublicUrl(filePath);
                if (!data || !data.publicUrl) throw new Error('URL não encontrada.');
                window.open(data.publicUrl, '_blank');
            } catch(error) {
                showAlert('Erro ao baixar o arquivo.');
            } finally {
                setTimeout(() => {
                    downloadBtn.innerHTML = '<i class="bi bi-download"></i> Baixar';
                    downloadBtn.disabled = false;
                }, 1500);
            }
        }

        if (viewBtn) {
            ui.modalTitle.textContent = viewBtn.dataset.title;
            ui.modalDescription.textContent = viewBtn.dataset.description;
            ui.modal.style.display = 'block'; // Abre o modal personalizado
        }
        
        if (deleteBtn) {
            const contractId = deleteBtn.dataset.id;
            const contractTitle = deleteBtn.dataset.title;
            // LÓGICA DE EXCLUSÃO ALTERADA PARA USAR 'confirm'
            if (confirm(`Tem certeza que deseja excluir o contrato "${contractTitle}"?`)) {
                deleteContract(contractId);
            }
        }
    });

    // --- INICIALIZAÇÃO ---
    setupCustomModal(); // Configura os eventos do modal personalizado
    loadContracts();
});