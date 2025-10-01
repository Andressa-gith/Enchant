import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        form: document.getElementById('documentForm'),
        companyNameInput: document.getElementById('companyName'),
        documentTypeSelect: document.getElementById('documentType'),
        documentValueInput: document.getElementById('documentValue'),
        fileInput: document.getElementById('documentFile'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        submitBtn: document.querySelector('#documentForm .add-btn'),
        documentsContainer: document.getElementById('documents-list'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
    };
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);
    let selectedFile = null;

    const showLoader = (isLoading) => { ui.loader && (ui.loader.style.display = isLoading ? 'flex' : 'none'); };
    const showEmptyState = (isEmpty) => { ui.emptyState && (ui.emptyState.style.display = isEmpty ? 'flex' : 'none'); };
    const showGrid = (shouldShow) => { ui.documentsContainer && (ui.documentsContainer.style.display = shouldShow ? 'grid' : 'none'); };

    const showAlert = (message, isError = true) => {
        const alertElement = isError ? ui.alertMessage : ui.successMessage;
        if (!alertElement) return;
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => { alertElement.style.display = 'none'; }, 4000);
    };

    const validateField = (input, condition, errorMsg, errorElementId) => {
        const errorElement = document.getElementById(errorElementId);
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
    
    const validateForm = () => {
        const errors = [];
        const fieldNames = {
            name: 'Nome do Documento',
            type: 'Tipo de Documento',
            value: 'Valor',
            file: 'Arquivo'
        };

        if (!validateField(ui.companyNameInput, ui.companyNameInput.value.trim().length >= 10, 'O nome deve ter no mínimo 10 caracteres.', 'companyName-error')) {
            errors.push(fieldNames.name);
        }
        if (!validateField(ui.documentTypeSelect, ui.documentTypeSelect.value !== '', 'Por favor, selecione um tipo.', 'documentType-error')) {
            errors.push(fieldNames.type);
        }
        if (!validateField(ui.documentValueInput, ui.documentValueInput.value > 0, 'O valor deve ser maior que zero.', 'documentValue-error')) {
            errors.push(fieldNames.value);
        }
        if (!validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.', 'documentFile-error')) {
            errors.push(fieldNames.file);
        }
        
        return {
            isValid: errors.length === 0,
            errors: [...new Set(errors)]
        };
    };

    const handleFileSelection = (file) => {
        selectedFile = file;
        if (file) {
            ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
            validateField(ui.fileUploadArea, true, '', 'documentFile-error');
        } else {
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
        }
    };

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

    const loadDocuments = async () => {
        showLoader(true);
        showGrid(false);
        showEmptyState(false);
        try {
            const documents = await fetchData('/api/documentos');
            renderDocuments(documents);
        } catch (error) {
            showAlert(error.message);
            renderDocuments([]);
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

        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Enviando...';
        const formData = new FormData();
        formData.append('titulo', ui.companyNameInput.value);
        formData.append('tipo_documento', ui.documentTypeSelect.value);
        formData.append('valor', ui.documentValueInput.value);
        formData.append('arquivo_documento', selectedFile);
        try {
            const result = await fetchData('/api/documentos', { method: 'POST', body: formData });
            showAlert(result.message, false);
            ui.form.reset();
            handleFileSelection(null);
            loadDocuments();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar Documento';
        }
    };

    const deleteDocument = async (docId, docTitle) => {
        if (confirm(`Tem certeza que deseja excluir o documento "${docTitle}"?`)) {
            try {
                const result = await fetchData(`/api/documentos/${docId}`, { method: 'DELETE' });
                showAlert(result.message, false);
                loadDocuments();
            } catch (error) {
                showAlert(error.message);
            }
        }
    };

    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderDocuments = (docs) => {
        if (!ui.documentsContainer) return;
        ui.documentsContainer.innerHTML = '';
        if (!docs || docs.length === 0) {
            showEmptyState(true);
            showGrid(false);
            return;
        }
        showEmptyState(false);
        showGrid(true);
        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-card';
            card.innerHTML = `
                <i class="bi bi-file-earmark-text document-icon"></i>
                <div class="document-details">
                    <h3 class="document-title">${doc.titulo}</h3>
                    <p class="document-company">Tipo: ${doc.tipo_documento}</p>
                </div>
                <div class="document-value">${formatCurrency(doc.valor)}</div>
                <div class="document-actions">
                    <button class="view-btn" data-path="${doc.caminho_arquivo}"><i class="bi bi-box-arrow-up-right"></i> Visualizar</button>
                    <button class="delete-btn" data-id="${doc.id}" data-title="${doc.titulo}"><i class="bi bi-trash-fill"></i> Apagar</button>
                </div>
            `;
            ui.documentsContainer.appendChild(card);
        });
    };

    ui.form.addEventListener('submit', submitForm);
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => { ui.fileUploadArea.classList.remove('dragover'); });
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); ui.fileInput.files = e.dataTransfer.files; });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));
    ui.documentsContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        if (viewBtn) {
            const filePath = viewBtn.dataset.path;
            try {
                const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
                if (!data || !data.publicUrl) throw new Error('URL pública não encontrada.');
                window.open(data.publicUrl, '_blank');
            } catch (error) {
                showAlert('Não foi possível gerar a URL do arquivo.');
            }
        }
        if (deleteBtn) {
            const docId = deleteBtn.dataset.id;
            const docTitle = deleteBtn.dataset.title;
            deleteDocument(docId, docTitle);
        }
    });

    loadDocuments();
});