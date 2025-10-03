// backend/controllers/dashboard.controller.js
import supabase from '../db/supabaseClient.js';

const getStartOfDay = (dateStr) => new Date(dateStr).toISOString();
const getEndOfDay = (dateStr) => new Date(`${dateStr}T23:59:59.999Z`).toISOString();

export const getDashboardData = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        const { 
            startDate = primeiroDiaDoMes.toISOString().split('T')[0], 
            endDate = hoje.toISOString().split('T')[0] 
        } = req.query;

        const dataInicio = getStartOfDay(startDate);
        const dataFim = getEndOfDay(endDate);

        const [
            { data: dadosInstituicao }, { data: entradasNoPeriodo }, { data: saidasNoPeriodo },
            { data: recibos }, { data: transferencias }, { data: gastosProprios },
            { data: parceriasNoPeriodo }, { data: todasEntradasAteDataFim }, { data: todasSaidasAteDataFim },
            { data: relatoriosRecentes }, { data: todasParcerias }
        ] = await Promise.all([
            supabase.from('instituicao').select('nome, primeiro_login').eq('id', instituicaoId).single(),
            supabase.from('doacao_entrada').select('quantidade, doador_origem_texto, data_entrada, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).gte('data_entrada', dataInicio).lte('data_entrada', dataFim),
            supabase.from('doacao_saida').select('quantidade_retirada, destinatario, data_saida, entrada:entrada_id(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).gte('data_saida', dataInicio).lte('data_saida', dataFim),
            supabase.from('documento_comprobatorio').select('valor, titulo, data_criacao').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Recibo de doação').gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('documento_comprobatorio').select('valor, titulo, data_criacao').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Comprovante de transferência').gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('gestao_financeira').select('valor_executado, nome_categoria, data_criacao').eq('instituicao_id', instituicaoId).eq('origem_recurso', 'Recursos Próprios').gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('parceiro').select('valor_total_parceria, nome, data_inicio, status, data_fim, data_criacao').eq('instituicao_id', instituicaoId).gte('data_criacao', dataInicio).lte('data_criacao', dataFim),
            supabase.from('doacao_entrada').select('quantidade, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId).lte('data_entrada', dataFim),
            supabase.from('doacao_saida').select('quantidade_retirada, entrada:entrada_id(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId).lte('data_saida', dataFim),
            supabase.from('relatorio_doacao').select('id, data_geracao, caminho_arquivo_pdf, data_inicio_filtro, data_fim_filtro').eq('instituicao_id', instituicaoId).order('data_geracao', { ascending: false }).limit(3),
            supabase.from('parceiro').select('nome, status, data_fim').eq('instituicao_id', instituicaoId)
        ]);
        
        const anyError = [dadosInstituicao, entradasNoPeriodo, saidasNoPeriodo, recibos, transferencias, gastosProprios, parceriasNoPeriodo, todasEntradasAteDataFim, todasSaidasAteDataFim, relatoriosRecentes, todasParcerias].find(result => result && result.error);
        if (anyError) throw anyError.error;

        const estoqueNoPeriodoPorCategoria = {};
        const totaisEntradaGeral = todasEntradasAteDataFim.reduce((acc, item) => { const n = item.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade); return acc; }, {});
        const totaisSaidaGeral = todasSaidasAteDataFim.reduce((acc, item) => { if (item.entrada?.categoria) { const n = item.entrada.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade_retirada); } return acc; }, {});
        new Set([...Object.keys(totaisEntradaGeral), ...Object.keys(totaisSaidaGeral)]).forEach(cat => { estoqueNoPeriodoPorCategoria[cat] = (totaisEntradaGeral[cat] || 0) - (totaisSaidaGeral[cat] || 0); });

        const parceriasAtivasValidas = parceriasNoPeriodo.filter(p => { const df = p.data_fim ? new Date(p.data_fim) : null; return p.status === 'Ativo' && (!df || df >= hoje); });
        const totalReceitasRecibos = recibos.reduce((acc, item) => acc + Number(item.valor), 0);
        const totalReceitasParcerias = parceriasAtivasValidas.reduce((acc, item) => acc + Number(item.valor_total_parceria), 0);
        const totalDespesasTransferencias = transferencias.reduce((acc, item) => acc + Number(item.valor), 0);
        const totalDespesasGastosProprios = gastosProprios.reduce((acc, item) => acc + Number(item.valor_executado), 0);
        const saldoFinanceiro = (totalReceitasRecibos + totalReceitasParcerias) - (totalDespesasTransferencias + totalDespesasGastosProprios);
        
        const totaisEntradaPeriodo = entradasNoPeriodo.reduce((acc, item) => { const n = item.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade); return acc; }, {});
        
        let principalCategoria = '--';
        if (Object.keys(totaisEntradaPeriodo).length > 0) {
            const maxVal = Math.max(...Object.values(totaisEntradaPeriodo));
            const topCategorias = Object.keys(totaisEntradaPeriodo).filter(key => totaisEntradaPeriodo[key] === maxVal);
            if (topCategorias.length === 1) {
                principalCategoria = topCategorias[0];
            }
        }
        
        const kpis = {
            totalItensEstoque: Object.values(estoqueNoPeriodoPorCategoria).reduce((acc, val) => acc + val, 0),
            totalFinanceiro: saldoFinanceiro,
            doadoresUnicos: new Set(entradasNoPeriodo.map(d => d.doador_origem_texto).filter(d => d && d.toLowerCase() !== 'anônimo')).size,
            principalCategoria: principalCategoria,
        };

        const atividades = [
            ...entradasNoPeriodo.map(i => ({ data: new Date(i.data_entrada), tipo: 'entrada', desc: `Doação recebida de <b>${i.doador_origem_texto}</b>` })),
            ...saidasNoPeriodo.map(i => ({ data: new Date(i.data_saida), tipo: 'saida', desc: `Doação retirada para <b>${i.destinatario || 'beneficiário'}</b>` })),
            ...recibos.map(i => ({ data: new Date(i.data_criacao), tipo: 'entrada-financeira', desc: `Recibo de doação emitido: <b>${i.titulo}</b>` })),
            ...transferencias.map(i => ({ data: new Date(i.data_criacao), tipo: 'saida-financeira', desc: `Transferência realizada para <b>${i.titulo}</b>` })),
            ...gastosProprios.map(i => ({ data: new Date(i.data_criacao), tipo: 'saida-financeira', desc: `Gasto com recursos próprios: <b>${i.nome_categoria}</b>` })),
            ...parceriasNoPeriodo.map(i => ({ data: new Date(i.data_criacao), tipo: 'parceria', desc: `Nova parceria firmada com <b>${i.nome}</b>` })),
        ].sort((a, b) => b.data - a.data);

        // ===== LÓGICA DE ALERTAS ATUALIZADA =====
        const parceriasAExpirar = todasParcerias.filter(p => {
            if (p.status !== 'Ativo' || !p.data_fim) return false;
            const dataFimParceria = new Date(p.data_fim);
            const diffDias = (dataFimParceria - hoje) / (1000 * 60 * 60 * 24);
            return diffDias >= 0 && diffDias <= 30;
        });
        
        const parceriasExpiradas = todasParcerias.filter(p => {
            if (p.status !== 'Ativo' || !p.data_fim) return false;
            const dataFimParceria = new Date(p.data_fim);
            return dataFimParceria < hoje;
        });

        const estoqueBaixo = Object.entries(estoqueNoPeriodoPorCategoria).filter(([_, qtd]) => qtd > 0 && qtd <= 10).map(([cat, _]) => cat);
        // ==========================================
        
        const fluxoFinanceiroDiario = {};
        const d1 = new Date(startDate);
        const d2 = new Date(endDate);
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
            fluxoFinanceiroDiario[d.toISOString().split('T')[0]] = { receita: 0, despesa: 0 };
        }
        
        [...recibos, ...parceriasAtivasValidas].forEach(item => {
            const data = new Date(item.data_criacao || item.data_inicio).toISOString().split('T')[0];
            if (fluxoFinanceiroDiario[data]) {
                fluxoFinanceiroDiario[data].receita += Number(item.valor || item.valor_total_parceria);
            }
        });
        [...transferencias, ...gastosProprios].forEach(item => {
            const data = new Date(item.data_criacao).toISOString().split('T')[0];
            if (fluxoFinanceiroDiario[data]) {
                fluxoFinanceiroDiario[data].despesa += Number(item.valor || item.valor_executado);
            }
        });

        const totaisSaidaPeriodo = saidasNoPeriodo.reduce((acc, item) => { if (item.entrada?.categoria) { const n = item.entrada.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade_retirada); } return acc; }, {});
        const todasCategoriasPeriodo = new Set([...Object.keys(totaisEntradaPeriodo), ...Object.keys(totaisSaidaPeriodo)]);
        
        const responseData = {
            primeiro_login: dadosInstituicao.primeiro_login,
            boasVindas: dadosInstituicao.nome, kpis, totaisPorCategoria: estoqueNoPeriodoPorCategoria,
            graficos: {
                estoqueAtual: { labels: Object.keys(estoqueNoPeriodoPorCategoria), data: Object.values(estoqueNoPeriodoPorCategoria) },
                fluxoDoacoes: {
                    labels: Array.from(todasCategoriasPeriodo),
                    datasets: [ { label: 'Entradas', data: Array.from(todasCategoriasPeriodo).map(cat => totaisEntradaPeriodo[cat] || 0) }, { label: 'Saídas', data: Array.from(todasCategoriasPeriodo).map(cat => totaisSaidaPeriodo[cat] || 0) } ]
                },
                fluxoFinanceiro: {
                    labels: Object.keys(fluxoFinanceiroDiario),
                    datasets: [
                        { label: 'Receitas', data: Object.values(fluxoFinanceiroDiario).map(v => v.receita) },
                        { label: 'Despesas', data: Object.values(fluxoFinanceiroDiario).map(v => v.despesa) }
                    ]
                }
            },
            atividades, relatoriosRecentes, 
            alertas: { parceriasAExpirar, parceriasExpiradas, estoqueBaixo } // Objeto de alertas atualizado
        };
        res.status(200).json(responseData);
    } catch (error) {
        console.error("❌ Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao buscar dados do dashboard." });
    }
};

export const getAllActivities = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const [
            { data: entradas }, { data: saidas }, { data: recibos },
            { data: transferencias }, { data: gastosProprios }, { data: parcerias }
        ] = await Promise.all([
            supabase.from('doacao_entrada').select('doador_origem_texto, data_entrada').eq('instituicao_id', instituicaoId),
            supabase.from('doacao_saida').select('destinatario, data_saida').eq('instituicao_id', instituicaoId),
            supabase.from('documento_comprobatorio').select('titulo, data_criacao').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Recibo de doação'),
            supabase.from('documento_comprobatorio').select('titulo, data_criacao').eq('instituicao_id', instituicaoId).eq('tipo_documento', 'Comprovante de transferência'),
            supabase.from('gestao_financeira').select('nome_categoria, data_criacao').eq('instituicao_id', instituicaoId).eq('origem_recurso', 'Recursos Próprios'),
            supabase.from('parceiro').select('nome, data_criacao').eq('instituicao_id', instituicaoId)
        ]);
        const todasAtividades = [
            ...(entradas || []).map(i => ({ data: new Date(i.data_entrada), tipo: 'entrada', desc: `Doação recebida de <b>${i.doador_origem_texto}</b>` })),
            ...(saidas || []).map(i => ({ data: new Date(i.data_saida), tipo: 'saida', desc: `Doação retirada para <b>${i.destinatario || 'beneficiário'}</b>` })),
            ...(recibos || []).map(i => ({ data: new Date(i.data_criacao), tipo: 'entrada-financeira', desc: `Recibo de doação emitido: <b>${i.titulo}</b>` })),
            ...(transferencias || []).map(i => ({ data: new Date(i.data_criacao), tipo: 'saida-financeira', desc: `Transferência realizada para <b>${i.titulo}</b>` })),
            ...(gastosProprios || []).map(i => ({ data: new Date(i.data_criacao), tipo: 'saida-financeira', desc: `Gasto com recursos próprios: <b>${i.nome_categoria}</b>` })),
            ...(parcerias || []).map(i => ({ data: new Date(i.data_criacao), tipo: 'parceria', desc: `Nova parceria firmada com <b>${i.nome}</b>` })),
        ];
        const atividadesOrdenadas = todasAtividades.sort((a, b) => b.data - a.data);
        res.status(200).json(atividadesOrdenadas);
    } catch (error) {
        console.error("❌ Erro ao buscar todas as atividades:", error);
        res.status(500).json({ message: "Erro interno ao buscar lista de atividades." });
    }
};

export const getAllAlerts = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const [
            { data: todasParcerias },
            { data: todasEntradas },
            { data: todasSaidas }
        ] = await Promise.all([
            supabase.from('parceiro').select('nome, status, data_fim').eq('instituicao_id', instituicaoId),
            supabase.from('doacao_entrada').select('quantidade, categoria:categoria_id(nome)').eq('instituicao_id', instituicaoId),
            supabase.from('doacao_saida').select('quantidade_retirada, entrada:entrada_id(categoria:categoria_id(nome))').eq('instituicao_id', instituicaoId)
        ]);

        const estoqueAtualPorCategoria = {};
        const totaisEntrada = (todasEntradas || []).reduce((acc, item) => { const n = item.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade); return acc; }, {});
        const totaisSaida = (todasSaidas || []).reduce((acc, item) => { if (item.entrada?.categoria) { const n = item.entrada.categoria.nome; acc[n] = (acc[n] || 0) + Number(item.quantidade_retirada); } return acc; }, {});
        new Set([...Object.keys(totaisEntrada), ...Object.keys(totaisSaida)]).forEach(cat => { estoqueAtualPorCategoria[cat] = (totaisEntrada[cat] || 0) - (totaisSaida[cat] || 0); });

        const parceriasAExpirar = (todasParcerias || []).filter(p => {
            if (p.status !== 'Ativo' || !p.data_fim) return false;
            const dataFimParceria = new Date(p.data_fim);
            const diffDias = (dataFimParceria - hoje) / (1000 * 60 * 60 * 24);
            return diffDias >= 0 && diffDias <= 30;
        }).map(p => ({
            tipo: 'parceria',
            texto: `Parceria com <b>${p.nome}</b> expira em breve.`
        }));

        const parceriasExpiradas = (todasParcerias || []).filter(p => {
            if (p.status !== 'Ativo' || !p.data_fim) return false;
            const dataFimParceria = new Date(p.data_fim);
            return dataFimParceria < hoje;
        }).map(p => ({
            tipo: 'parceria-expirada',
            texto: `Parceria com <b>${p.nome}</b> está expirada. Atualize o status.`
        }));

        const estoqueBaixo = Object.entries(estoqueAtualPorCategoria).filter(([_, qtd]) => qtd > 0 && qtd <= 10).map(([cat, qtd]) => ({
            tipo: 'estoque',
            texto: `Estoque de <b>${cat}</b> está baixo (${qtd}).`
        }));
        
        const todosAlertas = [...parceriasExpiradas, ...parceriasAExpirar, ...estoqueBaixo];

        res.status(200).json(todosAlertas);
    } catch (error) {
        console.error("❌ Erro ao buscar todos os alertas:", error);
        res.status(500).json({ message: "Erro interno ao buscar lista de alertas." });
    }
};