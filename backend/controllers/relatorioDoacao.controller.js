import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import stream from 'stream';

// Função para buscar relatórios já gerados
export const getRelatoriosGerados = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { data, error } = await supabase
            .from('relatorio_doacao')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_geracao', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar relatórios.', error: error.message });
    }
};

// Função principal para GERAR um novo relatório
export const gerarRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { responsavel, data_inicio_filtro, data_fim_filtro, frequencia_filtro, categoria_filtro } = req.body;
        
        // 1. Buscar dados de entrada e saída com base nos filtros
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
            // Busca o ID da categoria pelo nome para usar no filtro
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

        // 2. Gerar o PDF em memória
        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- Conteúdo do PDF ---
            doc.fontSize(20).text('Relatório de Doações', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Gerado por: ${responsavel}`);
            doc.text(`Período: ${new Date(data_inicio_filtro).toLocaleDateString('pt-BR')} a ${new Date(data_fim_filtro).toLocaleDateString('pt-BR')}`);
            doc.text(`Data de Geração: ${new Date().toLocaleString('pt-BR')}`);
            doc.moveDown(2);

            // Resumo
            const totalArrecadado = entradas.reduce((sum, item) => sum + item.quantidade, 0);
            const totalDistribuido = saidas.reduce((sum, item) => sum + item.quantidade_retirada, 0);
            doc.fontSize(16).text('Resumo Geral', { underline: true });
            doc.moveDown();
            doc.fontSize(12).text(`Total de Itens Arrecadados: ${totalArrecadado}`);
            doc.text(`Total de Itens Distribuídos: ${totalDistribuido}`);
            doc.text(`Saldo em Estoque (no período): ${totalArrecadado - totalDistribuido}`);
            doc.moveDown(2);

            // Tabela de Entradas
            doc.fontSize(14).text('Detalhes das Entradas', { underline: true });
            doc.moveDown();
            entradas.forEach(e => {
                doc.fontSize(10).text(`${new Date(e.data_entrada).toLocaleDateString('pt-BR')} - ${e.categoria.nome} - Qtd: ${e.quantidade} - Doador: ${e.doador_origem_texto}`);
            });
            doc.moveDown(2);

            // Tabela de Saídas
            doc.fontSize(14).text('Detalhes das Saídas', { underline: true });
            doc.moveDown();
            saidas.forEach(s => {
                doc.fontSize(10).text(`${new Date(s.data_saida).toLocaleDateString('pt-BR')} - ${s.entrada.categoria.nome} - Qtd: ${s.quantidade_retirada} - Destinatário: ${s.destinatario}`);
            });

            doc.end();
        });

        // 3. Salvar o PDF no Supabase Storage
        const filePath = `${instituicaoId}/${uuidv4()}.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('donation_report')
            .upload(filePath, pdfBuffer, { contentType: 'application/pdf' });
            
        if (uploadError) throw uploadError;

        // 4. Salvar o registro do relatório no banco de dados
        const { data: relatorioData, error: insertError } = await supabase
            .from('relatorio_doacao')
            .insert({
                instituicao_id: instituicaoId,
                responsavel, data_inicio_filtro, data_fim_filtro,
                frequencia_filtro, categoria_filtro,
                caminho_arquivo_pdf: filePath
            }).select().single();

        if (insertError) {
            await supabase.storage.from('donation_report').remove([filePath]); // Limpa em caso de erro
            throw insertError;
        }

        res.status(201).json({ message: 'Relatório gerado com sucesso!', data: relatorioData });

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ message: 'Erro interno ao gerar relatório.', error: error.message });
    }
};