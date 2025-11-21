import supabase from '/scripts/supabaseClient.js';

// ✅ CLASSE MODAL SEM BOOTSTRAP
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

        // Cria backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop-custom';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9998;
            animation: fadeIn 0.3s ease;
        `;
        document.body.appendChild(backdrop);

        this.modal = document.createElement('div');
        this.modal.id = 'modalProgressoValidacao';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        this.modal.innerHTML = `
    <div style="background: white; border: 2px solid #e2ccae; border-radius: 12px; overflow: hidden; max-height: 90vh; width: 90%; max-width: 600px; display: flex; flex-direction: column; animation: slideDown 0.3s ease;">
        <div style="background: linear-gradient(135deg, #F9E7D2 0%, #e2ccae 100%); border: none; padding: 1.5rem; flex-shrink: 0;">
            <h5 style="font-family: 'Lexend Deca'; font-weight: 600; color: #4E3629; display: flex; align-items: center; gap: 10px; margin: 0;">
                <i class="bi bi-gear-fill" style="font-size: 24px; animation: spin 2s linear infinite;"></i>
                Validando ${this.tipoDocumento}
            </h5>
        </div>
        <div style="padding: 2rem; font-family: 'Lexend Deca'; overflow-y: auto; max-height: calc(90vh - 100px);">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 80px; height: 80px; margin: 0 auto; background: #F9E7D2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-robot" style="font-size: 40px; color: #8B4513; animation: pulse 2s infinite;"></i>
                </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <p id="progressMessage" style="text-align: center; color: #4E3629; font-weight: 600; font-size: 16px; margin: 0;">
                    Preparando análise...
                </p>
                <p id="progressDetails" style="text-align: center; color: #666; font-size: 13px; margin: 0.5rem 0 0;">
                    Aguarde enquanto nossa IA verifica o documento
                </p>
            </div>

            <div style="background: #e0e0e0; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 1.5rem;">
                <div id="progressBar" style="height: 100%; background: linear-gradient(90deg, #e2ccae, #caae8d); width: 0%; transition: width 0.3s ease;"></div>
            </div>

            <div id="progressLogs" style="min-height: 150px; max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 1rem; font-size: 13px; border: 1px solid #dee2e6;">
                <div style="color: #666; text-align: center; font-style: italic;">
                    Aguardando início da validação...
                </div>
            </div>
        </div>
    </div>
`;

        const style = document.createElement('style');
        style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    @keyframes slideDown {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    #progressLogs > div:empty {
        display: none !important;
    }
    
    #progressLogs > div:last-child {
        border-bottom: none !important;
    }
    
    #errorButtonContainer {
        margin-top: 0 !important;
    }
`;
        document.head.appendChild(style);
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
        if (!this.progressLogs) return;
        
        if (!message || message.trim() === '') return;

        if (this.progressLogs.querySelector('[style*="italic"]')) {
            this.progressLogs.innerHTML = '';
        }

        const logItem = document.createElement('div');
        logItem.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;';

        const icons = {
            info: { icon: 'bi-info-circle-fill', color: '#3d2106' },
            success: { icon: 'bi-check-circle-fill', color: '#28a745' },
            error: { icon: 'bi-x-circle-fill', color: '#dc3545' },
            warning: { icon: 'bi-exclamation-triangle-fill', color: '#ffc107' }
        };

        const { icon, color } = icons[type] || icons.info;

        logItem.innerHTML = `
            <i class="bi ${icon}" style="color: ${color}; margin-top: 2px; font-size: 14px; flex-shrink: 0;"></i>
            <span style="color: #333; line-height: 1.5; word-break: break-word;">${message}</span>
        `;

        this.progressLogs.appendChild(logItem);
        this.progressLogs.scrollTop = this.progressLogs.scrollHeight;
    }

    mostrarErro(motivoErro) {
        this.atualizarProgresso(100, ' Documento Rejeitado', '');
        this.adicionarLog(` Documento não aprovado pela validação automática`, 'error');
        
        const motivoFormatado = motivoErro.length > 100 
            ? motivoErro.match(/.{1,100}(\s|$)/g).join('\n') 
            : motivoErro;
        
        this.adicionarLog(` Motivo da rejeição:`, 'warning');
        this.adicionarLog(motivoFormatado, 'error');
        this.adicionarLog(' Sugestão: Verifique se o documento possui todos os elementos obrigatórios e tente novamente.', 'info');

        setTimeout(() => {
            const modalBody = this.modal.querySelector('[style*="padding: 2rem"]');
            if (!modalBody) return;
            
            if (modalBody.querySelector('#errorButtonContainer')) return;
            
            const container = document.createElement('div');
            container.id = 'errorButtonContainer';
            container.style.cssText = 'text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #dee2e6;';
            container.innerHTML = `
                <button class="btn" style="background-color: #e2ccae; color: #3d2106; border: none; padding: 12px 40px; border-radius: 8px; font-weight: 500; font-size: 15px; cursor: pointer; transition: all 0.3s;" 
                    onmouseover="this.style.backgroundColor='#d4b895'" 
                    onmouseout="this.style.backgroundColor='#e2ccae'"
                    onclick="document.getElementById('modalProgressoValidacao').remove(); document.querySelector('.modal-backdrop-custom')?.remove();">
                    <i class="bi bi-check-circle" style="margin-right: 8px;"></i>Entendi
                </button>
            `;
            
            modalBody.appendChild(container);
            
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }, 3000);
    }

    mostrarSucesso() {
        this.atualizarProgresso(100, ' Validação Concluída com Sucesso!', '');
        this.adicionarLog(' Documento aprovado pela IA', 'success');
        this.adicionarLog(' Salvando informações...', 'info');
    }

    fechar() {
        const modal = document.getElementById('modalProgressoValidacao');
        const backdrop = document.querySelector('.modal-backdrop-custom');
        
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
        
        if (backdrop) {
            backdrop.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => backdrop.remove(), 300);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ✅ RESTO DO CÓDIGO IGUAL
document.addEventListener('DOMContentLoaded', () => {
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
        modal: document.getElementById('descriptionModal'),
        modalTitle: document.getElementById('modal-title'),
        modalDescription: document.getElementById('modal-description'),
    };

    let selectedFile = null;

    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);

    const showLoader = (isLoading) => { if(ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if(ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showContractsGrid = (shouldShow) => { if(ui.contractsList) ui.contractsList.style.display = shouldShow ? 'grid' : 'none'; };
    const showAlert = (message, isError = true) => {
        const alertElement = isError ? ui.alertMessage : ui.successMessage;
        if(alertElement) {
            alertElement.textContent = message;
            alertElement.style.display = 'block';
            setTimeout(() => { alertElement.style.display = 'none'; }, 5000);
        }
    };

    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group, .file-upload').querySelector('.error-message');
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
    
    const validateForm = () => {
        const errors = [];
        if (!validateField(ui.titleInput, ui.titleInput.value.trim().length >= 10, 'O título deve ter no mínimo 10 caracteres.')) errors.push('Título');
        if (!validateField(ui.descriptionInput, ui.descriptionInput.value.trim().length >= 20, 'A descrição deve ter no mínimo 20 caracteres.')) errors.push('Descrição');
        if (!validateField(ui.yearSelect, ui.yearSelect.selectedIndex !== 0, 'Por favor, selecione um ano.')) errors.push('Ano');
        if (!validateField(ui.fileUploadArea, selectedFile !== null, 'Por favor, selecione um arquivo.')) errors.push('Arquivo');

        return { 
            isValid: errors.length === 0, 
            errors: [...new Set(errors)] 
        };
    };

    const setupRealTimeValidation = () => {
        ui.titleInput.addEventListener('blur', () => validateField(ui.titleInput, ui.titleInput.value.trim().length >= 10, 'O título deve ter no mínimo 10 caracteres.'));
        ui.descriptionInput.addEventListener('blur', () => validateField(ui.descriptionInput, ui.descriptionInput.value.trim().length >= 20, 'A descrição deve ter no mínimo 20 caracteres.'));
        ui.yearSelect.addEventListener('blur', () => validateField(ui.yearSelect, ui.yearSelect.selectedIndex !== 0, 'Por favor, selecione um ano.'));
    };

    const handleFileSelection = (file) => {
        validateField(ui.fileUploadArea, true, '');
        if (!file) {
            selectedFile = null;
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            return;
        }
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 15 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            validateField(ui.fileUploadArea, false, 'Formato inválido. Use PDF ou DOC.');
            selectedFile = null; return;
        }
        if (file.size > maxSize) {
            validateField(ui.fileUploadArea, false, 'Arquivo muito grande (máx 15MB).');
            selectedFile = null; return;
        }
        
        selectedFile = file;
        ui.fileUploadText.textContent = `Arquivo: ${file.name}`;
        validateField(ui.fileUploadArea, true, '');
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
    const validation = validateForm();
    if (!validation.isValid) {
        showAlert(`Por favor, corrija os seguintes campos: ${validation.errors.join(', ')}`);
        return;
    }

    ui.submitBtn.disabled = true;
    ui.submitBtn.textContent = ' Validando...';

    // ✅ CRIAR MODAL DE PROGRESSO
    const modal = new ModalValidacaoIA('Contrato');
    modal.criar();

    try {
        await modal.sleep(800);
        modal.atualizarProgresso(10, 'Iniciando validação...', 'Preparando documento');
        modal.adicionarLog(' Preparando contrato para análise', 'info');

        await modal.sleep(1200);
        modal.atualizarProgresso(20, 'Enviando para análise...', 'Conectando com IA');
        modal.adicionarLog(' Enviando documento para servidor', 'info');

        const formData = new FormData();
        formData.append('nome_contrato', ui.titleInput.value);
        formData.append('descricao', ui.descriptionInput.value);
        formData.append('ano_vigencia', ui.yearSelect.value);
        formData.append('arquivo_contrato', selectedFile);

        await modal.sleep(1000);
        modal.atualizarProgresso(30, ' Analisando documento...', 'A IA está processando o contrato');
        modal.adicionarLog(' Inteligência Artificial analisando conteúdo...', 'info');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Faça o login novamente.');

        const response = await fetch('/api/contratos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();

        await modal.sleep(1500);
        modal.atualizarProgresso(60, 'Verificando estrutura...', 'Validando formato do documento');
        modal.adicionarLog(' Verificando elementos obrigatórios', 'info');

        await modal.sleep(1200);
        modal.atualizarProgresso(80, 'Análise de conteúdo...', 'Verificando autenticidade');
        modal.adicionarLog(' Analisando cláusulas e condições', 'info');

        if (!response.ok) {
            if (result.detalhes) {
                modal.mostrarErro(result.detalhes);
                await modal.sleep(10000);
                modal.fechar();
                showAlert(`Documento rejeitado: ${result.detalhes}`, true);
            } else {
                throw new Error(result.message || 'Erro ao enviar contrato.');
            }
            return;
        }

        await modal.sleep(800);
        modal.mostrarSucesso();
        
        await modal.sleep(1500);
        modal.adicionarLog(' Salvando no banco de dados', 'info');
        
        await modal.sleep(1000);
        modal.adicionarLog(' Contrato adicionado com sucesso!', 'success');

        await modal.sleep(2000);
        modal.fechar();

        showAlert(result.message || 'Contrato adicionado com sucesso!', false);
        ui.form.reset();
        selectedFile = null;
        ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
        loadContracts();

    } catch (error) {
        const mensagemErro = error.message.includes('análise automática')
            ? error.message.split('detalhes: ')[1] || error.message
            : error.message;

        modal.mostrarErro(mensagemErro);
        await modal.sleep(8000);
        modal.fechar();
        showAlert(error.message);
    } finally {
        ui.submitBtn.disabled = false;
        ui.submitBtn.textContent = 'Adicionar contrato';
    }
};

    const deleteContract = async (contractId, contractTitle) => {
        if (confirm(`Tem certeza que deseja excluir o contrato "${contractTitle}"?`)) {
            try {
                const result = await fetchData(`/api/contratos/${contractId}`, { method: 'DELETE' });
                showAlert(result.message, false);
                loadContracts();
            } catch (error) {
                showAlert(error.message);
            }
        }
    };
    
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
                        <svg class="icon" viewBox="0 0 24 24">
                            <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" fill="currentColor"/>
                        </svg> Download
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

    function setupCustomModal() {
        const modal = ui.modal;
        if (!modal) return;
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = function() { modal.style.display = 'none'; }
        }
        window.onclick = function(event) {
            if (event.target == modal) { modal.style.display = 'none'; }
        }
    }

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
                    downloadBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" fill="currentColor"/></svg> Download';
                    downloadBtn.disabled = false;
                }, 1500);
            }
        }

        if (viewBtn) {
            ui.modalTitle.textContent = viewBtn.dataset.title;
            ui.modalDescription.textContent = viewBtn.dataset.description;
            ui.modal.style.display = 'block';
        }
        
        if (deleteBtn) {
            const contractId = deleteBtn.dataset.id;
            const contractTitle = deleteBtn.dataset.title;
            deleteContract(contractId, contractTitle);
        }
    });

    setupCustomModal();
    setupRealTimeValidation();
    loadContracts();
});