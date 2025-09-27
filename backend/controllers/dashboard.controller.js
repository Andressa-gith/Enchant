// backend/controllers/dashboard.controller.js
import supabase from '../db/supabaseClient.js';

// Função auxiliar para definir a data de início do filtro
const getStartDate = (periodo) => {
    const hoje = new Date();
    if (periodo === 'ano') return new Date(hoje.getFullYear(), 0, 1).toISOString();
    if (periodo === '3meses') return new Date(new Date().setMonth(hoje.getMonth() - 3)).toISOString();
    // Padrão: 'mes'
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
};

export const getDashboardData = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { periodo = 'mes' } = req.query;
        const dataInicio = getStartDate(periodo);

        // --- BUSCAS PARALELAS NO BANCO ---
        const [
            { data: dadosInstituicao, error: erroInstituicao },
            { data: doacoesEntradas, error: erroEntradas },
            { data: doacoesSaidas, error: erroSaidas },
            { data: recibos, error: erroRecibos },
            { data: parcerias, error: erroParcerias },
            { data: transferencias, error: erroTransferencias },
            { data: gastosProprios, error: erroGastos }
        ] = await Promise.all([
            supabase.from('instituicao').select('nome').eq('id', instituicaoId).single(),
            supabase.from('doacao_entrada').select('quantidade, doador_origem_texto, data_entrada, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).gte('data_entrada', dataInicio),
            supabase.from('doacao_saida').select('quantidade_retirada, destinatario, data_saida, entrada:entrada_id(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).gte('data_saida', dataInicio),
            supabase.from('documento_comprobatorio').select('valor').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Recibo de doação').gte('data_criacao', dataInicio),
            supabase.from('parceiro').select('valor_total_parceria, status, data_fim').eq('instituicao_id', instituicaoId).gte('data_inicio', dataInicio),
            supabase.from('documento_comprobatorio').select('valor').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Comprovante de transferência').gte('data_criacao', dataInicio),
            supabase.from('gestao_financeira').select('valor_executado').eq('instituicao_id', instituicaoId).eq('origem_recurso', 'Recursos Próprios').gte('data_criacao', dataInicio)
        ]);
        
        const anyError = erroInstituicao || erroEntradas || erroSaidas || erroRecibos || erroParcerias || erroTransferencias || erroGastos;
        if (anyError) {
            console.error("Erro Supabase:", anyError);
            throw new Error(anyError.message);
        }

        // --- CÁLCULO DOS ITENS FÍSICOS (ESTOQUE) ---
        const totaisEntradaPorCategoria = doacoesEntradas.reduce((acc, item) => {
            const nomeCat = item.categoria.nome;
            acc[nomeCat] = (acc[nomeCat] || 0) + Number(item.quantidade);
            return acc;
        }, {});
        const totaisSaidaPorCategoria = doacoesSaidas.reduce((acc, item) => {
            if (item.entrada && item.entrada.categoria) {
                const nomeCat = item.entrada.categoria.nome;
                acc[nomeCat] = (acc[nomeCat] || 0) + Number(item.quantidade_retirada);
            }
            return acc;
        }, {});
        const estoqueAtualPorCategoria = {};
        const todasCategorias = new Set([...Object.keys(totaisEntradaPorCategoria), ...Object.keys(totaisSaidaPorCategoria)]);
        todasCategorias.forEach(cat => {
            const entradas = totaisEntradaPorCategoria[cat] || 0;
            const saidas = totaisSaidaPorCategoria[cat] || 0;
            estoqueAtualPorCategoria[cat] = entradas - saidas;
        });

        // --- CÁLCULO DOS KPIs ATUALIZADO ---
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const parceriasAtivasValidas = parcerias.filter(p => {
            const dataFim = p.data_fim ? new Date(p.data_fim) : null;
            const expirada = dataFim && dataFim < hoje;
            return p.status === 'Ativo' && !expirada;
        });

        const totalReceitasRecibos = recibos.reduce((acc, item) => acc + Number(item.valor), 0);
        const totalReceitasParcerias = parceriasAtivasValidas.reduce((acc, item) => acc + Number(item.valor_total_parceria), 0);
        const totalDespesasTransferencias = transferencias.reduce((acc, item) => acc + Number(item.valor), 0);
        const totalDespesasGastosProprios = gastosProprios.reduce((acc, item) => acc + Number(item.valor_executado), 0);
        const saldoFinanceiro = (totalReceitasRecibos + totalReceitasParcerias) - (totalDespesasTransferencias + totalDespesasGastosProprios);

        const kpis = {
            totalItensEstoque: Object.values(estoqueAtualPorCategoria).reduce((acc, val) => acc + val, 0),
            totalFinanceiro: saldoFinanceiro,
            doadoresUnicos: new Set(doacoesEntradas.map(d => d.doador_origem_texto).filter(d => d && d.toLowerCase() !== 'anônimo')).size,
            principalCategoria: Object.keys(totaisEntradaPorCategoria).length > 0
                ? Object.keys(totaisEntradaPorCategoria).reduce((a, b) => totaisEntradaPorCategoria[a] > totaisEntradaPorCategoria[b] ? a : b)
                : '--',
        };

        // --- ATIVIDADES RECENTES (ENTRADAS E SAÍDAS) ---
        const atividadesEntrada = doacoesEntradas.map(item => ({
            tipo: 'entrada',
            descricao: `<b>${item.quantidade}</b> de <b>${item.categoria.nome}</b> recebido de <i>${item.doador_origem_texto}</i>`,
            data: new Date(item.data_entrada)
        }));
        const atividadesSaida = doacoesSaidas.map(item => ({
            tipo: 'saida',
            descricao: `<b>${item.quantidade_retirada}</b> de <b>${item.entrada.categoria.nome}</b> retirado para <i>${item.destinatario || 'Não informado'}</i>`,
            data: new Date(item.data_saida)
        }));
        const atividadesRecentes = [...atividadesEntrada, ...atividadesSaida]
            .sort((a, b) => b.data - a.data)
            .slice(0, 7);

        // --- MONTA A RESPOSTA FINAL ---
        const responseData = {
            boasVindas: dadosInstituicao.nome,
            kpis,
            totaisPorCategoria: estoqueAtualPorCategoria,
            graficos: {
                estoqueAtual: {
                    labels: Object.keys(estoqueAtualPorCategoria),
                    data: Object.values(estoqueAtualPorCategoria)
                },
                fluxoDoacoes: {
                    labels: Array.from(todasCategorias),
                    datasets: [
                        { label: 'Entradas', data: Array.from(todasCategorias).map(cat => totaisEntradaPorCategoria[cat] || 0) },
                        { label: 'Saídas', data: Array.from(todasCategorias).map(cat => totaisSaidaPorCategoria[cat] || 0) }
                    ]
                }
            },
            atividades: atividadesRecentes
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("❌ Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao buscar dados do dashboard." });
    }
};