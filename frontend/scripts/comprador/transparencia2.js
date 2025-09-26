import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento dos elementos da UI para a página de CONTRATOS
    const ui = {
        form: document.getElementById('contracts-form'),
        titleInput: document.getElementById('contract-title'),
        descriptionInput: document.getElementById('contract-description'),
        yearSelect: document.getElementById('contract-year'), // Novo campo
        fileInput: document.getElementById('contract-file'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('.upload-btn'),
        contractsList: document.getElementById('contracts-list'), // Lista de contratos
        successMessage: document.getElementById('success-contracts'),
        alertMessage: document.getElementById('alert-contracts'),
        modalTitle: document.getElementById('modal-title'),
        modalDescription: document.getElementById('modal-description'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };

    let selectedFile = null;
    let contractIdToDelete = null; // Variável para ID do contrato

    // Funções de controle de UI (loading, lista vazia, etc.)
    const showLoader = (isLoading) => { ui.loader.style.display = isLoading ? 'block' : 'none'; };
    const showEmptyState = (isEmpty) => { ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showContractsGrid = (shouldShow) => { ui.contractsList.style.display = shouldShow ? 'grid' : 'none'; };

    // --- LÓGICA DE VALIDAÇÃO (adaptada para Contratos) ---
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

    // --- LÓGICA DE UPLOAD DE ARQUIVO (adaptada para Contratos) ---
    const handleFileSelection = (file) => {
        if (!file) return;
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 15 * 1024 * 1024; // 15MB
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
    
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    // --- FUNÇÕES DE API (adaptadas para /api/contratos) ---
    const loadContracts = async () => {
        showLoader(true);
        showContractsGrid(false);
        showEmptyState(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { throw new Error('Não autenticado.'); }
            const response = await fetch('/api/contratos', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) { throw new Error('Falha ao carregar contratos.'); }
            const contracts = await response.json();
            renderContracts(contracts);
        } catch (error) {
            showAlert(error.message || 'Erro ao carregar os contratos.');
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch('/api/contratos', { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao enviar.');
            showSuccess('Contrato adicionado!');
            ui.form.reset();
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/contratos/${contractId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao deletar.');
            showSuccess('Contrato excluído com sucesso!');
            loadContracts();
        } catch (error) {
            showAlert(error.message);
        }
    };

    // --- FUNÇÕES DE RENDERIZAÇÃO E FEEDBACK VISUAL ---
    const showAlert = (message) => { /* ...código sem alteração... */ };
    const showSuccess = (message) => { /* ...código sem alteração... */ };
    
    const renderContracts = (contracts) => {
        ui.contractsList.innerHTML = '';
        if (contracts.length === 0) {
            showEmptyState(true);
            showContractsGrid(false);
            return;
        }
        showEmptyState(false);
        showContractsGrid(true);
        contracts.forEach(contract => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-content">
                    <h3>${contract.nome_contrato}</h3>
                    <div class="card-meta">Ano de Vigência: <strong>${contract.ano_vigencia}</strong></div>
                </div>
                <div class="card-actions">
                    <button class="view-description-btn" data-title="${contract.nome_contrato}" data-description="${contract.descricao}">
                        <i class="bi bi-eye-fill"></i> Descrição
                    </button>
                    <button class="download-btn" data-path="${contract.caminho_arquivo}">
                        <i class="bi bi-download"></i> Baixar
                    </button>
                    <button class="delete-btn" data-id="${contract.id}">
                        <i class="bi bi-trash-fill"></i> Excluir
                    </button>
                </div>
            `;
            ui.contractsList.appendChild(card);
        });
    };

    // --- EVENT LISTENERS ---
    ui.contractsList.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('.download-btn');
        const viewBtn = e.target.closest('.view-description-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            try {
                // ADAPTADO: Usando o bucket 'contracts'
                const { data, error } = await supabase.storage.from('contracts').download(filePath);
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
            contractIdToDelete = deleteBtn.dataset.id;
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('confirmDeleteModal'));
            modal.show();
        }
    });

    ui.confirmDeleteBtn.addEventListener('click', () => {
        if (contractIdToDelete) {
            deleteContract(contractIdToDelete);
            contractIdToDelete = null;
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            modal.hide();
        }
    });

    ui.form.addEventListener('submit', submitForm);

    loadContracts();
});