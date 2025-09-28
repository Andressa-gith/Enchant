import supabase from '../db/supabaseClient.js';

/**
 * Busca a lista de relatórios já salvos para exibir na tabela.
 */
export const getRelatoriosSalvos = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { data: relatorios, error } = await supabase
            .from('relatorio_doacao')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_geracao', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, relatorios });
    } catch (error) {
        console.error('❌ Erro ao buscar relatórios salvos:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar relatórios salvos.' });
    }
};

/**
 * Salva um novo registro de relatório na tabela.
 * AGORA ELE RECEBE o caminho do PDF que foi salvo no Storage.
 */
export const adicionarRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { 
            responsavel, 
            data_inicio_filtro, 
            data_fim_filtro, 
            frequencia_filtro, 
            categoria_filtro,
            caminho_arquivo_pdf // <-- CAMPO RECEBIDO DO FRONTEND
        } = req.body;

        if (!caminho_arquivo_pdf) {
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
                caminho_arquivo_pdf // Salva o caminho real do arquivo no bucket
            })
            .select()
            .single();

        if (error) {
            console.error("Erro do Supabase ao inserir relatório:", error);
            throw error;
        };
        res.status(201).json({ success: true, message: 'Registro de relatório salvo!', relatorio: relatorioSalvo });
    } catch (error) {
        console.error('❌ Erro ao adicionar relatório:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao adicionar relatório.' });
    }
};

/**
 * Busca todos os dados brutos de entradas e saídas para o frontend gerar o PDF.
 */
export const getDadosParaPDF = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { data_inicio_filtro, data_fim_filtro, categoria_filtro } = req.query;

        if (!data_inicio_filtro || !data_fim_filtro) {
            return res.status(400).json({ message: 'Datas de início e fim são obrigatórias.' });
        }
        
        const dataFimCompleta = `${data_fim_filtro}T23:59:59.999Z`;

        let queryEntradas = supabase.from('doacao_entrada').select('data_entrada, quantidade, detalhes, doador_origem_texto, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).gte('data_entrada', data_inicio_filtro).lte('data_entrada', dataFimCompleta);
        let querySaidas = supabase.from('doacao_saida').select('data_saida, quantidade_retirada, observacao, destinatario, entrada:doacao_entrada!inner(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).gte('data_saida', data_inicio_filtro).lte('data_saida', dataFimCompleta);
            
        // CORREÇÃO DA LÓGICA DE FILTRO DE CATEGORIA
        if (categoria_filtro && categoria_filtro !== 'Geral') {
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

        res.status(200).json({ success: true, entradas, saidas });

    } catch (error) {
        console.error('❌ Erro ao buscar dados para o relatório PDF:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar dados para o relatório.' });
    }
};

export const deletarRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('relatorio_doacao')
            .delete()
            .match({ id: id, instituicao_id: instituicaoId }); // Garante que só delete o que pertence à instituição

        if (error) throw error;

        res.status(200).json({ success: true, message: 'Relatório deletado com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao deletar relatório:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao deletar relatório.' });
    }
};
