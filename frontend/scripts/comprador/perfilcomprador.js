// perfilcomprador.js - Arquivo completo com correções para visualização de senha

const userData = {
    orgName: "Nome Comprador",
    email: "nomecomprador@email.com", 
    password: "12345678C@",
    cnpj: "12.345.678/0001-95",
    phone: "(11) 91234-5678",
    estado: "Bahia",
    cidade: "Salvador",
    profileImage: "/api/placeholder/40/40",
    logoImage: null
};

// Variáveis globais
let isPasswordVisible = false;
let campoAtualComErro = '';
let logoPreviewData = null;

// ========== FUNÇÕES DE ATUALIZAÇÃO DA UI ==========

function updateUI() {
    console.log('Atualizando UI...');
    
    // Atualizar elementos da página principal
    const orgNameElement = document.getElementById("org-name");
    const institutionNameElement = document.getElementById("institution-name");
    const emailElement = document.getElementById("email");
    const cnpjElement = document.getElementById("cnpj");
    const phoneElement = document.getElementById("phone");
    const estadoElement = document.getElementById("estado");
    const cidadeElement = document.getElementById("cidade");
    const profileImageElement = document.getElementById("profile-image");

    if (orgNameElement) orgNameElement.textContent = userData.orgName;
    if (institutionNameElement) institutionNameElement.textContent = userData.orgName;
    if (emailElement) emailElement.textContent = userData.email;
    if (cnpjElement) cnpjElement.textContent = userData.cnpj;
    if (phoneElement) phoneElement.textContent = userData.phone;
    if (estadoElement) estadoElement.textContent = userData.estado;
    if (cidadeElement) cidadeElement.textContent = userData.cidade;
    if (profileImageElement) profileImageElement.src = userData.profileImage;
    
    // Atualizar campos do formulário de edição
    const editInstitutionName = document.getElementById("edit-institution-name");
    const editEmail = document.getElementById("edit-email");
    const editPassword = document.getElementById("edit-password");
    const editCnpj = document.getElementById("edit-cnpj");
    const editPhone = document.getElementById("edit-phone");
    const editEstado = document.getElementById("edit-estado");
    const editCidade = document.getElementById("edit-cidade");

    if (editInstitutionName) editInstitutionName.value = userData.orgName;
    if (editEmail) editEmail.value = userData.email;
    if (editPassword) editPassword.value = userData.password;
    if (editCnpj) editCnpj.value = userData.cnpj;
    if (editPhone) editPhone.value = userData.phone;
    if (editEstado) editEstado.value = userData.estado;
    if (editCidade) editCidade.value = userData.cidade;
    
    // Atualizar exibição da logo
    updateLogoDisplay();
    
    // Reconfigurar toggle de senha após atualizar dados
    setTimeout(setupMainPasswordToggle, 100);
}

function updateLogoDisplay() {
    const logoDisplay = document.getElementById('logo-display');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    const currentLogo = document.getElementById('current-logo');
    
    if (!logoDisplay) return;
    
    if (userData.logoImage) {
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
        if (currentLogo) {
            currentLogo.src = userData.logoImage;
            currentLogo.style.display = 'block';
        }
    } else {
        if (logoPlaceholder) logoPlaceholder.style.display = 'block';
        if (currentLogo) currentLogo.style.display = 'none';
    }
}

// ========== CONFIGURAÇÕES DE SENHA - VERSÃO CORRIGIDA ==========

function setupMainPasswordToggle() {
    console.log('Configurando toggle de senha principal...');
    
    // Aguardar elementos estarem disponíveis
    const checkElements = () => {
        const toggleButton = document.getElementById("toggle-password");
        const passwordDisplay = document.querySelector(".password-dots1");
        
        console.log('Toggle button:', toggleButton);
        console.log('Password display:', passwordDisplay);
        
        if (toggleButton && passwordDisplay) {
            console.log('Elementos encontrados, configurando evento...');
            
            // Remover listeners anteriores clonando o elemento
            const newButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newButton, toggleButton);
            
            // Adicionar novo evento
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Botão de senha clicado!');
                
                isPasswordVisible = !isPasswordVisible;
                
                const icon = newButton.querySelector('i');
                if (isPasswordVisible) {
                    passwordDisplay.textContent = userData.password;
                    if (icon) {
                        icon.className = 'bi bi-eye-slash';
                    }
                    console.log('Senha mostrada');
                } else {
                    passwordDisplay.textContent = '••••••••';
                    if (icon) {
                        icon.className = 'bi bi-eye';
                    }
                    console.log('Senha oculta');
                }
            });
            
            console.log('Event listener configurado com sucesso');
            return true;
        } else {
            console.warn('Elementos não encontrados ainda');
            return false;
        }
    };
    
    // Tentar configurar imediatamente, se falhar, tentar novamente após delay
    if (!checkElements()) {
        setTimeout(() => {
            console.log('Tentando novamente após delay...');
            checkElements();
        }, 1000);
    }
}

function setupEditPasswordToggle() {
    const editPasswordField = document.getElementById("edit-password");
    const toggleEditPassword = document.getElementById("toggle-edit-password");
    
    if (toggleEditPassword && editPasswordField) {
        // Clonar para remover listeners anteriores
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

// ========== MODAL DE EDIÇÃO DE INFORMAÇÕES ==========

function openEditModal() {
    const editModal = document.getElementById("edit-modal");
    if (!editModal) {
        console.error("Modal de edição não encontrado");
        return;
    }

    const modalOverlay = createModalOverlay();
    modalOverlay.style.display = "block";
    document.body.style.overflow = "hidden";
    editModal.style.display = "flex";
    editModal.style.zIndex = "1060";
    
    // Configurar o botão de mostrar/ocultar senha do modal de edição
    setTimeout(setupEditPasswordToggle, 100);
    
    // Atualizar campos do formulário
    updateUI();
}

function closeEditModal() {
    const modalOverlay = document.getElementById("modal-overlay");
    const editModal = document.getElementById("edit-modal");
    
    if (modalOverlay) {
        modalOverlay.style.display = "none";
    }
    if (editModal) {
        editModal.style.display = "none";
    }
    document.body.style.overflow = "auto";
}

function saveChanges() {
    console.log('Salvando alterações...');
    
    if (validarFormulario()) {
        const editInstitutionName = document.getElementById("edit-institution-name");
        const editEmail = document.getElementById("edit-email");
        const editPassword = document.getElementById("edit-password");
        const editCnpj = document.getElementById("edit-cnpj");
        const editPhone = document.getElementById("edit-phone");
        const editEstado = document.getElementById("edit-estado");
        const editCidade = document.getElementById("edit-cidade");
        
        if (editCnpj) {
            editCnpj.value = validadores.formatarCNPJ(editCnpj.value);
        }
        
        if (editPhone) {
            editPhone.value = validadores.formatarTelefone(editPhone.value);
        }
        
        if (editInstitutionName) userData.orgName = editInstitutionName.value;
        if (editEmail) userData.email = editEmail.value;
        if (editPassword) userData.password = editPassword.value;
        if (editCnpj) userData.cnpj = editCnpj.value;
        if (editPhone) userData.phone = editPhone.value;
        if (editEstado) userData.estado = editEstado.value;
        if (editCidade) userData.cidade = editCidade.value;
        
        // Reset password visibility state
        isPasswordVisible = false;
        
        updateUI();
        closeEditModal();
        
        mostrarModal('<div class="alert alert-success"><i class="bi bi-check-circle-fill"></i> Dados atualizados com sucesso!</div>');
    }
}

// ========== MODAL DE FOTO DE PERFIL ==========

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
    
    if (photoModal) {
        photoModal.style.display = "none";
    }
    if (modalOverlay) {
        modalOverlay.style.display = "none";
    }
    document.body.style.overflow = "auto";
}

function savePhoto() {
    const fileInput = document.getElementById("photo-upload");
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            userData.profileImage = e.target.result;
            const profileImage = document.getElementById("profile-image");
            if (profileImage) {
                profileImage.src = e.target.result;
            }
        };
        
        reader.readAsDataURL(fileInput.files[0]);
    }
    
    closePhotoModal();
}

// ========== MODAL DE LOGO ==========

function openLogoModal() {
    const logoModal = document.getElementById("logo-modal");
    if (!logoModal) {
        console.error("Modal de logo não encontrado");
        return;
    }

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
    
    if (logoModal) {
        logoModal.style.display = "none";
    }
    if (modalOverlay) {
        modalOverlay.style.display = "none";
    }
    document.body.style.overflow = "auto";
    
    clearLogoPreview();
}

function setupLogoUpload() {
    const logoUploadArea = document.getElementById('logo-upload-area');
    const logoUpload = document.getElementById('logo-upload');
    
    if (!logoUploadArea || !logoUpload) return;
    
    logoUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        logoUploadArea.classList.add('drag-over');
    });
    
    logoUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        logoUploadArea.classList.remove('drag-over');
    });
    
    logoUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        logoUploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleLogoFile(files[0]);
        }
    });
    
    logoUpload.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleLogoFile(e.target.files[0]);
        }
    });
}

function handleLogoFile(file) {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!tiposPermitidos.includes(file.type)) {
        mostrarModal('<div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill"></i> Formato não permitido. Use apenas JPG, PNG ou SVG.</div>');
        return;
    }
    
    const tamanhoMaximo = 2 * 1024 * 1024;
    if (file.size > tamanhoMaximo) {
        mostrarModal('<div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill"></i> Arquivo muito grande. O tamanho máximo é 2MB.</div>');
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
    
    logoUploadArea.innerHTML = `
        <div class="logo-preview-container">
            <img src="${imageSrc}" class="logo-preview-image" alt="Preview da logo">
            <button type="button" onclick="clearLogoPreview()" class="logo-preview-remove">×</button>
        </div>
        <p class="logo-preview-text">Clique em "Salvar" para confirmar a nova logo</p>
    `;
}

function clearLogoPreview() {
    const logoUploadArea = document.getElementById('logo-upload-area');
    if (!logoUploadArea) return;
    
    logoUploadArea.innerHTML = `
        <i class="bi bi-cloud-upload logo-upload-icon"></i>
        <p>Clique ou arraste uma imagem aqui</p>
        <p class="logo-upload-subtitle">JPG, PNG, SVG (máx. 2MB)</p>
    `;
    
    logoPreviewData = null;
    
    const logoUpload = document.getElementById('logo-upload');
    if (logoUpload) {
        logoUpload.value = '';
    }
}

function saveLogo() {
    if (logoPreviewData) {
        userData.logoImage = logoPreviewData;
        updateLogoDisplay();
        mostrarModal('<div class="alert alert-success"><i class="bi bi-check-circle-fill"></i> Logo atualizada com sucesso!</div>');
    } else {
        userData.logoImage = null;
        updateLogoDisplay();
        mostrarModal('<div class="alert alert-info"><i class="bi bi-info-circle-fill"></i> Logo removida.</div>');
    }
    
    closeLogoModal();
}

// ========== FUNÇÕES PARA ABRIR PDFs ==========

function openPrivacyPDF() {
    const pdfUrl = '/assets/pdfs/politica-privacidade.pdf';
    window.open(pdfUrl, '_blank');
}

function openTermsPDF() {
    const pdfUrl = '/assets/pdfs/termos-servico.pdf';
    window.open(pdfUrl, '_blank');
}

function openPrivacyModal() {
    openPrivacyPDF();
}

function closePrivacyModal() {
    // Mantido para compatibilidade
}

function openTermsModal() {
    openTermsPDF();
}

function closeTermsModal() {
    // Mantido para compatibilidade
}

// ========== GESTÃO DE MODAIS ==========

function createModalOverlay() {
    let modalOverlay = document.getElementById("modal-overlay");
    if (!modalOverlay) {
        modalOverlay = document.createElement("div");
        modalOverlay.id = "modal-overlay";
        modalOverlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1050;
        `;
        document.body.appendChild(modalOverlay);
        
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeAllModals();
            }
        });
    }
    return modalOverlay;
}

function closeAllModals() {
    closeEditModal();
    closePhotoModal();
    closeLogoModal();
}

// ========== FUNÇÕES DE VALIDAÇÃO ==========

const validadores = {
    validarNome: function(nome) {
        if (!nome || nome.trim() === "") {
            return { valido: false, mensagem: "O nome não pode ficar em branco." };
        }
        
        if (nome.trim().length < 3) {
            return { valido: false, mensagem: "O nome deve ter pelo menos 3 caracteres." };
        }
        
        const regexNome = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s.,'-]+$/;
        if (!regexNome.test(nome)) {
            return { 
                valido: false, 
                mensagem: "O nome contém caracteres não permitidos. Use apenas letras, números, espaços e os símbolos .,'-" 
            };
        }
        
        return { valido: true };
    },
    
    validarEmail: function(email) {
        if (!email || email.trim() === "") {
            return { valido: false, mensagem: "O email não pode ficar em branco." };
        }
        
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(email)) {
            return { 
                valido: false, 
                mensagem: "Formato de email inválido. Por favor, verifique se o email está no formato correto (exemplo@dominio.com)." 
            };
        }
        
        return { valido: true };
    },
    
    validarSenha: function(senha) {
        if (!senha || senha === "") {
            return { valido: false, mensagem: "A senha não pode ficar em branco." };
        }
        
        if (senha.length < 8) {
            return { 
                valido: false, 
                mensagem: "A senha deve ter no mínimo 8 caracteres." 
            };
        }
        
        if (!/[A-Z]/.test(senha)) {
            return { 
                valido: false, 
                mensagem: "A senha deve conter pelo menos uma letra maiúscula." 
            };
        }
        
        if (!/[0-9]/.test(senha)) {
            return { 
                valido: false, 
                mensagem: "A senha deve conter pelo menos um número." 
            };
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
            return { 
                valido: false, 
                mensagem: "A senha deve conter pelo menos um caractere especial (ex: !@#$%&*)." 
            };
        }
        
        return { valido: true };
    },
    
    validarCNPJ: function(cnpj) {
        if (!cnpj || cnpj.trim() === "") {
            return { valido: false, mensagem: "O CNPJ não pode ficar em branco." };
        }
        
        cnpj = cnpj.replace(/[^\d]+/g, '');
        
        if (cnpj.length !== 14) {
            return { 
                valido: false, 
                mensagem: "O CNPJ deve ter 14 dígitos (xx.xxx.xxx/xxxx-xx)." 
            };
        }
        
        if (/^(\d)\1+$/.test(cnpj)) {
            return { valido: false, mensagem: "CNPJ inválido." };
        }
        
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        const digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(0))) {
            return { valido: false, mensagem: "CNPJ inválido." };
        }
        
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(1))) {
            return { valido: false, mensagem: "CNPJ inválido." };
        }
        
        return { valido: true };
    },
    
    validarTelefone: function(telefone) {
        if (!telefone || telefone.trim() === "") {
            return { valido: false, mensagem: "O telefone não pode ficar em branco." };
        }
        
        const numeroLimpo = telefone.replace(/\D/g, '');
        
        if (numeroLimpo.length < 10 || numeroLimpo.length > 11) {
            return { 
                valido: false, 
                mensagem: "O número de telefone deve ter 10 dígitos (fixo) ou 11 dígitos (celular)." 
            };
        }
        
        if (numeroLimpo.length === 11 && numeroLimpo.charAt(2) !== '9') {
            return { 
                valido: false, 
                mensagem: "Para celulares, o formato deve ser (XX) 9XXXX-XXXX" 
            };
        }
        
        const ddd = parseInt(numeroLimpo.substring(0, 2));
        if (ddd < 11 || ddd > 99) {
            return { valido: false, mensagem: "DDD inválido." };
        }
        
        return { valido: true };
    },
    
    formatarCNPJ: function(cnpj) {
        cnpj = cnpj.replace(/\D/g, '');
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    },
    
    formatarTelefone: function(telefone) {
        telefone = telefone.replace(/\D/g, '');
        
        if (telefone.length === 11) {
            return telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else {
            return telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
        }
    }
};

function validarFormulario() {
    const campos = {
        "edit-institution-name": { 
            elemento: document.getElementById("edit-institution-name"),
            validador: validadores.validarNome,
            nome: "Nome da ONG" 
        },
        "edit-email": { 
            elemento: document.getElementById("edit-email"),
            validador: validadores.validarEmail,
            nome: "E-mail"
        },
        "edit-password": { 
            elemento: document.getElementById("edit-password"),
            validador: validadores.validarSenha,
            nome: "Senha"
        },
        "edit-cnpj": { 
            elemento: document.getElementById("edit-cnpj"),
            validador: validadores.validarCNPJ,
            nome: "CNPJ"
        },
        "edit-phone": { 
            elemento: document.getElementById("edit-phone"),
            validador: validadores.validarTelefone,
            nome: "Telefone"
        }
    };
    
    for (const id in campos) {
        const campo = campos[id];
        if (!campo.elemento) continue;
        
        const resultado = campo.validador(campo.elemento.value || "");
        
        if (!resultado.valido) {
            mostrarModalErro(campo.nome, resultado.mensagem);
            destacarCampoComErro(id);
            return false;
        }
    }
    
    return true;
}

// ========== FUNÇÕES DE FEEDBACK ==========

function mostrarModal(mensagem) {
    const modalBody = document.getElementById('erroSenhaModalBody');
    if (modalBody) {
        modalBody.innerHTML = mensagem;
        
        try {
            const erroModal = new bootstrap.Modal(document.getElementById('erroSenhaModal'));
            erroModal.show();
        } catch (error) {
            console.error('Erro ao mostrar modal:', error);
            alert(mensagem.replace(/<[^>]*>?/gm, ''));
        }
    } else {
        alert(mensagem.replace(/<[^>]*>?/gm, ''));
    }
}

function mostrarModalErro(campo, mensagem) {
    const titulo = `Erro de validação: ${campo}`;
    
    const conteudo = `
        <div class="alert alert-danger" role="alert">
            <h5><i class="bi bi-exclamation-triangle-fill"></i> Problema no campo "${campo}"</h5>
            <p>${mensagem}</p>
        </div>
        <p>Por favor, corrija o campo e tente novamente.</p>
    `;
    
    const modalLabel = document.getElementById('erroSenhaModalLabel');
    const modalBody = document.getElementById('erroSenhaModalBody');
    
    if (modalLabel) modalLabel.textContent = titulo;
    if (modalBody) modalBody.innerHTML = conteudo;
    
    try {
        const erroModal = new bootstrap.Modal(document.getElementById('erroSenhaModal'));
        erroModal.show();
        
        document.getElementById('erroSenhaModal').addEventListener('hidden.bs.modal', function() {
            const campo = document.getElementById(campoAtualComErro);
            if (campo) campo.focus();
        }, { once: true });
    } catch (error) {
        console.error('Erro ao mostrar modal:', error);
        alert(`${titulo}\n${mensagem}`);
    }
}

function destacarCampoComErro(id) {
    campoAtualComErro = id;
    
    const campo = document.getElementById(id);
    if (campo) {
        campo.style.border = "2px solid #dc3545";
        campo.style.backgroundColor = "#fff8f8";
        
        const removerEstiloErro = function() {
            campo.style.border = "";
            campo.style.backgroundColor = "";
            campo.removeEventListener('input', removerEstiloErro);
        };
        
        campo.addEventListener('input', removerEstiloErro);
    }
}

// ========== MÁSCARAS DE ENTRADA ==========

function configurarMascaraCNPJ() {
    const campoCNPJ = document.getElementById('edit-cnpj');
    if (!campoCNPJ) return;
    
    campoCNPJ.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor.length > 14) valor = valor.substring(0, 14);
        
        if (valor.length <= 2) {
            e.target.value = valor;
        } else if (valor.length <= 5) {
            e.target.value = valor.replace(/^(\d{2})(\d+)/, "$1.$2");
        } else if (valor.length <= 8) {
            e.target.value = valor.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
        } else if (valor.length <= 12) {
            e.target.value = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
        } else {
            e.target.value = valor.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, "$1.$2.$3/$4-$5");
        }
    });
}

function configurarMascaraTelefone() {
    const campoTelefone = document.getElementById('edit-phone');
    if (!campoTelefone) return;
    
    campoTelefone.addEventListener('input', function(e) {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor.length > 11) valor = valor.substring(0, 11);
        
        if (valor.length <= 2) {
            e.target.value = valor;
        } else if (valor.length <= 6) {
            e.target.value = valor.replace(/^(\d{2})(\d+)/, "($1) $2");
        } else if (valor.length <= 10) {
            e.target.value = valor.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
        } else {
            e.target.value = valor.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
        }
    });
}

function configurarVerificacaoSenha() {
    const campoSenha = document.getElementById('edit-password');
    if (!campoSenha) return;
    
    campoSenha.addEventListener('input', function() {
        const senha = campoSenha.value;
        
        const checkLength = document.getElementById("check-length");
        const checkUppercase = document.getElementById("check-uppercase");
        const checkNumber = document.getElementById("check-number");
        const checkSpecial = document.getElementById("check-special");
        
        if (checkLength) {
            if (senha.length >= 8) {
                checkLength.style.color = "#198754";
                checkLength.style.fontWeight = "bold";
            } else {
                checkLength.style.color = "#666";
                checkLength.style.fontWeight = "normal";
            }
        }
        
        if (checkUppercase) {
            if (/[A-Z]/.test(senha)) {
                checkUppercase.style.color = "#198754";
                checkUppercase.style.fontWeight = "bold";
            } else {
                checkUppercase.style.color = "#666";
                checkUppercase.style.fontWeight = "normal";
            }
        }
        
        if (checkNumber) {
            if (/[0-9]/.test(senha)) {
                checkNumber.style.color = "#198754";
                checkNumber.style.fontWeight = "bold";
            } else {
                checkNumber.style.color = "#666";
                checkNumber.style.fontWeight = "normal";
            }
        }
        
        if (checkSpecial) {
            if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
                checkSpecial.style.color = "#198754";
                checkSpecial.style.fontWeight = "bold";
            } else {
                checkSpecial.style.color = "#666";
                checkSpecial.style.fontWeight = "normal";
            }
        }
    });
}

// ========== INICIALIZAÇÃO ==========

function inicializar() {
    console.log('Inicializando aplicação...');
    
    // Aguardar que todos os elementos estejam disponíveis
    const initializeWithDelay = () => {
        console.log('Verificando elementos essenciais...');
        
        const elementosEssenciais = [
            'org-name', 'institution-name', 'email', 'cnpj', 
            'phone', 'estado', 'cidade', 'profile-image'
        ];
        
        let elementosEncontrados = 0;
        elementosEssenciais.forEach(id => {
            if (document.getElementById(id)) {
                elementosEncontrados++;
            }
        });
        
        console.log(`Elementos encontrados: ${elementosEncontrados}/${elementosEssenciais.length}`);
        
        if (elementosEncontrados < elementosEssenciais.length) {
            console.log('Nem todos os elementos foram encontrados, tentando novamente...');
            setTimeout(initializeWithDelay, 500);
            return;
        }
        
        // Inicializar UI
        updateUI();
        
        // Configurar funcionalidades
        configurarMascaraCNPJ();
        configurarMascaraTelefone(); 
        configurarVerificacaoSenha();
        
        // Configurar toggle de senha com delay adicional
        setTimeout(() => {
            setupMainPasswordToggle();
            console.log('Toggle de senha configurado');
        }, 200);
        
        console.log('Inicialização concluída');
    };
    
    initializeWithDelay();
}

function inicializarComplementos() {
    console.log('Inicializando complementos...');
    
    updateLogoDisplay();
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    const modalContents = document.querySelectorAll('.modal-content1');
    modalContents.forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    console.log('Complementos inicializados');
}

// ========== DISPONIBILIZAR FUNÇÕES GLOBALMENTE ==========

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

// ========== AUTO-INICIALIZAÇÃO ==========

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM carregado, iniciando aplicação...');
        setTimeout(() => {
            inicializar();
            inicializarComplementos();
        }, 100);
    });
} else {
    console.log('DOM já carregado, iniciando aplicação...');
    setTimeout(() => {
        inicializar();
        inicializarComplementos();
    }, 100);
}

console.log('Arquivo JavaScript completo carregado!');