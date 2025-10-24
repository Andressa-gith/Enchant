// Espera que todo o conteúdo da página seja carregado antes de executar o script
document.addEventListener('DOMContentLoaded', function () {

    // --- URLs DAS APIS EXTERNAS ---
    const API_ESTADOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome';
    const API_CIDADES_URL = (estadoId) => `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`;
    const API_CEP_URL = (cep) => `https://viacep.com.br/ws/${cep}/json/`;

    // --- SELETORES DE ELEMENTOS ---
    const formDados = document.getElementById('req_form_dados');
    const formDocumentos = document.getElementById('req_form_documentos');
    const primeiraSecao = document.getElementById('req_primeira_parte');
    const segundaSecao = document.getElementById('req_segunda_parte');

    const inputCep = document.getElementById('req_cep');
    const selectEstado = document.getElementById('req_estado');
    const selectCidade = document.getElementById('req_cidade');
    const inputSenha = document.getElementById('req_senha');
    const btnVoltar = document.getElementById('req_btn_voltar_nav');

    // Objeto para armazenar os ficheiros de upload
    const arquivosPorCategoria = {
        'estatuto': [], 'cnpj': [], 'documento-responsavel': [], 'balanco': [],
        'projetos': [], 'ata-eleicao': [], 'endereco': [], 'relatorio': [],
        'declaracao-renda': []
    };

    // --- FUNÇÕES DE INICIALIZAÇÃO ---

    function inicializarFormulario() {
        if (segundaSecao) segundaSecao.style.display = 'none';
        carregarEstados();
        adicionarEventListeners();
        document.querySelectorAll('.req_upload_area').forEach(configurarAreaUpload);
    }

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

    // --- MANIPULADORES DE EVENTOS ---

    function handleDadosSubmit(event) {
        event.preventDefault();
        const erros = validarPrimeiraSecao();
        if (erros.length === 0) {
            irParaSegundaSecao();
        } else {
            mostrarModal('Erro de Validação', erros);
        }
    }

    function handleDocumentosSubmit(event) {
        event.preventDefault();
        const erros = validarSegundaSecao();
        if (erros.length > 0) {
            mostrarModal('Erro de Validação', erros);
        } else {
            enviarSolicitacao();
        }
    }

    function handleSenhaInput() {
        const validacao = validarRequisitosSenha(this.value);
        document.getElementById('req_minimo_digitos').style.color = validacao.temMinimo8 ? 'green' : '#FF0404';
        document.getElementById('req_dois_numeros').style.color = validacao.tem2Numeros ? 'green' : '#FF0404';
        document.getElementById('req_um_caracter_especial').style.color = validacao.temCaractereEspecial ? 'green' : '#FF0404';
        document.getElementById('req_letra_maiuscula').style.color = validacao.temMaiuscula ? 'green' : '#FF0404';
    }

    // --- VALIDAÇÃO DOS FORMULÁRIOS ---

    function showError(inputId, message) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;
        
        inputElement.classList.add('is-invalid');
        const errorElement = inputElement.closest('.form-group').querySelector('.req_error_message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function clearErrors() {
        document.querySelectorAll('.req_error_message').forEach(msg => {
            msg.textContent = '';
        });
        document.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
    }

    function validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function validarCNPJ(cnpj) {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        return cnpjLimpo.length === 14;
    }

    function validarTelefone(telefone) {
        const telLimpo = telefone.replace(/\D/g, '');
        return telLimpo.length >= 10;
    }

    function validarPrimeiraSecao() {
        clearErrors();
        const erros = [];

        const fields = [
            { 
                id: 'req_nome_instituicao', 
                label: 'Nome da Instituição',
                msg: 'O nome da instituição é obrigatório.' 
            },
            { 
                id: 'req_tipo_instituicao', 
                label: 'Tipo de Instituição',
                msg: 'Selecione o tipo de instituição.' 
            },
            { 
                id: 'req_cnpj', 
                label: 'CNPJ',
                msg: 'O CNPJ é obrigatório.',
                validacao: (valor) => {
                    if (!valor) return 'O CNPJ é obrigatório.';
                    if (!validarCNPJ(valor)) return 'CNPJ inválido. Deve conter 14 dígitos.';
                    return null;
                }
            },
            { 
                id: 'req_email', 
                label: 'Email',
                msg: 'O email é obrigatório.',
                validacao: (valor) => {
                    if (!valor) return 'O email é obrigatório.';
                    if (!validarEmail(valor)) return 'Email inválido. Verifique o formato (exemplo@dominio.com).';
                    return null;
                }
            },
            { 
                id: 'req_tel', 
                label: 'Telefone',
                msg: 'O telefone é obrigatório.',
                validacao: (valor) => {
                    if (!valor) return 'O telefone é obrigatório.';
                    if (!validarTelefone(valor)) return 'Telefone inválido. Deve conter no mínimo 10 dígitos.';
                    return null;
                }
            },
            { 
                id: 'req_cep', 
                label: 'CEP',
                msg: 'O CEP é obrigatório.' 
            },
            { 
                id: 'req_estado', 
                label: 'Estado',
                msg: 'Selecione um estado.' 
            },
            { 
                id: 'req_cidade', 
                label: 'Cidade',
                msg: 'Selecione uma cidade.' 
            },
            { 
                id: 'req_bairro', 
                label: 'Bairro',
                msg: 'O bairro é obrigatório.' 
            },
            { 
                id: 'req_senha', 
                label: 'Senha',
                msg: 'A senha é obrigatória.',
                validacao: (valor) => {
                    if (!valor) return 'A senha é obrigatória.';
                    const validacao = validarRequisitosSenha(valor);
                    if (!validacao.valida) return 'A senha não atende aos requisitos de segurança.';
                    return null;
                }
            },
            { 
                id: 'req_confirmar_senha', 
                label: 'Confirmação de Senha',
                msg: 'A confirmação de senha é obrigatória.' 
            },
        ];

        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const valor = input ? input.value.trim() : '';

            if (field.validacao) {
                const erro = field.validacao(valor);
                if (erro) {
                    showError(field.id, erro);
                    erros.push(`<strong>${field.label}:</strong> ${erro}`);
                }
            } else if (!valor) {
                showError(field.id, field.msg);
                erros.push(`<strong>${field.label}:</strong> ${field.msg}`);
            }
        });

        // Validação de senhas coincidentes
        const senha = document.getElementById('req_senha').value;
        const confirmarSenha = document.getElementById('req_confirmar_senha').value;
        if (senha && confirmarSenha && senha !== confirmarSenha) {
            const mensagem = 'As senhas não coincidem.';
            showError('req_confirmar_senha', mensagem);
            erros.push(`<strong>Confirmação de Senha:</strong> ${mensagem}`);
        }

        return erros;
    }

    function validarSegundaSecao() {
        const erros = [];
        
        if (arquivosPorCategoria['declaracao-renda'].length === 0) {
            erros.push('<strong>Declaração de Receita:</strong> A "Declaração de que não possui receita própria suficiente" é obrigatória.');
        }

        const categoriasComArquivos = Object.values(arquivosPorCategoria)
            .filter(categoria => categoria.length > 0).length;

        if (categoriasComArquivos < 3) {
            erros.push('<strong>Documentos Insuficientes:</strong> É necessário enviar documentos de pelo menos 3 categorias diferentes (incluindo a declaração obrigatória).');
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
            mostrarModal('Erro de API', ['Não foi possível carregar a lista de estados.']);
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
            mostrarModal('Erro de API', ['Não foi possível carregar a lista de cidades.']);
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
                showError('req_cep', 'CEP não encontrado. Verifique o número digitado.');
                return;
            }

            document.getElementById('req_bairro').value = data.bairro;
            selectEstado.value = data.uf;
            await carregarCidades(data.uf);
            selectCidade.value = data.localidade;
        } catch (error) {
            console.error(error);
            showError('req_cep', 'Erro ao buscar o CEP. Tente novamente.');
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
            mostrarModal('Erro de Upload', [erro]);
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

    window.removerArquivo = function(categoria, id) {
        arquivosPorCategoria[categoria] = arquivosPorCategoria[categoria].filter(
            item => item.id !== id
        );
        atualizarListaArquivos(categoria);
    }

    function atualizarListaArquivos(categoria) {
        const listaContainer = document.querySelector(`.req_upload_area[data-categoria="${categoria}"] + .req_arquivos_lista`);
        if (!listaContainer) return;
        listaContainer.innerHTML = '';

        arquivosPorCategoria[categoria].forEach(item => {
            const arquivoDiv = document.createElement('div');
            arquivoDiv.className = 'req_arquivo_item';
            arquivoDiv.innerHTML = `
                <div class="req_arquivo_info">
                    <i class="fas fa-file-alt"></i>
                    <span class="req_arquivo_nome">${item.nome} (${formatarTamanhoArquivo(item.tamanho)})</span>
                </div>
                <button type="button" class="req_remover_arquivo" onclick="removerArquivo('${categoria}', ${item.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            listaContainer.appendChild(arquivoDiv);
        });
    }

    function configurarAreaUpload(area) {
        const categoria = area.dataset.categoria;
        const input = area.querySelector('.req_upload_input');

        area.addEventListener('click', () => input.click());
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('req_dragover');
        });
        area.addEventListener('dragleave', () => area.classList.remove('req_dragover'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('req_dragover');
            const arquivos = Array.from(e.dataTransfer.files);
            arquivos.forEach(arquivo => adicionarArquivo(categoria, arquivo));
        });
        input.addEventListener('change', (e) => {
            const arquivos = Array.from(e.target.files);
            arquivos.forEach(arquivo => adicionarArquivo(categoria, arquivo));
            e.target.value = '';
        });
    }

    // --- ENVIO DA SOLICITAÇÃO FINAL ---
    
    async function enviarSolicitacao() {
        const btnEnviar = document.getElementById('req_btn_enviar');
        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        try {
            const formData = new FormData();

            const camposTexto = ['req_nome_instituicao', 'req_tipo_instituicao', 'req_cnpj', 'req_email', 'req_tel', 'req_cep', 'req_estado', 'req_cidade', 'req_bairro', 'req_senha'];
            camposTexto.forEach(id => {
                const nomeCampoBackend = id.replace('req_', ''); 
                formData.append(nomeCampoBackend, document.getElementById(id).value.trim());
            });

            for (const [categoria, listaDeFicheiros] of Object.entries(arquivosPorCategoria)) {
                listaDeFicheiros.forEach((item, index) => {
                    const nomeDoCampo = `${categoria}_${index + 1}`;
                    formData.append(nomeDoCampo, item.arquivo, item.nome);
                });
            }

            const response = await fetch('/api/requisicao/enviar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Ocorreu um erro no servidor ao enviar a requisição.');
            }
            
            mostrarModal('Requisição Enviada com Sucesso!', [result.message || 'A sua solicitação foi enviada. Receberá um email quando a sua conta for analisada e aprovada.'], true);
            
            setTimeout(() => {
                window.location.href = '/entrar';
            }, 3000);

        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            mostrarModal('Erro ao Enviar', [error.message]);
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar';
        }
    }

    // --- FUNÇÃO DE MODAL ---
    
    function mostrarModal(titulo, mensagensArray, isSucesso = false) {
        const modalTitle = document.getElementById('req_errorModalLabel');
        const modalBody = document.getElementById('req_errorModalBody');

        if (modalTitle && modalBody) {
            modalTitle.textContent = titulo;
            
            // Formata as mensagens como lista HTML
            const listaHTML = mensagensArray.map(msg => `<li>${msg}</li>`).join('');
            modalBody.innerHTML = `<ul>${listaHTML}</ul>`;
            
            // Usa jQuery para abrir o modal
            $('#req_errorModal').modal('show');
        } else {
            // Fallback para navegadores sem jQuery
            const mensagemTexto = mensagensArray.join('\n- ');
            alert(`${titulo}\n\n${mensagemTexto}`);
        }
    }

    // --- INICIA O SCRIPT ---
    inicializarFormulario();
});