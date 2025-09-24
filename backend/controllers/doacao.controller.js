import supabase from '../db/supabaseClient.js';

export const registrarDoacaoController = async (req, res) => {
    try {
        // 1. DADOS DA REQUISIÇÃO
        // O middleware 'protegerRota' já validou o token e nos deu o 'req.user'
        const instituicao_id = req.user.id; 
        const dadosDoFormulario = req.body;

        // 2. VALIDAÇÃO SIMPLES (BOA PRÁTICA)
        // Verifica se os campos essenciais que o frontend DEVE enviar vieram na requisição
        if (!dadosDoFormulario.categoria_id || !dadosDoFormulario.quantidade) {
            return res.status(400).json({ message: 'Dados incompletos. Categoria e quantidade são obrigatórios.' });
        }

        // 3. MONTAR O OBJETO FINAL PARA O BANCO
        // O frontend já fez 90% do trabalho! Só precisamos adicionar o ID da instituição.
        const novaDoacao = {
            ...dadosDoFormulario,      // Pega tudo que o frontend mandou (categoria_id, quantidade, qualidade, doador_origem_texto, detalhes)
            instituicao_id: instituicao_id, // Adiciona o ID do usuário logado
        };
        
        // 4. INSERIR NO BANCO DE DADOS
        const { data, error } = await supabase
            .from('doacao_entrada')
            .insert(novaDoacao)
            .select() // .select() faz com que o Supabase retorne o dado que acabou de ser inserido
            .single(); // .single() para pegar o objeto direto, em vez de um array com um item só

        if (error) {
            // Se der erro no Supabase, joga o erro para o bloco catch
            throw error;
        }

        // 5. ENVIAR RESPOSTA DE SUCESSO
        // Retorna o status 201 (Created) e a doação que foi criada
        res.status(201).json(data);

    } catch (error) {
        console.error('Erro ao registrar doação:', error);
        // Retorna um erro genérico para o frontend
        res.status(500).json({ message: 'Erro interno no servidor ao registrar a doação.' });
    }
};

export const registrarRetiradaController = async (req, res) => {
    try {
        // 1. RECEBER OS DADOS
        const instituicao_id = req.user.id;
        const { entrada_id, quantidade_retirada, destinatario, observacao } = req.body;

        if (!entrada_id || !quantidade_retirada || Number(quantidade_retirada) <= 0) {
            return res.status(400).json({ message: 'Item do estoque e quantidade (maior que zero) são obrigatórios.' });
        }

        // 2. VALIDAÇÃO DE ESTOQUE NO BACKEND (COM AJUSTES DE SEGURANÇA E ANTI-BUG)
        const { data: entrada, error: erroEntrada } = await supabase
            .from('doacao_entrada')
            .select('quantidade')
            .eq('id', entrada_id)
            // <-- AJUSTE DE SEGURANÇA: Garante que o item pertence à instituição logada
            .eq('instituicao_id', instituicao_id) 
            .single();

        // <-- AJUSTE CONTRA BUGS: Verifica se o item foi encontrado
        if (erroEntrada || !entrada) {
            // Se 'entrada' for nulo, significa que o item não existe ou não pertence a esta instituição
            return res.status(404).json({ message: `Item do estoque (ID: ${entrada_id}) não encontrado ou não pertence à sua instituição.` });
        }

        // Esta parte do código continua igual, mas agora está segura
        const { data: saidas, error: erroSaidas } = await supabase
            .from('doacao_saida')
            .select('quantidade_retirada')
            .eq('entrada_id', entrada_id);

        if (erroSaidas) throw erroSaidas;

        const totalJaRetirado = saidas.reduce((acc, item) => acc + Number(item.quantidade_retirada), 0);
        const quantidadeDisponivel = Number(entrada.quantidade) - totalJaRetirado;

        if (Number(quantidade_retirada) > quantidadeDisponivel) {
            return res.status(400).json({ message: `A quantidade solicitada (${quantidade_retirada}) é maior que o estoque disponível (${quantidadeDisponivel}).` });
        }

        // 3. MONTAR O OBJETO FINAL PARA INSERÇÃO
        const novaRetirada = {
            instituicao_id,
            entrada_id,
            quantidade_retirada,
            destinatario,
            observacao
        };

        // 4. INSERIR NA TABELA 'doacao_saida'
        const { data, error } = await supabase
            .from('doacao_saida')
            .insert(novaRetirada)
            .select()
            .single();

        if (error) throw error;

        // 5. ENVIAR RESPOSTA DE SUCESSO
        res.status(201).json(data);

    } catch (error) {
        console.error('Erro ao registrar retirada:', error);
        res.status(500).json({ message: 'Erro interno no servidor ao registrar a retirada.' });
    }
};