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
    }

    criar() {
        // Remove modais antigos
        document.getElementById('modalProgressoValidacao')?.remove();
        document.getElementById('modalBackdropValidacao')?.remove();
        document.getElementById('modal-ia-force-styles')?.remove();

        // Injeta CSS global para forçar centralização
        const forceStyle = document.createElement('style');
        forceStyle.id = 'modal-ia-force-styles';
        forceStyle.textContent = `
            #modalBackdropValidacao,
            #modalProgressoValidacao {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
                max-width: none !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
            }
            #modalBackdropValidacao {
                background: rgba(0,0,0,0.6) !important;
                z-index: 2147483646 !important;
            }
            #modalProgressoValidacao {
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                pointer-events: auto !important;
            }
            #modalProgressoValidacao .modal-ia-content {
                background: white;
                border: 2px solid #e2ccae;
                border-radius: 12px;
                overflow: hidden;
                max-height: 90vh;
                width: 90%;
                max-width: 600px;
                display: flex;
                flex-direction: column;
                animation: slideDown 0.3s ease;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
            @keyframes pulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.1);opacity:0.8;}}
            @keyframes slideDown{from{transform:translateY(-50px);opacity:0;}to{transform:translateY(0);opacity:1;}}
            @keyframes fadeOut{from{opacity:1;}to{opacity:0;}}
        `;
        document.head.appendChild(forceStyle);

        // Cria backdrop como filho direto do html (não do body)
        const backdrop = document.createElement('div');
        backdrop.id = 'modalBackdropValidacao';
        document.documentElement.appendChild(backdrop);

        // Cria modal como filho direto do html (não do body)
        this.modal = document.createElement('div');
        this.modal.id = 'modalProgressoValidacao';

        this.modal.innerHTML = `
    <div class="modal-ia-content">
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

        document.documentElement.appendChild(this.modal);

        this.progressBar = this.modal.querySelector('#progressBar');
        this.progressMessage = this.modal.querySelector('#progressMessage');
        this.progressDetails = this.modal.querySelector('#progressDetails');
        this.progressLogs = this.modal.querySelector('#progressLogs');
    }

    atualizarProgresso(percent, message, details = '') {
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
            container.innerHTML = `<button class="btn" style="background-color:#e2ccae;color:#3d2106;border:none;padding:12px 40px;border-radius:8px;font-weight:500;font-size:15px;cursor:pointer;transition:all 0.3s;" onmouseover="this.style.backgroundColor='#d4b895'" onmouseout="this.style.backgroundColor='#e2ccae'" onclick="document.getElementById('modalProgressoValidacao')?.remove();document.getElementById('modalBackdropValidacao')?.remove();document.getElementById('modal-ia-force-styles')?.remove();"><i class="bi bi-check-circle" style="margin-right:8px;"></i>Entendi</button>`;
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
        const backdrop = document.getElementById('modalBackdropValidacao');
        const styles = document.getElementById('modal-ia-force-styles');
        
        if (modal) { 
            modal.style.animation = 'fadeOut 0.3s ease'; 
            setTimeout(() => modal.remove(), 300); 
        }
        if (backdrop) { 
            backdrop.style.animation = 'fadeOut 0.3s ease'; 
            setTimeout(() => backdrop.remove(), 300); 
        }
        // Remove estilos após um delay
        setTimeout(() => styles?.remove(), 350);
    }

    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        form: document.getElementById('categoryForm'),
        categoriaSelect: document.getElementById('categoria'),
        origemRecursoSelect: document.getElementById('origemRecurso'),
        orcamentoPrevistoInput: document.getElementById('orcamentoPrevisto'),
        valorExecutadoInput: document.getElementById('valorExecutado'),
        submitBtn: document.querySelector('#categoryForm .primeirinho1'),
        tableBody: document.getElementById('budgetTableBody'),
        originChartCanvas: document.getElementById('originChart'),
        destinationChartCanvas: document.getElementById('destinationChart'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('edit-form'),
        editIdInput: document.getElementById('edit-id'),
        editCategoriaSelect: document.getElementById('edit-categoria'),
        editOrcamentoInput: document.getElementById('edit-orcamentoPrevisto'),
        editExecutadoInput: document.getElementById('edit-valorExecutado'),
        saveEditBtn: document.getElementById('saveEditBtn'),
        manageAttachmentsModal: new bootstrap.Modal(document.getElementById('manageAttachmentsModal')),
        manageAttachmentsTitle: document.getElementById('manageAttachmentsTitle'),
        existingAttachmentsList: document.getElementById('existing-attachments-list'),
        attachGestaoId: document.getElementById('attach-gestao-id'),
        attachValorInput: document.getElementById('attach-valor'),
        attachTituloInput: document.getElementById('attach-titulo'),
        attachTipoSelect: document.getElementById('attach-tipo'),
        attachFileInput: document.getElementById('attach-file'),
        attachFileText: document.getElementById('attach-file-text'),
        saveAttachmentBtn: document.getElementById('saveAttachmentBtn'),
    };

    setTimeout(() => { window.SiteLoader?.hide(); }, 500);
    
    let allFinancialData = [], originChart, destinationChart, attachedFile = null;
    const chartColors = ['#8B4513', '#A0522D', '#D2B48C', '#DAA520', '#704010'];

    const showAlert = (message, isError = true) => {
        const el = isError ? ui.alertMessage : ui.successMessage;
        if (el) { el.textContent = message; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 5000); }
    };
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const validateField = (input, condition, errorMsg) => {
        const errorElement = input.closest('.form-group1')?.querySelector('.error-message');
        if (condition) { input.classList.remove('error'); if (errorElement) errorElement.style.display = 'none'; return true; }
        else { input.classList.add('error'); if (errorElement) { errorElement.textContent = errorMsg; errorElement.style.display = 'block'; } return false; }
    };

    const validateForm = (isEdit = false) => {
        const elements = {
            categoria: isEdit ? ui.editCategoriaSelect : ui.categoriaSelect,
            origem: isEdit ? null : ui.origemRecursoSelect,
            orcamento: isEdit ? ui.editOrcamentoInput : ui.orcamentoPrevistoInput,
            executado: isEdit ? ui.editExecutadoInput : ui.valorExecutadoInput
        };
        const errors = [];
        if (!validateField(elements.categoria, elements.categoria.selectedIndex !== 0, 'Categoria obrigatória.')) errors.push('Categoria');
        if (!isEdit && elements.origem && !validateField(elements.origem, elements.origem.selectedIndex !== 0, 'Origem obrigatória.')) errors.push('Origem');
        if (!validateField(elements.orcamento, elements.orcamento.value !== '' && parseFloat(elements.orcamento.value) > 0, 'Orçamento obrigatório.')) errors.push('Orçamento');
        if (!validateField(elements.executado, elements.executado.value !== '' && parseFloat(elements.executado.value) >= 0, 'Valor executado obrigatório.')) errors.push('Valor Executado');
        return { isValid: errors.length === 0, errors: [...new Set(errors)] };
    };

    const setupRealTimeValidation = () => {
        ui.categoriaSelect.addEventListener('blur', () => validateField(ui.categoriaSelect, ui.categoriaSelect.selectedIndex !== 0, 'Categoria obrigatória.'));
        ui.origemRecursoSelect.addEventListener('blur', () => validateField(ui.origemRecursoSelect, ui.origemRecursoSelect.selectedIndex !== 0, 'Origem obrigatória.'));
        ui.orcamentoPrevistoInput.addEventListener('blur', () => validateField(ui.orcamentoPrevistoInput, ui.orcamentoPrevistoInput.value !== '' && parseFloat(ui.orcamentoPrevistoInput.value) > 0, 'Orçamento deve ser maior que zero.'));
        ui.valorExecutadoInput.addEventListener('blur', () => validateField(ui.valorExecutadoInput, ui.valorExecutadoInput.value !== '' && parseFloat(ui.valorExecutadoInput.value) >= 0, 'Valor executado obrigatório.'));
        ui.editCategoriaSelect.addEventListener('blur', () => validateField(ui.editCategoriaSelect, ui.editCategoriaSelect.selectedIndex !== 0, 'Categoria obrigatória.'));
        ui.editOrcamentoInput.addEventListener('blur', () => validateField(ui.editOrcamentoInput, ui.editOrcamentoInput.value !== '' && parseFloat(ui.editOrcamentoInput.value) > 0, 'Orçamento deve ser maior que zero.'));
        ui.editExecutadoInput.addEventListener('blur', () => validateField(ui.editExecutadoInput, ui.editExecutadoInput.value !== '' && parseFloat(ui.editExecutadoInput.value) >= 0, 'Valor executado obrigatório.'));
    };
    
    const fetchData = async (url, options = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = '/login'; throw new Error('Sessão expirada.'); }
        const headers = { 'Authorization': `Bearer ${session.access_token}`, ...options.headers };
        if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
        const response = await fetch(url, { ...options, headers });
        const result = await response.json();
        if (!response.ok) throw { message: result.message || 'Erro.', detalhes: result.detalhes, tipo_erro: result.tipo_erro };
        return result;
    };
    
    const loadFinancialData = async () => {
        try { allFinancialData = await fetchData('/api/financeiro'); renderTable(); updateCharts(); }
        catch (error) { showAlert(error.message); }
    };

    const addLancamento = async (e) => {
        e.preventDefault();
        const validation = validateForm();
        if (!validation.isValid) { showAlert(`Corrija os campos: ${validation.errors.join(', ')}`); return; }
        ui.submitBtn.disabled = true; ui.submitBtn.textContent = 'Enviando...';
        const newLancamento = { nome_categoria: ui.categoriaSelect.value, origem_recurso: ui.origemRecursoSelect.value, orcamento_previsto: ui.orcamentoPrevistoInput.value, valor_executado: ui.valorExecutadoInput.value || 0 };
        try { const result = await fetchData('/api/financeiro', { method: 'POST', body: JSON.stringify(newLancamento) }); showAlert(result.message, false); ui.form.reset(); loadFinancialData(); }
        catch (error) { showAlert(error.message); }
        finally { ui.submitBtn.disabled = false; ui.submitBtn.textContent = 'Adicionar'; }
    };

    const saveEdit = async () => {
        const validation = validateForm(true);
        if (!validation.isValid) { showAlert(`Corrija os campos: ${validation.errors.join(', ')}`); return; }
        const id = ui.editIdInput.value;
        const updatedData = { nome_categoria: ui.editCategoriaSelect.value, orcamento_previsto: ui.editOrcamentoInput.value, valor_executado: ui.editExecutadoInput.value || 0 };
        try { const result = await fetchData(`/api/financeiro/${id}`, { method: 'PATCH', body: JSON.stringify(updatedData) }); showAlert(result.message, false); ui.editModal.hide(); loadFinancialData(); }
        catch (error) { showAlert(error.message); }
    };

    const deleteItem = async (id, category) => {
        if (confirm(`Excluir o lançamento "${category}"?`)) {
            try { const result = await fetchData(`/api/financeiro/${id}`, { method: 'DELETE' }); showAlert(result.message, false); loadFinancialData(); }
            catch (error) { showAlert(error.message); }
        }
    };
    
    const populateEditModal = (item) => {
        ui.editIdInput.value = item.id;
        ui.editCategoriaSelect.innerHTML = ui.categoriaSelect.innerHTML;
        ui.editCategoriaSelect.value = item.nome_categoria;
        ui.editOrcamentoInput.value = item.orcamento_previsto;
        ui.editExecutadoInput.value = item.valor_executado;
        ui.editModal.show();
    };

    const openManageAttachmentsModal = (item) => {
        ui.manageAttachmentsTitle.textContent = item.nome_categoria;
        ui.attachGestaoId.value = item.id;
        ui.attachValorInput.value = item.valor_executado;
        renderExistingAttachments(item.documento_comprobatorio || []);
        ui.attachTituloInput.value = `Comprovante - ${item.nome_categoria}`;
        attachedFile = null; ui.attachFileInput.value = '';
        ui.attachFileText.textContent = 'Clique para selecionar o arquivo';
        ui.manageAttachmentsModal.show();
    };

    const renderExistingAttachments = (attachments) => {
        if (attachments.length === 0) { ui.existingAttachmentsList.innerHTML = '<p class="text-muted">Nenhum comprovante anexado ainda.</p>'; return; }
        ui.existingAttachmentsList.innerHTML = attachments.map(doc => `
            <div class="existing-attachment-item">
                <span title="${doc.titulo}">${doc.titulo}</span>
                <div class="actions">
                    <button class="btn btn-sm btn-outline-secondary view-attachment-btn" data-path="${doc.caminho_arquivo}">Ver</button>
                    <button class="btn btn-sm btn-outline-danger delete-attachment-btn" data-doc-id="${doc.id}"><i class="bi bi-trash3-fill"></i></button>
                </div>
            </div>`).join('');
    };

    // ✅ FUNÇÃO DE ANEXAR COM VALIDAÇÃO IA E MODAL
    const handleAddNewAttachment = async () => {
        if (!attachedFile || !ui.attachTituloInput.value) { showAlert('Preencha o título e selecione um arquivo.'); return; }

        ui.saveAttachmentBtn.disabled = true;
        ui.saveAttachmentBtn.textContent = 'Validando...';

        // Esconde o modal de anexos temporariamente
        ui.manageAttachmentsModal.hide();

        const modal = new ModalValidacaoIA('Comprovante');
        modal.criar();

        try {
            await modal.sleep(800);
            modal.atualizarProgresso(10, 'Iniciando validação...', 'Preparando comprovante');
            modal.adicionarLog('Preparando comprovante para análise', 'info');

            await modal.sleep(1200);
            modal.atualizarProgresso(20, 'Enviando para análise...', 'Conectando com IA');
            modal.adicionarLog('Enviando documento para servidor', 'info');

            const formData = new FormData();
            formData.append('titulo', ui.attachTituloInput.value);
            formData.append('tipo_documento', ui.attachTipoSelect.value);
            formData.append('valor', ui.attachValorInput.value);
            formData.append('arquivo_documento', attachedFile);
            formData.append('gestao_financeira_id', ui.attachGestaoId.value);

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
                    showAlert(`Comprovante rejeitado: ${result.detalhes}`, true);
                } else { throw { message: result.message || 'Erro ao enviar comprovante.' }; }
                return;
            }

            await modal.sleep(800);
            modal.mostrarSucesso();
            await modal.sleep(1500);
            modal.adicionarLog('Salvando no banco de dados', 'info');
            await modal.sleep(1000);
            modal.adicionarLog('Comprovante anexado com sucesso!', 'success');
            await modal.sleep(2000);
            modal.fechar();

            showAlert('Comprovante validado e anexado com sucesso!', false);
            loadFinancialData();

        } catch (error) {
            const msg = error.detalhes || error.message;
            modal.mostrarErro(msg);
            await modal.sleep(8000);
            modal.fechar();
            showAlert(error.message);
        } finally {
            ui.saveAttachmentBtn.disabled = false;
            ui.saveAttachmentBtn.textContent = 'Salvar Novo Anexo';
        }
    };
    
    const handleDeleteAttachment = async (docId) => {
        if (confirm('Excluir este anexo?')) {
            try { await fetchData(`/api/documentos/${docId}`, { method: 'DELETE' }); showAlert('Anexo excluído.', false); ui.manageAttachmentsModal.hide(); loadFinancialData(); }
            catch (error) { showAlert(error.message); }
        }
    };

    const updateCharts = () => {
        if (originChart) originChart.destroy();
        if (destinationChart) destinationChart.destroy();
        if (!allFinancialData || allFinancialData.length === 0) return;
        const originData = allFinancialData.reduce((acc, item) => { acc[item.origem_recurso] = (acc[item.origem_recurso] || 0) + parseFloat(item.orcamento_previsto); return acc; }, {});
        originChart = new Chart(ui.originChartCanvas, { type: 'pie', data: { labels: Object.keys(originData), datasets: [{ data: Object.values(originData), backgroundColor: chartColors }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
        const destinationData = allFinancialData.reduce((acc, item) => { acc[item.nome_categoria] = (acc[item.nome_categoria] || 0) + parseFloat(item.valor_executado); return acc; }, {});
        destinationChart = new Chart(ui.destinationChartCanvas, { type: 'bar', data: { labels: Object.keys(destinationData), datasets: [{ label: 'Valor Executado', data: Object.values(destinationData), backgroundColor: chartColors[0] }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } } });
    };

    const renderTable = () => {
        ui.tableBody.innerHTML = '';
        if (!allFinancialData || allFinancialData.length === 0) { ui.tableBody.innerHTML = `<tr><td colspan="7" class="no-data1">Nenhuma categoria adicionada ainda.</td></tr>`; return; }
        allFinancialData.forEach(item => {
            const row = document.createElement('tr');
            const attachments = item.documento_comprobatorio || [];
            const attachmentCount = attachments.length;
            const statusClass = item.status ? item.status.toLowerCase().replace(' ', '-') + '1' : '';
            const attachmentButtonHtml = `<button class="btn-icon manage-attachments-btn" data-id="${item.id}" title="Gerenciar Anexos"><i class="bi bi-paperclip"></i>${attachmentCount > 0 ? `<span class="attachment-badge">${attachmentCount}</span>` : ''}</button>`;
            row.innerHTML = `
                <td>${item.nome_categoria}</td>
                <td>${item.origem_recurso}</td>
                <td>${formatCurrency(item.orcamento_previsto)}</td>
                <td>${formatCurrency(item.valor_executado)}</td>
                <td>${(item.orcamento_previsto > 0 ? (item.valor_executado / item.orcamento_previsto) * 100 : 0).toFixed(1)}%</td>
                <td><span class="status-badge1 status-${statusClass}">${item.status}</span></td>
                <td class="actions-cell1">${attachmentButtonHtml}<button class="editinho1 edit-btn" data-id="${item.id}" title="Editar">Editar</button><button class="exclusivo1 delete-btn" data-id="${item.id}" data-category="${item.nome_categoria}" title="Excluir"><i class="bi bi-trash-fill"></i> Excluir</button></td>`;
            ui.tableBody.appendChild(row);
        });
    };

    ui.form.addEventListener('submit', addLancamento);
    ui.saveEditBtn.addEventListener('click', saveEdit);
    ui.saveAttachmentBtn.addEventListener('click', handleAddNewAttachment);
    ui.attachFileInput.addEventListener('change', (e) => { attachedFile = e.target.files[0]; if (attachedFile) ui.attachFileText.textContent = `Arquivo: ${attachedFile.name}`; });

    ui.tableBody.addEventListener('click', (e) => {
        const manageBtn = e.target.closest('.manage-attachments-btn');
        if (manageBtn) { const item = allFinancialData.find(d => d.id == manageBtn.dataset.id); if (item) openManageAttachmentsModal(item); }
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) deleteItem(deleteBtn.dataset.id, deleteBtn.dataset.category);
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) { const item = allFinancialData.find(d => d.id == editBtn.dataset.id); if (item) populateEditModal(item); }
    });

    document.getElementById('manageAttachmentsModal').addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-attachment-btn');
        if (viewBtn) { const { data } = supabase.storage.from('comprovantes').getPublicUrl(viewBtn.dataset.path); window.open(data.publicUrl, '_blank'); }
        const deleteBtn = e.target.closest('.delete-attachment-btn');
        if (deleteBtn) handleDeleteAttachment(deleteBtn.dataset.docId);
    });

    setupRealTimeValidation();
    loadFinancialData();
});