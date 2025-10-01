import supabase from '/scripts/supabaseClient.js';

// Configurações de validação para relatórios
const reportValidationRules = {
    title: { min: 10, max: 150, required: true },
    description: { min: 20, max: 1000, required: true },
    file: { required: true, maxSize: 10, allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'] }
};

// Inicialização da página
document.addEventListener('DOMContentLoaded', function () {
    setupReportsForm();
    setupRealTimeValidation();
    setupDragAndDrop();
    setupModal();
    addCharacterCounters();
    loadReports();
});


// --- FUNÇÕES DE API ---

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
    submitBtn.textContent = 'Enviando...';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Faça o login novamente.');

        const response = await fetch('/api/relatorios', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao enviar relatório.');

        showAlert(result.message || 'Relatório adicionado com sucesso!');
        resetForm(document.getElementById('reports-form'));
        loadReports();

    } catch (error) {
        showAlert(error.message, true);
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
        // --- CÓDIGO ATUALIZADO E MAIS SEGURO ---
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


// --- FUNÇÕES DE SETUP E UI ---

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
                    <svg class="icon" viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" fill="currentColor"/></svg> Ver descrição
                </button>
                <button class="delete-btn" onclick="deleteReport(${report.id})">Excluir</button>
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
        counter.className = 'char-counter'; // Use a class for styling
        counter.id = `${field.id}-counter`;
        // Insert after the error message div
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

// Expondo funções para o onclick do HTML
window.downloadFile = downloadFile;
window.showDescription = showDescription;
window.editReport = editReport;
window.deleteReport = deleteReport;