import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento completo da UI
    const ui = {
        form: document.getElementById('documentForm'),
        documentsContainer: document.getElementById('documentsContainer'),
        fileInput: document.getElementById('documentFile'),
        fileUploadArea: document.querySelector('.file-upload'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
        confirmDeleteModal: new bootstrap.Modal(document.getElementById('confirmDeleteModal')),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    };

    let docToDeleteId = null;

    // Funções de controle de UI
    const showLoader = (isLoading) => { if (ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if (ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showGrid = (shouldShow) => { if (ui.documentsContainer) ui.documentsContainer.style.display = shouldShow ? 'grid' : 'none'; };

    // --- LÓGICA DE UPLOAD DE ARQUIVO ---
    const handleFileSelection = (file) => {
        const fileUploadText = ui.fileUploadArea.querySelector('p');
        const fileNameDisplay = ui.fileUploadArea.querySelector('small');
        if (!file) return;
        fileUploadText.textContent = `Arquivo selecionado:`;
        fileNameDisplay.textContent = file.name;
    };
    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });
    ui.fileInput.addEventListener('change', () => handleFileSelection(ui.fileInput.files.length > 0 ? ui.fileInput.files[0] : null));

    // --- FUNÇÕES DE API ---
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderDocuments = (docs) => {
        ui.documentsContainer.innerHTML = '';
        if (docs.length === 0) {
            showEmptyState(true); showGrid(false); return;
        }
        showEmptyState(false); showGrid(true);

        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-card';
            card.innerHTML = `
                <i class="bi bi-file-earmark-text document-icon"></i>
                <div class="document-details">
                    <h3 class="document-title">${doc.tipo_documento}</h3>
                    <p class="document-company">${doc.titulo}</p>
                </div>
                <div class="document-value">${formatCurrency(doc.valor)}</div>
                <div class="document-actions">
                    <button class="view-btn" data-path="${doc.caminho_arquivo}"><i class="bi bi-box-arrow-up-right"></i> Visualizar</button>
                    <button class="delete-btn" data-id="${doc.id}"><i class="bi bi-trash-fill"></i> Apagar</button>
                </div>
            `;
            ui.documentsContainer.appendChild(card);
        });
    };

    const fetchData = async () => {
        showLoader(true); showGrid(false); showEmptyState(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado.');
            const response = await fetch('/api/documentos', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar documentos.');
            const documents = await response.json();
            renderDocuments(documents);
        } catch (error) {
            showAlert(error.message || 'Erro ao carregar documentos.');
            renderDocuments([]);
        } finally {
            showLoader(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const formData = new FormData(ui.form);
        if (!formData.get('arquivo_documento') || !formData.get('arquivo_documento').size) {
            showAlert("Por favor, selecione um arquivo."); return;
        }
        const submitButton = ui.form.querySelector('button[type="submit"]');
        submitButton.disabled = true; submitButton.textContent = 'Enviando...';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch('/api/documentos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            if (!response.ok) throw new Error('Erro ao adicionar documento.');
            ui.form.reset();
            ui.fileUploadArea.querySelector('p').textContent = 'Clique para selecionar ou arraste aqui';
            ui.fileUploadArea.querySelector('small').textContent = 'PDF, DOC, JPG, PNG (máx. 10MB)';
            showSuccess('Documento adicionado com sucesso!');
            fetchData();
        } catch (error) { 
            showAlert(error.message || 'Falha ao adicionar o documento.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-check-circle-fill"></i> Adicionar Documento';
        }
    };

    const deleteDocument = async (id) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/documentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!response.ok) throw new Error('Erro ao deletar documento.');
            showSuccess('Documento excluído com sucesso!');
            fetchData();
        } catch (error) { 
            showAlert(error.message || 'Falha ao apagar o documento.');
        }
    };
    
    const showAlert = (message) => { ui.alertMessage.textContent = message; ui.alertMessage.style.display = 'block'; setTimeout(() => ui.alertMessage.style.display = 'none', 5000); };
    const showSuccess = (message) => { ui.successMessage.textContent = message; ui.successMessage.style.display = 'block'; setTimeout(() => ui.successMessage.style.display = 'none', 4000); };
    
    // --- EVENT LISTENERS ---
    ui.documentsContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        if (viewBtn) {
            const filePath = viewBtn.dataset.path;
            const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
            if (data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                showAlert('Não foi possível gerar a URL do arquivo.');
            }
        }
        if (deleteBtn) {
            docToDeleteId = deleteBtn.dataset.id;
            ui.confirmDeleteModal.show();
        }
    });

    ui.confirmDeleteBtn.addEventListener('click', () => {
        if(docToDeleteId) {
            deleteDocument(docToDeleteId);
            docToDeleteId = null;
            ui.confirmDeleteModal.hide();
        }
    });

    ui.form.addEventListener('submit', handleAdd);
    fetchData();
});