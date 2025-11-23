// Importa o cliente Supabase para fazer a autenticação
import supabase from '/scripts/supabaseClient.js';

// Roda o script principal apenas quando o HTML estiver totalmente carregado
document.addEventListener('DOMContentLoaded', async () => {
    // 1. VERIFICA AUTENTICAÇÃO
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        window.location.href = '/entrar';
        return;
    }

    // 2. MAPEAMENTO DOS ELEMENTOS DA UI
    const ui = {
        // Displays de Informação
        orgName: document.getElementById('org-name'),
        institutionName: document.getElementById('institution-name'),
        email: document.getElementById('email'),
        cnpj: document.getElementById('cnpj'),
        phone: document.getElementById('phone'),
        estado: document.getElementById('estado'),
        cidade: document.getElementById('cidade'),
        sobre: document.getElementById('sobre'),
        charCounter: document.getElementById('char-counter'),
        passwordDots: document.querySelector('.password-dots1'),
        profileImage: document.getElementById('profile-image'),
        logoPlaceholder: document.getElementById('logo-placeholder'),
        currentLogo: document.getElementById('current-logo'),
        editCnpj: document.getElementById('edit-cnpj'),
        editPhone: document.getElementById('edit-phone'),
        editSobre: document.getElementById('edit-sobre'),

        // Modais
        editModal: document.getElementById('edit-modal'),
        photoModal: document.getElementById('photo-modal'),
        logoModal: document.getElementById('logo-modal'),
        notificationModal: document.getElementById('erroSenhaModal'),
        notificationModalBody: document.getElementById('erroSenhaModalBody'),

        // Botões de Abrir Modais
        btnOpenPhotoModal: document.getElementById('btn-open-photo-modal'),
        btnOpenLogoModal: document.getElementById('btn-open-logo-modal'),
        btnOpenEditModal: document.getElementById('btn-open-edit-modal'),

        // Botões Dentro dos Modais
        btnCloseEditModalX: document.getElementById('btn-close-edit-modal-x'),
        btnCancelEditModal: document.getElementById('btn-cancel-edit-modal'),
        btnSaveChanges: document.getElementById('btn-save-changes'),

        btnClosePhotoModalX: document.getElementById('btn-close-photo-modal-x'),
        btnCancelPhotoModal: document.getElementById('btn-cancel-photo-modal'),
        btnSavePhoto: document.getElementById('btn-save-photo'),

        btnCloseLogoModalX: document.getElementById('btn-close-logo-modal-x'),
        btnCancelLogoModal: document.getElementById('btn-cancel-logo-modal'),
        btnSaveLogo: document.getElementById('btn-save-logo'),
        photoUploadInput: document.getElementById('photo-upload'),
        photoUploadArea: document.getElementById('photo-upload-area'),

        // Campos do Formulário de Edição
        editInstitutionName: document.getElementById('edit-institution-name'),
        editEmail: document.getElementById('edit-email'),
        editPassword: document.getElementById('edit-password'),
        editEstado: document.getElementById('edit-estado'),
        editCidade: document.getElementById('edit-cidade'),

        // Outros
        toggleEditPassword: document.getElementById('toggle-edit-password'),
        logoUploadArea: document.getElementById('logo-upload-area'),
        logoUploadInput: document.getElementById('logo-upload'),
        passwordChecklist: {
            length: document.getElementById('check-length'),
            uppercase: document.getElementById('check-uppercase'),
            number: document.getElementById('check-number'),
            special: document.getElementById('check-special'),
        }
    };

    // 3. ESTADO DA APLICAÇÃO
    let userData = {};
    let logoPreviewFile = null;
    let photoPreviewFile = null;
    let modalOverlay = null;
    const notificationModalInstance = new bootstrap.Modal(ui.notificationModal);

    // 4. FUNÇÕES

    function setupCharCounter() {
        if (ui.editSobre && ui.charCounter) {
            const maxLength = ui.editSobre.getAttribute('maxlength');
            const updateCounter = () => {
                const currentLength = ui.editSobre.value.length;
                const remaining = maxLength - currentLength;
                ui.charCounter.textContent = `${remaining} caracteres restantes`;
                if (remaining < 20) {
                    ui.charCounter.style.color = '#dc3545';
                } else {
                    ui.charCounter.style.color = '#6c757d';
                }
            };
            ui.editSobre.addEventListener('input', updateCounter);
        }
    }

    async function fetchUserProfile() {
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const data = await response.json();
            userData = data;
            updateUI();
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            showNotification('Falha ao carregar seus dados. Tente recarregar a página.', 'danger');
        }
    }

    async function saveProfileChanges() {
        if (!validarFormulario()) return;

        const dadosParaEnviar = {
            nome: ui.editInstitutionName.value,
            email: ui.editEmail.value,
            senha: ui.editPassword.value,
            cnpj: ui.editCnpj.value,
            telefone: ui.editPhone.value,
            estado: ui.editEstado.value,
            cidade: ui.editCidade.value,
            sobre: ui.editSobre.value
        };

        const aSenhaFoiAlterada = !!dadosParaEnviar.senha;

        if (!dadosParaEnviar.senha) {
            delete dadosParaEnviar.senha;
        }

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(dadosParaEnviar)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Falha ao salvar no servidor');
            }

            if (aSenhaFoiAlterada) {
                closeModal(ui.editModal);
                showNotification('Senha alterada com sucesso! Por segurança, você será desconectado.', 'success');

                setTimeout(async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/entrar';
                }, 2000);

            } else {
                await fetchUserProfile();
                closeModal(ui.editModal);
                showNotification('Dados atualizados com sucesso!', 'success');
            }
        } catch (error) {
            closeModal(ui.editModal);
            showNotification(`Erro do Servidor: ${error.message}`, 'danger');
        }
    }

    function handlePhotoFile(file) {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
        if (!tiposPermitidos.includes(file.type)) {
            closeModal(ui.photoModal);
            return showNotification('Formato não permitido. Use JPG, PNG ou SVG.', 'danger');
        }
        if (file.size > 2 * 1024 * 1024) {
            closeModal(ui.photoModal);
            return showNotification('Arquivo muito grande (máx. 2MB).', 'danger');
        }

        photoPreviewFile = file;
        const reader = new FileReader();
        reader.onload = e => showPhotoPreview(e.target.result);
        reader.readAsDataURL(file);
    }

    function showPhotoPreview(imageSrc) {
        ui.photoUploadArea.innerHTML = `<div class="logo-preview-container">
            <img src="${imageSrc}" class="logo-preview-image" alt="Preview">
            <button type="button" class="logo-preview-remove" id="btn-clear-photo-preview">×</button>
        </div><p class="logo-preview-text">Clique em "Salvar"</p>`;

        document.getElementById('btn-clear-photo-preview').addEventListener('click', (e) => {
            e.stopPropagation();
            clearPhotoPreview();
        });
    }

    function clearPhotoPreview() {
        photoPreviewFile = null;
        ui.photoUploadInput.value = '';
        ui.photoUploadArea.innerHTML = `<i class="bi bi-cloud-upload" style="font-size: 24px; color: #666; margin-bottom: 10px;"></i>
            <p>Clique ou arraste uma imagem aqui</p>
            <p style="font-size: 12px; color: #999;">JPG, PNG, SVG (máx. 2MB)</p>`;
    }

    function setupPhotoUpload() {
        ui.photoUploadArea.addEventListener('click', () => {
            ui.photoUploadInput.click();
        });

        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            ui.photoUploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                if (eventName === 'dragover') ui.photoUploadArea.classList.add('drag-over');
                else ui.photoUploadArea.classList.remove('drag-over');
            });
        });

        ui.photoUploadArea.addEventListener('drop', e => {
            if (e.dataTransfer.files.length > 0) {
                handlePhotoFile(e.dataTransfer.files[0]);
            }
        });

        ui.photoUploadInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                handlePhotoFile(e.target.files[0]);
            }
        });
    }

    async function saveProfilePhoto() {
        if (!photoPreviewFile) {
            closeModal(ui.photoModal);
            return showNotification('Nenhuma nova foto selecionada.', 'info');
        }

        const modalValidacao = criarModalValidacao('Foto de Perfil');
        
        try {
            await sleep(500);
            atualizarModalValidacao(modalValidacao, 20, 'Validando imagem...', 'Analisando conteúdo');
            adicionarLogValidacao(modalValidacao, ' Verificando se a imagem é apropriada', 'info');

            const formData = new FormData();
            formData.append('foto', photoPreviewFile);

            await sleep(800);
            atualizarModalValidacao(modalValidacao, 40, 'Enviando para análise...', 'Conectando com IA');
            adicionarLogValidacao(modalValidacao, ' Enviando imagem para validação', 'info');

            const response = await fetch('/api/user/profile/foto', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            const result = await response.json();

            await sleep(1000);
            atualizarModalValidacao(modalValidacao, 70, 'Analisando conteúdo...', 'Verificando se é apropriada');
            adicionarLogValidacao(modalValidacao, ' IA analisando a imagem', 'info');

            if (!response.ok) {
                if (result.tipo_erro === 'validacao_ia') {
                    mostrarErroValidacao(modalValidacao, result.detalhes);
                    await sleep(8000);
                    fecharModalValidacao(modalValidacao);
                    closeModal(ui.photoModal);
                    return showNotification(`Foto rejeitada: ${result.detalhes}`, 'danger');
                } else {
                    throw new Error(result.message || 'Erro ao enviar foto.');
                }
            }

            await sleep(500);
            mostrarSucessoValidacao(modalValidacao);
            adicionarLogValidacao(modalValidacao, ' Imagem aprovada pela IA', 'success');
            
            await sleep(1500);
            fecharModalValidacao(modalValidacao);

            closeModal(ui.photoModal);
            showNotification('Foto de perfil atualizada com sucesso!', 'success');
            photoPreviewFile = null;
            window.location.reload();

        } catch (error) {
            mostrarErroValidacao(modalValidacao, error.message);
            await sleep(5000);
            fecharModalValidacao(modalValidacao);
            closeModal(ui.photoModal);
            showNotification(error.message, 'danger');
        }
    }

    async function saveOrganizationLogo() {
        if (!logoPreviewFile) {
            closeModal(ui.logoModal);
            return showNotification('Nenhum novo logo selecionado.', 'info');
        }

        const modalValidacao = criarModalValidacao('Logo');
        
        try {
            await sleep(500);
            atualizarModalValidacao(modalValidacao, 20, 'Validando logo...', 'Analisando conteúdo');
            adicionarLogValidacao(modalValidacao, ' Verificando se o logo é apropriado', 'info');

            const formData = new FormData();
            formData.append('logo', logoPreviewFile);

            await sleep(800);
            atualizarModalValidacao(modalValidacao, 40, 'Enviando para análise...', 'Conectando com IA');
            adicionarLogValidacao(modalValidacao, ' Enviando logo para validação', 'info');

            const response = await fetch('/api/user/profile/logo', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            const result = await response.json();

            await sleep(1000);
            atualizarModalValidacao(modalValidacao, 70, 'Analisando conteúdo...', 'Verificando se é apropriado');
            adicionarLogValidacao(modalValidacao, ' IA analisando o logo', 'info');

            if (!response.ok) {
                if (result.tipo_erro === 'validacao_ia') {
                    mostrarErroValidacao(modalValidacao, result.detalhes);
                    await sleep(8000);
                    fecharModalValidacao(modalValidacao);
                    closeModal(ui.logoModal);
                    return showNotification(`Logo rejeitado: ${result.detalhes}`, 'danger');
                } else {
                    throw new Error(result.message || 'Erro ao enviar logo.');
                }
            }

            await sleep(500);
            mostrarSucessoValidacao(modalValidacao);
            adicionarLogValidacao(modalValidacao, ' Logo aprovado pela IA', 'success');
            
            await sleep(1500);
            fecharModalValidacao(modalValidacao);

            closeModal(ui.logoModal);
            showNotification('Logo atualizado com sucesso!', 'success');
            logoPreviewFile = null;
            window.location.reload();

        } catch (error) {
            mostrarErroValidacao(modalValidacao, error.message);
            await sleep(5000);
            fecharModalValidacao(modalValidacao);
            closeModal(ui.logoModal);
            showNotification(error.message, 'danger');
        }
    }

    // ✅ FUNÇÕES AUXILIARES DO MODAL DE VALIDAÇÃO
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function criarModalValidacao(tipo) {
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: relative;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            background: white;
            border-radius: 12px;
            border: 2px solid #e2ccae;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #F9E7D2 0%, #e2ccae 100%); padding: 1.5rem;">
                <h5 style="font-family: 'Lexend Deca'; font-weight: 600; color: #4E3629; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-shield-check" style="font-size: 24px;"></i>
                    Validando ${tipo}
                </h5>
            </div>
            <div style="padding: 2rem; overflow-y: auto; flex: 1;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="width: 80px; height: 80px; margin: 0 auto; background: #F9E7D2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-robot" style="font-size: 40px; color: #8B4513;"></i>
                    </div>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <p class="progress-message" style="text-align: center; color: #4E3629; font-weight: 600; font-size: 16px; margin: 0;">
                        Preparando análise...
                    </p>
                    <p class="progress-details" style="text-align: center; color: #666; font-size: 13px; margin: 0.5rem 0 0;">
                        Aguarde enquanto nossa IA verifica a imagem
                    </p>
                </div>
                <div style="background: #e0e0e0; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 1.5rem;">
                    <div class="progress-bar" style="height: 100%; background: linear-gradient(90deg, #e2ccae, #caae8d); width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div class="progress-logs" style="min-height: 150px; max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 1rem; font-size: 13px; border: 1px solid #dee2e6;">
                    <div style="color: #666; text-align: center; font-style: italic;">
                        Aguardando início da validação...
                    </div>
                </div>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
        document.body.style.overflow = 'hidden';

        return { backdrop, modal };
    }

    function atualizarModalValidacao(modalObj, percent, message, details) {
        const progressBar = modalObj.modal.querySelector('.progress-bar');
        const progressMessage = modalObj.modal.querySelector('.progress-message');
        const progressDetails = modalObj.modal.querySelector('.progress-details');

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressMessage) progressMessage.textContent = message;
        if (progressDetails) progressDetails.textContent = details;
    }

    function adicionarLogValidacao(modalObj, message, type = 'info') {
        const logsContainer = modalObj.modal.querySelector('.progress-logs');
        if (!logsContainer) return;

        const italic = logsContainer.querySelector('[style*="italic"]');
        if (italic) logsContainer.innerHTML = '';

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

        logsContainer.appendChild(logItem);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function mostrarErroValidacao(modalObj, motivoErro) {
        atualizarModalValidacao(modalObj, 100, ' Imagem Rejeitada', '');
        adicionarLogValidacao(modalObj, ' Imagem não aprovada pela validação', 'error');
        
        const motivoFormatado = motivoErro.length > 100 
            ? motivoErro.match(/.{1,100}(\s|$)/g).join('\n') 
            : motivoErro;
        
        adicionarLogValidacao(modalObj, ` Motivo da rejeição:`, 'warning');
        adicionarLogValidacao(modalObj, motivoFormatado, 'error');
        adicionarLogValidacao(modalObj, ' Sugestão: Use uma imagem apropriada e tente novamente.', 'info');

        setTimeout(() => {
            const modalBody = modalObj.modal.querySelector('[style*="padding: 2rem"]');
            if (!modalBody || modalBody.querySelector('#errorButtonContainer')) return;
            
            const container = document.createElement('div');
            container.id = 'errorButtonContainer';
            container.style.cssText = 'text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #dee2e6;';
            
            const btn = document.createElement('button');
            btn.style.cssText = 'background-color: #e2ccae; color: #3d2106; border: none; padding: 12px 40px; border-radius: 8px; font-weight: 500; font-size: 15px; cursor: pointer; transition: all 0.3s;';
            btn.innerHTML = '<i class="bi bi-check-circle" style="margin-right: 8px;"></i>Entendi';
            btn.onmouseover = () => btn.style.backgroundColor = '#d4b895';
            btn.onmouseout = () => btn.style.backgroundColor = '#e2ccae';
            btn.onclick = () => fecharModalValidacao(modalObj);
            
            container.appendChild(btn);
            modalBody.appendChild(container);
            
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }, 3000);
    }

    function mostrarSucessoValidacao(modalObj) {
        atualizarModalValidacao(modalObj, 100, ' Validação Concluída com Sucesso!', '');
        adicionarLogValidacao(modalObj, ' Imagem aprovada pela IA', 'success');
        adicionarLogValidacao(modalObj, ' Salvando imagem...', 'info');
    }

    function fecharModalValidacao(modalObj) {
        if (modalObj.backdrop) modalObj.backdrop.remove();
        document.body.style.overflow = '';
    }

    function updateUI() {
        ui.orgName.textContent = userData.nome || 'Nome não encontrado';
        ui.institutionName.textContent = userData.nome || 'Não informado';
        ui.email.textContent = userData.email || 'Não informado';
        ui.cnpj.textContent = userData.cnpj || 'Não informado';
        ui.phone.textContent = userData.telefone || 'Não informado';
        ui.estado.textContent = userData.estado || 'Não informado';
        ui.cidade.textContent = userData.cidade || 'Não informado';
        ui.sobre.textContent = userData.sobre || 'Não informado';

        ui.profileImage.src = userData.url_foto_perfil || '/assets/imgs/comprador/avatar-padrao.jpg';

        if (userData.url_logo) {
            ui.logoPlaceholder.style.display = 'none';
            ui.currentLogo.src = userData.url_logo;
            ui.currentLogo.style.display = 'block';
        } else {
            ui.logoPlaceholder.style.display = 'flex';
            ui.currentLogo.style.display = 'none';
        }

        if (userData.mp_connected) {
            document.getElementById('mp-button-container').style.display = 'none';
            document.getElementById('mp-connected-info').style.display = 'block';
            document.getElementById('mp-status-text').textContent = 'Sua conta está conectada.';
        } else {
            document.getElementById('mp-button-container').style.display = 'block';
            document.getElementById('mp-connected-info').style.display = 'none';
        }

        ui.editInstitutionName.value = userData.nome || '';
        ui.editEmail.value = userData.email || '';
        ui.editCnpj.value = userData.cnpj || '';
        ui.editSobre.value = userData.sobre || '';
        ui.editPhone.value = userData.telefone || '';
        ui.editEstado.value = userData.estado || '';
        ui.editCidade.value = userData.cidade || '';
        ui.editPassword.value = '';
    }

    function createModalOverlayIfNeeded() {
        if (!modalOverlay) {
            modalOverlay = document.createElement("div");
            modalOverlay.className = "modal-overlay";
            document.body.appendChild(modalOverlay);
            modalOverlay.addEventListener('click', closeAllModals);
        }
    }

    function openModal(modalElement) {
        createModalOverlayIfNeeded();
        modalOverlay.style.display = "block";
        modalElement.style.display = "flex";
        document.body.style.overflow = "hidden";
        if (modalElement.id === 'edit-modal') {
            configurarMascaraCNPJ();
            configurarMascaraTelefone();
        }
    }

    function closeModal(modalElement) {
        if (modalOverlay) modalOverlay.style.display = "none";
        modalElement.style.display = "none";
        document.body.style.overflow = "auto";
    }

    function closeAllModals() {
        document.querySelectorAll('.modal1').forEach(modal => closeModal(modal));
    }

    function showNotification(message, type = 'info') {
        const icon = {
            success: 'bi-check-circle-fill',
            danger: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill',
        }[type];
        ui.notificationModalBody.innerHTML = `<div class="alert alert-${type} d-flex align-items-center mb-0"><i class="bi ${icon} me-2"></i> ${message}</div>`;
        notificationModalInstance.show();
    }

    function setupPasswordToggles() {
        ui.toggleEditPassword.addEventListener('click', () => {
            const isPassword = ui.editPassword.type === 'password';
            ui.editPassword.type = isPassword ? 'text' : 'password';
            ui.toggleEditPassword.querySelector('i').className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
    }

    function checkPasswordStrength() {
        const senha = ui.editPassword.value;
        const checks = {
            length: senha.length >= 8,
            uppercase: /[A-Z]/.test(senha),
            number: /[0-9]/.test(senha),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
        };

        for (const key in checks) {
            const item = ui.passwordChecklist[key];
            if (checks[key]) {
                item.style.color = 'green';
                item.innerHTML = `✓ ${item.textContent.substring(2)}`;
            } else {
                item.style.color = '#666666';
                item.innerHTML = `• ${item.textContent.substring(2)}`;
            }
        }
    }

    function setupLogoUpload() {
        ui.logoUploadArea.addEventListener('click', () => {
            ui.logoUploadInput.click();
        });

        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            ui.logoUploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                if (eventName === 'dragover') ui.logoUploadArea.classList.add('drag-over');
                else ui.logoUploadArea.classList.remove('drag-over');
            });
        });

        ui.logoUploadArea.addEventListener('drop', e => {
            if (e.dataTransfer.files.length > 0) {
                handleLogoFile(e.dataTransfer.files[0]);
            }
        });

        ui.logoUploadInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                handleLogoFile(e.target.files[0]);
            }
        });
    }

    function handleLogoFile(file) {
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/svg+xml'];
        if (!tiposPermitidos.includes(file.type)) {
            closeModal(ui.logoModal);
            return showNotification('Formato não permitido. Use JPG, PNG ou SVG.', 'danger');
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            closeModal(ui.logoModal);
            return showNotification('Arquivo muito grande (máx. 2MB).', 'danger');
        }

        logoPreviewFile = file; // Armazena o arquivo para envio
        const reader = new FileReader();
        reader.onload = e => showLogoPreview(e.target.result);
        reader.readAsDataURL(file);
    }

    function showLogoPreview(imageSrc) {
        ui.logoUploadArea.innerHTML = `<div class="logo-preview-container">
            <img src="${imageSrc}" class="logo-preview-image" alt="Preview">
            <button type="button" class="logo-preview-remove" id="btn-clear-logo-preview">×</button>
        </div><p class="logo-preview-text">Clique em "Salvar"</p>`;

        // Adiciona o listener para o botão de remover que acabou de ser criado
        document.getElementById('btn-clear-logo-preview').addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que o clique propague para a área de upload
            clearLogoPreview();
        });
    }

    function clearLogoPreview() {
        logoPreviewFile = null;
        ui.logoUploadInput.value = '';
        ui.logoUploadArea.innerHTML = `<i class="bi bi-cloud-upload" style="font-size: 24px; color: #666; margin-bottom: 10px;"></i>
            <p>Clique ou arraste uma imagem aqui</p>
            <p style="font-size: 12px; color: #999;">JPG, PNG, SVG (máx. 2MB)</p>`;
    }

    // --- Validação de Formulário ---

    const validadores = {
        nome: (val) => val.trim().length >= 3 ? { v: true } : { v: false, m: "O nome deve ter pelo menos 3 caracteres." },
        email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? { v: true } : { v: false, m: "Formato de email inválido." },
        senha: (val) => !val || (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*()]/.test(val)) ? { v: true } : { v: false, m: "A senha não atende aos requisitos." },
        cnpj: (val) => val.length === 18 ? { v: true } : { v: false, m: "CNPJ inválido." }, // Validação simples
        telefone: (val) => val.length >= 14 ? { v: true } : { v: false, m: "Telefone inválido." }, // Validação simples
    };

    function validarFormulario() {
        const campos = [
            { el: ui.editInstitutionName, val: validadores.nome, nome: 'Nome' },
            { el: ui.editEmail, val: validadores.email, nome: 'E-mail' },
            { el: ui.editPassword, val: validadores.senha, nome: 'Senha' },
            { el: ui.editCnpj, val: validadores.cnpj, nome: 'CNPJ' },
            { el: ui.editPhone, val: validadores.telefone, nome: 'Telefone' },
        ];

        for (const campo of campos) {
            const resultado = campo.val(campo.el.value);
            if (!resultado.v) {
                closeModal(ui.editModal);
                showNotification(`${campo.nome}: ${resultado.m}`, 'danger');
                campo.el.focus();
                return false;
            }
        }
        return true;
    }

    function configurarMascaraCNPJ() {
        if (!ui.editCnpj) return;
        ui.editCnpj.setAttribute('maxlength', '18'); // Limita o tamanho do campo
        ui.editCnpj.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }

    function configurarMascaraTelefone() {
        if (!ui.editPhone) return;
        ui.editPhone.setAttribute('maxlength', '15'); // Limita para (XX) XXXXX-XXXX
        ui.editPhone.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            if (value.length > 13) {
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            } else {
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    // --- Conexão dos Eventos ---

    function conectarEventos() {
        // Abrir Modais
        ui.btnOpenEditModal.addEventListener('click', () => openModal(ui.editModal));
        ui.btnOpenPhotoModal.addEventListener('click', () => openModal(ui.photoModal));
        ui.btnOpenLogoModal.addEventListener('click', () => openModal(ui.logoModal));

        // Fechar Modais (Botões 'X' e 'Cancelar')
        [
            ui.btnCloseEditModalX, ui.btnCancelEditModal,
            ui.btnClosePhotoModalX, ui.btnCancelPhotoModal,
            ui.btnCloseLogoModalX, ui.btnCancelLogoModal
        ].forEach(btn => btn.addEventListener('click', closeAllModals));

        // Ações dos Modais (Salvar)
        ui.btnSaveChanges.addEventListener('click', saveProfileChanges);

        ui.btnSavePhoto.addEventListener('click', saveProfilePhoto);
        ui.btnSaveLogo.addEventListener('click', saveOrganizationLogo);

        // Outros eventos
        ui.editPassword.addEventListener('input', checkPasswordStrength);

        const btnConectar = document.getElementById('btn-conectar-mp');
        if (btnConectar) {
            btnConectar.addEventListener('click', () => {
                const instituicaoId = userData.id; // Pega o ID do usuário logado

                // Abre popup
                const width = 600;
                const height = 700;
                const left = (screen.width - width) / 2;
                const top = (screen.height - height) / 2;

                console.log("🟢 userData:", userData)
                const popup = window.open(
                    `/api/mercado-pago/authorize?id=${instituicaoId}`,
                    'Mercado Pago',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Escuta mensagens da popup
                window.addEventListener('message', function handler(event) {
                    if (event.data.type === 'mp-success') {
                        showNotification('✓ Mercado Pago conectado com sucesso!', 'success');
                        fetchUserProfile(); // Recarrega dados
                        window.removeEventListener('message', handler);
                    } else if (event.data.type === 'mp-error') {
                        showNotification(`Erro: ${event.data.message || 'Não foi possível conectar'}`, 'danger');
                        window.removeEventListener('message', handler);
                    }
                });
            });
        }

        // Botão de desconectar MP
        const btnDesconectar = document.getElementById('btn-desconectar-mp');
        if (btnDesconectar) {
            btnDesconectar.addEventListener('click', async () => {
                if (!confirm('Deseja desconectar o Mercado Pago?')) return;

                try {
                    const response = await fetch('/api/mercado-pago/disconnect', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });

                    if (!response.ok) throw new Error('Erro');

                    showNotification('Desconectado com sucesso', 'success');
                    await fetchUserProfile();
                } catch (error) {
                    showNotification('Erro ao desconectar', 'danger');
                }
            });
        }
    }


    // 5. INICIALIZAÇÃO
    // Ponto de partida da aplicação na página

    await fetchUserProfile(); // Busca os dados do usuário e atualiza a UI
    setupPasswordToggles();   // Configura os botões de mostrar/esconder senha
    setupLogoUpload();        // Configura a área de arrastar e soltar logo
    setupPhotoUpload();  
    setupCharCounter(); //contador la
    conectarEventos();        // Conecta todos os botões às suas funções
    setTimeout(() => {
        window.SiteLoader?.hide();
    }, 500);

    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    if (status) {
        let mensagem = '';
        let tipo = 'info';

        switch (status) {
            case 'mp-conectado':
                mensagem = '✓ Mercado Pago conectado com sucesso! Agora você pode receber doações.';
                tipo = 'success';
                break;
            case 'mp-erro':
                mensagem = 'Erro ao conectar com Mercado Pago. Tente novamente.';
                tipo = 'danger';
                break;
            case 'mp-erro-auth':
                mensagem = 'Erro de autenticação. Faça login novamente.';
                tipo = 'danger';
                break;
            case 'mp-erro-callback':
                mensagem = 'Erro no retorno do Mercado Pago. Tente novamente.';
                tipo = 'danger';
                break;
        }

        if (mensagem) {
            showNotification(mensagem, tipo);
            // Limpa a URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Recarrega os dados se conectou com sucesso
            if (status === 'mp-conectado') {
                await fetchUserProfile();
            }
        }
    }
});