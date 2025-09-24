import supabaseClient from '../supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mapeamento dos elementos do HTML ---
    const form = document.getElementById('doacao-form');
    const selectCategoria = document.getElementById('categoria-doacao');
    const camposEspecificosContainer = document.getElementById('campos-especificos-container');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));

    // --- Função Auxiliar para criar campos HTML de forma limpa ---
    const criarCampoHTML = (id, name, label, inputHTML, required = true) => {
        return `
            <div class="form-group">
                <label class="form-label" for="${id}">${label}</label>
                ${inputHTML.replace('>', ` id="${id}" name="${name}" class="form-control" ${required ? 'required' : ''}>`)}
            </div>
        `;
    };

    // --- Passo 1: Carregar as categorias do banco de dados ---
    async function carregarCategorias() {
        const { data, error } = await supabaseClient
            .from('categoria')
            .select('id, nome')
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao carregar categorias:', error);
            selectCategoria.innerHTML = '<option value="">Erro ao carregar</option>';
            return;
        }

        selectCategoria.innerHTML = '<option value="" disabled selected>Selecione a categoria...</option>';
        data.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nome;
            option.dataset.nome = categoria.nome; // Guarda o nome para o switch
            selectCategoria.appendChild(option);
        });
    }

    // --- Passo 2 e 3: "Ouvir" a seleção e gerar os campos dinâmicos ---
    selectCategoria.addEventListener('change', (event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const nomeCategoria = selectedOption.dataset.nome;
        
        camposEspecificosContainer.innerHTML = ''; // Limpa os campos antigos
        let camposHTML = '';

        // Snippets de campos reutilizáveis
        const campoQualidade = criarCampoHTML('qualidade', 'qualidade', 'Qualidade', 
            `<select>
                <option value="" disabled selected>Selecione...</option>
                <option value="Novo">Novo</option>
                <option value="Usado - Bom estado">Usado - Bom estado</option>
                <option value="Usado - Regular">Usado - Regular</option>
            </select>`
        );

        const campoPrecisaReparo = criarCampoHTML('precisa_reparo', 'precisa_reparo', 'Precisa de reparo?',
            `<select>
                <option value="true">Sim</option>
                <option value="false" selected>Não</option>
            </select>`
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
            // <<<< NOVO CASE ADICIONADO AQUI >>>>
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
            // <<<< CASE ATUALIZADO AQUI >>>>
            case 'Ração para animais':
                camposHTML += criarCampoHTML('tamanho_animal', 'tamanho_animal', 'Tamanho do Animal', `<select><option value="Pequeno">Pequeno</option><option value="Médio">Médio</option><option value="Grande">Grande</option></select>`);
                camposHTML += criarCampoHTML('tipo_racao', 'tipo_racao', 'Tipo', `<select><option value="Seca">Seca</option><option value="Úmida">Úmida</option></select>`);
                camposHTML += criarCampoHTML('animal', 'animal', 'Animal', `<select><option value="" disabled selected>Selecione...</option><option value="Cachorro">Cachorro</option><option value="Gato">Gato</option><option value="Outro">Outro</option></select>`);
                break;
        }
        camposEspecificosContainer.innerHTML = camposHTML;
    });

    // --- Passo 4: Preparar dados para o backend ao enviar o formulário ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        const formData = new FormData(form);
        
        const doacaoParaApi = {};
        const detalhes = {};

        // Lista de campos que são colunas diretas na tabela `doacao_entrada`
        const camposPrincipais = ['categoria_id', 'quantidade', 'doador_origem_texto', 'qualidade'];

        // Separa os dados: o que é principal e o que vai para o JSON `detalhes`
        for (const [key, value] of formData.entries()) {
            if (camposPrincipais.includes(key)) {
                doacaoParaApi[key] = value;
            } else {
                detalhes[key] = value;
            }
        }
        
        // Adiciona o objeto de detalhes ao payload final
        doacaoParaApi.detalhes = detalhes;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const token = session.access_token;

            const response = await fetch('/api/doacao/registrar-doacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(doacaoParaApi)
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.message || 'Erro no servidor');
            }

            document.getElementById('successModalBody').textContent = 'Doação registrada com sucesso!';
            successModal.show();
            form.reset();
            camposEspecificosContainer.innerHTML = '';

        } catch (error) {
            console.error("Erro ao enviar doação:", error);
            document.getElementById('errorModalBody').textContent = `Falha ao registrar: ${error.message}`;
            errorModal.show();
        }
    });

    carregarCategorias();
});