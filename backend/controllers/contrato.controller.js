import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// Função para buscar todos os contratos da instituição logada
export const getContratos = async (req, res) => {
    try {
        const instituicaoId = req.user.id;

        const { data, error } = await supabase
            .from('contrato')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('ano_vigencia', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contratos.', error: error.message });
    }
};

// Função para adicionar um novo contrato
export const addContrato = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { nome_contrato, descricao, ano_vigencia } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo de contrato foi enviado.' });
        }

        // 1. Faz o upload do arquivo para o Supabase Storage
        const file = req.file;
        const filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;

        const { error: uploadError } = await supabase.storage
            .from('contracts') // Nome do novo bucket
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // 2. Insere os dados na tabela 'contrato'
        const { data: contratoData, error: insertError } = await supabase
            .from('contrato')
            .insert({
                instituicao_id: instituicaoId,
                nome_contrato,
                descricao,
                ano_vigencia: parseInt(ano_vigencia, 10), // Garante que o ano é um número
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) {
            // Se der erro no banco, remove o arquivo do Storage para não deixar lixo
            await supabase.storage.from('contracts').remove([filePath]);
            throw insertError;
        }

        res.status(201).json({ message: 'Contrato adicionado com sucesso!', data: contratoData });

    } catch (error) {
        console.error("Erro ao adicionar contrato:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar contrato.', error: error.message });
    }
};

export const deleteContrato = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params; // Pega o ID do contrato pela URL

        // 1. Pega o caminho do arquivo antes de deletar o registro do banco
        const { data: contrato, error: fetchError } = await supabase
            .from('contrato') // <-- Tabela de contratos
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !contrato) {
            throw new Error('Contrato não encontrado ou você não tem permissão para excluí-lo.');
        }

        // 2. Deleta o registro da tabela 'contrato'
        const { error: deleteDbError } = await supabase
            .from('contrato') // <-- Tabela de contratos
            .delete()
            .eq('id', id);

        if (deleteDbError) throw deleteDbError;
        
        // 3. Deleta o arquivo do Supabase Storage
        const { error: deleteStorageError } = await supabase.storage
            .from('contracts') // <-- Bucket de contratos
            .remove([contrato.caminho_arquivo]);
            
        // Mesmo que dê erro ao apagar o arquivo, a operação no banco foi um sucesso.
        // Apenas logamos o aviso no console do servidor.
        if (deleteStorageError) {
            console.warn("Aviso: Registro do banco deletado, mas falha ao deletar arquivo no Storage:", deleteStorageError.message);
        }

        res.status(200).json({ message: 'Contrato deletado com sucesso!' });

    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar contrato.', error: error.message });
    }
}