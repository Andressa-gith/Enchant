import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Busca todos os documentos comprobatórios da instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getDocumentos = async (req, res) => {
    logger.info('Iniciando busca de documentos comprobatórios...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando documentos para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('documento_comprobatorio')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_criacao', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de documentos bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar documentos comprobatórios.', error);
        res.status(500).json({ message: 'Erro ao buscar documentos.' });
    }
};


/**
 * Atualiza um documento comprobatório.
 * Se um novo arquivo for enviado, ele substitui o antigo no Storage.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const updateDocumento = async (req, res) => {
    logger.info('Iniciando processo de atualização de documento...');
    const { id } = req.params;
    const instituicaoId = req.user.id;

    try {
        const { titulo, valor, tipo_documento } = req.body;
        let updateData = { titulo, valor: parseFloat(valor) };

        if (titulo !== undefined) updateData.titulo = titulo;
        if (valor !== undefined) updateData.valor = parseFloat(valor);
        if (tipo_documento !== undefined) updateData.tipo_documento = tipo_documento;

        // Se um novo arquivo foi enviado, a lógica é mais complexa.
        if (req.file) {
            logger.info(`Novo arquivo recebido para o documento ID: ${id}. Substituindo o antigo.`);
            
            // 1. Pega o caminho do arquivo antigo para deletar depois.
            const { data: docAntigo, error: fetchError } = await supabase
                .from('documento_comprobatorio')
                .select('caminho_arquivo')
                .match({ id: id, instituicao_id: instituicaoId })
                .single();
            
            if (fetchError || !docAntigo) {
                return res.status(404).json({ message: 'Documento não encontrado ou sem permissão.' });
            }
            const caminhoArquivoAntigo = docAntigo.caminho_arquivo;

            // 2. Faz upload do novo arquivo.
            const novoFilePath = `${instituicaoId}/${uuidv4()}-${req.file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('comprovantes')
                .upload(novoFilePath, req.file.buffer, { contentType: req.file.mimetype });

            if (uploadError) throw uploadError;
            logger.info(`Novo arquivo enviado para: ${novoFilePath}`);
            updateData.caminho_arquivo = novoFilePath;

            // 3. Deleta o arquivo antigo do Storage (depois que o novo já subiu).
            if (caminhoArquivoAntigo) {
                await supabase.storage.from('comprovantes').remove([caminhoArquivoAntigo]);
                logger.info(`Arquivo antigo (${caminhoArquivoAntigo}) deletado do Storage.`);
            }
        }
        
        // 4. Atualiza o registro no banco de dados.
        const { data, error } = await supabase
            .from('documento_comprobatorio')
            .update(updateData)
            .match({ id: id, instituicao_id: instituicaoId })
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            logger.warn(`Documento ID: ${id} não encontrado para atualização.`);
            return res.status(404).json({ message: 'Documento não encontrado ou sem permissão.' });
        }
        
        const updatedData = data[0];

        logger.info(`Documento ID: ${id} atualizado com sucesso.`);
        res.status(200).json({ message: 'Documento atualizado com sucesso!', data: updateData });

    } catch (error) {
        logger.error(`Erro ao atualizar documento ID: ${id}.`, error);
        res.status(500).json({ message: 'Erro interno ao atualizar documento.' });
    }
};

/**
 * Adiciona um novo documento comprobatório, incluindo o upload do arquivo.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const addDocumento = async (req, res) => {
    logger.info('Iniciando processo de adição de novo documento...');
    let filePath; // Variável para guardar o caminho do arquivo para possível rollback
    try {
        const instituicaoId = req.user.id;
        const { titulo, tipo_documento, valor } = req.body;
        logger.debug('Dados recebidos para novo documento:', { titulo, tipo_documento, valor });

        if (!req.file) {
            logger.warn('Tentativa de adicionar documento sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // 1. Upload do arquivo
        const file = req.file;
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de documento para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('comprovantes')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de documento realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados do documento no banco de dados...');
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

        if (insertError) throw insertError;

        logger.info('Documento adicionado com sucesso!', { id: data.id });
        res.status(201).json({ message: 'Documento adicionado com sucesso!', data });

    } catch (error) {
        logger.error('Erro no processo de adicionar documento.', error);
        
        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('comprovantes').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }

        res.status(500).json({ message: 'Erro ao adicionar documento.' });
    }
};


/**
 * Deleta um documento comprobatório e seu arquivo associado no Storage.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteDocumento = async (req, res) => {
    logger.info('Iniciando processo de exclusão de documento...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar documento ID: ${id}`);

        // 1. Busca o caminho do arquivo para garantir que o item existe
        const { data: doc, error: fetchError } = await supabase
            .from('documento_comprobatorio')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        // SE NÃO ACHOU, RETORNA 404 AQUI!
        if (fetchError || !doc) {
            logger.warn(`Documento ID: ${id} não encontrado para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Documento não encontrado ou você não tem permissão.' });
        }

        // 2. Deleta o registro do banco
        const { error: deleteDbError } = await supabase
            .from('documento_comprobatorio')
            .delete()
            .eq('id', id);
        if (deleteDbError) throw deleteDbError;
        logger.info(`Registro do documento ID: ${id} deletado do banco de dados.`);
        
        // 3. Deleta o arquivo do Storage
        const { error: deleteStorageError } = await supabase.storage
            .from('comprovantes')
            .remove([doc.caminho_arquivo]);
        if (deleteStorageError) {
            logger.warn(`Falha ao remover arquivo do Storage para documento ID: ${id}.`, deleteStorageError);
        }

        logger.info(`Documento ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Documento deletado com sucesso!' });
        
    } catch (error) {
        logger.error('Erro ao deletar documento.', error);
        res.status(500).json({ message: 'Erro ao deletar documento.' });
    }
}