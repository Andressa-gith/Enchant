import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js';

/**
 * Busca a lista de relatórios de doação já salvos para a instituição logada.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getRelatoriosSalvos = async (req, res) => {
    logger.info('Iniciando busca de relatórios salvos...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando relatórios para a instituição ID: ${instituicaoId}`);

        const { data: relatorios, error } = await supabase
            .from('relatorio_doacao')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_geracao', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de relatórios salvos bem-sucedida. ${relatorios.length} registros encontrados.`);
        res.status(200).json({ success: true, relatorios });
    } catch (error) {
        logger.error('Erro ao buscar relatórios salvos.', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar relatórios salvos.' });
    }
};

/**
 * Salva um novo registro de relatório gerado no banco de dados.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const adicionarRelatorio = async (req, res) => {
    logger.info('Iniciando salvamento de novo registro de relatório...');
    try {
        const instituicaoId = req.user.id;
        const { responsavel, data_inicio_filtro, data_fim_filtro, frequencia_filtro, categoria_filtro, caminho_arquivo_pdf } = req.body;
        
        logger.debug('Dados recebidos para salvar relatório:', { responsavel, data_inicio_filtro, data_fim_filtro, categoria_filtro, caminho_arquivo_pdf });

        if (!caminho_arquivo_pdf) {
            logger.warn('Tentativa de salvar relatório sem o caminho do arquivo PDF.');
            return res.status(400).json({ success: false, message: 'O caminho do arquivo PDF é obrigatório.'});
        }
        
        const { data: relatorioSalvo, error } = await supabase
            .from('relatorio_doacao')
            .insert({
                instituicao_id: instituicaoId,
                responsavel,
                data_inicio_filtro,
                data_fim_filtro,
                frequencia_filtro,
                categoria_filtro: categoria_filtro === 'Geral' ? null : categoria_filtro,
                caminho_arquivo_pdf
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`Registro de relatório ID: ${relatorioSalvo.id} salvo com sucesso.`);
        res.status(201).json({ success: true, message: 'Registro de relatório salvo!', relatorio: relatorioSalvo });
    } catch (error) {
        logger.error('Erro ao adicionar registro de relatório.', error);
        res.status(500).json({ success: false, message: 'Erro interno ao adicionar relatório.' });
    }
};

/**
 * Busca os dados brutos de doações (entradas e saídas) com base nos filtros para a geração de um PDF.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getDadosParaPDF = async (req, res) => {
    logger.info('Iniciando busca de dados para geração de relatório PDF...');
    try {
        const instituicaoId = req.user.id;
        const { data_inicio_filtro, data_fim_filtro, categoria_filtro } = req.query;
        logger.debug('Filtros recebidos para o PDF:', req.query);

        if (!data_inicio_filtro || !data_fim_filtro) {
            logger.warn('Tentativa de buscar dados para PDF sem datas de início e fim.');
            return res.status(400).json({ message: 'Datas de início e fim são obrigatórias.' });
        }
        
        const dataFimCompleta = `${data_fim_filtro}T23:59:59.999Z`;

        let queryEntradas = supabase.from('doacao_entrada').select('data_entrada, quantidade, detalhes, doador_origem_texto, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).gte('data_entrada', data_inicio_filtro).lte('data_entrada', dataFimCompleta);
        let querySaidas = supabase.from('doacao_saida').select('data_saida, quantidade_retirada, observacao, destinatario, entrada:doacao_entrada!inner(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).gte('data_saida', data_inicio_filtro).lte('data_saida', dataFimCompleta);
            
        if (categoria_filtro && categoria_filtro !== 'Geral') {
            logger.info(`Aplicando filtro de categoria: ${categoria_filtro}`);
            const { data: categoriaData, error: catError } = await supabase.from('categoria').select('id').eq('nome', categoria_filtro).single();
            if (catError) throw new Error("Categoria não encontrada para o filtro.");

            if (categoriaData) {
                queryEntradas = queryEntradas.eq('categoria_id', categoriaData.id);
                querySaidas = querySaidas.eq('entrada.categoria_id', categoriaData.id);
            }
        }

        const [{ data: entradas, error: erroEntradas }, { data: saidas, error: erroSaidas }] = await Promise.all([
            queryEntradas.order('data_entrada', { ascending: true }),
            querySaidas.order('data_saida', { ascending: true })
        ]);

        if (erroEntradas) throw erroEntradas;
        if (erroSaidas) throw erroSaidas;

        logger.info(`Dados para PDF encontrados: ${entradas.length} entradas, ${saidas.length} saídas.`);
        res.status(200).json({ success: true, entradas, saidas });

    } catch (error) {
        logger.error('Erro ao buscar dados para o relatório PDF.', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar dados para o relatório.' });
    }
};

/**
 * Deleta um registro de relatório do banco de dados.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deletarRelatorio = async (req, res) => {
    logger.info('Iniciando exclusão de registro de relatório...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar registro de relatório ID: ${id}`);

        const { error, count } = await supabase
            .from('relatorio_doacao')
            .delete({ count: 'exact' })
            .match({ id: id, instituicao_id: instituicaoId });

        if (error) throw error;
        
        if (count === 0) {
            logger.warn(`Registro de relatório ID: ${id} não encontrado para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ success: false, message: 'Relatório não encontrado ou sem permissão para excluí-lo.' });
        }
        
        logger.info(`Registro de relatório ID: ${id} deletado com sucesso.`);
        res.status(200).json({ success: true, message: 'Relatório deletado com sucesso.' });
    } catch (error) {
        logger.error('Erro ao deletar registro de relatório.', error);
        res.status(500).json({ success: false, message: 'Erro interno ao deletar relatório.' });
    }
};