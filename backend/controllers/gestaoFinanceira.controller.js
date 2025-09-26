import supabase from '../db/supabaseClient.js';

// Função para buscar todos os dados financeiros (sem alteração)
export const getFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const ano = req.query.ano || new Date().getFullYear();

        const { data, error } = await supabase
            .from('gestao_financeira')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            // .eq('ano', ano) // Temporariamente removido para mostrar todos os anos
            .order('data_criacao', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados financeiros.', error: error.message });
    }
};

// Função para adicionar uma nova categoria (sem alteração)
export const addFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { nome_categoria, origem_recurso, orcamento_previsto, valor_executado, status } = req.body;
        const ano = new Date().getFullYear();

        const { data, error } = await supabase
            .from('gestao_financeira')
            .insert({ instituicao_id: instituicaoId, nome_categoria, origem_recurso, orcamento_previsto, valor_executado, status, ano })
            .select().single();

        if (error) throw error;
        res.status(201).json({ message: 'Categoria financeira adicionada com sucesso!', data });
    } catch (error) {
        console.error("Erro ao adicionar categoria:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar categoria.', error: error.message });
    }
};

// NOVO: Função para editar um lançamento completo (usada pelo modal de edição)
export const updateFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { nome_categoria, orcamento_previsto, valor_executado } = req.body;

        if (!nome_categoria || orcamento_previsto === undefined || valor_executado === undefined) {
            return res.status(400).json({ message: 'Dados para atualização inválidos.' });
        }

        const { data, error } = await supabase
            .from('gestao_financeira')
            .update({ nome_categoria, orcamento_previsto, valor_executado })
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


// Função para atualizar o status (sem alteração)
export const updateStatusFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!status) return res.status(400).json({ message: 'Novo status não fornecido.' });

        const { data, error } = await supabase
            .from('gestao_financeira')
            .update({ status: status })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ message: 'Registro não encontrado ou sem permissão.' });

        res.status(200).json({ message: 'Status atualizado com sucesso!', data });
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        res.status(500).json({ message: 'Erro interno ao atualizar status.', error: error.message });
    }
};

// NOVO: Função para excluir um lançamento financeiro
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
        
        // No caso de gestão financeira, geralmente não há arquivo para deletar, então é mais simples.
        res.status(200).json({ message: 'Lançamento deletado com sucesso!' });
    } catch (error) {
        console.error("Erro ao deletar lançamento:", error);
        res.status(500).json({ message: 'Erro ao deletar lançamento.', error: error.message });
    }
};