// backend/controllers/dashboard.controller.js
import supabase from '../db/supabaseClient.js';

const getStartOfDay = (dateStr) => new Date(dateStr).toISOString();
const getEndOfDay = (dateStr) => new Date(`${dateStr}T23:59:59.999Z`).toISOString();

export const getDashboardData = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const hoje = new Date();
        const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        const { 
            startDate = primeiroDiaDoMes.toISOString().split('T')[0], 
            endDate = hoje.toISOString().split('T')[0] 
        } = req.query;

        const dataInicio = getStartOfDay(startDate);
        const dataFim = getEndOfDay(endDate);

        // --- BUSCAS PARALELAS NO BANCO ---
        const [
            { data: dadosInstituicao, error: e1 }, { data: entradasNoPeriodo, error: e2 }, 
            { data: saidasNoPeriodo, error: e3 }, { data: recibos, error: e4 }, 
            { data: transferencias, error: e5 }, { data: gastosProprios, error: e6 },
            { data: parcerias, error: e7 },
            // CORREÇÃO: Buscas para o estoque agora usam a DATA FINAL do filtro
            { data: todasEntradasAteDataFim, error: e8 },
            { data: todasSaidasAteDataFim, error: e9 }
        ] = await Promise.all([
            supabase.from('instituicao').select('nome').eq('id', instituicaoId).single(),
            supabase.from('doacao_entrada').select('quantidade, doador_origem_texto, data_entrada, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).gte('data_entrada', dataInicio).lte('data_entrada', dataFim),
            supabase.from('doacao_saida').select('quantidade_retirada, destinatario, data_saida, entrada:entrada_id(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).gte('data_saida', dataInicio).lte('data_saida', dataFim),
            supabase.from('documento_comprobatorio').select('valor, titulo, data_criacao').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Recibo de doação').gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('documento_comprobatorio').select('valor, titulo, data_criacao').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Comprovante de transferência').gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('gestao_financeira').select('valor_executado, nome_categoria, data_criacao').eq('instituicao_id', instituicaoId).eq('origem_recurso', 'Recursos Próprios').gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('parceiro').select('valor_total_parceria, nome, data_inicio, status, data_fim').eq('instituicao_id', instituicaoId).gte('data_inicio', dataInicio).lte('data_inicio', dataFim),
            supabase.from('doacao_entrada').select('quantidade, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).lte('data_entrada', dataFim),
            supabase.from('doacao_saida').select('quantidade_retirada, entrada:entrada_id(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).lte('data_saida', dataFim)
        ]);

        const anyError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9;
        if (anyError) throw anyError;

        // --- CÁLCULO DE ESTOQUE CORRIGIDO ---
        const totaisEntradaGeral = todasEntradasAteDataFim.reduce((acc, item) => { const n = item.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade); return acc; }, {});
        const totaisSaidaGeral = todasSaidasAteDataFim.reduce((acc, item) => { if (item.entrada?.categoria) { const n = item.entrada.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade_retirada); } return acc; }, {});
        const estoqueNoPeriodoPorCategoria = {};
        new Set([...Object.keys(totaisEntradaGeral), ...Object.keys(totaisSaidaGeral)]).forEach(cat => { estoqueNoPeriodoPorCategoria[cat] = (totaisEntradaGeral[cat] || 0) - (totaisSaidaGeral[cat] || 0); });

        // --- CÁLCULO FINANCEIRO E KPIs ---
        const parceriasAtivasValidas = parcerias.filter(p => { const df = p.data_fim ? new Date(p.data_fim) : null; return p.status === 'Ativo' && (!df || df >= hoje); });
        const totalReceitasRecibos = recibos.reduce((acc, item) => acc + Number(item.valor), 0);
        const totalReceitasParcerias = parceriasAtivasValidas.reduce((acc, item) => acc + Number(item.valor_total_parceria), 0);
        const totalDespesasTransferencias = transferencias.reduce((acc, item) => acc + Number(item.valor), 0);
        const totalDespesasGastosProprios = gastosProprios.reduce((acc, item) => acc + Number(item.valor_executado), 0);
        const saldoFinanceiro = (totalReceitasRecibos + totalReceitasParcerias) - (totalDespesasTransferencias + totalDespesasGastosProprios);
        
        const totaisEntradaPeriodo = entradasNoPeriodo.reduce((acc, item) => { const n = item.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade); return acc; }, {});
        const kpis = {
            totalItensEstoque: Object.values(estoqueNoPeriodoPorCategoria).reduce((acc, val) => acc + val, 0),
            totalFinanceiro: saldoFinanceiro,
            doadoresUnicos: new Set(entradasNoPeriodo.map(d => d.doador_origem_texto).filter(d => d && d.toLowerCase() !== 'anônimo')).size,
            principalCategoria: Object.keys(totaisEntradaPeriodo).length > 0 ? Object.keys(totaisEntradaPeriodo).reduce((a, b) => totaisEntradaPeriodo[a] > totaisEntradaPeriodo[b] ? a : b) : '--',
        };

        // --- TIMELINE DE ATIVIDADES ---
        const atividades = [
            ...entradasNoPeriodo.map(i => ({ data: new Date(i.data_entrada), tipo: 'entrada', desc: `Doação recebida de <b>${i.doador_origem_texto}</b>` })),
            ...saidasNoPeriodo.map(i => ({ data: new Date(i.data_saida), tipo: 'saida', desc: `Doação retirada para <b>${i.destinatario || 'beneficiário'}</b>` })),
            ...recibos.map(i => ({ data: new Date(i.data_criacao), tipo: 'entrada-financeira', desc: `Recibo de doação emitido por <b>${i.titulo}</b>` })),
            ...transferencias.map(i => ({ data: new Date(i.data_criacao), tipo: 'saida-financeira', desc: `Transferência realizada para <b>${i.titulo}</b>` })),
            ...gastosProprios.map(i => ({ data: new Date(i.data_criacao), tipo: 'saida-financeira', desc: `Gasto com recursos próprios: <b>${i.nome_categoria}</b>` })),
            ...parcerias.map(i => ({ data: new Date(i.data_inicio), tipo: 'parceria', desc: `Nova parceria registrada com <b>${i.nome}</b>` })),
        ].sort((a, b) => b.data - a.data).slice(0, 7);

        // --- MONTA A RESPOSTA FINAL ---
        const totaisSaidaPeriodo = saidasNoPeriodo.reduce((acc, item) => { if (item.entrada?.categoria) { const n = item.entrada.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade_retirada); } return acc; }, {});
        const todasCategoriasPeriodo = new Set([...Object.keys(totaisEntradaPeriodo), ...Object.keys(totaisSaidaPeriodo)]);
        const responseData = {
            boasVindas: dadosInstituicao.nome, kpis, totaisPorCategoria: estoqueNoPeriodoPorCategoria,
            graficos: {
                estoqueAtual: { labels: Object.keys(estoqueNoPeriodoPorCategoria), data: Object.values(estoqueNoPeriodoPorCategoria) },
                fluxoDoacoes: {
                    labels: Array.from(todasCategoriasPeriodo),
                    datasets: [ { label: 'Entradas', data: Array.from(todasCategoriasPeriodo).map(cat => totaisEntradaPeriodo[cat] || 0) }, { label: 'Saídas', data: Array.from(todasCategoriasPeriodo).map(cat => totaisSaidaPeriodo[cat] || 0) } ]
                }
            },
            atividades
        };
        res.status(200).json(responseData);
    } catch (error) {
        console.error("❌ Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao buscar dados do dashboard." });
    }
};