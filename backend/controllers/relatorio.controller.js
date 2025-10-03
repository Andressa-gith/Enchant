import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Busca todos os relatórios de transparência da instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getRelatorios = async (req, res) => {
    logger.info('Iniciando busca de relatórios de transparência...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando relatórios para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('relatorio')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_publicacao', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de relatórios bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar relatórios.', error);
        res.status(500).json({ message: 'Erro ao buscar relatórios.' });
    }
};

/**
 * Adiciona um novo relatório de transparência, incluindo o upload do arquivo.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const addRelatorio = async (req, res) => {
    logger.info('Iniciando processo de adição de novo relatório...');
    let filePath; // Variável para guardar o caminho do arquivo para possível rollback
    try {
        const instituicaoId = req.user.id;
        const { titulo, descricao } = req.body;
        logger.debug('Dados recebidos para novo relatório:', { titulo });

        if (!req.file) {
            logger.warn('Tentativa de adicionar relatório sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // 1. Upload do arquivo
        const file = req.file;
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de relatório para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('reports')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de relatório realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados do relatório no banco de dados...');
        const { data: relatorioData, error: insertError } = await supabase
            .from('relatorio')
            .insert({
                instituicao_id: instituicaoId,
                titulo: titulo,
                descricao: descricao,
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        logger.info(`Relatório ID: ${relatorioData.id} adicionado com sucesso.`);
        res.status(201).json({ message: 'Relatório adicionado com sucesso!', data: relatorioData });

    } catch (error) {
        logger.error('Erro no processo de adicionar relatório.', error);

        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('reports').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }
        
        res.status(500).json({ message: 'Erro interno ao adicionar relatório.' });
    }
};

/**
 * Deleta um relatório de transparência e seu arquivo associado no Storage.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteRelatorio = async (req, res) => {
    logger.info('Iniciando processo de exclusão de relatório...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar relatório ID: ${id}`);

        // 1. Busca o caminho do arquivo
        logger.info(`Buscando informações do relatório ID: ${id} para exclusão.`);
        const { data: relatorio, error: fetchError } = await supabase
            .from('relatorio')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !relatorio) {
            logger.warn(`Relatório ID: ${id} não encontrado ou usuário sem permissão.`);
            throw new Error('Relatório não encontrado ou você não tem permissão.');
        }

        // 2. Deleta o registro do banco
        logger.info(`Deletando registro do relatório ID: ${id} do banco de dados.`);
        const { error: deleteDbError } = await supabase
            .from('relatorio')
            .delete()
            .eq('id', id);

        if (deleteDbError) throw deleteDbError;
        
        // 3. Deleta o arquivo do Storage
        logger.info(`Deletando arquivo do Storage: ${relatorio.caminho_arquivo}`);
        const { error: deleteStorageError } = await supabase.storage
            .from('reports')
            .remove([relatorio.caminho_arquivo]);
            
        if (deleteStorageError) {
            logger.warn(`Registro do relatório ID: ${id} deletado, mas falha ao remover arquivo do Storage.`, deleteStorageError);
        }

        logger.info(`Relatório ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Relatório deletado com sucesso!' });

    } catch (error) {
        logger.error('Erro ao deletar relatório.', error);
        res.status(500).json({ message: 'Erro ao deletar relatório.' });
    }
};