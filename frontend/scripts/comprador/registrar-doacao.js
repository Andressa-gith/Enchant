import supabaseClient from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mapeamento dos elementos do HTML ---
    const form = document.getElementById('doacao-form');
    const selectCategoria = document.getElementById('categoria-doacao');
    const camposEspecificosContainer = document.getElementById('campos-especificos-container');
    const caixaListaItens = document.getElementById('caixa-lista-itens');
    const btnRegistrarCaixa = document.getElementById('btn-registrar-caixa');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));

    // Onde guardamos os itens antes de salvar
    let caixaDeDoacoes = [];

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    
    const renderCaixa = () => {
        if (caixaDeDoacoes.length === 0) {
            caixaListaItens.innerHTML = '<p class="caixa-vazia-mensagem">Sua caixa de doações está vazia.</p>';
            btnRegistrarCaixa.disabled = true;
            return;
        }

        caixaListaItens.innerHTML = caixaDeDoacoes.map((item, index) => {
            const categoriaOption = selectCategoria.querySelector(`option[value="${item.categoria_id}"]`);
            const nomeCategoria = categoriaOption ? categoriaOption.textContent : 'Categoria';
            
            let detalhesPrincipais = `${item.quantidade}x ${nomeCategoria}`;
            if (item.detalhes && item.detalhes.especificacao) {
                detalhesPrincipais += ` - ${item.detalhes.especificacao}`;
            } else if (item.detalhes && item.detalhes.tipo) {
                detalhesPrincipais += ` - ${item.detalhes.tipo}`;
            }

            return `
                <div class="item-na-caixa">
                    <span>${detalhesPrincipais} (Doador: ${item.doador_origem_texto})</span>
                    <button type="button" class="btn-remover-item" data-index="${index}" title="Remover item">&times;</button>
                </div>
            `;
        }).join('');
        btnRegistrarCaixa.disabled = false;
    };
    
    // --- FUNÇÕES DE LÓGICA ---

    const adicionarItemNaCaixa = (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const doacaoParaApi = {};
        const detalhes = {};
        const camposPrincipais = ['categoria_id', 'quantidade', 'doador_origem_texto', 'qualidade'];

        let formIsValid = true;
        for (const [key, value] of formData.entries()) {
            if (!value) {
                // Pula campos que podem ser opcionais (se houver)
                const input = form.elements[key];
                if (input && input.required) {
                    formIsValid = false;
                    break;
                }
            }
        }

        if (!formIsValid) {
            alert('Por favor, preencha todos os campos obrigatórios do item antes de adicionar à caixa.');
            return;
        }
        
        for (const [key, value] of formData.entries()) {
            if (camposPrincipais.includes(key)) {
                doacaoParaApi[key] = value;
            } else {
                detalhes[key] = value;
            }
        }
        doacaoParaApi.detalhes = detalhes;
        
        caixaDeDoacoes.push(doacaoParaApi);
        renderCaixa();
        
        const categoriaId = form.elements.categoria_id.value;
        const doador = form.elements.doador_origem_texto.value;
        const quantidadeInput = form.elements.quantidade;

        // Limpa apenas os campos dinâmicos e de quantidade
        camposEspecificosContainer.innerHTML = '';
        quantidadeInput.value = '';

        form.elements.categoria_id.value = categoriaId;
        form.elements.doador_origem_texto.value = doador;
        selectCategoria.dispatchEvent(new Event('change'));
        quantidadeInput.focus();
    };

    const removerItemDaCaixa = (index) => {
        caixaDeDoacoes.splice(index, 1);
        renderCaixa();
    };

    const registrarTodaCaixa = async () => {
        if (caixaDeDoacoes.length === 0) {
            alert('A caixa de doações está vazia!');
            return;
        }

        btnRegistrarCaixa.disabled = true;
        btnRegistrarCaixa.textContent = 'Registrando...';

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const response = await fetch('/api/doacao/registrar-multiplas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(caixaDeDoacoes)
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.message || 'Erro no servidor');
            }
            
            const resultado = await response.json();
            document.getElementById('successModalBody').textContent = resultado.message;
            successModal.show();
            
            caixaDeDoacoes = [];
            renderCaixa();
            form.reset();
            camposEspecificosContainer.innerHTML = '';

        } catch (error) {
            console.error("Erro ao enviar doações:", error);
            document.getElementById('errorModalBody').textContent = `Falha ao registrar: ${error.message}`;
            errorModal.show();
        } finally {
            btnRegistrarCaixa.disabled = false;
            btnRegistrarCaixa.textContent = 'Registrar Todas as Doações da Caixa';
        }
    };
    
    // --- FUNÇÕES DE CRIAÇÃO DE HTML E CARREGAMENTO DE DADOS ---
    const criarCampoHTML = (id, name, label, inputHTML, required = true) => {
        return `
            <div class="form-group">
                <label class="form-label" for="${id}">${label}</label>
                ${inputHTML.replace('>', ` id="${id}" name="${name}" class="form-control" ${required ? 'required' : ''}>`)}
            </div>
        `;
    };
    
    async function carregarCategorias() {
        try {
            const { data, error } = await supabaseClient
                .from('categoria')
                .select('id, nome')
                .order('nome', { ascending: true });

            if (error) throw error;

            selectCategoria.innerHTML = '<option value="" disabled selected>Selecione a categoria...</option>';
            data.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.id;
                option.textContent = categoria.nome;
                option.dataset.nome = categoria.nome;
                selectCategoria.appendChild(option);
            });
        } catch(error) {
            console.error('Erro ao carregar categorias:', error);
            selectCategoria.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    selectCategoria.addEventListener('change', (event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const nomeCategoria = selectedOption.dataset.nome;
        
        camposEspecificosContainer.innerHTML = '';
        let camposHTML = '';

        const campoQualidade = criarCampoHTML('qualidade', 'qualidade', 'Qualidade', 
            `<select><option value="" disabled selected>Selecione...</option><option value="Novo">Novo</option><option value="Usado - Bom estado">Usado - Bom estado</option><option value="Usado - Regular">Usado - Regular</option></select>`
        );
        const campoPrecisaReparo = criarCampoHTML('precisa_reparo', 'precisa_reparo', 'Precisa de reparo?',
            `<select><option value="true">Sim</option><option value="false" selected>Não</option></select>`
        );

        switch (nomeCategoria) {
            case 'Roupas':
                camposHTML += campoQualidade;
                camposHTML += criarCampoHTML('genero', 'genero', 'Gênero', `<select><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Unissex">Unissex</option></select>`);
                camposHTML += criarCampoHTML('tamanho', 'tamanho', 'Tamanho', `<input type="text" placeholder="P, M, G, 38, 40...">`);
                camposHTML += criarCampoHTML('tipo', 'tipo', 'Tipo', `<input type="text" placeholder="Calça, camisa, vestido...">`);
                break;
            case 'Calçados':
                camposHTML += campoQualidade;
                camposHTML += criarCampoHTML('genero', 'genero', 'Gênero', `<select><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Unissex">Unissex</option></select>`);
                camposHTML += criarCampoHTML('tamanho', 'tamanho', 'Tamanho', `<input type="text" placeholder="35, 40, 42...">`);
                break;
            case 'Alimentos':
                camposHTML += criarCampoHTML('tipo', 'tipo', 'Tipo', `<input type="text" placeholder="Não perecível, perecível...">`);
                camposHTML += criarCampoHTML('validade', 'validade', 'Validade', `<input type="date">`);
                camposHTML += criarCampoHTML('especificacao', 'especificacao', 'Especificação', `<input type="text" placeholder="Arroz, feijão, macarrão...">`);
                break;
            case 'Produtos de higiene':
                camposHTML += criarCampoHTML('especificacao', 'especificacao', 'Especifique', `<input type="text" placeholder="Sabonete, pasta de dente...">`);
                camposHTML += criarCampoHTML('restricao', 'restricao', 'Restrição/Recomendação', `<input type="text" placeholder="Sem fragrância, infantil...">`, false);
                break;
            case 'Produtos de Limpeza':
                camposHTML += criarCampoHTML('especificacao', 'especificacao', 'Especifique', `<input type="text" placeholder="Luva, esponja...">`);
                camposHTML += criarCampoHTML('tamanho', 'tamanho', 'Tamanho/Volume', `<input type="text" placeholder="500ML, 1L...">`);
                break;
            case 'Móveis':
                camposHTML += campoQualidade;
                camposHTML += criarCampoHTML('especificacao', 'especificacao', 'Especificação', `<input type="text" placeholder="Sofá, cadeira, mesa...">`);
                camposHTML += campoPrecisaReparo;
                break;
            case 'Eletrodomésticos':
                camposHTML += campoQualidade;
                camposHTML += criarCampoHTML('especificacao', 'especificacao', 'Especificação', `<input type="text" placeholder="Televisão, fogão, geladeira...">`);
                camposHTML += campoPrecisaReparo;
                break;
            case 'Cobertores':
                camposHTML += campoQualidade;
                break;
            case 'Ração para animais':
                camposHTML += criarCampoHTML('tamanho_animal', 'tamanho_animal', 'Tamanho do Animal', `<select><option value="Pequeno">Pequeno</option><option value="Médio">Médio</option><option value="Grande">Grande</option></select>`);
                camposHTML += criarCampoHTML('tipo_racao', 'tipo_racao', 'Tipo', `<select><option value="Seca">Seca</option><option value="Úmida">Úmida</option></select>`);
                camposHTML += criarCampoHTML('animal', 'animal', 'Animal', `<select><option value="" disabled selected>Selecione...</option><option value="Cachorro">Cachorro</option><option value="Gato">Gato</option><option value="Outro">Outro</option></select>`);
                break;
        }
        camposEspecificosContainer.innerHTML = camposHTML;
    });

    // --- EVENT LISTENERS ---
    form.addEventListener('submit', adicionarItemNaCaixa);
    btnRegistrarCaixa.addEventListener('click', registrarTodaCaixa);

    caixaListaItens.addEventListener('click', (event) => {
        // CORREÇÃO APLICADA AQUI:
        const removeButton = event.target.closest('.btn-remover-item');
        if (removeButton) {
            removerItemDaCaixa(removeButton.dataset.index);
        }
    });

    // --- INICIALIZAÇÃO ---
    carregarCategorias();
});