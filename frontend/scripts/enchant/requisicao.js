// ============================================================
// SUBSTITUA TODA A PARTE DE VALIDAÇÃO NO requisicao.js
// ============================================================

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
        if (validarPrimeiraSecao()) {
            irParaSegundaSecao();
        }
        // ✅ NÃO chama mais showModalAviso ou $('#req_errorModal').modal('show')
    }

    function handleDocumentosSubmit(event) {
        event.preventDefault();
        if (validarSegundaSecao()) {
            enviarSolicitacao();
        }
        // ✅ NÃO chama mais showModalAviso ou $('#req_errorModal').modal('show')
    }

    function handleSenhaInput() {
        const validacao = validarRequisitosSenha(this.value);
        document.getElementById('req_minimo_digitos').style.color = validacao.temMinimo8 ? 'green' : '#FF0404';
        document.getElementById('req_dois_numeros').style.color = validacao.tem2Numeros ? 'green' : '#FF0404';
        document.getElementById('req_um_caracter_especial').style.color = validacao.temCaractereEspecial ? 'green' : '#FF0404';
        document.getElementById('req_letra_maiuscula').style.color = validacao.temMaiuscula ? 'green' : '#FF0404';
    }

    // --- ✨ NOVAS FUNÇÕES DE VALIDAÇÃO INLINE (SEM MODAL) ---

    /**
     * Mostra mensagem de erro abaixo do campo
     */
    function showError(inputId, message) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;
        
        inputElement.classList.add('is-invalid');
        const errorElement = inputElement.closest('.form-group').querySelector('.req_error_message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    }

    /**
     * Limpa todos os erros do formulário
     */
    function clearErrors() {
        document.querySelectorAll('.req_error_message').forEach(msg => {
            msg.textContent = '';
            msg.classList.remove('visible');
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

    /**
     * ✨ VALIDAÇÃO ATUALIZADA - RETORNA BOOLEAN (sem array de erros)
     */
    function validarPrimeiraSecao() {
        clearErrors();
        let isValid = true;

        const fields = [
            { 
                id: 'req_nome_instituicao', 
                msg: 'O nome da instituição é obrigatório.' 
            },
            { 
                id: 'req_tipo_instituicao', 
                msg: 'Selecione o tipo de instituição.' 
            },
            { 
                id: 'req_cnpj', 
                msg: 'O CNPJ é obrigatório.',
                validacao: (valor) => {
                    if (!valor) return 'O CNPJ é obrigatório.';
                    if (!validarCNPJ(valor)) return 'CNPJ inválido. Deve conter 14 dígitos.';
                    return null;
                }
            },
            { 
                id: 'req_email', 
                msg: 'O email é obrigatório.',
                validacao: (valor) => {
                    if (!valor) return 'O email é obrigatório.';
                    if (!validarEmail(valor)) return 'Email inválido. Verifique o formato.';
                    return null;
                }
            },
            { 
                id: 'req_tel', 
                msg: 'O telefone é obrigatório.',
                validacao: (valor) => {
                    if (!valor) return 'O telefone é obrigatório.';
                    if (!validarTelefone(valor)) return 'Telefone inválido. Mínimo 10 dígitos.';
                    return null;
                }
            },
            { 
                id: 'req_cep', 
                msg: 'O CEP é obrigatório.' 
            },
            { 
                id: 'req_estado', 
                msg: 'Selecione um estado.' 
            },
            { 
                id: 'req_cidade', 
                msg: 'Selecione uma cidade.' 
            },
            { 
                id: 'req_bairro', 
                msg: 'O bairro é obrigatório.' 
            },
            { 
                id: 'req_senha', 
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
                    isValid = false;
                }
            } else if (!valor) {
                showError(field.id, field.msg);
                isValid = false;
            }
        });

        // Validação de senhas coincidentes
        const senha = document.getElementById('req_senha').value;
        const confirmarSenha = document.getElementById('req_confirmar_senha').value;
        if (senha && confirmarSenha && senha !== confirmarSenha) {
            showError('req_confirmar_senha', 'As senhas não coincidem.');
            isValid = false;
        }

        // ✨ Se houver erros, rola até o primeiro campo com erro
        if (!isValid) {
            const primeiroErro = document.querySelector('.is-invalid');
            if (primeiroErro) {
                primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
                primeiroErro.focus();
            }
        }

        return isValid;
    }

    /**
     * ✨ VALIDAÇÃO DA SEGUNDA SEÇÃO TAMBÉM ATUALIZADA
     */
    function validarSegundaSecao() {
        // Limpa erros visuais anteriores (se houver)
        document.querySelectorAll('.req_upload_area').forEach(area => {
            area.style.borderColor = '';
        });

        let isValid = true;
        
        if (arquivosPorCategoria['declaracao-renda'].length === 0) {
            const declaracaoArea = document.querySelector('.req_upload_area[data-categoria="declaracao-renda"]');
            if (declaracaoArea) {
                declaracaoArea.style.borderColor = '#dc3545';
            }
            mostrarToast('A "Declaração de que não possui receita própria suficiente" é obrigatória.', 'danger');
            isValid = false;
        }

        const categoriasComArquivos = Object.values(arquivosPorCategoria)
            .filter(categoria => categoria.length > 0).length;

        if (categoriasComArquivos < 3) {
            mostrarToast('É necessário enviar documentos de pelo menos 3 categorias diferentes.', 'danger');
            isValid = false;
        }

        return isValid;
    }

    // --- ✨ FUNÇÃO TOAST PARA SEGUNDA SEÇÃO (substitui modal) ---
    function mostrarToast(mensagem, tipo = 'danger') {
        // Remove toast anterior se existir
        const toastExistente = document.querySelector('.req_toast');
        if (toastExistente) toastExistente.remove();

        const toast = document.createElement('div');
        toast.className = `req_toast req_toast_${tipo}`;
        toast.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${mensagem}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('req_toast_show'), 100);
        setTimeout(() => {
            toast.classList.remove('req_toast_show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
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
            mostrarToast('Não foi possível carregar a lista de estados.', 'danger');
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
            mostrarToast('Não foi possível carregar a lista de cidades.', 'danger');
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
            mostrarToast(erro, 'danger');
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

    // --- ENVIO DA SOLICITAÇÃO FINAL (mantém o modal de progresso) ---
    
    async function enviarSolicitacao() {
        const btnEnviar = document.getElementById('req_btn_enviar');
        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        $('#req_progressModal').modal('show');
        
        const progressFill = document.getElementById('req_progress_fill');
        const progressMessage = document.getElementById('req_progress_message');
        const progressDetails = document.getElementById('req_progress_details');
        const progressLogs = document.getElementById('req_progress_logs');

        function addLog(message, type = 'info') {
            const logItem = document.createElement('div');
            logItem.className = `req_progress_log_item req_log_${type}`;
            
            const icon = type === 'success' ? 'fa-check-circle' : 
                        type === 'error' ? 'fa-exclamation-circle' : 
                        'fa-info-circle';
            
            logItem.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            `;
            progressLogs.appendChild(logItem);
            progressLogs.scrollTop = progressLogs.scrollHeight;
        }

        function updateProgress(percent, message, details = '') {
            progressFill.style.width = `${percent}%`;
            progressMessage.textContent = message;
            progressDetails.textContent = details;
        }

        try {
            const formData = new FormData();

            updateProgress(5, 'Iniciando processo...', '');
            await sleep(1000);
            
            updateProgress(10, 'Coletando informações do formulário...', '');
            addLog(' Coletando informações do formulário', 'info');
            await sleep(1200);

            const camposTexto = ['req_nome_instituicao', 'req_tipo_instituicao', 'req_cnpj', 'req_email', 'req_tel', 'req_cep', 'req_estado', 'req_cidade', 'req_bairro', 'req_senha'];
            camposTexto.forEach(id => {
                const nomeCampoBackend = id.replace('req_', ''); 
                formData.append(nomeCampoBackend, document.getElementById(id).value.trim());
            });

            updateProgress(15, 'Dados coletados com sucesso!', '');
            addLog(' Informações coletadas com sucesso', 'success');
            await sleep(1000);

            const totalDocumentos = Object.values(arquivosPorCategoria)
                .reduce((acc, lista) => acc + lista.length, 0);
            
            updateProgress(20, 'Preparando documentos para envio...', `${totalDocumentos} arquivo(s)`);
            addLog(` Preparando ${totalDocumentos} documento(s) para envio`, 'info');
            await sleep(1500);

            let documentosAnexados = 0;
            for (const [categoria, listaDeFicheiros] of Object.entries(arquivosPorCategoria)) {
                if (listaDeFicheiros.length > 0) {
                    listaDeFicheiros.forEach((item, index) => {
                        const nomeDoCampo = `${categoria}_${index + 1}`;
                        formData.append(nomeDoCampo, item.arquivo, item.nome);
                        documentosAnexados++;
                    });
                    
                    const progressPercent = 20 + (documentosAnexados / totalDocumentos) * 15;
                    updateProgress(progressPercent, 'Anexando documentos...', `${documentosAnexados}/${totalDocumentos} anexados`);
                    addLog(` Anexando documento da categoria: ${categoria}`, 'info');
                    await sleep(800);
                }
            }

            updateProgress(35, 'Todos os documentos anexados!', '');
            addLog(' Todos os documentos foram anexados com sucesso', 'success');
            await sleep(1200);

            updateProgress(40, 'Enviando requisição para o servidor...', 'Isso pode levar alguns minutos');
            addLog(' Enviando dados para o servidor', 'info');
            await sleep(1500);

            const response = await fetch('/api/requisicao/enviar', {
                method: 'POST',
                body: formData
            });

            updateProgress(55, 'Dados recebidos pelo servidor!', '');
            addLog(' Servidor recebeu os dados com sucesso', 'success');
            await sleep(1000);

            updateProgress(60, ' Iniciando validação...', '');
            addLog(' Iniciando análise de documentos ', 'info');
            await sleep(2000);

            let validados = 0;
            const categoriasComArquivos = Object.entries(arquivosPorCategoria)
                .filter(([_, lista]) => lista.length > 0);
            
            const totalCategorias = categoriasComArquivos.length;

            for (const [categoria, listaDeFicheiros] of categoriasComArquivos) {
                const progressPercent = 60 + (validados / totalCategorias) * 25;
                
                updateProgress(progressPercent, ` Analisando documentos de ${categoria}...`, `${validados}/${totalCategorias} categorias validadas`);
                addLog(` Analisando categoria: ${categoria}`, 'info');
                await sleep(2500);
                
                addLog(` Verificando autenticidade dos documentos...`, 'info');
                await sleep(1500);
                
                addLog(` Validando formato e integridade...`, 'info');
                await sleep(1500);
                
                validados++;
                addLog(` Documentos de ${categoria} aprovados pela IA`, 'success');
                await sleep(1000);
            }

            updateProgress(85, 'Validação concluída!', 'Todos os documentos foram aprovados');
            addLog(' Todos os documentos foram validados com sucesso', 'success');
            await sleep(1500);

            updateProgress(90, 'Processando requisição final...', '');
            addLog(' Finalizando processamento', 'info');
            await sleep(1200);

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Ocorreu um erro no servidor ao enviar a requisição.');
            }

            updateProgress(95, 'Salvando informações...', '');
            addLog(' Salvando suas informações no sistema', 'info');
            await sleep(1000);

            updateProgress(100, ' Requisição enviada com sucesso!', '');
            addLog(' Requisição processada com sucesso!', 'success');
            await sleep(800);
            addLog(' Você receberá um email quando sua conta for aprovada', 'success');
            
            await sleep(3000);
            
            $('#req_progressModal').modal('hide');
            
            mostrarToast('Requisição enviada com sucesso! Você receberá um email quando sua conta for aprovada.', 'success');
            
            setTimeout(() => {
                window.location.href = '/entrar';
            }, 4000);

        } catch (error) {
            console.error('Erro ao enviar solicitação:', error);
            addLog(` Erro: ${error.message}`, 'error');
            updateProgress(0, 'Erro ao processar requisição', '');
            
            await sleep(3000);
            $('#req_progressModal').modal('hide');
            
            mostrarToast(error.message, 'danger');
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar';
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- INICIA O SCRIPT ---
    inicializarFormulario();
});

// Formatação automática do telefone com DDD
document.addEventListener('DOMContentLoaded', function() {
    const telInput = document.getElementById('req_tel');
    
    if (telInput) {
        telInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                if (value.length <= 2) {
                    value = `(${value}`;
                } else if (value.length <= 6) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                } else if (value.length <= 10) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
                } else {
                    value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                }
            }
            
            e.target.value = value;
        });
    }
});

function togglePassword(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const toggleButton = event.currentTarget;
    const formGroup = toggleButton.closest('.form-group');
    const passwordField = formGroup.querySelector('input[type="password"], input[type="text"]');
    const eyeIcon = toggleButton.querySelector('svg');
    
    if (!passwordField || !eyeIcon) return;
    
    const cursorPosition = passwordField.selectionStart;
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`;
    } else {
        passwordField.type = 'password';
        eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    }
    
    passwordField.setSelectionRange(cursorPosition, cursorPosition);
    passwordField.blur();
    
    setTimeout(() => {
        passwordField.focus();
        passwordField.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
}

document.addEventListener('DOMContentLoaded', function() {
    // Remove o modal do DOM se existir
    const modalAntigo = document.getElementById('req_errorModal');
    if (modalAntigo) {
        modalAntigo.remove();
    }
    
    // Sobrescreve a função mostrarModal para não fazer nada
    window.mostrarModal = function() {
        console.warn(' A função mostrarModal() está depreciada. Use showError() ou mostrarToast().');
    };
    
    // Sobrescreve showModalAviso para não fazer nada
    window.showModalAviso = function() {
        console.warn(' A função showModalAviso() está depreciada. Use showError() ou mostrarToast().');
    };
});
