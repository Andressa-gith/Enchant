import supabase from '../db/supabaseClient.js';

// GET: Buscar todas as parcerias
export const getParcerias = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { data, error } = await supabase
            .from('parceiro')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_inicio', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar parcerias.', error: error.message });
    }
};

// POST: Adicionar nova parceria
export const addParceria = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { nome, tipo_setor, status, data_inicio, data_fim, valor_total_parceria, objetivos } = req.body;

        const { data, error } = await supabase
            .from('parceiro')
            .insert({
                instituicao_id: instituicaoId,
                nome, tipo_setor, status, data_inicio,
                data_fim: data_fim || null, // Permite data final nula
                valor_total_parceria: valor_total_parceria || null, // Permite valor nulo
                objetivos
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: 'Parceria adicionada com sucesso!', data });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar parceria.', error: error.message });
    }
};

// PUT: Atualizar uma parceria existente
export const updateParceria = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        const { nome, tipo_setor, status, data_inicio, data_fim, valor_total_parceria, objetivos } = req.body;

        const { data, error } = await supabase
            .from('parceiro')
            .update({
                nome, tipo_setor, status, data_inicio,
                data_fim: data_fim || null,
                valor_total_parceria: valor_total_parceria || null,
                objetivos
            })
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: 'Parceria atualizada com sucesso!', data });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar parceria.', error: error.message });
    }
};

// DELETE: Deletar uma parceria
export const deleteParceria = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('parceiro')
            .delete()
            .eq('id', id)
            .eq('instituicao_id', instituicaoId);

        if (error) throw error;
        res.status(200).json({ message: 'Parceria deletada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar parceria.', error: error.message });
    }
};