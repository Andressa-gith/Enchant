// Espera que todo o conteúdo da página seja carregado antes de executar o script
document.addEventListener('DOMContentLoaded', function () {

    // --- URLs DAS APIS EXTERNAS ---
    const API_ESTADOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome';
    const API_CIDADES_URL = (estadoId) => `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`;
    const API_CEP_URL = (cep) => `https://viacep.com.br/ws/${cep}/json/`;

    // --- SELETORES DE ELEMENTOS ---
    // Formulários e secções principais
    const formDados = document.getElementById('dados-form');
    const formDocumentos = document.getElementById('documentos-form');
    const primeiraSecao = document.getElementById('primeira-parte');
    const segundaSecao = document.getElementById('segunda-parte');

    // Campos do primeiro formulário
    const inputCep = document.getElementById('cep');
    const selectEstado = document.getElementById('estado');
    const selectCidade = document.getElementById('cidade');
    const inputSenha = document.getElementById('senha');

    // Botões
    const btnVoltar = document.getElementById('btn-voltar');

    // Objeto para armazenar os ficheiros de upload
    const arquivosPorCategoria = {
        'estatuto': [], 'cnpj': [], 'documento-responsavel': [], 'balanco': [],
        'projetos': [], 'ata-eleicao': [], 'endereco': [], 'relatorio': [],
        'declaracao-renda': []
    };

    // --- FUNÇÕES DE INICIALIZAÇÃO ---

    /**
     * Função principal que inicia a lógica do formulário.
     */
    function inicializarFormulario() {
        if (segundaSecao) segundaSecao.style.display = 'none';
        carregarEstados();
        adicionarEventListeners();
        document.querySelectorAll('.upload-area').forEach(configurarAreaUpload);
    }

    /**
     * Centraliza a adição de todos os event listeners.
     */
    function adicionarEventListeners() {
        if (formDados) formDados.addEventListener('submit', handleDadosSubmit);
        if (formDocumentos) formDocumentos.addEventListener('submit', handleDocumentosSubmit);
        if (btnVoltar) btnVoltar.addEventListener('click', voltarPrimeiraSecao);

        if (inputCep) inputCep.addEventListener('blur', (event) => buscarCEP(event.target.value));
        if (selectEstado) selectEstado.addEventListener('change', () => carregarCidades(selectEstado.value));
        if (inputSenha) inputSenha.addEventListener('input', handleSenhaInput);
    }

    // --- NAVEGAÇÃO ENTRE SECÇÕES ---

    function irParaSegundaSecao() {
        primeiraSecao.style.display = 'none';
        segundaSecao.style.display = 'block';
        window.scrollTo(0, 0);
    }

    function voltarPrimeiraSecao() {
        segundaSecao.style.display = 'none';
        primeiraSecao.style.display = 'block';
        window.scrollTo(0, 0);
    }

    // --- MANIPULADORES DE EVENTOS (HANDLERS) ---

    /**
     * Lida com a submissão do primeiro formulário (dados da instituição).
     * @param {Event} event - O evento de submissão.
     */
    function handleDadosSubmit(event) {
        event.preventDefault();
        if (validarPrimeiraSecao()) {
            irParaSegundaSecao();
        }
    }

    /**
     * Lida com a submissão do segundo formulário (documentos).
     * @param {Event} event - O evento de submissão.
     */
    function handleDocumentosSubmit(event) {
        event.preventDefault();
        const erros = validarSegundaSecao();
        if (erros.length > 0) {
            const listaErros = erros.map(erro => `<li>${erro}</li>`).join('');
            mostrarModal('Erro de Validação', `<ul>${listaErros}</ul>`);
        } else {
            enviarSolicitacao();
        }
    }

    /**
     * Atualiza a interface para dar feedback sobre os requisitos da senha.
     */
    function handleSenhaInput() {
        const validacao = validarRequisitosSenha(this.value);
        document.getElementById('minimodigitos').style.color = validacao.temMinimo8 ? 'green' : '#FF0404';
        document.getElementById('doisnumeros').style.color = validacao.tem2Numeros ? 'green' : '#FF0404';
        document.getElementById('umcaracterespecial').style.color = validacao.temCaractereEspecial ? 'green' : '#FF0404';
        document.getElementById('letramaiuscula').style.color = validacao.temMaiuscula ? 'green' : '#FF0404';
    }


    // --- VALIDAÇÃO DOS FORMULÁRIOS ---

    /**
     * (MODIFICADO) Mostra uma mensagem de erro e adiciona a borda vermelha.
     */
    function showError(inputId, message) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;
        
        // Adiciona a classe para a borda vermelha
        inputElement.classList.add('is-invalid');

        const errorElement = inputElement.closest('.form-group').querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    /**
     * (MODIFICADO) Limpa todas as mensagens de erro e bordas vermelhas.
     */
    function clearErrors() {
        // Remove as mensagens de erro
        document.querySelectorAll('.error-message').forEach(msg => {
            msg.textContent = '';
        });
        // Remove as classes de borda vermelha
        document.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
    }

    /**
     * Valida todos os campos da primeira parte do formulário.
     * @returns {boolean} - True se o formulário for válido, false caso contrário.
     */
    function validarPrimeiraSecao() {
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
            if (!input || !input.value.trim()) {
                showError(field.id, field.msg);
                isValid = false;
            }
        });

        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmarsenha').value;
        if (senha && confirmarSenha && senha !== confirmarSenha) {
            showError('confirmarsenha', 'As senhas não coincidem.');
            isValid = false;
        }

        if (senha && !validarRequisitosSenha(senha).valida) {
            showError('senha', 'A senha não atende aos requisitos de segurança.');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Valida os requisitos do formulário de upload de documentos.
     * @returns {string[]} - Uma lista de mensagens de erro.
     */
    function validarSegundaSecao() {
        const erros = [];
        if (arquivosPorCategoria['declaracao-renda'].length === 0) {
            erros.push('A "Declaração de que não possui receita própria" é obrigatória.');
        }

        const categoriasComArquivos = Object.values(arquivosPorCategoria)
            .filter(categoria => categoria.length > 0).length;

        if (categoriasComArquivos < 3) {
            erros.push('É necessário enviar documentos de pelo menos 3 categorias diferentes.');
        }

        return erros;
    }


    // --- LÓGICA DE SENHA ---

    function validarRequisitosSenha(senha) {
        const temMinimo8 = senha.length >= 8;
        const tem2Numeros = (senha.match(/\d/g) || []).length >= 2;
        const temCaractereEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(senha);
        const temMaiuscula = /[A-Z]/.test(senha);
        return {
            temMinimo8, tem2Numeros, temCaractereEspecial, temMaiuscula,
            valida: temMinimo8 && tem2Numeros && temCaractereEspecial && temMaiuscula
        };
    }

    // --- LÓGICA DE API (IBGE E VIACEP) ---

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
            mostrarModal('Erro de API', 'Não foi possível carregar a lista de estados.');
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
            mostrarModal('Erro de API', 'Não foi possível carregar a lista de cidades.');
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

    // --- SISTEMA DE UPLOAD DE ARQUIVOS ---
    
    function formatarTamanhoArquivo(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const tamanhos = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamanhos[i];
    }

    function validarArquivo(arquivo) {
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const tamanhoMaximo = 10 * 1024 * 1024; // 10MB

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
            return;
        }
        const idUnico = Date.now() + Math.random();
        arquivosPorCategoria[categoria].push({
            arquivo: arquivo,
            nome: arquivo.name,
            tamanho: arquivo.size,
            id: idUnico
        });
        atualizarListaArquivos(categoria);
    }

    // Tornamos esta função acessível globalmente para o onclick funcionar
    window.removerArquivo = function(categoria, id) {
        arquivosPorCategoria[categoria] = arquivosPorCategoria[categoria].filter(
            item => item.id !== id
        );
        atualizarListaArquivos(categoria);
    }

    function atualizarListaArquivos(categoria) {
        const listaContainer = document.querySelector(`.upload-area[data-categoria="${categoria}"] + .arquivos-lista`);
        if (!listaContainer) return;
        listaContainer.innerHTML = '';

        arquivosPorCategoria[categoria].forEach(item => {
            const arquivoDiv = document.createElement('div');
            arquivoDiv.className = 'arquivo-item'; // Adicione uma classe para estilização
            arquivoDiv.innerHTML = `
                <div class="arquivo-info">
                    <i class="fas fa-file-alt"></i>
                    <span>${item.nome} (${formatarTamanhoArquivo(item.tamanho)})</span>
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
        area.addEventListener('dragleave', () => area.classList.remove('dragover'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            const arquivos = Array.from(e.dataTransfer.files);
            arquivos.forEach(arquivo => adicionarArquivo(categoria, arquivo));
        });
        input.addEventListener('change', (e) => {
            const arquivos = Array.from(e.target.files);
            arquivos.forEach(arquivo => adicionarArquivo(categoria, arquivo));
            e.target.value = ''; // Limpa o input para permitir selecionar o mesmo ficheiro novamente
        });
    }

    // --- ENVIO DA SOLICITAÇÃO FINAL ---
    
    async function enviarSolicitacao() {
        const btnEnviar = document.getElementById('btn-enviar');
        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        try {
            const formData = new FormData();

            // Adiciona os dados de texto do primeiro formulário
            const camposTexto = ['nome_instituicao', 'tipo_instituicao', 'cnpj', 'email', 'tel', 'cep', 'estado', 'cidade', 'bairro', 'senha'];
            camposTexto.forEach(id => {
                formData.append(id, document.getElementById(id).value.trim());
            });

            // Adiciona os ficheiros com as etiquetas corretas que o backend espera
            for (const [categoria, listaDeFicheiros] of Object.entries(arquivosPorCategoria)) {
                listaDeFicheiros.forEach((item, index) => {
                    const nomeDoCampo = `${categoria}_${index + 1}`;
                    formData.append(nomeDoCampo, item.arquivo, item.nome);
                });
            }

            // Envia para o backend
            const response = await fetch('/api/requisicao/enviar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Ocorreu um erro no servidor ao enviar a requisição.');
            }
            
            mostrarModal('Requisição Enviada com Sucesso!', result.message || 'A sua solicitação foi enviada. Receberá um email quando a sua conta for analisada e aprovada.');
            
            setTimeout(() => {
                window.location.href = '/entrar'; // Redireciona para a página de login
            }, 3000);

        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            mostrarModal('Erro ao Enviar', error.message);
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar';
        }
    }

    // --- FUNÇÃO UTILITÁRIA DE MODAL ---
    
    function mostrarModal(titulo, mensagem) {
        const modalTitle = document.getElementById('errorModalLabel');
        const modalBody = document.getElementById('errorModalBody');

        if (modalTitle && modalBody) {
            modalTitle.textContent = titulo;
            modalBody.innerHTML = mensagem; // Usamos innerHTML para renderizar as tags <li>
            $('#errorModal').modal('show'); // Usa jQuery para mostrar o modal do Bootstrap
        } else {
            // Fallback caso o modal não exista ou jQuery não carregue
            alert(`${titulo}\n\n${mensagem.replace(/<li>/g, '- ').replace(/<\/li>|<ul>|<\/ul>/g, '')}`);
        }
    }

    // --- INICIA O SCRIPT ---
    inicializarFormulario();
});
