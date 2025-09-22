document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('passwordForm'); // Use o ID do seu <form>
    const pass1 = document.getElementById('pass1');
    const pass2 = document.getElementById('pass2');

    // Elementos dos requisitos (seu código original, mantido)
    const reqLength = document.getElementById('reqLength');
    const reqUpper = document.getElementById('reqUpper');
    const reqNumbers = document.getElementById('reqNumbers');
    const reqSpecial = document.getElementById('reqSpecial');

    // Função para mostrar modal de erro (seu código original, mantido)
    function showErrorModal(messages) {
        const errorModalBody = document.getElementById('errorModalBody');
        errorModalBody.innerHTML = '';
        messages.forEach(message => {
            const errorP = document.createElement('p');
            errorP.textContent = message;
            errorP.style.marginBottom = '10px';
            errorModalBody.appendChild(errorP);
        });
        // Assumindo que você usa jQuery para modais Bootstrap
        $('#errorModal').modal('show');
    }

    // Suas funções de validação em tempo real (código original, mantido)
    function updateRequirementUI(password) {
        if (!password) {
            [reqLength, reqUpper, reqNumbers, reqSpecial].forEach(el => {
                el.classList.remove('valid');
                el.classList.add('invalid');
            });
            return;
        }
        reqLength.classList.toggle('valid', password.length >= 8);
        reqLength.classList.toggle('invalid', password.length < 8);
        reqUpper.classList.toggle('valid', /[A-Z]/.test(password));
        reqUpper.classList.toggle('invalid', !/[A-Z]/.test(password));
        const numberCount = (password.match(/[0-9]/g) || []).length;
        reqNumbers.classList.toggle('valid', numberCount >= 2);
        reqNumbers.classList.toggle('invalid', numberCount < 2);
        reqSpecial.classList.toggle('valid', /[!@#$%^&*(),.?":{}|<>]/.test(password));
        reqSpecial.classList.toggle('invalid', !/[!@#$%^&*(),.?":{}|<>]/.test(password));
    }

    pass1.addEventListener('input', function () {
        updateRequirementUI(pass1.value);
        checkPasswordMatch();
    });

    function checkPasswordMatch() {
        if (pass1.value && pass2.value) {
            if (pass1.value !== pass2.value) {
                pass2.classList.add('password-mismatch');
                pass2.classList.remove('password-match');
            } else {
                pass2.classList.remove('password-mismatch');
                pass2.classList.add('password-match');
            }
        }
    }

    pass2.addEventListener('input', function () {
        checkPasswordMatch();
    });

    function validatePassword(password) {
        const hasMinLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const numberCount = (password.match(/[0-9]/g) || []).length;
        const hasEnoughNumbers = numberCount >= 2;
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return {
            isValid: hasMinLength && hasUppercase && hasEnoughNumbers && hasSpecialChar
        };
    }

    // MUDANÇA PRINCIPAL: Adicionamos 'async' para poder usar 'await' com o fetch
    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        // ----- SEU CÓDIGO DE VALIDAÇÃO (MANTIDO) -----
        let errorMessages = [];
        let isValid = true;

        const passwordValidation = validatePassword(pass1.value);
        if (!passwordValidation.isValid) {
            errorMessages.push('Por favor, crie uma senha válida atendendo todos os requisitos.');
            pass1.focus();
            isValid = false;
        }

        if (pass1.value !== pass2.value) {
            errorMessages.push('As senhas não coincidem!');
            if (isValid) {
                pass2.focus();
            }
            isValid = false;
        }
        
        if (!isValid) {
            showErrorModal(errorMessages);
            return; // Interrompe a execução se a validação local falhar
        }

        // ----- INÍCIO DA LÓGICA DE COMUNICAÇÃO COM O BACK-END -----
        try {
            // 1. Pegar o token do sessionStorage
            const token = sessionStorage.getItem('passwordResetToken');

            if (!token) {
                showErrorModal(['Sua sessão expirou. Por favor, reinicie o processo.']);
                return;
            }

            // 2. Montar e executar a chamada para a API
            const response = await fetch('/resetPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    newPassword: pass1.value // Envia a nova senha validada
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // ERRO: O back-end recusou a troca (ex: token expirado)
                showErrorModal([data.message || 'Ocorreu um erro no servidor.']);
            } else {
                // SUCESSO: Senha alterada com sucesso!
                $('#successModal').modal('show'); // Mostra seu modal de sucesso

                // Limpa o token para segurança
                sessionStorage.removeItem('passwordResetToken');

                // Redireciona para a página de login automaticamente após 2 segundos
                setTimeout(() => {
                    window.location.href = "/login"; // Redirecionamento para a rota de login
                }, 2000);
            }

        } catch (error) {
            // ERRO DE REDE: Não conseguiu se conectar ao servidor
            console.error('Erro de conexão:', error);
            showErrorModal(['Não foi possível conectar ao servidor. Verifique sua internet.']);
        }
    });
});