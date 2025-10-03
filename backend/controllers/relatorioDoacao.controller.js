import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import logger from '../utils/logger.js';

/**
 * Busca a lista de relatórios de doação que já foram gerados e salvos.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getRelatoriosGerados = async (req, res) => {
    logger.info('Iniciando busca de relatórios gerados...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando relatórios para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('relatorio_doacao')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_geracao', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de relatórios gerados bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar relatórios gerados.', error);
        res.status(500).json({ message: 'Erro ao buscar relatórios.' });
    }
};

/**
 * Gera um relatório de doações em PDF com base nos filtros, salva no Storage e registra no banco.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const gerarRelatorio = async (req, res) => {
    logger.info('Iniciando processo de geração de relatório PDF...');
    let filePath; // Para rollback do arquivo
    try {
        const instituicaoId = req.user.id;
        const { responsavel, data_inicio_filtro, data_fim_filtro, frequencia_filtro, categoria_filtro } = req.body;
        logger.debug('Filtros recebidos para geração do relatório:', { responsavel, data_inicio_filtro, data_fim_filtro, categoria_filtro });

        // 1. Buscar dados de entrada e saída
        logger.info('Buscando dados de entradas e saídas no banco...');
        let queryEntrada = supabase.from('doacao_entrada').select('*, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId);
        let querySaida = supabase.from('doacao_saida').select('*, entrada:doacao_entrada!inner(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId);
        
        if (data_inicio_filtro) {
            queryEntrada = queryEntrada.gte('data_entrada', data_inicio_filtro);
            querySaida = querySaida.gte('data_saida', data_inicio_filtro);
        }
        if (data_fim_filtro) {
            queryEntrada = queryEntrada.lte('data_entrada', data_fim_filtro);
            querySaida = querySaida.lte('data_saida', data_fim_filtro);
        }
        if (categoria_filtro && categoria_filtro !== 'Geral') {
            logger.info(`Aplicando filtro de categoria: ${categoria_filtro}`);
            const { data: categoria, error: erroCategoria } = await supabase.from('categoria').select('id').eq('nome', categoria_filtro).single();
            if (erroCategoria) throw new Error('Categoria do filtro não encontrada.');
            
            if (categoria) {
                queryEntrada = queryEntrada.eq('categoria_id', categoria.id);
                querySaida = querySaida.eq('entrada.categoria_id', categoria.id);
            }
        }
        
        const { data: entradas, error: erroEntrada } = await queryEntrada;
        const { data: saidas, error: erroSaida } = await querySaida;

        if (erroEntrada || erroSaida) throw (erroEntrada || erroSaida);
        logger.info(`Dados encontrados: ${entradas.length} entradas, ${saidas.length} saídas.`);

        // 2. Gerar o PDF em memória
        logger.info('Iniciando geração do PDF em memória...');
        const pdfBuffer = await new Promise((resolve) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Conteúdo do PDF (lógica original mantida)
            doc.fontSize(20).text('Relatório de Doações', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Gerado por: ${responsavel}`);
            doc.text(`Período: ${new Date(data_inicio_filtro).toLocaleDateString('pt-BR')} a ${new Date(data_fim_filtro).toLocaleDateString('pt-BR')}`);
            doc.text(`Data de Geração: ${new Date().toLocaleString('pt-BR')}`);
            doc.moveDown(2);
            const totalArrecadado = entradas.reduce((sum, item) => sum + item.quantidade, 0);
            const totalDistribuido = saidas.reduce((sum, item) => sum + item.quantidade_retirada, 0);
            doc.fontSize(16).text('Resumo Geral', { underline: true });
            doc.moveDown();
            doc.fontSize(12).text(`Total de Itens Arrecadados: ${totalArrecadado}`);
            doc.text(`Total de Itens Distribuídos: ${totalDistribuido}`);
            doc.text(`Saldo em Estoque (no período): ${totalArrecadado - totalDistribuido}`);
            doc.moveDown(2);
            doc.fontSize(14).text('Detalhes das Entradas', { underline: true });
            doc.moveDown();
            entradas.forEach(e => { doc.fontSize(10).text(`${new Date(e.data_entrada).toLocaleDateString('pt-BR')} - ${e.categoria.nome} - Qtd: ${e.quantidade} - Doador: ${e.doador_origem_texto}`); });
            doc.moveDown(2);
            doc.fontSize(14).text('Detalhes das Saídas', { underline: true });
            doc.moveDown();
            saidas.forEach(s => { doc.fontSize(10).text(`${new Date(s.data_saida).toLocaleDateString('pt-BR')} - ${s.entrada.categoria.nome} - Qtd: ${s.quantidade_retirada} - Destinatário: ${s.destinatario}`); });
            doc.end();
        });
        logger.info('PDF gerado em memória com sucesso.');

        // 3. Salvar o PDF no Supabase Storage
        filePath = `${instituicaoId}/${uuidv4()}.pdf`;
        logger.info(`Fazendo upload do PDF para o Storage em: ${filePath}`);
        const { error: uploadError } = await supabase.storage
            .from('donation_report')
            .upload(filePath, pdfBuffer, { contentType: 'application/pdf' });
            
        if (uploadError) throw uploadError;
        logger.info('Upload para o Storage concluído.');

        // 4. Salvar o registro do relatório no banco de dados
        logger.info('Salvando registro do relatório no banco de dados...');
        const { data: relatorioData, error: insertError } = await supabase
            .from('relatorio_doacao')
            .insert({
                instituicao_id: instituicaoId,
                responsavel, data_inicio_filtro, data_fim_filtro,
                frequencia_filtro, categoria_filtro,
                caminho_arquivo_pdf: filePath
            }).select().single();

        if (insertError) throw insertError;

        logger.info(`Relatório ID: ${relatorioData.id} gerado e salvo com sucesso.`);
        res.status(201).json({ message: 'Relatório gerado com sucesso!', data: relatorioData });

    } catch (error) {
        logger.error('Erro ao gerar relatório.', error);

        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo PDF: ${filePath}`);
            await supabase.storage.from('donation_report').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }

        res.status(500).json({ message: 'Erro interno ao gerar relatório.' });
    }
};