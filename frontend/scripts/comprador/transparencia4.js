import supabase from '/scripts/supabaseClient.js';

// ✅ CLASSE MODAL DE VALIDAÇÃO IA (PADRONIZADA)
class ModalValidacaoIA {
    constructor(tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
        this.modal = null;
        this.progressBar = null;
        this.progressMessage = null;
        this.progressDetails = null;
        this.progressLogs = null;
        this.currentProgress = 0;
    }

    criar() {
        const modalAntigo = document.getElementById('modalProgressoValidacao');
        if (modalAntigo) modalAntigo.remove();
        const backdropAntigo = document.querySelector('.modal-backdrop-custom');
        if (backdropAntigo) backdropAntigo.remove();

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop-custom';
        backdrop.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;animation:fadeIn 0.3s ease;`;
        document.body.appendChild(backdrop);

        this.modal = document.createElement('div');
        this.modal.id = 'modalProgressoValidacao';
        this.modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s ease;`;

        this.modal.innerHTML = `
    <div style="background:white;border:2px solid #e2ccae;border-radius:12px;overflow:hidden;max-height:90vh;width:90%;max-width:600px;display:flex;flex-direction:column;animation:slideDown 0.3s ease;">
        <div style="background:linear-gradient(135deg,#F9E7D2 0%,#e2ccae 100%);padding:1.5rem;flex-shrink:0;">
            <h5 style="font-family:'Lexend Deca';font-weight:600;color:#4E3629;display:flex;align-items:center;gap:10px;margin:0;">
                <i class="bi bi-gear-fill" style="font-size:24px;animation:spin 2s linear infinite;"></i>
                Validando ${this.tipoDocumento}
            </h5>
        </div>
        <div style="padding:2rem;font-family:'Lexend Deca';overflow-y:auto;max-height:calc(90vh - 100px);">
            <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="width:80px;height:80px;margin:0 auto;background:#F9E7D2;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <i class="bi bi-robot" style="font-size:40px;color:#8B4513;animation:pulse 2s infinite;"></i>
                </div>
            </div>
            <div style="margin-bottom:1.5rem;">
                <p id="progressMessage" style="text-align:center;color:#4E3629;font-weight:600;font-size:16px;margin:0;">Preparando análise...</p>
                <p id="progressDetails" style="text-align:center;color:#666;font-size:13px;margin:0.5rem 0 0;">Aguarde enquanto nossa IA verifica o documento</p>
            </div>
            <div style="background:#e0e0e0;border-radius:10px;height:8px;overflow:hidden;margin-bottom:1.5rem;">
                <div id="progressBar" style="height:100%;background:linear-gradient(90deg,#e2ccae,#caae8d);width:0%;transition:width 0.3s ease;"></div>
            </div>
            <div id="progressLogs" style="min-height:150px;max-height:200px;overflow-y:auto;background:#f8f9fa;border-radius:8px;padding:1rem;font-size:13px;border:1px solid #dee2e6;">
                <div style="color:#666;text-align:center;font-style:italic;">Aguardando início da validação...</div>
            </div>
        </div>
    </div>`;

        const style = document.createElement('style');
        style.id = 'modal-animations';
        if (!document.getElementById('modal-animations')) {
            style.textContent = `
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    @keyframes pulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.1);opacity:0.8;}}
    @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
    @keyframes fadeOut{from{opacity:1;}to{opacity:0;}}
    @keyframes slideDown{from{transform:translateY(-50px);opacity:0;}to{transform:translateY(0);opacity:1;}}
    #progressLogs>div:empty{display:none!important;}
    #progressLogs>div:last-child{border-bottom:none!important;}`;
            document.head.appendChild(style);
        }
        document.body.appendChild(this.modal);

        this.progressBar = this.modal.querySelector('#progressBar');
        this.progressMessage = this.modal.querySelector('#progressMessage');
        this.progressDetails = this.modal.querySelector('#progressDetails');
        this.progressLogs = this.modal.querySelector('#progressLogs');
    }

    atualizarProgresso(percent, message, details = '') {
        this.currentProgress = percent;
        if (this.progressBar) this.progressBar.style.width = `${percent}%`;
        if (this.progressMessage) this.progressMessage.textContent = message;
        if (this.progressDetails) this.progressDetails.textContent = details;
    }

    adicionarLog(message, type = 'info') {
        if (!this.progressLogs || !message || message.trim() === '') return;
        if (this.progressLogs.querySelector('[style*="italic"]')) this.progressLogs.innerHTML = '';

        const logItem = document.createElement('div');
        logItem.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #e0e0e0;';

        const icons = {
            info: { icon: 'bi-info-circle-fill', color: '#3d2106' },
            success: { icon: 'bi-check-circle-fill', color: '#28a745' },
            error: { icon: 'bi-x-circle-fill', color: '#dc3545' },
            warning: { icon: 'bi-exclamation-triangle-fill', color: '#ffc107' }
        };
        const { icon, color } = icons[type] || icons.info;

        logItem.innerHTML = `<i class="bi ${icon}" style="color:${color};margin-top:2px;font-size:14px;flex-shrink:0;"></i><span style="color:#333;line-height:1.5;word-break:break-word;">${message}</span>`;
        this.progressLogs.appendChild(logItem);
        this.progressLogs.scrollTop = this.progressLogs.scrollHeight;
    }

    mostrarErro(motivoErro) {
        this.atualizarProgresso(100, 'Documento Rejeitado', '');
        this.adicionarLog('Documento não aprovado pela validação automática', 'error');
        const motivoFormatado = motivoErro.length > 100 ? motivoErro.match(/.{1,100}(\s|$)/g).join('\n') : motivoErro;
        this.adicionarLog('Motivo da rejeição:', 'warning');
        this.adicionarLog(motivoFormatado, 'error');
        this.adicionarLog('Sugestão: Verifique se o documento possui todos os elementos obrigatórios e tente novamente.', 'info');

        setTimeout(() => {
            const modalBody = this.modal.querySelector('[style*="padding:2rem"]') || this.modal.querySelector('[style*="padding: 2rem"]');
            if (!modalBody || modalBody.querySelector('#errorButtonContainer')) return;
            
            const container = document.createElement('div');
            container.id = 'errorButtonContainer';
            container.style.cssText = 'text-align:center;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #dee2e6;';
            container.innerHTML = `<button class="btn" style="background-color:#e2ccae;color:#3d2106;border:none;padding:12px 40px;border-radius:8px;font-weight:500;font-size:15px;cursor:pointer;transition:all 0.3s;" onmouseover="this.style.backgroundColor='#d4b895'" onmouseout="this.style.backgroundColor='#e2ccae'" onclick="document.getElementById('modalProgressoValidacao').remove();document.querySelector('.modal-backdrop-custom')?.remove();"><i class="bi bi-check-circle" style="margin-right:8px;"></i>Entendi</button>`;
            modalBody.appendChild(container);
            setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
        }, 3000);
    }

    mostrarSucesso() {
        this.atualizarProgresso(100, 'Validação Concluída com Sucesso!', '');
        this.adicionarLog('Documento aprovado pela IA', 'success');
        this.adicionarLog('Salvando informações...', 'info');
    }

    fechar() {
        const modal = document.getElementById('modalProgressoValidacao');
        const backdrop = document.querySelector('.modal-backdrop-custom');
        if (modal) { modal.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => modal.remove(), 300); }
        if (backdrop) { backdrop.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => backdrop.remove(), 300); }
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

document.addEventListener('DOMContentLoaded', () => {
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

    let selectedFile = null, editSelectedFile = null, allDocuments = [], editModalInstance = null;
    setTimeout(() => { window.SiteLoader?.hide(); }, 500);

    const showLoader = (isLoading) => { ui.loader && (ui.loader.style.display = isLoading ? 'block' : 'none'); };
    const showEmptyState = (isEmpty) => { ui.emptyState && (ui.emptyState.style.display = isEmpty ? 'block' : 'none'); };
    const showGrid = (shouldShow) => { ui.documentsContainer && (ui.documentsContainer.style.display = shouldShow ? 'grid' : 'none'); };
    const showAlert = (message, isError = true) => {
        const el = isError ? ui.alertMessage : ui.successMessage;
        if (!el) return;
        el.textContent = message; el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    };
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group, .form-group1, .file-upload-group')?.querySelector('.error-message');
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

    const validateForm = (isEdit = false) => {
        const elements = {
            name: isEdit ? ui.editCompanyNameInput : ui.companyNameInput,
            type: isEdit ? ui.editDocumentTypeSelect : ui.documentTypeSelect,
            value: isEdit ? ui.editDocumentValueInput : ui.documentValueInput,
            file: isEdit ? null : ui.fileUploadArea
        };
        const errors = [];
        if (!validateField(elements.name, elements.name.value.trim().length >= 5, 'O nome deve ter no mínimo 5 caracteres.')) errors.push('Nome');
        if (!validateField(elements.type, elements.type.selectedIndex !== 0, 'Selecione um tipo de documento.')) errors.push('Tipo');
        if (!validateField(elements.value, elements.value.value !== '' && parseFloat(elements.value.value) > 0, 'O valor é obrigatório.')) errors.push('Valor');
        if (!isEdit && elements.file && !validateField(elements.file, selectedFile !== null, 'Selecione um arquivo.')) errors.push('Arquivo');
        return { isValid: errors.length === 0, errors: [...new Set(errors)] };
    };

    const setupRealTimeValidation = () => {
        ui.companyNameInput.addEventListener('blur', () => validateField(ui.companyNameInput, ui.companyNameInput.value.trim().length >= 5, 'O nome deve ter no mínimo 5 caracteres.'));
        ui.documentTypeSelect.addEventListener('blur', () => validateField(ui.documentTypeSelect, ui.documentTypeSelect.selectedIndex !== 0, 'Selecione um tipo.'));
        ui.documentValueInput.addEventListener('blur', () => validateField(ui.documentValueInput, ui.documentValueInput.value !== '' && parseFloat(ui.documentValueInput.value) > 0, 'O valor é obrigatório.'));
        ui.editCompanyNameInput.addEventListener('blur', () => validateField(ui.editCompanyNameInput, ui.editCompanyNameInput.value.trim().length >= 5, 'O nome deve ter no mínimo 5 caracteres.'));
        ui.editDocumentTypeSelect.addEventListener('blur', () => validateField(ui.editDocumentTypeSelect, ui.editDocumentTypeSelect.selectedIndex !== 0, 'Selecione um tipo.'));
        ui.editDocumentValueInput.addEventListener('blur', () => validateField(ui.editDocumentValueInput, ui.editDocumentValueInput.value !== '' && parseFloat(ui.editDocumentValueInput.value) > 0, 'O valor é obrigatório.'));
    };

    const handleFileSelection = (file) => {
        if (!file) { selectedFile = null; ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui'; return; }
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
        const maxSize = 10 * 1024 * 1024;
        if (!allowedTypes.includes(file.type)) { validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF, DOC, JPG ou PNG.'); selectedFile = null; return; }
        if (file.size > maxSize) { validateField(ui.fileUploadArea, false, 'Arquivo muito grande (máximo 10MB).'); selectedFile = null; return; }
        selectedFile = file; ui.fileUploadText.textContent = `Arquivo: ${file.name}`; validateField(ui.fileUploadArea, true, '');
    };

    const fetchData = async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/entrar'; throw new Error('Sessão expirada.'); }
        const headers = { 'Authorization': `Bearer ${session.access_token}`, ...options.headers };
        if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        if (!response.ok) throw { message: result.message || 'Erro.', detalhes: result.detalhes, tipo_erro: result.tipo_erro };
        return result;
    };

    const loadDocuments = async () => {
        showLoader(true); showGrid(false); showEmptyState(false);
        try { allDocuments = await fetchData('/api/documentos'); renderDocuments(allDocuments); }
        catch (error) { showAlert(error.message); renderDocuments([]); }
        finally { showLoader(false); }
    };

    // ✅ SUBMIT COM VALIDAÇÃO IA E MODAL
    const submitForm = async (e) => {
        e.preventDefault();
        const validation = validateForm();
        if (!validation.isValid) { showAlert(`Corrija os campos: ${validation.errors.join(', ')}`); return; }

        ui.submitBtn.disabled = true;
        ui.submitBtn.textContent = 'Validando...';
        const modal = new ModalValidacaoIA('Documento Comprobatório');
        modal.criar();

        try {
            await modal.sleep(800);
            modal.atualizarProgresso(10, 'Iniciando validação...', 'Preparando documento');
            modal.adicionarLog('Preparando documento para análise', 'info');

            await modal.sleep(1200);
            modal.atualizarProgresso(20, 'Enviando para análise...', 'Conectando com IA');
            modal.adicionarLog('Enviando documento para servidor', 'info');

            const formData = new FormData();
            formData.append('titulo', ui.companyNameInput.value);
            formData.append('tipo_documento', ui.documentTypeSelect.value);
            formData.append('valor', ui.documentValueInput.value);
            formData.append('arquivo_documento', selectedFile);

            await modal.sleep(1000);
            modal.atualizarProgresso(30, 'Analisando documento...', 'A IA está processando');
            modal.adicionarLog('Inteligência Artificial analisando conteúdo...', 'info');

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw { message: 'Sessão expirada. Faça login novamente.' };

            const response = await fetch('/api/documentos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const result = await response.json();

            await modal.sleep(1500);
            modal.atualizarProgresso(60, 'Verificando estrutura...', 'Validando formato');
            modal.adicionarLog('Verificando elementos obrigatórios', 'info');

            await modal.sleep(1200);
            modal.atualizarProgresso(80, 'Análise de conteúdo...', 'Verificando autenticidade');
            modal.adicionarLog('Analisando informações do comprovante', 'info');

            if (!response.ok) {
                if (result.tipo_erro === 'validacao_ia') {
                    modal.mostrarErro(result.detalhes);
                    await modal.sleep(10000);
                    modal.fechar();
                    showAlert(`Documento rejeitado: ${result.detalhes}`, true);
                } else { throw { message: result.message || 'Erro ao enviar documento.' }; }
                return;
            }

            await modal.sleep(800);
            modal.mostrarSucesso();
            await modal.sleep(1500);
            modal.adicionarLog('Salvando no banco de dados', 'info');
            await modal.sleep(1000);
            modal.adicionarLog('Documento adicionado com sucesso!', 'success');
            await modal.sleep(2000);
            modal.fechar();

            showAlert(result.message || 'Documento adicionado com sucesso!', false);
            ui.form.reset(); handleFileSelection(null); loadDocuments();
        } catch (error) {
            const msg = error.detalhes || error.message;
            modal.mostrarErro(msg);
            await modal.sleep(8000);
            modal.fechar();
            showAlert(error.message);
        } finally {
            ui.submitBtn.disabled = false;
            ui.submitBtn.textContent = 'Adicionar Documento';
        }
    };

    const deleteDocument = async (docId, docTitle) => {
        if (confirm(`Excluir o documento "${docTitle}"?`)) {
            try { const result = await fetchData(`/api/documentos/${docId}`, { method: 'DELETE' }); showAlert(result.message, false); loadDocuments(); }
            catch (error) { showAlert(error.message); }
        }
    };

    const openEditModal = (docId) => {
        const doc = allDocuments.find(d => d.id == docId);
        if (!doc) { showAlert('Documento não encontrado.'); return; }
        ui.editIdInput.value = doc.id;
        ui.editCompanyNameInput.value = doc.titulo;
        ui.editDocumentValueInput.value = doc.valor;
        ui.editDocumentTypeSelect.value = doc.tipo_documento;
        ui.editFileInput.value = ''; editSelectedFile = null;
        ui.editFileUploadText.textContent = 'Clique para selecionar um novo arquivo (opcional)';
        if (!editModalInstance) editModalInstance = new bootstrap.Modal(ui.editModal);
        editModalInstance.show();
    };

    const handleSaveChanges = async () => {
        const validation = validateForm(true);
        if (!validation.isValid) { showAlert(`Corrija os campos: ${validation.errors.join(', ')}`); return; }

        const docId = ui.editIdInput.value;
        const formData = new FormData();
        formData.append('titulo', ui.editCompanyNameInput.value);
        formData.append('valor', ui.editDocumentValueInput.value);
        formData.append('tipo_documento', ui.editDocumentTypeSelect.value);
        if (editSelectedFile) formData.append('arquivo_documento', editSelectedFile);

        ui.saveEditBtn.disabled = true;
        ui.saveEditBtn.textContent = 'Salvando...';

        try {
            const result = await fetchData(`/api/documentos/${docId}`, { method: 'PUT', body: formData });
            showAlert(result.message, false);
            editModalInstance.hide();
            loadDocuments();
        } catch (error) { showAlert(error.message); }
        finally { ui.saveEditBtn.disabled = false; ui.saveEditBtn.textContent = 'Salvar Alterações'; }
    };

    const renderDocuments = (docs) => {
        if (!ui.documentsContainer) return;
        ui.documentsContainer.innerHTML = '';
        if (!docs || docs.length === 0) { showEmptyState(true); showGrid(false); return; }
        showEmptyState(false); showGrid(true);
        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'uploaded-item';
            const linkedToHtml = doc.gestao_financeira ? `<p class="document-linked-to"><i class="bi bi-link-45deg"></i> Vinculado a: ${doc.gestao_financeira.nome_categoria}</p>` : '';
            card.innerHTML = `
            <div class="document-header">
                <div style="flex:1;"><h3 class="document-title">${doc.titulo}</h3><p class="document-company">${doc.tipo_documento}</p></div>
                <button class="edit-btn-round" data-id="${doc.id}"><svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg></button>
            </div>
            ${linkedToHtml}
            <p class="document-value">${formatCurrency(doc.valor)}</p>
            <div class="document-actions">
                <button class="view-btn" data-path="${doc.caminho_arquivo}"><i class="bi bi-box-arrow-up-right"></i> Visualizar</button>
                <button class="delete" data-id="${doc.id}" data-title="${doc.titulo}"><i class="bi bi-trash-fill"></i> Excluir</button>
            </div>`;
            ui.documentsContainer.appendChild(card);
        });
    };

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
            try {
                const { data } = supabase.storage.from('comprovantes').getPublicUrl(viewBtn.dataset.path);
                if (!data?.publicUrl) throw new Error();
                window.open(data.publicUrl, '_blank');
            } catch { showAlert('Não foi possível abrir o arquivo.'); }
        }
        if (deleteBtn) deleteDocument(deleteBtn.dataset.id, deleteBtn.dataset.title);
        if (editBtn) openEditModal(editBtn.dataset.id);
    });

    ui.fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ui.fileUploadArea.classList.add('dragover'); });
    ui.fileUploadArea.addEventListener('dragleave', () => ui.fileUploadArea.classList.remove('dragover'));
    ui.fileUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ui.fileUploadArea.classList.remove('dragover'); handleFileSelection(e.dataTransfer.files[0]); });

    setupRealTimeValidation();
    loadDocuments();
});