// backend/controllers/dashboard.controller.js
import supabase from '../db/supabaseClient.js';

export const getDashboardData = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { periodo = 'mes' } = req.query;

        // Define o intervalo de data (sua lógica está ótima)
        const agora = new Date();
        let dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1); // Padrão: Mês
        if (periodo === 'ano') dataInicio = new Date(agora.getFullYear(), 0, 1);
        if (periodo === '3meses') dataInicio = new Date(new Date().setMonth(agora.getMonth() - 3)); // Corrigido para 3 meses
        
        // --- BUSCAS PARALELAS NO BANCO DE DADOS ---
        const [
            { data: dadosInstituicao, error: erroInstituicao },
            { data: doacoesItens, error: erroItens },
            { data: dadosFinanceiros, error: erroFinanceiro }
        ] = await Promise.all([
            supabase.from('instituicao').select('nome').eq('id', instituicaoId).single(),
            
            // AJUSTE 3: Otimizado para buscar apenas as colunas necessárias
            supabase.from('doacao_entrada')
                .select('quantidade, doador_origem_texto, data_entrada, categoria:categoria_id(nome)')
                .eq('instituicao_id', instituicaoId)
                .gte('data_entrada', dataInicio.toISOString()),

            supabase.from('gestao_financeira')
                .select('valor_executado')
                .eq('instituicao_id', instituicaoId)
                .gte('data_criacao', dataInicio.toISOString())
        ]);

        if (erroInstituicao || erroItens || erroFinanceiro) {
            throw (erroInstituicao || erroItens || erroFinanceiro);
        }

        // --- CÁLCULO DOS KPIs ---
        const totaisPorCategoria = doacoesItens.reduce((acc, item) => {
            const nomeCategoria = item.categoria.nome;
            acc[nomeCategoria] = (acc[nomeCategoria] || 0) + Number(item.quantidade);
            return acc;
        }, {});

        const kpis = {
            totalItensRecebidos: doacoesItens.reduce((acc, item) => acc + Number(item.quantidade), 0),
            totalFinanceiro: dadosFinanceiros.reduce((acc, item) => acc + Number(item.valor_executado), 0),
            // AJUSTE 2: Filtra "Anônimo" antes de contar os doadores únicos
            doadoresUnicos: new Set(doacoesItens.map(d => d.doador_origem_texto).filter(d => d.toLowerCase() !== 'anônimo')).size,
            principalCategoria: Object.keys(totaisPorCategoria).length > 0
                ? Object.keys(totaisPorCategoria).reduce((a, b) => totaisPorCategoria[a] > totaisPorCategoria[b] ? a : b)
                : 'Nenhuma',
        };
        
        // --- DADOS PARA O GRÁFICO (TOTAIS POR CATEGORIA) ---
        const labelsGrafico = Object.keys(totaisPorCategoria);
        const dataGrafico = Object.values(totaisPorCategoria);

        // --- DADOS PARA A SIDEBAR (ATIVIDADES RECENTES) ---
        const atividadesRecentes = doacoesItens
            .sort((a, b) => new Date(b.data_entrada) - new Date(a.data_entrada))
            .slice(0, 5) // Pega os 5 mais recentes
            .map(item => ({
                descricao: `Recebido ${item.quantidade} de ${item.categoria.nome}`,
                doador: item.doador_origem_texto
            }));

        // --- MONTA A RESPOSTA FINAL ---
        const responseData = {
            boasVindas: dadosInstituicao.nome,
            kpis,
            // AJUSTE 1 (BUG FIX): Adicionando a contagem de categorias na resposta
            totaisPorCategoria: totaisPorCategoria, 
            grafico: {
                labels: labelsGrafico,
                data: dataGrafico,
            },
            atividades: atividadesRecentes,
            // detalhesInstituicao não é usado no JS do frontend, removi para manter limpo
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao buscar dados do dashboard." });
    }
};