import supabaseClient from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Mapeamento dos elementos do HTML
    const form = document.getElementById('retirada-form');
    const selectItemEstoque = document.getElementById('item-estoque');
    const infoDisponivel = document.getElementById('info-disponivel');
    const inputQuantidade = document.getElementById('quantidade-retirada');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));

    let estoqueDisponivel = []; // Array para guardar os dados dos itens

    // Carrega os itens do estoque ao iniciar a página
    async function carregarItensEmEstoque() {
        try {
            // Primeiro, pegamos a sessão para saber qual instituição está logada
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !session) throw new Error('Sessão não encontrada.');
            
            const instituicaoId = session.user.id; // ID da instituição logada

            // **CORREÇÃO AQUI**
            // Agora, as buscas são filtradas pelo 'instituicao_id'
            const [
                { data: entradas, error: erroEntradas },
                { data: saidas, error: erroSaidas }
            ] = await Promise.all([
                supabaseClient.from('doacao_entrada')
                    .select(`*, categoria:categoria_id(nome)`)
                    .eq('instituicao_id', instituicaoId), // <-- FILTRO DE SEGURANÇA ADICIONADO
                
                supabaseClient.from('doacao_saida')
                    .select('entrada_id, quantidade_retirada')
                    .eq('instituicao_id', instituicaoId) // <-- FILTRO DE SEGURANÇA ADICIONADO
            ]);

            if (erroEntradas || erroSaidas) {
                throw new Error(erroEntradas?.message || erroSaidas?.message || 'Erro ao carregar dados.');
            }

            const totaisRetirados = saidas.reduce((acc, saida) => {
                acc[saida.entrada_id] = (acc[saida.entrada_id] || 0) + Number(saida.quantidade_retirada);
                return acc;
            }, {});

            estoqueDisponivel = entradas.map(entrada => {
                const retirado = totaisRetirados[entrada.id] || 0;
                const disponivel = Number(entrada.quantidade) - retirado;
                return { ...entrada, quantidade_disponivel: disponivel };
            }).filter(item => item.quantidade_disponivel > 0);

            selectItemEstoque.innerHTML = '<option value="" disabled selected>Selecione um item do estoque...</option>';
            
            if (estoqueDisponivel.length === 0) {
                 selectItemEstoque.innerHTML = '<option value="" disabled>Nenhum item em estoque para retirada.</option>';
            } else {
                estoqueDisponivel.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = `Lote #${item.id}: ${item.categoria.nome} (de ${item.doador_origem_texto}) - Disp: ${item.quantidade_disponivel}`;
                    selectItemEstoque.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
            selectItemEstoque.innerHTML = `<option>${error.message}</option>`;
        }
    }

    // "Ouve" a seleção de um item no menu (sem alteração)
    selectItemEstoque.addEventListener('change', (event) => {
        const itemId = event.target.value;
        const itemSelecionado = estoqueDisponivel.find(item => item.id == itemId);

        if (itemSelecionado) {
            infoDisponivel.textContent = `Quantidade disponível em estoque: ${itemSelecionado.quantidade_disponivel}`;
            inputQuantidade.disabled = false;
            inputQuantidade.max = itemSelecionado.quantidade_disponivel;
            inputQuantidade.value = 1;
        } else {
            infoDisponivel.textContent = '';
            inputQuantidade.disabled = true;
            inputQuantidade.max = null;
        }
    });

    // Envia o formulário (sem alteração)
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const retiradaParaApi = {
            entrada_id: formData.get('entrada_id'),
            quantidade_retirada: formData.get('quantidade_retirada'),
            destinatario: formData.get('destinatario'),
            observacao: formData.get('observacao')
        };
        
        const itemSelecionado = estoqueDisponivel.find(item => item.id == retiradaParaApi.entrada_id);
        if (!itemSelecionado || Number(retiradaParaApi.quantidade_retirada) > itemSelecionado.quantidade_disponivel) {
            document.getElementById('errorModalBody').textContent = 'A quantidade a retirar não pode ser maior que o estoque disponível.';
            errorModal.show();
            return;
        }

        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !session) throw new Error('Sessão não encontrada. Faça o login novamente.');
            
            const token = session.access_token;

            const response = await fetch('/api/doacao/registrar-retirada', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(retiradaParaApi)
            });

            if (!response.ok) {
                const erro = await response.json();
                throw new Error(erro.message || 'Erro no servidor ao registrar retirada.');
            }

            // Lógica de feedback visual
            document.getElementById('successModalBody').textContent = 'Retirada registrada com sucesso!';
            successModal.show();
            
            form.reset();
            infoDisponivel.textContent = '';
            inputQuantidade.disabled = true;

            const successModalElement = document.getElementById('successModal');
            
            // Adiciona o "ouvinte" para recarregar o estoque QUANDO o modal for fechado
            successModalElement.addEventListener('hidden.bs.modal', () => {
                carregarItensEmEstoque();
            }, { once: true });

        } catch (error) {
            console.error("Erro ao enviar retirada:", error);
            document.getElementById('errorModalBody').textContent = `Falha ao registrar: ${error.message}`;
            errorModal.show();
        }
    });

    // Inicia tudo
    carregarItensEmEstoque();
});