document.addEventListener('DOMContentLoaded', function() {
    // --- URLs DAS APIS EXTERNAS ---
    const API_ESTADOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome';
    const API_CIDADES_URL = (estadoId) => `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`;
    const API_CEP_URL = (cep) => `https://viacep.com.br/ws/${cep}/json/`;

    // --- SELETORES DE ELEMENTOS ---
    const formPrincipal = document.getElementById('dados-form');
    const primeiraParte = document.getElementById('primeira-parte');
    const segundaParte = document.getElementById('segunda-parte');
    
    const inputCep = document.getElementById('cep');
    const selectEstado = document.getElementById('estado');
    const selectCidade = document.getElementById('cidade');
    const inputSenha = document.getElementById('senha');
    
    const btnVoltar = document.getElementById('voltar-pagamento');
    const btnComprar = document.getElementById('comprar');
    const paymentOptions = document.querySelectorAll('input[name="opcao"]');

    // --- FUNÇÕES DE INICIALIZAÇÃO ---

    function inicializarFormulario() {
        if (segundaParte) segundaParte.style.display = 'none';
        carregarEstados();
        adicionarEventListeners();
        addInputMasks();
        mudarpagamento(1);
    }

    function adicionarEventListeners() {
        if (formPrincipal) formPrincipal.addEventListener('submit', handleFormSubmit);
        if (inputCep) inputCep.addEventListener('blur', handleCepBlur);
        if (selectEstado) selectEstado.addEventListener('change', handleEstadoChange);
        if (inputSenha) inputSenha.addEventListener('input', handleSenhaInput);
        if (btnVoltar) btnVoltar.addEventListener('click', voltarParaDados);
        if (btnComprar) btnComprar.addEventListener('click', handleCompraSubmit);
        
        paymentOptions.forEach(option => {
            option.addEventListener('click', () => mudarpagamento(parseInt(option.value)));
        });
    }

    // --- NOVAS FUNÇÕES DE VALIDAÇÃO CUSTOMIZADA ---

    /**
     * Mostra uma mensagem de erro abaixo de um campo específico.
     */
    function showError(inputId, message) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;
        
        inputElement.classList.add('is-invalid');
        const errorElement = inputElement.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    }

    /**
     * Limpa todas as mensagens de erro e destaques do formulário.
     */
    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(msg => {
            msg.textContent = '';
            msg.classList.remove('visible');
        });
        document.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
    }

    /**
     * Valida todos os campos da primeira parte do formulário.
     * @returns {boolean} - True se o formulário for válido, false caso contrário.
     */
    function validateForm() {
        clearErrors();
        let isValid = true;

        const fields = [
            { id: 'nome_instituicao', msg: 'O nome da instituição é obrigatório.' },
            { id: 'tipo_instituicao', msg: 'Selecione o tipo de instituição.' },
            { id: 'cnpj', msg: 'O CNPJ é obrigatório.' },
            { id: 'email', msg: 'O email é obrigatório.' },
            { id: 'tel', msg: 'O telefone é obrigatório.' },
            { id: 'cep', msg: 'O CEP é obrigatório.' },
            { id: 'estado', msg: 'Selecione um estado.' },
            { id: 'cidade', msg: 'Selecione uma cidade.' },
            { id: 'bairro', msg: 'O bairro é obrigatório.' },
            { id: 'senha', msg: 'A senha é obrigatória.' },
            { id: 'confirmarsenha', msg: 'A confirmação de senha é obrigatória.' },
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            if (!input.value.trim()) {
                showError(field.id, field.msg);
                isValid = false;
            }
        });

        // Validações específicas adicionais
        const cep = document.getElementById('cep');
        if (cep.value && cep.value.length !== 9) {
            showError('cep', 'O CEP deve ter o formato XXXXX-XXX.');
            isValid = false;
        }

        const senha = document.getElementById('senha');
        const confirmarSenha = document.getElementById('confirmarsenha');
        if (senha.value && confirmarSenha.value && senha.value !== confirmarSenha.value) {
            showError('confirmarsenha', 'As senhas não coincidem.');
            isValid = false;
        }

        if (senha.value && !validarSenha(senha.value).valida) {
            showError('senha', 'A senha não atende aos requisitos de segurança.');
            isValid = false;
        }

        return isValid;
    }

    // --- FUNÇÕES DE LÓGICA E API (ORIGINAIS) ---

    async function carregarEstados() {
        try {
            const response = await fetch(API_ESTADOS_URL);
            if (!response.ok) throw new Error('Erro ao buscar estados.');
            const estados = await response.json();
            
            selectEstado.innerHTML = '<option value="" hidden>Escolha uma opção...</option>';
            estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado.sigla;
                option.textContent = estado.nome;
                selectEstado.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            showModalAviso('Não foi possível carregar a lista de estados. Tente recarregar a página.');
        }
    }

    async function carregarCidades(estadoSigla) {
        if (!estadoSigla) return;
        selectCidade.innerHTML = '<option value="">Carregando...</option>';
        selectCidade.disabled = true;

        try {
            const response = await fetch(API_CIDADES_URL(estadoSigla));
            if (!response.ok) throw new Error('Erro ao buscar cidades.');
            const cidades = await response.json();

            selectCidade.innerHTML = '<option value="" hidden>Selecione uma cidade...</option>';
            cidades.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade.nome;
                option.textContent = cidade.nome;
                selectCidade.appendChild(option);
            });
            selectCidade.disabled = false;
        } catch (error) {
            console.error(error);
            showModalAviso('Não foi possível carregar a lista de cidades.');
        }
    }
    
    async function buscarCEP(cep) {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        try {
            const response = await fetch(API_CEP_URL(cepLimpo));
            if (!response.ok) throw new Error('CEP não encontrado.');
            const data = await response.json();

            if (data.erro) {
                showError('cep', 'CEP não encontrado. Verifique o número digitado.');
                return;
            }

            document.getElementById('bairro').value = data.bairro;
            selectEstado.value = data.uf;
            await carregarCidades(data.uf);
            selectCidade.value = data.localidade;
        } catch (error) {
            console.error(error);
            showError('cep', 'Erro ao buscar o CEP. Tente novamente.');
        }
    }


    // --- FUNÇÕES DE MANIPULAÇÃO DE EVENTOS (HANDLERS) ---

    function handleFormSubmit(event) {
        event.preventDefault();
        // A mágica acontece aqui: trocamos a validação padrão pela nossa
        if (validateForm()) {
            irParaPagamento();
        }
    }

    function handleCepBlur(event) {
        buscarCEP(event.target.value);
    }
    
    function handleEstadoChange() {
        carregarCidades(selectEstado.value);
    }

    function handleSenhaInput() {
        const validacao = validarSenha(this.value);
        document.getElementById('minimodigitos').style.color = validacao.temMinimo8 ? 'green' : '#757575';
        document.getElementById('doisnumeros').style.color = validacao.tem2Numeros ? 'green' : '#757575';
        document.getElementById('umcaracterespecial').style.color = validacao.temCaractereEspecial ? 'green' : '#757575';
        document.getElementById('letramaiuscula').style.color = validacao.temMaiuscula ? 'green' : '#757575';
    }

    function handleCompraSubmit(event) {
        event.preventDefault();
        validarPagamentoEFinalizar();
    }


    // --- LÓGICA PRINCIPAL DO FORMULÁRIO ---

    function irParaPagamento() {
        // A validação pesada já foi feita, aqui só transferimos os dados
        document.getElementById('display-nome').textContent = document.getElementById('nome_instituicao').value;
        document.getElementById('display-email').textContent = document.getElementById('email').value;
        document.getElementById('display-telefone').textContent = document.getElementById('tel').value;

        primeiraParte.style.display = 'none';
        segundaParte.style.display = 'flex';
    }

    function voltarParaDados() {
        segundaParte.style.display = 'none';
        primeiraParte.style.display = 'block';
    }

    function validarSenha(senha) {
        const temMinimo8 = senha.length >= 8;
        const tem2Numeros = (senha.match(/\d/g) || []).length >= 2;
        const temCaractereEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(senha);
        const temMaiuscula = /[A-Z]/.test(senha);
        return {
            temMinimo8, tem2Numeros, temCaractereEspecial, temMaiuscula,
            valida: temMinimo8 && tem2Numeros && temCaractereEspecial && temMaiuscula
        };
    }
    
    function mudarpagamento(opcao) {
        document.querySelector('.cartao-credito').style.display = (opcao === 1) ? 'block' : 'none';
        document.querySelector('.cartao-debito').style.display = (opcao === 2) ? 'block' : 'none';
        document.querySelector('.pix').style.display = (opcao === 3) ? 'block' : 'none';
    }

    function validarPagamentoEFinalizar() {
        const paymentMethod = parseInt(document.querySelector('input[name="opcao"]:checked').value);
        let pagamentoValido = false;

        // ================== LÓGICA RESTAURADA AQUI ==================
        if (paymentMethod === 1 || paymentMethod === 2) { 
            const tipo = (paymentMethod === 1) ? '' : 'debito';
            const numCartao = document.getElementById(`numerocartao${tipo}`).value.replace(/\D/g, '');
            const cvv = document.getElementById(`cvv${tipo}`).value.replace(/\D/g, '');
            const mes = document.getElementById(`mes${tipo}`).value;
            const ano = document.getElementById(`ano${tipo}`).value;

            if (numCartao.length !== 16) showModalAviso(`O número do cartão deve conter 16 dígitos.`, 'erro');
            else if (cvv.length < 3 || cvv.length > 4) showModalAviso(`O CVV deve conter 3 ou 4 dígitos.`, 'erro');
            else if (!mes || !ano) showModalAviso(`Selecione a data de validade do cartão.`, 'erro');
            else pagamentoValido = true;

        } else if (paymentMethod === 3) {
            const nomeCompleto = document.getElementById("nomecompleto").value.trim();
            const cpf = document.getElementById("cpf").value.replace(/\D/g, '');

            if (nomeCompleto === "") showModalAviso("Preencha o nome completo para o pagamento PIX.", 'erro');
            else if (cpf.length !== 11) showModalAviso("O CPF para o pagamento PIX deve conter 11 dígitos.", 'erro');
            else pagamentoValido = true;
        }
        // ==============================================================
        
        if (pagamentoValido) {
            submeterCadastro();
        }
    }
    
    async function submeterCadastro() {
        btnComprar.disabled = true;
        btnComprar.textContent = 'Processando...';
        try {
            const formData = new FormData(formPrincipal);
            const dadosCadastro = Object.fromEntries(formData.entries());
            const ROTA_CADASTRO = '/api/user/cadastro';
            const response = await fetch(ROTA_CADASTRO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCadastro),
            });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.message || 'Ocorreu um erro no servidor.');

            showModalAviso('Cadastro realizado com sucesso! Redirecionando...', 'sucesso');
            setTimeout(() => {
                window.location.href = '/entrar'; 
            }, 2000);
            
        } catch (error) {
            console.error('Erro na submissão:', error);
            showModalAviso(error.message, 'erro');
            btnComprar.disabled = false;
            btnComprar.textContent = 'Continuar com a compra';
        }
    }
    
    function showModalAviso(message, tipo = 'erro') {
        const modalHeader = document.getElementById('avisoModalHeader');
        const modalTitle = document.getElementById('avisoModalLabel');
        const modalBody = document.getElementById('errorModalBody');

        if (modalHeader && modalTitle && modalBody) {
            modalHeader.classList.remove('modal-header-success', 'modal-header-error');
            if (tipo === 'sucesso') {
                modalHeader.classList.add('modal-header-success');
                modalTitle.textContent = 'Sucesso!';
            } else {
                modalHeader.classList.add('modal-header-error');
                modalTitle.textContent = 'Ocorreu um Erro';
            }
            modalBody.textContent = message;
            $('#errorModal').modal('show');
        } else {
            alert(message);
        }
    }

    function addInputMasks() {
        const inputs = {
            cnpj: document.getElementById('cnpj'),
            tel: document.getElementById('tel'),
            cep: document.getElementById('cep'), // Adicionado CEP
            cpf: document.getElementById('cpf'),
            numerocartao: document.getElementById('numerocartao'),
            numerocartaodebito: document.getElementById('numerocartaodebito'),
            cvv: document.getElementById('cvv'),
            cvvdebito: document.getElementById('cvvdebito')
        };

        if (inputs.cnpj) inputs.cnpj.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            v = v.replace(/^(\d{2})(\d)/, '$1.$2');
            v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
            v = v.replace(/(\d{4})(\d)/, '$1-$2');
            e.target.value = v.slice(0, 18);
        });

        if (inputs.tel) inputs.tel.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 11);
            v = v.replace(/^(\d{2})(\d)/, '($1) $2');
            v = v.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = v;
        });
        
        // ================== NOVA MÁSCARA DE CEP ==================
        if (inputs.cep) inputs.cep.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            v = v.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = v;
        });
        // =========================================================

        if (inputs.cpf) inputs.cpf.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = v;
        });

        const mascaraCartao = (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 16);
            v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = v;
        };

        if (inputs.numerocartao) inputs.numerocartao.addEventListener('input', mascaraCartao);
        if (inputs.numerocartaodebito) inputs.numerocartaodebito.addEventListener('input', mascaraCartao);
    }

    // --- INICIA O SCRIPT ---
    inicializarFormulario();
});