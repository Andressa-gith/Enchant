import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// GET: Buscar todos os documentos
export const getDocumentos = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { data, error } = await supabase
            .from('documento_comprobatorio')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_criacao', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar documentos.', error: error.message });
    }
};

// POST: Adicionar novo documento
export const addDocumento = async (req, res) => {

    try {
        const instituicaoId = req.user.id;
        const { titulo, tipo_documento, valor } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // Upload para o Storage
        const file = req.file;
        const filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        const { error: uploadError } = await supabase.storage
            .from('comprovantes') // Nome do novo bucket
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        // Inserção no banco de dados
        const { data, error: insertError } = await supabase
            .from('documento_comprobatorio')
            .insert({
                instituicao_id: instituicaoId,
                titulo,
                tipo_documento,
                valor: parseFloat(valor),
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) {
            await supabase.storage.from('comprovantes').remove([filePath]);
            throw insertError;
        }

        res.status(201).json({ message: 'Documento adicionado com sucesso!', data });
    } catch (error) {
        console.error("Erro detalhado ao adicionar documento:", error);
        res.status(500).json({ message: 'Erro ao adicionar documento.', error: error.message });
    }
};

// DELETE: Deletar um documento
export const deleteDocumento = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;

        // 1. Pega o caminho do arquivo antes de deletar
        const { data: doc, error: fetchError } = await supabase
            .from('documento_comprobatorio')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !doc) throw new Error('Documento não encontrado ou permissão negada.');

        // 2. Deleta o registro do banco
        const { error: deleteDbError } = await supabase
            .from('documento_comprobatorio')
            .delete()
            .eq('id', id);

        if (deleteDbError) throw deleteDbError;
        
        // 3. Deleta o arquivo do Storage
        const { error: deleteStorageError } = await supabase.storage
            .from('comprovantes')
            .remove([doc.caminho_arquivo]);
            
        if (deleteStorageError) {
            console.warn("Aviso: Registro do banco deletado, mas falha ao deletar arquivo no Storage:", deleteStorageError.message);
        }

        res.status(200).json({ message: 'Documento deletado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar documento.', error: error.message });
    }
}