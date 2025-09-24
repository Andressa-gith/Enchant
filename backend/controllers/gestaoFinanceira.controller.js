import supabase from '../db/supabaseClient.js';

// Função para buscar todos os dados financeiros da instituição
export const getFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;

        // Adicionamos um filtro de ano, pegando o ano atual como padrão
        const ano = req.query.ano || new Date().getFullYear();

        const { data, error } = await supabase
            .from('gestao_financeira')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .eq('ano', ano) // Filtra pelo ano
            .order('data_criacao', { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados financeiros.', error: error.message });
    }
};

// Função para adicionar uma nova categoria financeira
export const addFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { nome_categoria, origem_recurso, orcamento_previsto, valor_executado, status } = req.body;
        
        // Pega o ano atual para o novo registro
        const ano = new Date().getFullYear();

        const { data, error } = await supabase
            .from('gestao_financeira')
            .insert({
                instituicao_id: instituicaoId,
                nome_categoria,
                origem_recurso,
                orcamento_previsto,
                valor_executado,
                status,
                ano, // Salva o ano do registro
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Categoria financeira adicionada com sucesso!', data });

    } catch (error) {
        console.error("Erro ao adicionar categoria:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar categoria.', error: error.message });
    }
};

// Função para atualizar o valor executado de uma categoria
export const updateValorExecutado = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { valor_executado } = req.body;

        if (valor_executado === undefined || valor_executado < 0) {
            return res.status(400).json({ message: 'Valor executado inválido.' });
        }

        const { data, error } = await supabase
            .from('gestao_financeira')
            .update({ valor_executado: valor_executado })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ message: 'Registro não encontrado ou você não tem permissão.' });
            }
            throw error;
        }

        res.status(200).json({ message: 'Valor executado atualizado com sucesso!', data });

    } catch (error) {
        console.error("Erro ao atualizar valor executado:", error);
        res.status(500).json({ message: 'Erro interno ao atualizar valor.', error: error.message });
    }
};

export const updateStatusFinanceiro = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Novo status não fornecido.' });
        }

        const { data, error } = await supabase
            .from('gestao_financeira')
            .update({ status: status })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ message: 'Registro não encontrado ou você não tem permissão.' });
            }
            throw error;
        }

        res.status(200).json({ message: 'Status atualizado com sucesso!', data });

    } catch (error) {
        console.error("Erro ao atualizar status financeiro:", error);
        res.status(500).json({ message: 'Erro interno ao atualizar status.', error: error.message });
    }
};