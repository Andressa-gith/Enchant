import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Busca todos os contratos da instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getContratos = async (req, res) => {
    logger.info('Iniciando busca de contratos...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando contratos para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('contrato')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('ano_vigencia', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de contratos bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar contratos.', error);
        res.status(500).json({ message: 'Erro ao buscar contratos.' });
    }
};

/**
 * Adiciona um novo contrato, incluindo o upload do arquivo.
 * @param {object} req - Objeto de requisição do Express (com req.body e req.file).
 * @param {object} res - Objeto de resposta do Express.
 */
export const addContrato = async (req, res) => {
    logger.info('Iniciando processo de adição de novo contrato...');
    let filePath; // Variável para guardar o caminho do arquivo para possível rollback
    try {
        const instituicaoId = req.user.id;
        const { nome_contrato, descricao, ano_vigencia } = req.body;

        logger.debug('Dados recebidos para novo contrato:', { nome_contrato, ano_vigencia });

        if (!req.file) {
            logger.warn('Tentativa de adicionar contrato sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo de contrato foi enviado.' });
        }

        // 1. Upload do arquivo
        const file = req.file;
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de contrato para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de contrato realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados do contrato no banco de dados...');
        const { data: contratoData, error: insertError } = await supabase
            .from('contrato')
            .insert({
                instituicao_id: instituicaoId,
                nome_contrato,
                descricao,
                ano_vigencia: parseInt(ano_vigencia, 10),
                caminho_arquivo: filePath,
            })
            .select()
            .single();

        if (insertError) throw insertError; // O erro será pego pelo catch principal

        logger.info('Contrato adicionado com sucesso!', { id: contratoData.id });
        res.status(201).json({ message: 'Contrato adicionado com sucesso!', data: contratoData });

    } catch (error) {
        logger.error('Erro no processo de adicionar contrato.', error);
        
        // Se o erro aconteceu DEPOIS do upload (ex: erro no insert), o filePath vai existir
        // e tentaremos remover o arquivo órfão do Storage.
        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('contracts').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }
        
        res.status(500).json({ message: 'Erro interno ao adicionar contrato.' });
    }
};

/**
 * Deleta um contrato e seu arquivo associado no Storage.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteContrato = async (req, res) => {
    logger.info('Iniciando processo de exclusão de contrato...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar contrato ID: ${id}`);

        // 1. Busca o caminho do arquivo
        logger.info(`Buscando informações do contrato ID: ${id} para exclusão.`);
        const { data: contrato, error: fetchError } = await supabase
            .from('contrato')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !contrato) {
            logger.warn(`Contrato ID: ${id} não encontrado ou usuário sem permissão.`);
            throw new Error('Contrato não encontrado ou você não tem permissão para excluí-lo.');
        }

        // 2. Deleta o registro do banco
        logger.info(`Deletando registro do contrato ID: ${id} do banco de dados.`);
        const { error: deleteDbError } = await supabase
            .from('contrato')
            .delete()
            .eq('id', id);

        if (deleteDbError) throw deleteDbError;
        
        // 3. Deleta o arquivo do Storage
        logger.info(`Deletando arquivo do Storage: ${contrato.caminho_arquivo}`);
        const { error: deleteStorageError } = await supabase.storage
            .from('contracts')
            .remove([contrato.caminho_arquivo]);
            
        if (deleteStorageError) {
            logger.warn(`Registro do contrato ID: ${id} deletado, mas falha ao remover arquivo do Storage.`, deleteStorageError);
        }

        logger.info(`Contrato ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Contrato deletado com sucesso!' });

    } catch (error) {
        logger.error('Erro ao deletar contrato.', error);
        res.status(500).json({ message: 'Erro ao deletar contrato.' });
    }
};