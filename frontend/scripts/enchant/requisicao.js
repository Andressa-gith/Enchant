document.addEventListener('DOMContentLoaded', function() {
    // ========== VARIÁVEIS GLOBAIS ==========
    const primeiraSecao = document.getElementById('primeira-parte');
    const segundaSecao = document.getElementById('segunda-parte');
    const formDados = document.getElementById('dados-form');
    const formDocumentos = document.getElementById('documentos-form');
    
    // Armazenamento de arquivos por categoria
    const arquivosPorCategoria = {
        'estatuto': [],
        'cnpj': [],
        'documento-responsavel': [],
        'balanco': [],
        'projetos': [],
        'ata-eleicao': [],
        'endereco': [],
        'relatorio': [],
        'declaracao-renda': []
    };

    // ========== VALIDAÇÃO DE CAMPOS ==========
    
    function mascaraCNPJ(campo) {
        let valor = campo.value.replace(/\D/g, '');
        valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
        valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
        campo.value = valor;
    }

    function mascaraTelefone(campo) {
        let valor = campo.value.replace(/\D/g, '');
        valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
        valor = valor.replace(/(\d)(\d{4})$/, '$1-$2');
        campo.value = valor;
    }

    function validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function validarCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14) return false;
        
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0, tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != digitos.charAt(0)) return false;
        
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        return resultado == digitos.charAt(1);
    }

    function validarSenha(senha) {
        const criterios = {
            minimodigitos: senha.length >= 8,
            doisnumeros: (senha.match(/\d/g) || []).length >= 2,
            umcaracterespecial: /[!@#$%^&*(),.?":{}|<>]/.test(senha),
            letramaiuscula: /[A-Z]/.test(senha)
        };

        Object.keys(criterios).forEach(criterio => {
            const elemento = document.getElementById(criterio);
            if (elemento) {
                elemento.classList.toggle('valid', criterios[criterio]);
                elemento.classList.toggle('invalid', !criterios[criterio]);
            }
        });

        return Object.values(criterios).every(Boolean);
    }

    // ========== EVENT LISTENERS PARA MÁSCARAS ==========
    
    const cnpjInput = document.getElementById('cnpj');
    const telInput = document.getElementById('tel');
    const senhaInput = document.getElementById('senha');
    
    if (cnpjInput) {
        cnpjInput.addEventListener('input', () => mascaraCNPJ(cnpjInput));
    }
    
    if (telInput) {
        telInput.addEventListener('input', () => mascaraTelefone(telInput));
    }
    
    if (senhaInput) {
        senhaInput.addEventListener('input', () => validarSenha(senhaInput.value));
    }

    // ========== SISTEMA DE CIDADES POR ESTADO ==========
    
    const cidadesPorEstado = {
        'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá'],
        'AL': ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo'],
        'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque'],
        'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru'],
        'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro'],
        'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú'],
        'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Sobradinho'],
        'ES': ['Vitória', 'Serra', 'Vila Velha', 'Cariacica'],
        'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde'],
        'MA': ['São Luís', 'Imperatriz', 'Timon', 'Caxias'],
        'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop'],
        'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá'],
        'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
        'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá'],
        'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos'],
        'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa'],
        'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru'],
        'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri'],
        'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu'],
        'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante'],
        'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Santa Maria'],
        'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena'],
        'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre'],
        'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José'],
        'SP': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo'],
        'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana'],
        'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional']
    };

    const estadoSelect = document.getElementById('estado');
    const cidadeSelect = document.getElementById('cidade');

    if (estadoSelect && cidadeSelect) {
        estadoSelect.addEventListener('change', function() {
            const estadoSelecionado = this.value;
            cidadeSelect.innerHTML = '<option value="" hidden>Selecione uma cidade...</option>';
            
            if (estadoSelecionado && cidadesPorEstado[estadoSelecionado]) {
                cidadeSelect.disabled = false;
                cidadesPorEstado[estadoSelecionado].forEach(cidade => {
                    const option = document.createElement('option');
                    option.value = cidade;
                    option.textContent = cidade;
                    cidadeSelect.appendChild(option);
                });
            } else {
                cidadeSelect.disabled = true;
            }
        });
    }

    // ========== VALIDAÇÃO DO PRIMEIRO FORMULÁRIO ==========
    
    function validarPrimeiroForm() {
        const erros = [];
        
        const nomeInstituicao = document.getElementById('nomecomprador').value.trim();
        if (!nomeInstituicao) {
            erros.push('Nome da Instituição/ONG é obrigatório');
        }

        const email = document.getElementById('email').value.trim();
        if (!email) {
            erros.push('Email é obrigatório');
        } else if (!validarEmail(email)) {
            erros.push('Email inválido');
        }

        const cnpj = document.getElementById('cnpj').value;
        if (!cnpj) {
            erros.push('CNPJ é obrigatório');
        } else if (!validarCNPJ(cnpj)) {
            erros.push('CNPJ inválido');
        }

        const telefone = document.getElementById('tel').value.trim();
        if (!telefone) {
            erros.push('Telefone é obrigatório');
        }

        const estado = document.getElementById('estado').value;
        if (!estado) {
            erros.push('Estado é obrigatório');
        }

        const cidade = document.getElementById('cidade').value;
        if (!cidade) {
            erros.push('Cidade é obrigatória');
        }

        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmarsenha').value;
        
        if (!senha) {
            erros.push('Senha é obrigatória');
        } else if (!validarSenha(senha)) {
            erros.push('Senha não atende aos critérios mínimos');
        }

        if (!confirmarSenha) {
            erros.push('Confirmação de senha é obrigatória');
        } else if (senha !== confirmarSenha) {
            erros.push('As senhas não coincidem');
        }

        return erros;
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