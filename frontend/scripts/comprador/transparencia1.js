import supabase from '/scripts/supabaseClient.js';

// Configurações de validação para relatórios
const reportValidationRules = {
    title: { min: 10, max: 150, required: true },
    description: { min: 20, max: 1000, required: true },
    file: { required: true, maxSize: 10, allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'] }
};

// ✅ 1️⃣ CLASSE PRIMEIRO - ANTES DE TUDO
class ModalValidacaoIA {
    constructor(tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
        this.modal = null;
        this.bsModal = null;
        this.progressBar = null;
        this.progressMessage = null;
        this.progressDetails = null;
        this.progressLogs = null;
        this.currentProgress = 0;
    }

    criar() {
        const modalAntigo = document.getElementById('modalProgressoValidacao');
        if (modalAntigo) modalAntigo.remove();

        this.modal = document.createElement('div');
        this.modal.id = 'modalProgressoValidacao';
        this.modal.className = 'modal fade';
        this.modal.setAttribute('tabindex', '-1');
        this.modal.setAttribute('data-bs-backdrop', 'static');
        this.modal.setAttribute('data-bs-keyboard', 'false');

        this.modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content" style="border: 2px solid #e2ccae; border-radius: 12px; overflow: hidden; max-height: 90vh;">
            <div class="modal-header" style="background: linear-gradient(135deg, #F9E7D2 0%, #e2ccae 100%); border: none; padding: 1.5rem; flex-shrink: 0;">
                <h5 class="modal-title" style="font-family: 'Lexend Deca'; font-weight: 600; color: #4E3629; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-gear-fill" style="font-size: 24px; animation: spin 2s linear infinite;"></i>
                    Validando ${this.tipoDocumento}
                </h5>
            </div>
            <div class="modal-body" style="padding: 2rem; font-family: 'Lexend Deca'; overflow-y: auto; max-height: calc(90vh - 100px);">
                <!-- Ícone Central -->
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="width: 80px; height: 80px; margin: 0 auto; background: #F9E7D2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-robot" style="font-size: 40px; color: #8B4513; animation: pulse 2s infinite;"></i>
                    </div>
                </div>

                <!-- Mensagem de Progresso -->
                <div style="margin-bottom: 1.5rem;">
                    <p id="progressMessage" style="text-align: center; color: #4E3629; font-weight: 600; font-size: 16px; margin: 0;">
                        Preparando análise...
                    </p>
                    <p id="progressDetails" style="text-align: center; color: #666; font-size: 13px; margin: 0.5rem 0 0;">
                        Aguarde enquanto nossa IA verifica o documento
                    </p>
                </div>

                <!-- Barra de Progresso -->
                <div style="background: #e0e0e0; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 1.5rem;">
                    <div id="progressBar" style="height: 100%; background: linear-gradient(90deg, #e2ccae, #caae8d); width: 0%; transition: width 0.3s ease;"></div>
                </div>

               <!-- Logs de Validação -->
<div id="progressLogs" style="min-height: 150px; max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 1rem; font-size: 13px; border: 1px solid #dee2e6;">
    <div style="color: #666; text-align: center; font-style: italic;">
        Aguardando início da validação...
    </div>
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
    
    /* ✅ Remove espaços em branco extras */
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

        this.bsModal = new bootstrap.Modal(this.modal);
        this.bsModal.show();
    }

    atualizarProgresso(percent, message, details = '') {
        this.currentProgress = percent;
        if (this.progressBar) this.progressBar.style.width = `${percent}%`;
        if (this.progressMessage) this.progressMessage.textContent = message;
        if (this.progressDetails) this.progressDetails.textContent = details;
    }

    adicionarLog(message, type = 'info') {
    if (!this.progressLogs) return;
    
    // ✅ Ignora mensagens vazias
    if (!message || message.trim() === '') return;

    // Limpa mensagem de aguardando
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
    
    // Quebra o motivo em linhas se for muito longo
    const motivoFormatado = motivoErro.length > 100 
        ? motivoErro.match(/.{1,100}(\s|$)/g).join('\n') 
        : motivoErro;
    
    this.adicionarLog(` Motivo da rejeição:`, 'warning');
    this.adicionarLog(motivoFormatado, 'error');
    // ❌ REMOVA ESTA LINHA: this.adicionarLog('', 'info'); // Linha em branco
    this.adicionarLog(' Sugestão: Verifique se o documento possui todos os elementos obrigatórios e tente novamente.', 'info');

    // Adiciona botão de fechar após 3 segundos
    setTimeout(() => {
        const modalBody = this.modal.querySelector('.modal-body');
        if (!modalBody) return;
        
        // ✅ Verifica se o botão já foi adicionado
        if (modalBody.querySelector('#errorButtonContainer')) return;
        
        const container = document.createElement('div');
        container.id = 'errorButtonContainer';
        container.style.cssText = 'text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #dee2e6;';
        container.innerHTML = `
            <button class="btn" style="background-color: #e2ccae; color: #3d2106; border: none; padding: 12px 40px; border-radius: 8px; font-weight: 500; font-size: 15px; cursor: pointer; transition: all 0.3s;" 
                onmouseover="this.style.backgroundColor='#d4b895'" 
                onmouseout="this.style.backgroundColor='#e2ccae'"
                onclick="document.getElementById('modalProgressoValidacao').remove(); document.querySelector('.modal-backdrop')?.remove();">
                <i class="bi bi-check-circle" style="margin-right: 8px;"></i>Entendi
            </button>
        `;
        
        modalBody.appendChild(container);
        
        // ✅ Scroll automático para o botão ficar visível
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }, 3000);
}

    mostrarSucesso() {
        this.atualizarProgresso(100, ' Validação Concluída com Sucesso!', '');
        this.adicionarLog('Documento aprovado pela IA', 'success');
        this.adicionarLog('Salvando informações...', 'info');
    }

    fechar() {
        if (this.bsModal) {
            this.bsModal.hide();
        }
        setTimeout(() => {
            if (this.modal) this.modal.remove();
            document.querySelector('.modal-backdrop')?.remove();
        }, 500);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ✅ 2️⃣ FUNÇÕES DE API
async function loadReports() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão não encontrada.');

        const response = await fetch('/api/relatorios', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!response.ok) throw new Error('Falha ao buscar relatórios do servidor.');

        const reports = await response.json();
        updateReportsList(reports);
    } catch (error) {
        showAlert(error.message, true);
        updateReportsList([]);
    }
}

async function addReport(formData) {
    const submitBtn = document.querySelector('#reports-form .upload-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = ' Validando...';

    const modal = new ModalValidacaoIA('Relatório');
    modal.criar();

    try {
        await modal.sleep(800);
        modal.atualizarProgresso(10, 'Iniciando validação...', 'Preparando documento');
        modal.adicionarLog(' Preparando relatório para análise', 'info');

        await modal.sleep(1200);
        modal.atualizarProgresso(20, 'Enviando para análise...', 'Conectando com IA');
        modal.adicionarLog(' Enviando documento para servidor', 'info');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Faça o login novamente.');

        await modal.sleep(1000);
        modal.atualizarProgresso(30, ' Analisando documento...', 'A IA está processando o relatório');
        modal.adicionarLog(' Inteligência Artificial analisando conteúdo...', 'info');

        const response = await fetch('/api/relatorios', {
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
        modal.adicionarLog(' Analisando dados financeiros e informações', 'info');

        if (!response.ok) {
            if (result.tipo_erro === 'validacao_ia') {
                modal.mostrarErro(result.detalhes);
                await modal.sleep(10000);
                modal.fechar();
                showAlert(`Documento rejeitado: ${result.detalhes}`, true);
            } else {
                throw new Error(result.message || 'Erro ao enviar relatório.');
            }
            return;
        }

        await modal.sleep(800);
        modal.mostrarSucesso();
        
        await modal.sleep(1500);
        modal.adicionarLog(' Salvando no banco de dados', 'info');
        
        await modal.sleep(1000);
        modal.adicionarLog(' Relatório adicionado com sucesso!', 'success');

        await modal.sleep(2000);
        modal.fechar();

        showAlert(result.message || 'Relatório adicionado com sucesso!');
        resetForm(document.getElementById('reports-form'));
        loadReports();

   } catch (error) {
    const mensagemErro = error.message.includes('análise automática')
        ? error.message.split('detalhes: ')[1] || error.message
        : error.message;

    modal.mostrarErro(mensagemErro);
    await modal.sleep(55000);  // ⬆️ 8 segundos para ler o erro
    modal.fechar();
    showAlert(error.message);
} finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Adicionar relatório';
    }
}

async function deleteReport(id) {
    const confirmMessage = `Tem certeza que deseja excluir este relatório?\n\nEsta ação não pode ser desfeita e o relatório será removido permanentemente.`;
    
    if (confirm(confirmMessage)) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');

            const response = await fetch(`/api/relatorios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao excluir relatório.');
            
            showAlert(result.message);
            loadReports();
        } catch (error) {
            showAlert(error.message, true);
        }
    }
}

async function downloadFile(filePath) {
    if (!filePath) {
        showAlert('Caminho do arquivo não encontrado.', true);
        return;
    }
    
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<span style="color: #28a745;">✓ Gerando link...</span>';
    button.disabled = true;

    try {
        const { data } = supabase.storage.from('reports').getPublicUrl(filePath);

        if (!data || !data.publicUrl) {
            throw new Error('Não foi possível gerar a URL pública do arquivo.');
        }
        
        window.open(data.publicUrl, '_blank');

    } catch (error) {
        showAlert(error.message || 'Erro ao gerar link para download.', true);
        console.error(error);
    } finally {
        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1500);
    }
}

// ✅ 3️⃣ FUNÇÕES DE SETUP E UI
function setupReportsForm() {
    const form = document.getElementById('reports-form');
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const validation = validateReportsForm();
        if (!validation.isValid) {
            showAlert(`Por favor, corrija os seguintes campos: ${validation.errors.join(', ')}`, true);
            return;
        }
        const formData = new FormData();
        formData.append('titulo', document.getElementById('report-title').value.trim());
        formData.append('descricao', document.getElementById('report-description').value.trim());
        formData.append('arquivo_relatorio', document.getElementById('report-file').files[0]);
        addReport(formData);
    });
}

function updateReportsList(reports) {
    const listContainer = document.getElementById('reports-list');
    const title = listContainer.querySelector('h3');
    listContainer.innerHTML = '';
    listContainer.appendChild(title);

    if (!reports || reports.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Nenhum relatório publicado ainda.';
        emptyMessage.style.cssText = 'color: #333; text-align: center; padding: 20px;';
        listContainer.appendChild(emptyMessage);
        return;
    }

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'cards-grid';
    
    reports.sort((a, b) => new Date(b.data_publicacao) - new Date(a.data_publicacao));

    reports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'card';
        const descriptionSnippet = report.descricao.length > 80 ? report.descricao.substring(0, 80) + '...' : report.descricao;
        const reportJsonString = JSON.stringify(report).replace(/'/g, "&apos;");

        card.innerHTML = `
            <h3>${report.titulo}</h3>
            <div class="card-description">${descriptionSnippet}</div>
            <div class="card-meta">
                <div>Publicado em: ${new Date(report.data_publicacao).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="card-actions">
                <button class="download-btn" onclick="downloadFile('${report.caminho_arquivo}')">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" fill="currentColor"/></svg> Download
                </button>
                <button class="view-description-btn" onclick='showDescription(${reportJsonString})'>
                    <svg class="icon" id="oio" viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" fill="currentColor"/></svg> Descrição
                </button>
                <button class="delete-btn" onclick="deleteReport(${report.id})"><i class="bi bi-trash-fill"></i> Excluir</button>            
            </div>
        `;
        cardsGrid.appendChild(card);
    });

    listContainer.appendChild(cardsGrid);
}

function showDescription(report) {
    if (!report) return;
    const modal = document.getElementById('descriptionModal');
    document.getElementById('modal-title').textContent = report.titulo;
    document.getElementById('modal-description').textContent = report.descricao;
    modal.style.display = 'block';
}

function editReport() {
    showAlert('A funcionalidade de edição será implementada em breve.', false);
}

function setupRealTimeValidation() {
    document.querySelectorAll('#reports-form input, #reports-form textarea').forEach(input => {
        input.addEventListener('blur', () => validateSingleField(input));
        input.addEventListener('input', () => {
            clearFieldError(input);
            updateCharacterCounter(input);
        });
    });
    document.getElementById('report-file').addEventListener('change', (e) => validateFileField(e.target));
}

function validateSingleField(field) {
    const fieldName = field.id.replace('report-', '');
    if (!reportValidationRules[fieldName]) return true;
    const rules = reportValidationRules[fieldName];
    const value = field.value.trim();
    let isValid = true, errorMessage = '';

    if (rules.required && !value) {
        isValid = false;
        errorMessage = 'Este campo é obrigatório.';
    } else if (rules.min && value.length < rules.min) {
        isValid = false;
        errorMessage = `Mínimo de ${rules.min} caracteres.`;
    } else if (rules.max && value.length > rules.max) {
        isValid = false;
        errorMessage = `Máximo de ${rules.max} caracteres.`;
    }

    if (isValid) {
        field.classList.remove('error');
        hideFieldError(field.id);
    } else {
        field.classList.add('error');
        showFieldError(field.id, errorMessage);
    }
    return isValid;
}

function validateFileField(fileInput) {
    const rules = reportValidationRules.file;
    const file = fileInput.files[0];
    const fileUploadDiv = fileInput.closest('.file-upload');
    let isValid = true, errorMessage = '';

    if (rules.required && !file) {
        isValid = false;
        errorMessage = 'Por favor, selecione um arquivo.';
    } else if (file) {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > rules.maxSize) {
            isValid = false;
            errorMessage = `Arquivo muito grande (máx: ${rules.maxSize}MB).`;
        }
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!rules.allowedTypes.includes(fileExtension)) {
            isValid = false;
            errorMessage = `Tipo de arquivo não permitido.`;
        }
    }

    if (isValid) {
        fileUploadDiv.classList.remove('error');
        hideFieldError('report-file');
        if (file) updateFileUploadDisplay(fileUploadDiv, file.name);
    } else {
        fileUploadDiv.classList.add('error');
        showFieldError('report-file', errorMessage);
    }
    return isValid;
}

function validateReportsForm() {
    let isFormValid = true;
    let errors = [];
    const fieldNames = { title: 'Título', description: 'Descrição', file: 'Arquivo' };

    ['report-title', 'report-description'].forEach(id => {
        if (!validateSingleField(document.getElementById(id))) {
            isFormValid = false;
            errors.push(fieldNames[id.replace('report-', '')]);
        }
    });
    if (!validateFileField(document.getElementById('report-file'))) {
        isFormValid = false;
        errors.push(fieldNames.file);
    }
    return { isValid: isFormValid, errors: [...new Set(errors)] };
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + '-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideFieldError(fieldId) {
    const errorElement = document.getElementById(fieldId + '-error');
    if (errorElement) errorElement.style.display = 'none';
}

function clearFieldError(field) {
    field.classList.remove('error');
    hideFieldError(field.id);
}

function showAlert(message, isError = false) {
    const alertElement = document.getElementById(isError ? 'alert-reports' : 'success-reports');
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => { alertElement.style.display = 'none'; }, isError ? 5000 : 3000);
    }
}

function resetForm(form) {
    form.reset();
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.valid').forEach(el => el.classList.remove('valid'));
    form.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    const fileUpload = form.querySelector('.file-upload');
    if (fileUpload) {
        fileUpload.classList.remove('error', 'valid');
        fileUpload.querySelector('p').textContent = 'Clique para selecionar o arquivo ou arraste aqui';
        fileUpload.style.borderColor = '';
        fileUpload.style.backgroundColor = '';
    }
    updateAllCharacterCounters();
}

function setupDragAndDrop() {
    const fileUpload = document.querySelector('.file-upload');
    const input = fileUpload.querySelector('input[type="file"]');
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') fileUpload.classList.add('dragover');
            if (eventName === 'dragleave' || eventName === 'drop') fileUpload.classList.remove('dragover');
            if (eventName === 'drop') {
                input.files = e.dataTransfer.files;
                validateFileField(input);
            }
        });
    });
}

function updateFileUploadDisplay(upload, fileName) {
    const p = upload.querySelector('p');
    p.textContent = `Arquivo: ${fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName}`;
}

function setupModal() {
    const modal = document.getElementById('descriptionModal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };
}

function addCharacterCounters() {
    [{ id: 'report-title', max: 150 }, { id: 'report-description', max: 1000 }].forEach(field => {
        const element = document.getElementById(field.id);
        if (!element) return;
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.id = `${field.id}-counter`;
        element.parentNode.insertBefore(counter, element.nextSibling.nextSibling);
        element.addEventListener('input', () => updateCharacterCounter(element));
        updateCharacterCounter(element);
    });
}

function updateCharacterCounter(element) {
    const counter = document.getElementById(element.id + '-counter');
    if (!counter) return;
    const rule = reportValidationRules[element.id.replace('report-', '')];
    if (!rule || !rule.max) return;
    const length = element.value.length;
    counter.textContent = `${length}/${rule.max}`;
    if (length > rule.max) counter.style.color = '#dc3545';
    else if (length > rule.max * 0.9) counter.style.color = '#ffc107';
    else counter.style.color = '#6c757d';
}

function updateAllCharacterCounters() {
    updateCharacterCounter(document.getElementById('report-title'));
    updateCharacterCounter(document.getElementById('report-description'));
}

// ✅ 4️⃣ INICIALIZAÇÃO - POR ÚLTIMO
document.addEventListener('DOMContentLoaded', function () {
    setupReportsForm();
    setupRealTimeValidation();
    setupDragAndDrop();
    setupModal();
    addCharacterCounters();
    loadReports();
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);
});

// Expondo funções para o onclick do HTML
window.downloadFile = downloadFile;
window.showDescription = showDescription;
window.editReport = editReport;
window.deleteReport = deleteReport;