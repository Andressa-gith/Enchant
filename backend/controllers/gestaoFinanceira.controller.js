import supabase from '../db/supabaseClient.js';

// --- FUNÇÃO HELPER ---
// Centraliza a lógica para calcular o status, como planejamos.
const calcularStatus = (orcamento, executado) => {
    // Converte para número para garantir a comparação correta
    const orcamentoNum = parseFloat(orcamento);
    const executadoNum = parseFloat(executado);

    if (executadoNum === 0) {
        return 'Planejado';
    }
    // Se o valor executado for maior ou igual ao previsto, está Executado.
    if (executadoNum >= orcamentoNum) {
        return 'Executado';
    }
    // Se for maior que 0 e menor que o orçamento, está Pendente.
    return 'Pendente';
};

// Busca todos os dados financeiros para a instituição logada.
export const getFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { data, error } = await supabase
            .from('gestao_financeira')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_criacao', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados financeiros.', error: error.message });
    }
};

// Adiciona um novo lançamento e CALCULA O STATUS AUTOMATICAMENTE.
export const addFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        // O 'status' não vem mais do frontend.
        const { nome_categoria, origem_recurso, orcamento_previsto, valor_executado } = req.body;
        const ano = new Date().getFullYear();

        // Calcula o status com base nos valores recebidos.
        const status = calcularStatus(orcamento_previsto, valor_executado || 0);

        const { data, error } = await supabase
            .from('gestao_financeira')
            .insert({ 
                instituicao_id: instituicaoId, 
                nome_categoria, 
                origem_recurso, 
                orcamento_previsto, 
                valor_executado: valor_executado || 0, 
                status, // Status calculado
                ano 
            })
            .select().single();

        if (error) throw error;
        res.status(201).json({ message: 'Categoria financeira adicionada com sucesso!', data });
    } catch (error) {
        console.error("Erro ao adicionar categoria:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar categoria.', error: error.message });
    }
};

// Atualiza um lançamento e RECALCULA O STATUS AUTOMATICAMENTE.
export const updateFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { nome_categoria, orcamento_previsto, valor_executado } = req.body;

        if (nome_categoria === undefined || orcamento_previsto === undefined || valor_executado === undefined) {
            return res.status(400).json({ message: 'Dados para atualização inválidos.' });
        }

        // Recalcula o status antes de atualizar.
        const status = calcularStatus(orcamento_previsto, valor_executado);

        const { data, error } = await supabase
            .from('gestao_financeira')
            .update({ nome_categoria, orcamento_previsto, valor_executado, status }) // Adiciona o status ao update
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()
            .single();
        
        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Registro não encontrado ou sem permissão.' });

        res.status(200).json({ message: 'Lançamento atualizado com sucesso!', data });
    } catch (error) {
        console.error("Erro ao atualizar lançamento:", error);
        res.status(500).json({ message: 'Erro interno ao atualizar lançamento.', error: error.message });
    }
};

// Deleta um lançamento financeiro.
export const deleteFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('gestao_financeira')
            .delete()
            .eq('id', id)
            .eq('instituicao_id', instituicaoId);

        if (error) throw error;
        
        res.status(200).json({ message: 'Lançamento deletado com sucesso!' });
    } catch (error) {
        console.error("Erro ao deletar lançamento:", error);
        res.status(500).json({ message: 'Erro ao deletar lançamento.', error: error.message });
    }
};