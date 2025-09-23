import supabase from '/scripts/supabaseClient.js';
console.log("🔵 Módulo registrar-entrada.js: Carregado.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("🔵 ETAPA 1: DOM carregado.");
    let currentUser = null;
    let categorias = [];

    // --- MAPEAMENTO DOS ELEMENTOS ---
    const selectCategoria = document.getElementById('categoria-doacao');
    const quantidadeInput = document.getElementById('quantidade');
    const doadorInput = document.getElementById('doador');
    const camposEspecificosContainer = document.getElementById('campos-especificos-container');
    const doacaoForm = document.getElementById('doacao-form');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
    console.log("🔵 ETAPA 2: Elementos do DOM mapeados.");

    // --- AUTENTICAÇÃO E CARREGAMENTO INICIAL ---
    console.log("🔵 ETAPA 3: Configurando verificação de autenticação...");
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔵 ETAPA 4: Evento de auth recebido - ${event}`);
        if (session && session.user) {
            currentUser = session.user;
            console.log(`✅ ETAPA 5: Sessão válida para ${currentUser.email}.`);
            await loadCategorias();
            infoModal.show(); // Mostra o modal de boas-vindas
        } else {
            console.log("❌ ETAPA 5: Nenhuma sessão encontrada. Redirecionando para /entrar.");
            window.location.href = '/entrar';
        }
    });

    async function loadCategorias() {
        console.log("🔵 ETAPA 6: Buscando categorias no banco de dados...");

        try {
            // Query mais simples e direta
            const { data, error } = await supabase
                .from('categoria')
                .select('id, nome')
                .order('nome');

            if (error) {
                console.error('❌ ERRO na ETAPA 6:', error);
                showModal('error', 'Não foi possível carregar as categorias de doação.');
                return;
            }
            
            categorias = data;
            selectCategoria.innerHTML = '<option value="" disabled selected>Selecione a categoria...</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nome;
                selectCategoria.appendChild(option);
            });
            
            // Força o select a ficar habilitado
            selectCategoria.disabled = false;
            selectCategoria.style.pointerEvents = 'auto';
            
            console.log("✅ ETAPA 7: Select de categorias preenchido.");
        } catch (err) {
            console.error('❌ ERRO CATCH na ETAPA 6:', err);
            showModal('error', 'Erro inesperado ao carregar categorias.');
        }
    }

    // --- GERAÇÃO DINÂMICA DOS CAMPOS ---
    selectCategoria.addEventListener('change', () => {
        const categoriaNome = selectCategoria.options[selectCategoria.selectedIndex].textContent;
        console.log(`🔵 ETAPA 8: Categoria '${categoriaNome}' selecionada. Renderizando campos...`);
        renderizarCamposEspecificos(categoriaNome);
    });

    function renderizarCamposEspecificos(categoriaNome) {
        camposEspecificosContainer.innerHTML = '';
        let htmlCampos = '';
        
        // Lógica completa baseada nas suas imagens
        switch (categoriaNome) {
            case 'Alimentos':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_tipo">Tipo</label>
                        <select id="detalhe_tipo" class="form-control" required>
                            <option value="" disabled selected>Selecione...</option>
                            <option value="Perecíveis">Perecíveis</option>
                            <option value="Não Perecíveis">Não Perecíveis</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_validade">Validade</label>
                        <input type="date" id="detalhe_validade" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_especificacao">Especificação</label>
                        <input type="text" id="detalhe_especificacao" placeholder="Arroz, feijão, leite..." class="form-control" required>
                    </div>`;
                break;
            case 'Roupas':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_genero">Gênero</label>
                        <select id="detalhe_genero" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Unissex">Unissex</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_qualidade">Qualidade</label>
                        <select id="detalhe_qualidade" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Novo">Novo</option>
                            <option value="Usado - Bom estado">Usado - Bom estado</option>
                            <option value="Usado - Regular estado">Usado - Regular estado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_tamanho">Tamanho</label>
                        <input type="text" id="detalhe_tamanho" placeholder="P, M, G, 38, 40..." class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_tipo_roupa">Tipo</label>
                        <input type="text" id="detalhe_tipo_roupa" placeholder="Calça, camisa, blusa..." class="form-control" required>
                    </div>`;
                break;
            case 'Calçados':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_genero">Gênero</label>
                        <select id="detalhe_genero" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Unissex">Unissex</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_qualidade">Qualidade</label>
                        <select id="detalhe_qualidade" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Novo">Novo</option>
                            <option value="Usado - Bom estado">Usado - Bom estado</option>
                            <option value="Usado - Regular estado">Usado - Regular estado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_tamanho">Tamanho</label>
                        <input type="text" id="detalhe_tamanho" placeholder="38, 40, 42..." class="form-control" required>
                    </div>`;
                break;
            case 'Produtos de Higiene':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_especificacao">Especifique</label>
                        <input type="text" id="detalhe_especificacao" placeholder="Sabonete, pasta de dente..." class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_restricao">Restrição/Recomendação</label>
                        <input type="text" id="detalhe_restricao" placeholder="Opcional: Sem fragrância, para peles sensíveis..." class="form-control">
                    </div>`;
                break;
            case 'Ração para Animais':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_porte_animal">Porte</label>
                        <select id="detalhe_porte_animal" class="form-control" required>
                            <option value="" disabled selected>Selecione...</option>
                            <option value="Grande Porte">Grande Porte</option>
                            <option value="Médio Porte">Médio Porte</option>
                            <option value="Pequeno Porte">Pequeno Porte</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_idade_animal">Tipo</label>
                        <select id="detalhe_idade_animal" class="form-control" required>
                            <option value="" disabled selected>Selecione...</option>
                            <option value="Adulto">Adulto</option>
                            <option value="Filhote">Filhote</option>
                            <option value="Sênior">Sênior</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_animal">Animal</label>
                        <input type="text" id="detalhe_animal" placeholder="Gato, cachorro, pássaro..." class="form-control" required>
                    </div>`;
                break;
            case 'Cobertores':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_qualidade">Qualidade</label>
                        <select id="detalhe_qualidade" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Novo">Novo</option>
                            <option value="Usado - Bom estado">Usado - Bom estado</option>
                            <option value="Usado - Regular estado">Usado - Regular estado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_tipo">Tipo</label>
                        <input type="text" id="detalhe_tipo" placeholder="Casal, Solteiro, Infantil..." class="form-control">
                    </div>`;
                break;
            case 'Móveis':
            case 'Eletrodomésticos':
                htmlCampos = `
                    <div class="form-group">
                        <label class="form-label" for="detalhe_qualidade">Qualidade</label>
                        <select id="detalhe_qualidade" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Novo">Novo</option>
                            <option value="Usado - Funcionando / Bom estado">Usado - Funcionando / Bom estado</option>
                            <option value="Usado - Necessita Reparo">Usado - Necessita Reparo</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_especificacao">Especificação</label>
                        <input type="text" id="detalhe_especificacao" placeholder="Sofá, geladeira, TV..." class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="detalhe_precisa_reparo">Precisa de reparo?</label>
                        <select id="detalhe_precisa_reparo" class="form-control" required>
                            <option value="" disabled selected>Selecione</option>
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                        </select>
                    </div>`;
                break;
            default:
                htmlCampos = '<p class="text-white-50">Selecione uma categoria para ver os detalhes.</p>';
                break;
        }
        camposEspecificosContainer.innerHTML = htmlCampos;
        console.log("✅ ETAPA 9: Campos específicos renderizados.");
    }

    // --- ENVIO DO FORMULÁRIO ---
    doacaoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("🔵 ETAPA 10: Formulário enviado. Validando dados...");

        if (!selectCategoria.value || !quantidadeInput.value || !doadorInput.value) {
            showModal('error', 'Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const detalhes = {};
        const camposExtras = camposEspecificosContainer.querySelectorAll('input, select');
        let todosCamposEspecificosPreenchidos = true;
        camposExtras.forEach(campo => {
            if (campo.hasAttribute('required') && !campo.value.trim()) {
                todosCamposEspecificosPreenchidos = false;
            }
            const chave = campo.id.replace('detalhe_', '');
            detalhes[chave] = campo.value.trim();
        });

        if (!todosCamposEspecificosPreenchidos) {
            showModal('error', 'Por favor, preencha todos os detalhes da doação.');
            return;
        }
        
        console.log("✅ ETAPA 11: Dados validados. Preparando para enviar ao banco...");
        
        const novaDoacao = {
            instituicao_id: currentUser.id,
            categoria_id: selectCategoria.value,
            quantidade: parseFloat(quantidadeInput.value),
            doador_origem_texto: doadorInput.value.trim(),
            detalhes: detalhes
        };

        console.log("🔵 Enviando para o Supabase:", novaDoacao);

        const { error } = await supabase.from('doacao_entrada').insert([novaDoacao]);

        if (error) {
            console.error('❌ ERRO na ETAPA 12:', error);
            showModal('error', `Falha ao registrar a doação: ${error.message}`);
        } else {
            console.log("✅ ETAPA 12: Doação registrada com sucesso no banco de dados!");
            showModal('success', 'Doação registrada com sucesso!');
            doacaoForm.reset();
            camposEspecificosContainer.innerHTML = '';
            selectCategoria.value = "";
        }
    });

    function showModal(type, message) {
        if (type === 'success') {
            document.getElementById('successModalBody').innerHTML = `<p>${message}</p>`;
            successModal.show();
        } else if (type === 'error') {
            document.getElementById('errorModalBody').innerHTML = `<p>${message}</p>`;
            errorModal.show();
        }
    }
});