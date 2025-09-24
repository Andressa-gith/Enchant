import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// Função para buscar todas as auditorias da instituição logada
export const getAuditorias = async (req, res) => {
    try {
        const instituicaoId = req.user.id;

        const { data, error } = await supabase
            .from('nota_auditoria')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_auditoria', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar auditorias.', error: error.message });
    }
};

// Função para adicionar uma nova auditoria
export const addAuditoria = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { titulo, data_auditoria, tipo, status } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo de auditoria foi enviado.' });
        }

        // 1. Faz o upload do arquivo para o Supabase Storage
        const file = req.file;
        const filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;

        const { error: uploadError } = await supabase.storage
            .from('audit') // Nome do novo bucket
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // 2. Insere os dados na tabela 'nota_auditoria'
        const { data: auditoriaData, error: insertError } = await supabase
            .from('nota_auditoria')
            .insert({
                instituicao_id: instituicaoId,
                titulo,
                data_auditoria,
                tipo,
                status,
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) {
            // Se der erro no banco, remove o arquivo do Storage
            await supabase.storage.from('audit').remove([filePath]);
            throw insertError;
        }

        res.status(201).json({ message: 'Auditoria adicionada com sucesso!', data: auditoriaData });

    } catch (error) {
        console.error("Erro ao adicionar auditoria:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar auditoria.', error: error.message });
    }
};