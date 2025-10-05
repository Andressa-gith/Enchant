import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- MAPEAMENTO DOS ELEMENTOS DA UI ---
    const ui = {
        form: document.getElementById('documentForm'),
        companyNameInput: document.getElementById('companyName'),
        documentTypeSelect: document.getElementById('documentType'),
        documentValueInput: document.getElementById('documentValue'),
        fileInput: document.getElementById('documentFile'),
        fileUploadArea: document.querySelector('#documentForm .file-upload'),
        fileUploadText: document.querySelector('#documentForm .file-upload p'),
        submitBtn: document.querySelector('#documentForm .add-btn'),
        documentsContainer: document.getElementById('documents-list'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
        // Elementos do Modal de Edição
        editModal: document.getElementById('editModal'),
        editForm: document.getElementById('edit-form'),
        editIdInput: document.getElementById('edit-id'),
        editCompanyNameInput: document.getElementById('edit-companyName'),
        editDocumentTypeSelect: document.getElementById('edit-documentType'),
        editDocumentValueInput: document.getElementById('edit-documentValue'),
        editFileInput: document.getElementById('edit-documentFile'),
        editFileUploadText: document.getElementById('edit-fileUploadText'),
        saveEditBtn: document.getElementById('saveEditBtn'),
    };

    let selectedFile = null;
    let editSelectedFile = null;
    let allDocuments = [];
    let editModalInstance = null;

    setTimeout(() => { window.SiteLoader?.hide(); }, 500);

    // --- FUNÇÕES DE CONTROLE DE UI ---
    const showLoader = (isLoading) => { ui.loader && (ui.loader.style.display = isLoading ? 'block' : 'none'); };
    const showEmptyState = (isEmpty) => { ui.emptyState && (ui.emptyState.style.display = isEmpty ? 'block' : 'none'); };
    const showGrid = (shouldShow) => { ui.documentsContainer && (ui.documentsContainer.style.display = shouldShow ? 'grid' : 'none'); };
    const showAlert = (message, isError = true) => {
        const alertElement = isError ? ui.alertMessage : ui.successMessage;
        if (!alertElement) return;
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => { alertElement.style.display = 'none'; }, 5000);
    };
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        selectedFile = file;
        if (file) {
            ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
        } else {
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
        }
    };

    // --- FUNÇÕES DE API ---
    const fetchData = async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/entrar';
            throw new Error('Sessão expirada.');
        }
        const headers = { 'Authorization': `Bearer ${session.access_token}`, ...options.headers };
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Ocorreu um erro na comunicação com o servidor.');
        }
        return result;
    };

    // --- LÓGICA PRINCIPAL ---
    const loadDocuments = async () => {
        showLoader(true);
        showGrid(false);
        showEmptyState(false);
        try {
            allDocuments = await fetchData('/api/documentos');
            renderDocuments(allDocuments);
        } catch (error) {
            showAlert(error.message);
            renderDocuments([]);
        } finally {
            showLoader(false);
        }
    };

    const submitForm = async (e) => {
        e.preventDefault();
        if (!selectedFile || !ui.companyNameInput.value || !ui.documentValueInput.value || ui.documentTypeSelect.selectedIndex === 0) {
            showAlert('Por favor, preencha todos os campos obrigatórios.');
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

    const openEditModal = (docId) => {
        const doc = allDocuments.find(d => d.id == docId);
        if (!doc) {
            showAlert('Documento não encontrado para edição.');
            return;
        }

        ui.editIdInput.value = doc.id;
        ui.editCompanyNameInput.value = doc.titulo;
        ui.editDocumentValueInput.value = doc.valor;
        ui.editDocumentTypeSelect.value = doc.tipo_documento;

        ui.editFileInput.value = '';
        editSelectedFile = null;
        ui.editFileUploadText.textContent = 'Clique para selecionar um novo arquivo (opcional)';
        
        if (!editModalInstance) {
            editModalInstance = new bootstrap.Modal(ui.editModal);
        }
        editModalInstance.show();
    };

    const handleSaveChanges = async () => {
        const docId = ui.editIdInput.value;
        const formData = new FormData();
        formData.append('titulo', ui.editCompanyNameInput.value);
        formData.append('valor', ui.editDocumentValueInput.value);
        formData.append('tipo_documento', ui.editDocumentTypeSelect.value);

        if (editSelectedFile) {
            formData.append('arquivo_documento', editSelectedFile);
        }
        
        ui.saveEditBtn.disabled = true;
        ui.saveEditBtn.textContent = 'Salvando...';

        try {
            const result = await fetchData(`/api/documentos/${docId}`, { method: 'PUT', body: formData });
            showAlert(result.message, false);
            editModalInstance.hide();
            loadDocuments();
        } catch (error) {
            showAlert(error.message);
        } finally {
            ui.saveEditBtn.disabled = false;
            ui.saveEditBtn.textContent = 'Salvar Alterações';
        }
    };

    // --- RENDERIZAÇÃO ---
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
            card.className = 'uploaded-item';
            card.innerHTML = `
                <div class="document-header">
                    <div style="flex: 1;">
                        <h3 class="document-title">${doc.titulo}</h3>
                        <p class="document-company">${doc.tipo_documento}</p>
                    </div>
                    <button class="edit-btn-round" data-id="${doc.id}">
                        <svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>
                    </button>
                </div>
                <p class="document-value">${formatCurrency(doc.valor)}</p>
                <div class="document-actions">
                    <button class="view-btn" data-path="${doc.caminho_arquivo}"><i class="bi bi-box-arrow-up-right"></i> Visualizar</button>
                    <button class="delete" data-id="${doc.id}" data-title="${doc.titulo}"><i class="bi bi-trash-fill"></i> Excluir</button>
                </div>
            `;
            ui.documentsContainer.appendChild(card);
        });
    };

    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', submitForm);
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files[0]));

    ui.saveEditBtn.addEventListener('click', handleSaveChanges);
    ui.editFileInput.addEventListener('change', (e) => {
        editSelectedFile = e.target.files[0];
        ui.editFileUploadText.textContent = editSelectedFile ? `Novo arquivo: ${editSelectedFile.name}` : 'Clique para selecionar um novo arquivo (opcional)';
    });
    
    ui.documentsContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        const deleteBtn = e.target.closest('.delete');
        const editBtn = e.target.closest('.edit-btn-round');
        
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
            deleteDocument(deleteBtn.dataset.id, deleteBtn.dataset.title);
        }
        
        if (editBtn) {
            openEditModal(editBtn.dataset.id);
        }
    });

    // --- INICIALIZAÇÃO ---
    loadDocuments();
});