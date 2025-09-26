// Importa o cliente Supabase para fazer a autenticação
import supabase from '/scripts/supabaseClient.js';

// Roda o script principal apenas quando o HTML estiver totalmente carregado
document.addEventListener('DOMContentLoaded', async () => {
    // 1. VERIFICA AUTENTICAÇÃO
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        // Se não houver sessão ativa, redireciona para a página de login
        window.location.href = '/entrar';
        return;
    }

    // 2. MAPEAMENTO DOS ELEMENTOS DA UI
    // Organiza todos os elementos do HTML em um objeto para fácil acesso
    const ui = {
        // Displays de Informação
        orgName: document.getElementById('org-name'),
        institutionName: document.getElementById('institution-name'),
        email: document.getElementById('email'),
        cnpj: document.getElementById('cnpj'),
        phone: document.getElementById('phone'),
        estado: document.getElementById('estado'),
        cidade: document.getElementById('cidade'),
        passwordDots: document.querySelector('.password-dots1'),
        profileImage: document.getElementById('profile-image'),
        logoPlaceholder: document.getElementById('logo-placeholder'),
        currentLogo: document.getElementById('current-logo'),
        
        // Modais
        editModal: document.getElementById('edit-modal'),
        photoModal: document.getElementById('photo-modal'),
        logoModal: document.getElementById('logo-modal'),
        privacyModal: document.getElementById('privacy-modal'),
        termsModal: document.getElementById('terms-modal'),
        notificationModal: document.getElementById('erroSenhaModal'),
        notificationModalBody: document.getElementById('erroSenhaModalBody'),
        
        // Botões de Abrir Modais
        btnOpenPhotoModal: document.getElementById('btn-open-photo-modal'),
        btnOpenLogoModal: document.getElementById('btn-open-logo-modal'),
        btnOpenEditModal: document.getElementById('btn-open-edit-modal'),
        btnOpenPrivacyModal: document.getElementById('btn-open-privacy-modal'),
        btnOpenTermsModal: document.getElementById('btn-open-terms-modal'),
        
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
        
        btnClosePrivacyModalX: document.getElementById('btn-close-privacy-modal-x'),
        btnClosePrivacyModalFooter: document.getElementById('btn-close-privacy-modal-footer'),
        
        btnCloseTermsModalX: document.getElementById('btn-close-terms-modal-x'),

        // Campos do Formulário de Edição
        editInstitutionName: document.getElementById('edit-institution-name'),
        editEmail: document.getElementById('edit-email'),
        editPassword: document.getElementById('edit-password'),
        editCnpj: document.getElementById('edit-cnpj'),
        editPhone: document.getElementById('edit-phone'),
        editEstado: document.getElementById('edit-estado'),
        editCidade: document.getElementById('edit-cidade'),
        
        // Outros
        togglePassword: document.getElementById('toggle-password'),
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
    // Variáveis para guardar dados e controlar o estado da UI
    let userData = {};
    let logoPreviewFile = null;
    let photoPreviewFile = null;
    let isPasswordVisible = false;
    let modalOverlay = null;
    const notificationModalInstance = new bootstrap.Modal(ui.notificationModal);

    // 4. FUNÇÕES
    
    // --- Funções de API (Comunicação com o Backend) ---
    
    async function fetchUserProfile() {
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const data = await response.json();
            userData = data; // Armazena os dados do usuário globalmente
            updateUI(); // Atualiza a página com os dados recebidos
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
        };
        
        const aSenhaFoiAlterada = !!dadosParaEnviar.senha;

        // Não envia a senha se o campo estiver vazio
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
                const updatedData = await response.json();
                Object.assign(userData, updatedData); // Atualiza a variável local
                updateUI();
                closeModal(ui.editModal);
                showNotification('Dados atualizados com sucesso!', 'success');
            }
        } catch (error) {
            closeModal(ui.editModal);
            showNotification(`Erro do Servidor: ${error.message}`, 'danger');
        }
    }

    function handlePhotoFile(file) {
        if (!file) return;
        // Validações (pode adicionar mais se quiser)
        if (!file.type.startsWith('image/')) {
            return showNotification('Por favor, selecione um ficheiro de imagem.', 'danger');
        }
        photoPreviewFile = file; // Armazena o ficheiro selecionado
    }

    async function saveProfilePhoto() {
        if (!photoPreviewFile) {
            return showNotification('Nenhuma nova foto selecionada.', 'info');
        }

        const cleanFileName = photoPreviewFile.name
        .replace(/\s+/g, '_') // Substitui espaços por underscore
        .replace(/[^a-zA-Z0-9._-]/g, '') // Remove caracteres especiais
        .toLowerCase();

        // Usa o nome original do ficheiro para mais flexibilidade (ex: .jpg, .png)
        const filePath = `${session.user.id}/${cleanFileName}`;
        showNotification('A enviar foto...', 'info');

        // 1. Tenta fazer o upload para o Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(filePath, photoPreviewFile, { upsert: true });

        // 2. Verifica se o upload falhou
        if (uploadError) {
            console.error('Erro no upload da foto:', uploadError);
            return showNotification('Erro ao enviar a sua foto.', 'danger');
        }
        
        // 3. Se o upload teve sucesso, tenta salvar o caminho no banco de dados
        try {
            await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ caminho_foto_perfil: uploadData.path })
            });

            showNotification('Foto de perfil atualizada!', 'success');
            await fetchUserProfile(); // Re-busca tudo para atualizar a UI com a nova imagem
            closeModal(ui.photoModal);
            photoPreviewFile = null; // Limpa a seleção
        
        } catch (dbError) {
            console.error('Erro ao salvar caminho no DB:', dbError);
            showNotification('A foto foi enviada, mas houve um erro ao salvar a referência.', 'danger');
        }
    }

    async function saveOrganizationLogo() {
        if (!logoPreviewFile) {
            return showNotification('Nenhum novo logo selecionado.', 'info');
        }

        const cleanFileName2 = logoPreviewFile.name
        .replace(/\s+/g, '_') // Substitui espaços por underscore
        .replace(/[^a-zA-Z0-9._-]/g, '') // Remove caracteres especiais
        .toLowerCase();

        // Usa o nome original do ficheiro para consistência
        const filePath = `${session.user.id}/${cleanFileName2}`;
        showNotification('A enviar logo...', 'info');

        // 1. Tenta fazer o upload para o Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, logoPreviewFile, {
                upsert: true // Substitui o logo se já existir
            });

        // 2. Verifica se o upload falhou
        if (uploadError) {
            console.error('Erro no upload do logo:', uploadError);
            return showNotification('Erro ao enviar o seu logo.', 'danger');
        }
        
        // 3. Se o upload teve sucesso, tenta salvar o caminho no banco de dados
        try {
            await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ caminho_logo: uploadData.path })
            });

            showNotification('Logo atualizado com sucesso!', 'success');
            await fetchUserProfile(); // Re-busca os dados para obter a nova URL assinada
            closeModal(ui.logoModal);
            logoPreviewFile = null; // Limpa a seleção

        } catch (dbError) {
            console.error('Erro ao salvar caminho no DB:', dbError);
            showNotification('O logo foi enviado, mas houve um erro ao salvar a referência.', 'danger');
        }
    }
    // --- Funções de UI e Modais ---

    function updateUI() {
        // Atualiza os textos na página principal
        ui.orgName.textContent = userData.nome || 'Nome não encontrado';
        ui.institutionName.textContent = userData.nome || 'Não informado';
        ui.email.textContent = userData.email || 'Não informado';
        ui.cnpj.textContent = userData.cnpj || 'Não informado';
        ui.phone.textContent = userData.telefone || 'Não informado';
        ui.estado.textContent = userData.estado || 'Não informado';
        ui.cidade.textContent = userData.cidade || 'Não informado';

        ui.profileImage.src = userData.url_foto_perfil;

        if (userData.url_logo) {
            // Se tem um logo, esconde o placeholder e mostra a imagem
            ui.logoPlaceholder.style.display = 'none';
            ui.currentLogo.src = userData.url_logo;
            ui.currentLogo.style.display = 'block';
        } else {
            // Se não tem, mostra o placeholder e esconde a imagem
            ui.logoPlaceholder.style.display = 'flex';
            ui.currentLogo.style.display = 'none';
        }

        // Preenche o formulário de edição com os dados atuais
        ui.editInstitutionName.value = userData.nome || '';
        ui.editEmail.value = userData.email || '';
        ui.editCnpj.value = userData.cnpj || '';
        ui.editPhone.value = userData.telefone || '';
        ui.editEstado.value = userData.estado || '';
        ui.editCidade.value = userData.cidade || '';
        ui.editPassword.value = ''; // Senha sempre vazia por segurança

    }

    function createModalOverlayIfNeeded() {
        if (!modalOverlay) {
            modalOverlay = document.createElement("div");
            modalOverlay.className = "modal-overlay"; // Use uma classe do seu CSS
            document.body.appendChild(modalOverlay);
            modalOverlay.addEventListener('click', closeAllModals);
        }
    }
    
    function openModal(modalElement) {
        createModalOverlayIfNeeded();
        modalOverlay.style.display = "block";
        modalElement.style.display = "flex";
        document.body.style.overflow = "hidden";
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
    
    // --- Lógica de Senha ---

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

    // --- Lógica de Upload de Logo ---
    function setupLogoUpload() {
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
            return showNotification('Formato não permitido. Use JPG, PNG ou SVG.', 'danger');
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
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

    // --- Conexão dos Eventos ---
    
    function conectarEventos() {
        // Abrir Modais
        ui.btnOpenEditModal.addEventListener('click', () => openModal(ui.editModal));
        ui.btnOpenPhotoModal.addEventListener('click', () => openModal(ui.photoModal));
        ui.btnOpenLogoModal.addEventListener('click', () => openModal(ui.logoModal));
        ui.btnOpenPrivacyModal.addEventListener('click', () => openModal(ui.privacyModal));
        ui.btnOpenTermsModal.addEventListener('click', () => openModal(ui.termsModal));

        // Fechar Modais (Botões 'X' e 'Cancelar')
        [
            ui.btnCloseEditModalX, ui.btnCancelEditModal,
            ui.btnClosePhotoModalX, ui.btnCancelPhotoModal,
            ui.btnCloseLogoModalX, ui.btnCancelLogoModal,
            ui.btnClosePrivacyModalX, ui.btnClosePrivacyModalFooter,
            ui.btnCloseTermsModalX
        ].forEach(btn => btn.addEventListener('click', closeAllModals));

        // Ações dos Modais (Salvar)
        ui.btnSaveChanges.addEventListener('click', saveProfileChanges);

        ui.btnSavePhoto.addEventListener('click', saveProfilePhoto); 
        ui.btnSaveLogo.addEventListener('click', saveOrganizationLogo);
        ui.photoUploadInput.addEventListener('change', (event) => {
            handlePhotoFile(event.target.files[0]);
        });

        // Outros eventos
        ui.editPassword.addEventListener('input', checkPasswordStrength);
    }


    // 5. INICIALIZAÇÃO
    // Ponto de partida da aplicação na página
    
    await fetchUserProfile(); // Busca os dados do usuário e atualiza a UI
    setupPasswordToggles();   // Configura os botões de mostrar/esconder senha
    setupLogoUpload();        // Configura a área de arrastar e soltar logo
    conectarEventos();        // Conecta todos os botões às suas funções
});