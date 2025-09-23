// Crie o arquivo: backend/controllers/dashboard.controller.js
import supabase from '../db/supabaseClient.js';

export const getDashboardData = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { periodo = 'mes' } = req.query; // Pega o período do filtro

        // Define o intervalo de data
        const agora = new Date();
        let dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1); // Padrão: Mês
        if (periodo === 'ano') dataInicio = new Date(agora.getFullYear(), 0, 1);
        if (periodo === 'semana') dataInicio = new Date(agora.setDate(agora.getDate() - 7));
        if (periodo === 'dia') dataInicio = new Date(agora.setHours(0, 0, 0, 0));

        // --- BUSCAS PARALELAS NO BANCO DE DADOS ---
        const [
            { data: dadosInstituicao, error: erroInstituicao },
            { data: doacoesItens, error: erroItens },
            { data: dadosFinanceiros, error: erroFinanceiro }
        ] = await Promise.all([
            supabase.from('instituicao').select('nome, email_contato, cnpj, tipo_instituicao').eq('id', instituicaoId).single(),
            supabase.from('doacao_entrada').select(`*, categoria:categoria_id(nome)`).eq('instituicao_id', instituicaoId).gte('data_entrada', dataInicio.toISOString()),
            supabase.from('gestao_financeira').select('valor_executado').eq('instituicao_id', instituicaoId).gte('data_criacao', dataInicio.toISOString())
            // ATENÇÃO: Adicione um .eq('nome_categoria', 'Sua Categoria de Receita') se necessário
        ]);

        if (erroInstituicao || erroItens || erroFinanceiro) {
            throw (erroInstituicao || erroItens || erroFinanceiro);
        }

        // --- CÁLCULO DOS KPIs ---
        const kpis = {
            totalItensRecebidos: doacoesItens.reduce((acc, item) => acc + item.quantidade, 0),
            totalFinanceiro: dadosFinanceiros.reduce((acc, item) => acc + item.valor_executado, 0),
            doadoresUnicos: new Set(doacoesItens.map(d => d.doador_origem_texto)).size,
        };

        // Calcula a categoria principal
        const contagemCategorias = doacoesItens.reduce((acc, item) => {
            const nomeCategoria = item.categoria.nome;
            acc[nomeCategoria] = (acc[nomeCategoria] || 0) + item.quantidade;
            return acc;
        }, {});

        kpis.principalCategoria = Object.keys(contagemCategorias).length > 0
            ? Object.keys(contagemCategorias).reduce((a, b) => contagemCategorias[a] > contagemCategorias[b] ? a : b)
            : 'Nenhuma';
        
        // --- DADOS PARA O GRÁFICO (TOTAIS POR CATEGORIA) ---
        const labelsGrafico = Object.keys(contagemCategorias);
        const dataGrafico = Object.values(contagemCategorias);

        // --- DADOS PARA A SIDEBAR (ATIVIDADES RECENTES) ---
        const atividadesRecentes = doacoesItens
            .sort((a, b) => new Date(b.data_entrada) - new Date(a.data_entrada))
            .slice(0, 5)
            .map(item => ({
                descricao: `Recebido ${item.quantidade} de ${item.categoria.nome}`,
                doador: item.doador_origem_texto
            }));

        // --- MONTA A RESPOSTA FINAL ---
        const responseData = {
            boasVindas: dadosInstituicao.nome,
            kpis,
            grafico: {
                labels: labelsGrafico,
                data: dataGrafico,
            },
            atividades: atividadesRecentes,
            detalhesInstituicao: dadosInstituicao,
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ message: "Erro interno ao buscar dados do dashboard." });
    }
};