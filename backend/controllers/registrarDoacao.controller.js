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