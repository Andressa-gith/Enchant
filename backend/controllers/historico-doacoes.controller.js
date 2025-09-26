import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// Função para buscar o histórico de doações com filtros e paginação
export const getHistoricoDoacoes = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { 
            page = 1, 
            limit = 10, 
            startDate, 
            endDate, 
            type, 
            category 
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('doacao_entrada')
            .select(`
                id,
                quantidade,
                qualidade,
                detalhes,
                doador_origem_texto,
                data_entrada,
                categoria:categoria_id(nome)
            `)
            .eq('instituicao_id', instituicaoId)
            .order('data_entrada', { ascending: false });

        // Aplicar filtros de data
        if (startDate) {
            query = query.gte('data_entrada', startDate);
        }
        if (endDate) {
            query = query.lte('data_entrada', endDate);
        }

        // Aplicar filtro de categoria
        if (category && category !== '') {
            const { data: categoriaData } = await supabase
                .from('categoria')
                .select('id')
                .eq('nome', category)
                .single();
            
            if (categoriaData) {
                query = query.eq('categoria_id', categoriaData.id);
            }
        }

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: doacoes, error } = await query;
        if (error) throw error;

        // Contagem total
        let countQuery = supabase
            .from('doacao_entrada')
            .select('id', { count: 'exact', head: true })
            .eq('instituicao_id', instituicaoId);

        if (startDate) countQuery = countQuery.gte('data_entrada', startDate);
        if (endDate) countQuery = countQuery.lte('data_entrada', endDate);
        if (category && category !== '') {
            const { data: categoriaData } = await supabase
                .from('categoria')
                .select('id')
                .eq('nome', category)
                .single();
            if (categoriaData) {
                countQuery = countQuery.eq('categoria_id', categoriaData.id);
            }
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        const processedData = doacoes.map(doacao => ({
            id: doacao.id,
            data: new Date(doacao.data_entrada).toLocaleDateString('pt-BR'),
            tipo: determinarTipoPorData(doacao.data_entrada),
            categoria: doacao.categoria?.nome || 'Não informado',
            origem: doacao.doador_origem_texto || 'Anônimo',
            quantidade: doacao.quantidade,
            qualidade: doacao.qualidade || 'Não informado',
            detalhes: doacao.detalhes || ''
        }));

        res.status(200).json({
            success: true,
            data: processedData,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit)),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar histórico de doações:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno ao buscar histórico de doações.',
            error: error.message 
        });
    }
};

// Função para ADICIONAR um relatório à lista (sem gerar PDF ainda)
export const adicionarRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { 
            responsible, 
            startPeriod, 
            endPeriod, 
            reportType, 
            reportCategory 
        } = req.body;

        // Validação dos campos obrigatórios
        if (!responsible || !startPeriod || !endPeriod || !reportType) {
            return res.status(400).json({ 
                success: false,
                message: 'Responsável, datas e tipo de relatório são obrigatórios.' 
            });
        }

        // Converter os tipos de frequência para o banco
        const frequenciaMap = {
            'Anual': 'ANUAL',
            'Semestral': 'SEMESTRAL', 
            'Mensal': 'MENSAL',
            'Semanal': 'SEMANAL',
            'Pontual': 'PONTUAL'
        };

        const origemMap = {
            'Geral': null,
            'Roupas': 'ROUPAS',
            'Alimentos': 'ALIMENTOS',
            'Brinquedos': 'BRINQUEDOS',
            'Livros': 'LIVROS',
            'Medicamentos': 'MEDICAMENTOS'
        };

        // Buscar doações do período para validar se existem dados
        let doacoesQuery = supabase
            .from('doacao_entrada')
            .select('id, quantidade, categoria:categoria_id(nome)', { count: 'exact' })
            .eq('instituicao_id', instituicaoId)
            .gte('data_entrada', startPeriod)
            .lte('data_entrada', endPeriod);

        if (reportCategory && reportCategory !== 'Geral') {
            const { data: categoriaData } = await supabase
                .from('categoria')
                .select('id')
                .eq('nome', reportCategory)
                .single();
            
            if (categoriaData) {
                doacoesQuery = doacoesQuery.eq('categoria_id', categoriaData.id);
            }
        }

        const { count: totalDoacoes, error: doacoesError } = await doacoesQuery;
        if (doacoesError) throw doacoesError;

        // Criar placeholder para o caminho do PDF (será preenchido quando gerar)
        const pdfPlaceholder = `relatorio_${instituicaoId}_${Date.now()}.pdf`;

        // Salvar na tabela relatorio_doacao
        const { data: relatorioSalvo, error: relatorioError } = await supabase
            .from('relatorio_doacao')
            .insert({
                instituicao_id: instituicaoId,
                responsavel: responsible,
                data_inicio_filtro: startPeriod,
                data_fim_filtro: endPeriod,
                frequencia_filtro: frequenciaMap[reportType] || 'PONTUAL',
                categoria_filtro: reportCategory === 'Geral' ? null : reportCategory,
                origem_filtro: origemMap[reportCategory] || null,
                caminho_arquivo_pdf: pdfPlaceholder // Placeholder até gerar o PDF
            })
            .select()
            .single();

        if (relatorioError) throw relatorioError;

        res.status(201).json({
            success: true,
            message: 'Relatório adicionado à lista com sucesso!',
            relatorio: {
                id: relatorioSalvo.id,
                responsavel: relatorioSalvo.responsavel,
                periodo: `${new Date(startPeriod).toLocaleDateString('pt-BR')} - ${new Date(endPeriod).toLocaleDateString('pt-BR')}`,
                tipo: reportType,
                categoria: reportCategory,
                totalDoacoes: totalDoacoes || 0,
                status: 'Pendente', // PDF ainda não foi gerado
                dataGeracao: new Date(relatorioSalvo.data_geracao).toLocaleDateString('pt-BR')
            }
        });

    } catch (error) {
        console.error('❌ Erro ao adicionar relatório:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno ao adicionar relatório.',
            error: error.message 
        });
    }
};

// Função para buscar relatórios salvos
export const getRelatoriosSalvos = async (req, res) => {
    try {
        const instituicaoId = req.user.id;

        const { data: relatorios, error } = await supabase
            .from('relatorio_doacao')
            .select('*')
            .eq('instituicao_id', instituicaoId)
            .order('data_geracao', { ascending: false });

        if (error) throw error;

        const processedRelatorios = relatorios.map(rel => ({
            id: rel.id,
            responsavel: rel.responsavel,
            periodo: `${new Date(rel.data_inicio_filtro).toLocaleDateString('pt-BR')} - ${new Date(rel.data_fim_filtro).toLocaleDateString('pt-BR')}`,
            tipo: rel.frequencia_filtro,
            categoria: rel.categoria_filtro || 'Geral',
            dataGeracao: new Date(rel.data_geracao).toLocaleDateString('pt-BR'),
            status: rel.caminho_arquivo_pdf.includes('relatorio_') && !rel.caminho_arquivo_pdf.includes('.pdf') ? 'Pendente' : 'Gerado'
        }));

        res.status(200).json({
            success: true,
            relatorios: processedRelatorios
        });

    } catch (error) {
        console.error('❌ Erro ao buscar relatórios salvos:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno ao buscar relatórios salvos.'
        });
    }
};

// Função para GERAR o PDF de um relatório específico
export const gerarPDFRelatorio = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;

        // Buscar o relatório salvo
        const { data: relatorio, error: relError } = await supabase
            .from('relatorio_doacao')
            .select('*')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (relError) throw relError;
        if (!relatorio) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado.'
            });
        }

        // Buscar dados da instituição
        const { data: instituicao } = await supabase
            .from('instituicao')
            .select('nome')
            .eq('id', instituicaoId)
            .single();

        // Buscar doações do período do relatório
        let doacoesQuery = supabase
            .from('doacao_entrada')
            .select(`
                id,
                quantidade,
                qualidade,
                detalhes,
                doador_origem_texto,
                data_entrada,
                categoria:categoria_id(nome)
            `)
            .eq('instituicao_id', instituicaoId)
            .gte('data_entrada', relatorio.data_inicio_filtro)
            .lte('data_entrada', relatorio.data_fim_filtro)
            .order('data_entrada', { ascending: false });

        if (relatorio.categoria_filtro) {
            const { data: categoriaData } = await supabase
                .from('categoria')
                .select('id')
                .eq('nome', relatorio.categoria_filtro)
                .single();
            
            if (categoriaData) {
                doacoesQuery = doacoesQuery.eq('categoria_id', categoriaData.id);
            }
        }

        const { data: doacoes, error: doacoesError } = await doacoesQuery;
        if (doacoesError) throw doacoesError;

        // Calcular estatísticas
        const totalDoacoes = doacoes.length;
        const totalItens = doacoes.reduce((acc, d) => acc + parseInt(d.quantidade || 0), 0);
        const categorias = {};
        const doadores = new Set();
        const qualidades = {};

        doacoes.forEach(doacao => {
            const cat = doacao.categoria?.nome || 'Não informado';
            categorias[cat] = (categorias[cat] || 0) + parseInt(doacao.quantidade || 0);
            
            const qual = doacao.qualidade || 'Não informado';
            qualidades[qual] = (qualidades[qual] || 0) + 1;
            
            if (doacao.doador_origem_texto && doacao.doador_origem_texto !== 'Anônimo') {
                doadores.add(doacao.doador_origem_texto);
            }
        });

        // Preparar dados completos do relatório para o frontend gerar o PDF
        const relatorioCompleto = {
            id: relatorio.id,
            instituicao: instituicao?.nome || 'Instituição',
            responsavel: relatorio.responsavel,
            periodo: {
                inicio: new Date(relatorio.data_inicio_filtro).toLocaleDateString('pt-BR'),
                fim: new Date(relatorio.data_fim_filtro).toLocaleDateString('pt-BR')
            },
            tipo: relatorio.frequencia_filtro,
            categoria: relatorio.categoria_filtro || 'Geral',
            dataGeracao: new Date().toLocaleDateString('pt-BR'),
            estatisticas: {
                totalDoacoes,
                totalItens,
                totalDoadores: doadores.size,
                categoriasPorQuantidade: categorias,
                distribuicaoQualidade: qualidades
            },
            doacoes: doacoes.map(d => ({
                id: d.id,
                data: new Date(d.data_entrada).toLocaleDateString('pt-BR'),
                categoria: d.categoria?.nome || 'Não informado',
                quantidade: d.quantidade,
                qualidade: d.qualidade || 'Não informado',
                doador: d.doador_origem_texto || 'Anônimo',
                detalhes: d.detalhes || ''
            }))
        };

        // Atualizar o status do relatório (marcar como processado)
        await supabase
            .from('relatorio_doacao')
            .update({ 
                caminho_arquivo_pdf: `relatorio_${id}_${Date.now()}.pdf` 
            })
            .eq('id', id);

        res.status(200).json({
            success: true,
            message: 'Dados do relatório preparados para PDF',
            relatorio: relatorioCompleto
        });

    } catch (error) {
        console.error('❌ Erro ao gerar PDF do relatório:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno ao gerar PDF do relatório.'
        });
    }
};

// Função auxiliar
function determinarTipoPorData(dataEntrada) {
    const agora = new Date();
    const entrada = new Date(dataEntrada);
    const diffTime = Math.abs(agora - entrada);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return 'Semanal';
    if (diffDays <= 30) return 'Mensal';
    if (diffDays <= 180) return 'Semestral';
    return 'Anual';
}