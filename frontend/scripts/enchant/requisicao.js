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

            showModalAviso('Cadastro realizado com sucesso!', 'sucesso');
            setTimeout(() => {
                window.location.href = '/entrar'; 
            }, 1500);
            
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

    // ========== SISTEMA DE UPLOAD DE ARQUIVOS ==========
    
    function formatarTamanhoArquivo(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const tamanhos = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamanhos[i];
    }

    function validarArquivo(arquivo) {
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const tamanhoMaximo = 10 * 1024 * 1024;

        if (!tiposPermitidos.includes(arquivo.type)) {
            return 'Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.';
        }

        if (arquivo.size > tamanhoMaximo) {
            return 'Arquivo muito grande. Tamanho máximo: 10MB.';
        }

        return null;
    }

    function adicionarArquivo(categoria, arquivo) {
        const erro = validarArquivo(arquivo);
        if (erro) {
            mostrarModal('Erro de Upload', erro);
            return false;
        }

        arquivosPorCategoria[categoria].push({
            arquivo: arquivo,
            nome: arquivo.name,
            tamanho: arquivo.size,
            id: Date.now() + Math.random()
        });

        atualizarListaArquivos(categoria);
        return true;
    }

    function removerArquivo(categoria, id) {
        arquivosPorCategoria[categoria] = arquivosPorCategoria[categoria].filter(
            item => item.id !== id
        );
        atualizarListaArquivos(categoria);
    }

    function atualizarListaArquivos(categoria) {
        const listaContainer = document.querySelector(`[data-categoria="${categoria}"]`).nextElementSibling;
        if (!listaContainer) return;

        listaContainer.innerHTML = '';

        arquivosPorCategoria[categoria].forEach(item => {
            const arquivoDiv = document.createElement('div');
            arquivoDiv.className = 'arquivo-item';
            arquivoDiv.innerHTML = `
                <div class="arquivo-info">
                    <i class="fas fa-file"></i>
                    <div>
                        <div class="arquivo-nome">${item.nome}</div>
                        <div class="arquivo-tamanho">${formatarTamanhoArquivo(item.tamanho)}</div>
                    </div>
                </div>
                <button type="button" class="remover-arquivo" onclick="removerArquivo('${categoria}', ${item.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            listaContainer.appendChild(arquivoDiv);
        });
    }

    function configurarAreaUpload(area) {
        const categoria = area.dataset.categoria;
        const input = area.querySelector('.upload-input');

        area.addEventListener('click', () => input.click());

        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const arquivos = Array.from(e.dataTransfer.files);
            arquivos.forEach(arquivo => {
                adicionarArquivo(categoria, arquivo);
            });
        });

        input.addEventListener('change', (e) => {
            const arquivos = Array.from(e.target.files);
            arquivos.forEach(arquivo => {
                adicionarArquivo(categoria, arquivo);
            });
            e.target.value = '';
        });
    }

    document.querySelectorAll('.upload-area').forEach(configurarAreaUpload);

    // ========== SISTEMA DE MODAL ==========
    
    function mostrarModal(titulo, mensagem) {
        let modal = document.getElementById('errorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.innerHTML = `
                <div class="modal fade" id="errorModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="errorModalLabel"></h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body" id="errorModalBody"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" data-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('errorModalLabel').textContent = titulo;
        document.getElementById('errorModalBody').innerHTML = mensagem;
        
        if (typeof $ !== 'undefined') {
            $('#errorModal').modal('show');
        } else {
            document.getElementById('errorModal').style.display = 'block';
        }
    }

    // ========== NAVEGAÇÃO ENTRE SEÇÕES ==========
    
    function irParaSegundaSecao() {
        primeiraSecao.style.display = 'none';
        segundaSecao.style.display = 'block';
        segundaSecao.classList.add('active');
        window.scrollTo(0, 0);
    }

    function voltarPrimeiraSecao() {
        segundaSecao.style.display = 'none';
        segundaSecao.classList.remove('active');
        primeiraSecao.style.display = 'block';
        window.scrollTo(0, 0);
    }

    // ========== VALIDAÇÃO DA SEGUNDA SEÇÃO ==========
    
    function validarSegundaSecao() {
        const erros = [];
        
        if (arquivosPorCategoria['declaracao-renda'].length === 0) {
            erros.push('Declaração de que não possui receita própria suficiente é obrigatória');
        }

        const categoriasComArquivos = Object.values(arquivosPorCategoria)
            .filter(categoria => categoria.length > 0).length;

        if (categoriasComArquivos < 3) {
            erros.push('É necessário enviar documentos de pelo menos 3 categorias diferentes');
        }

        return erros;
    }

    // ========== ENVIO DA SOLICITAÇÃO ==========
    
 // No seu ficheiro requisicao.js

async function enviarSolicitacao() {
    const btnEnviar = document.querySelector('#btn-enviar');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    try {
        // PASSO 1: Criar o FormData para enviar tudo junto
        const formData = new FormData();

        // PASSO 2: Adicionar os dados de texto (nome, email, etc.)
        formData.append('nomeInstituicao', document.getElementById('nomecomprador').value.trim());
        formData.append('email', document.getElementById('email').value.trim());
        formData.append('cnpj', document.getElementById('cnpj').value.trim());
        formData.append('telefone', document.getElementById('tel').value.trim());
        formData.append('estado', document.getElementById('estado').value);
        formData.append('cidade', document.getElementById('cidade').value);
        formData.append('senha', document.getElementById('senha').value);

        // PASSO 3: Adicionar os FICHEIROS com as etiquetas corretas
        // Esta é a parte mais importante.
        for (const [categoria, listaDeFicheiros] of Object.entries(arquivosPorCategoria)) {
            listaDeFicheiros.forEach((item, index) => {
                // Cria a etiqueta que o backend espera, ex: "declaracao-renda_1"
                const nomeDoCampo = `${categoria}_${index + 1}`;
                formData.append(nomeDoCampo, item.arquivo, item.nome);
            });
        }

        // PASSO 4: Enviar para o backend
        const response = await fetch('/api/requisicao/enviar', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Erro ao enviar requisição');
        }
        
        // Se deu tudo certo
        mostrarModal('Requisição Enviada com Sucesso!', 
            result.message || 'Você receberá um email quando sua conta for aprovada.');
        
        setTimeout(() => {
            window.location.href = '/entrar';
        }, 3000);

    } catch (error) {
        // Captura o erro do servidor e mostra no ecrã
        console.error('Erro:', error);
        mostrarModal('Erro ao Enviar Requisição', error.message);
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar';
    }
}
    // ========== EVENT LISTENERS DOS FORMULÁRIOS ==========
    
    if (formDados) {
        formDados.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const erros = validarPrimeiroForm();
            
            if (erros.length > 0) {
                const listaErros = erros.map(erro => `<li>${erro}</li>`).join('');
                mostrarModal('Erro de Validação', `<ul>${listaErros}</ul>`);
                return;
            }

            irParaSegundaSecao();
        });
    }

    if (formDocumentos) {
        formDocumentos.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const erros = validarSegundaSecao();
            
            if (erros.length > 0) {
                const listaErros = erros.map(erro => `<li>${erro}</li>`).join('');
                mostrarModal('Erro de Validação', `<ul>${listaErros}</ul>`);
                return;
            }

            enviarSolicitacao();
        });
    }

    const btnVoltar = document.getElementById('btn-voltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', voltarPrimeiraSecao);
    }

    // ========== FUNÇÕES GLOBAIS ==========
    
    window.removerArquivo = removerArquivo;
});