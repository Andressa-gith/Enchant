// Importa o cliente Supabase para verificar a autenticação
import supabase from '/scripts/supabaseClient.js';

// O "Guarda" reativo que inicializa a página (TEM Q colocar isso em todas as paginas se pa)
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => initializeApp(session));
        } else {
            initializeApp(session);
        }
    } else {
        if (!window.isLoggingOut) {
            alert('Você precisa estar logado para acessar essa página.');
            window.location.href = '/entrar';
        }
    }
});

// Função que busca os dados do perfil no nosso backend
async function fetchUserProfile(session) {
    const token = session.access_token;
    try {
        // Usa a rota GET /api/user/profile que já criamos e protegemos
        const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error(`Falha ao buscar dados do perfil. Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        alert('Não foi possível carregar seus dados. Tente recarregar a página.');
        return null;
    }
}

// Função principal que "monta" a página e ativa todas as suas funcionalidades
function initializeProfilePage(userData, session) {
    console.log("Dados do perfil recebidos do backend:", userData);
    
    // Suas variáveis globais
    let isPasswordVisible = false;
    let campoAtualComErro = '';
    let logoPreviewData = null;

    // ========== FUNÇÕES DE ATUALIZAÇÃO DA UI ==========
    function updateUI() {
        console.log('Atualizando UI...');
        
        // Atualizar elementos da página principal com os dados do backend
        document.getElementById("org-name").textContent = userData.nome || 'Nome não encontrado';
        document.getElementById("institution-name").textContent = userData.nome || 'Não informado';
        document.getElementById("email").textContent = userData.email || 'Não informado';
        document.getElementById("cnpj").textContent = userData.documento_numero || 'Não informado';
        document.getElementById("phone").textContent = userData.telefone || 'Não informado'; // (Requer JOIN no backend)
        document.getElementById("estado").textContent = userData.estado || 'Não informado';   // (Requer JOIN no backend)
        document.getElementById("cidade").textContent = userData.cidade || 'Não informado';   // (Requer JOIN no backend)
        document.querySelector(".password-dots1").textContent = '••••••••';
        
        // Atualizar campos do formulário de edição
        document.getElementById("edit-institution-name").value = userData.nome || '';
        document.getElementById("edit-email").value = userData.email || '';
        document.getElementById("edit-cnpj").value = userData.documento_numero || '';
        document.getElementById("edit-phone").value = userData.telefone || '';
        document.getElementById("edit-estado").value = userData.estado || '';
        document.getElementById("edit-cidade").value = userData.cidade || '';
        document.getElementById("edit-password").value = ''; // Senha sempre vazia por segurança
        
        updateLogoDisplay();
        setTimeout(setupMainPasswordToggle, 100);
    }

    function updateLogoDisplay() {
        const logoDisplay = document.getElementById('logo-display');
        const logoPlaceholder = document.getElementById('logo-placeholder');
        const currentLogo = document.getElementById('current-logo');
        if (!logoDisplay) return;
        if (userData.url_logo) { // Supondo que 'url_logo' venha dos dados
            if (logoPlaceholder) logoPlaceholder.style.display = 'none';
            if (currentLogo) {
                currentLogo.src = userData.url_logo;
                currentLogo.style.display = 'block';
            }
        } else {
            if (logoPlaceholder) logoPlaceholder.style.display = 'block';
            if (currentLogo) currentLogo.style.display = 'none';
        }
    }

    // ========== CONFIGURAÇÕES DE SENHA ==========
    function setupMainPasswordToggle() {
        const toggleButton = document.getElementById("toggle-password");
        const passwordDisplay = document.querySelector(".password-dots1");
        if (toggleButton && passwordDisplay) {
            const newButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newButton, toggleButton);
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                isPasswordVisible = !isPasswordVisible;
                const icon = newButton.querySelector('i');
                if (isPasswordVisible) {
                    passwordDisplay.textContent = "Não é possível exibir a senha";
                    if (icon) icon.className = 'bi bi-eye-slash';
                } else {
                    passwordDisplay.textContent = '••••••••';
                    if (icon) icon.className = 'bi bi-eye';
                }
            });
        }
    }

    function setupEditPasswordToggle() {
        const editPasswordField = document.getElementById("edit-password");
        const toggleEditPassword = document.getElementById("toggle-edit-password");
        if (toggleEditPassword && editPasswordField) {
            const newToggleButton = toggleEditPassword.cloneNode(true);
            toggleEditPassword.parentNode.replaceChild(newToggleButton, toggleEditPassword);
            newToggleButton.addEventListener("click", function(e) {
                e.preventDefault();
                const icon = newToggleButton.querySelector('i');
                if (editPasswordField.type === "password") {
                    editPasswordField.type = "text";
                    if (icon) icon.className = 'bi bi-eye-slash';
                } else {
                    editPasswordField.type = "password";
                    if (icon) icon.className = 'bi bi-eye';
                }
            });
        }
    }

    // ========== MODAIS E LÓGICAS DE EDIÇÃO ==========
    function openEditModal() {
        const editModal = document.getElementById("edit-modal");
        if (!editModal) return;
        const modalOverlay = createModalOverlay();
        modalOverlay.style.display = "block";
        document.body.style.overflow = "hidden";
        editModal.style.display = "flex";
        editModal.style.zIndex = "1060";
        setTimeout(setupEditPasswordToggle, 100);
        updateUI(); // Preenche o modal com os dados atuais
    }

    function closeEditModal() {
        const modalOverlay = document.getElementById("modal-overlay");
        const editModal = document.getElementById("edit-modal");
        if (modalOverlay) modalOverlay.style.display = "none";
        if (editModal) editModal.style.display = "none";
        document.body.style.overflow = "auto";
    }

    async function saveChanges() {
        console.log('Salvando alterações...');
        if (validarFormulario()) {
            const dadosParaEnviar = {
                nome: document.getElementById("edit-institution-name").value,
                email: document.getElementById("edit-email").value,
                senha: document.getElementById("edit-password").value, // Enviar apenas se não for vazia
                cnpj: document.getElementById("edit-cnpj").value,
                telefone: document.getElementById("edit-phone").value,
                estado: document.getElementById("edit-estado").value,
                cidade: document.getElementById("edit-cidade").value,
            };

            try {
                const response = await fetch('/api/user/profile', { // Rota para ATUALIZAR
                    method: 'PUT', // ou 'PATCH'
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
                const updatedData = await response.json();
                Object.assign(userData, updatedData); // Atualiza a variável local 'userData'
                updateUI();
                closeEditModal();
                mostrarModal('<div class="alert alert-success"><i class="bi bi-check-circle-fill"></i> Dados atualizados com sucesso!</div>');
            } catch(error) {
                mostrarModalErro('Servidor', error.message);
                return;
            }
        }
    }

    function openPhotoModal() {
        const photoModal = document.getElementById("photo-modal");
        if (photoModal) {
            const modalOverlay = createModalOverlay();
            modalOverlay.style.display = "block";
            document.body.style.overflow = "hidden";
            photoModal.style.display = "flex";
            photoModal.style.zIndex = "1060";
        }
    }

    function closePhotoModal() {
        const photoModal = document.getElementById("photo-modal");
        const modalOverlay = document.getElementById("modal-overlay");
        if (photoModal) photoModal.style.display = "none";
        if (modalOverlay) modalOverlay.style.display = "none";
        document.body.style.overflow = "auto";
    }

    function savePhoto() {
        const fileInput = document.getElementById("photo-upload");
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                userData.profileImage = e.target.result; // Salva localmente por enquanto
                const profileImage = document.getElementById("profile-image");
                if (profileImage) profileImage.src = e.target.result;
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
        closePhotoModal();
    }

    function openLogoModal() {
        const logoModal = document.getElementById("logo-modal");
        if (!logoModal) return;
        const modalOverlay = createModalOverlay();
        modalOverlay.style.display = "block";
        document.body.style.overflow = "hidden";
        logoModal.style.display = "flex";
        logoModal.style.zIndex = "1060";
        setupLogoUpload();
    }

    function closeLogoModal() {
        const logoModal = document.getElementById("logo-modal");
        const modalOverlay = document.getElementById("modal-overlay");
        if (logoModal) logoModal.style.display = "none";
        if (modalOverlay) modalOverlay.style.display = "none";
        document.body.style.overflow = "auto";
        clearLogoPreview();
    }

    function setupLogoUpload() {
        const logoUploadArea = document.getElementById('logo-upload-area');
        const logoUpload = document.getElementById('logo-upload');
        if (!logoUploadArea || !logoUpload) return;
        logoUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); logoUploadArea.classList.add('drag-over'); });
        logoUploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); logoUploadArea.classList.remove('drag-over'); });
        logoUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            logoUploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleLogoFile(e.dataTransfer.files[0]);
        });
        logoUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleLogoFile(e.target.files[0]);
        });
    }

    function handleLogoFile(file) {
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
        if (!tiposPermitidos.includes(file.type)) {
            mostrarModal('<div class="alert alert-danger">Formato não permitido. Use JPG, PNG ou SVG.</div>');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            mostrarModal('<div class="alert alert-danger">Arquivo muito grande (máx. 2MB).</div>');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            logoPreviewData = e.target.result;
            showLogoPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    function showLogoPreview(imageSrc) {
        const logoUploadArea = document.getElementById('logo-upload-area');
        if (!logoUploadArea) return;
        logoUploadArea.innerHTML = `<div class="logo-preview-container"><img src="${imageSrc}" class="logo-preview-image" alt="Preview"><button type="button" onclick="clearLogoPreview()" class="logo-preview-remove">×</button></div><p class="logo-preview-text">Clique em "Salvar"</p>`;
    }

    function clearLogoPreview() {
        const logoUploadArea = document.getElementById('logo-upload-area');
        if (!logoUploadArea) return;
        logoUploadArea.innerHTML = `<i class="bi bi-cloud-upload logo-upload-icon"></i><p>Clique ou arraste uma imagem</p><p class="logo-upload-subtitle">JPG, PNG, SVG (máx. 2MB)</p>`;
        logoPreviewData = null;
        const logoUpload = document.getElementById('logo-upload');
        if (logoUpload) logoUpload.value = '';
    }

    function saveLogo() {
        if (logoPreviewData) {
            userData.logoImage = logoPreviewData;
            // AQUI entraria a lógica de 'fetch' para enviar o logo para o backend
            updateLogoDisplay();
            mostrarModal('<div class="alert alert-success">Logo atualizada com sucesso!</div>');
        } else {
            userData.logoImage = null;
            updateLogoDisplay();
            mostrarModal('<div class="alert alert-info">Logo removida.</div>');
        }
        closeLogoModal();
    }

    function openPrivacyPDF() { window.open('/assets/pdfs/politica-privacidade.pdf', '_blank'); }
    function openTermsPDF() { window.open('/assets/pdfs/termos-servico.pdf', '_blank'); }
    function openPrivacyModal() { openPrivacyPDF(); }
    function closePrivacyModal() {}
    function openTermsModal() { openTermsPDF(); }
    function closeTermsModal() {}

    function createModalOverlay() {
        let modalOverlay = document.getElementById("modal-overlay");
        if (!modalOverlay) {
            modalOverlay = document.createElement("div");
            modalOverlay.id = "modal-overlay";
            modalOverlay.style.cssText = `display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); z-index: 1050;`;
            document.body.appendChild(modalOverlay);
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeAllModals();
            });
        }
        return modalOverlay;
    }
    
    function closeAllModals() {
        closeEditModal();
        closePhotoModal();
        closeLogoModal();
    }
    
    const validadores = {
        validarNome: function(nome) {
            if (!nome || nome.trim() === "") return { valido: false, mensagem: "O nome não pode ficar em branco." };
            if (nome.trim().length < 3) return { valido: false, mensagem: "O nome deve ter pelo menos 3 caracteres." };
            const regexNome = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s.,'-]+$/;
            if (!regexNome.test(nome)) return { valido: false, mensagem: "O nome contém caracteres não permitidos." };
            return { valido: true };
        },
        validarEmail: function(email) {
            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !regexEmail.test(email)) return { valido: false, mensagem: "Formato de email inválido." };
            return { valido: true };
        },
        validarSenha: function(senha) {
            if (!senha) return { valido: true }; // Senha pode ser vazia se não for alterada
            if (senha.length < 8) return { valido: false, mensagem: "A senha deve ter no mínimo 8 caracteres." };
            if (!/[A-Z]/.test(senha)) return { valido: false, mensagem: "A senha deve conter pelo menos uma letra maiúscula." };
            if (!/[0-9]/.test(senha)) return { valido: false, mensagem: "A senha deve conter pelo menos um número." };
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) return { valido: false, mensagem: "A senha deve conter um caractere especial." };
            return { valido: true };
        },
        validarCNPJ: function(cnpj) { /* ...sua validação de CNPJ... */ return { valido: true }; },
        validarTelefone: function(telefone) { /* ...sua validação de telefone... */ return { valido: true }; },
    };

    function validarFormulario() {
        const campos = {
            "edit-institution-name": { validador: validadores.validarNome, nome: "Nome da ONG" },
            "edit-email": { validador: validadores.validarEmail, nome: "E-mail" },
            "edit-password": { validador: validadores.validarSenha, nome: "Senha" },
            "edit-cnpj": { validador: validadores.validarCNPJ, nome: "CNPJ" },
            "edit-phone": { validador: validadores.validarTelefone, nome: "Telefone" }
        };
        for (const id in campos) {
            const campo = campos[id];
            const elemento = document.getElementById(id);
            if (!elemento) continue;
            const resultado = campo.validador(elemento.value || "");
            if (!resultado.valido) {
                mostrarModalErro(campo.nome, resultado.mensagem);
                destacarCampoComErro(id);
                return false;
            }
        }
        return true;
    }

    function mostrarModal(mensagem) {
        const modalBody = document.getElementById('erroSenhaModalBody');
        const modalEl = document.getElementById('erroSenhaModal');
        if (modalBody && modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalBody.innerHTML = mensagem;
            modal.show();
        }
    }
    function mostrarModalErro(campo, mensagem) { /* ...sua função... */ }
    function destacarCampoComErro(id) { /* ...sua função... */ }
    function configurarMascaraCNPJ() { /* ...sua função... */ }
    function configurarMascaraTelefone() { /* ...sua função... */ }
    function configurarVerificacaoSenha() { /* ...sua função... */ }

    // ========== INICIALIZAÇÃO DA PÁGINA ==========
    updateUI();
    configurarMascaraCNPJ();
    configurarMascaraTelefone();
    configurarVerificacaoSenha();
    
    // Disponibiliza as funções que são chamadas pelo HTML (onclick)
    window.openEditModal = openEditModal;
    window.closeEditModal = closeEditModal;
    window.saveChanges = saveChanges;
    window.openPhotoModal = openPhotoModal;
    window.closePhotoModal = closePhotoModal;
    window.savePhoto = savePhoto;
    window.openLogoModal = openLogoModal;
    window.closeLogoModal = closeLogoModal;
    window.saveLogo = saveLogo;
    window.clearLogoPreview = clearLogoPreview;
    window.openPrivacyPDF = openPrivacyPDF;
    window.openTermsPDF = openTermsPDF;
    window.openPrivacyModal = openPrivacyModal;
    window.closePrivacyModal = closePrivacyModal;
    window.openTermsModal = openTermsModal;
    window.closeTermsModal = closeTermsModal;
    window.closeAllModals = closeAllModals;
}