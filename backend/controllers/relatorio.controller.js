import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// Função para buscar todos os relatórios da instituição logada
export const getRelatorios = async (req, res) => {
    try {
        const instituicaoId = req.user.id;

        const { data, error } = await supabase
            .from('relatorio')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_publicacao', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar relatórios.', error: error.message });
    }
};

// Função para adicionar um novo relatório
export const addRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { titulo, descricao } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // 1. Fazer o upload do arquivo para o Supabase Storage
        const file = req.file;
        // Cria um nome de arquivo único para evitar conflitos
        const filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;

        const { error: uploadError } = await supabase.storage
            .from('reports') // Nome do seu bucket
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // 2. Inserir os dados na tabela 'relatorio'
        const { data: relatorioData, error: insertError } = await supabase
            .from('relatorio')
            .insert({
                instituicao_id: instituicaoId,
                titulo: titulo,
                descricao: descricao,
                caminho_arquivo: filePath, // Salva o caminho do arquivo no banco
            })
            .select()
            .single();

        if (insertError) {
            // Se der erro no banco, tenta remover o arquivo que já foi salvo no Storage
            await supabase.storage.from('reports').remove([filePath]);
            throw insertError;
        }

        res.status(201).json({ message: 'Relatório adicionado com sucesso!', data: relatorioData });

    } catch (error) {
        console.error("Erro ao adicionar relatório:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar relatório.', error: error.message });
    }
};

// (Opcional, mas recomendado) Função para deletar um relatório
export const deleteRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;

        // Pega o caminho do arquivo antes de deletar o registro
        const { data: relatorio, error: fetchError } = await supabase
            .from('relatorio')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !relatorio) throw new Error('Relatório não encontrado ou você não tem permissão.');

        // Deleta o registro do banco
        const { error: deleteDbError } = await supabase
            .from('relatorio')
            .delete()
            .eq('id', id);

        if (deleteDbError) throw deleteDbError;
        
        // Deleta o arquivo do Storage
        const { error: deleteStorageError } = await supabase.storage
            .from('reports')
            .remove([relatorio.caminho_arquivo]);
            
        if (deleteStorageError) {
            console.warn("Aviso: Registro do banco deletado, mas falha ao deletar arquivo no Storage:", deleteStorageError.message);
        }

        res.status(200).json({ message: 'Relatório deletado com sucesso!' });

    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar relatório.', error: error.message });
    }
}