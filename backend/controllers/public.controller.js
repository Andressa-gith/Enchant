import supabase from '../db/supabaseClient.js';

class PublicController {
    async listarOngs(req, res) {
        try {
            // Busca na sua tabela unificada de usuários
            const { data, error } = await supabase
                .from('instituicao')
                .select('id, nome, caminho_logo') // Adicione as colunas que quiser mostrar

            if (error) {
                throw error; // Joga o erro para o nosso 'catch'
            }

            const ongsFormatadas = data.map(ong => {
                let logoUrl = null;
                if (ong.caminho_logo) {
                    const { data: publicUrlData } = supabase.storage
                        .from('logos')
                        .getPublicUrl(ong.caminho_logo);

                    logoUrl = publicUrlData.publicUrl;
                }

                return {
                    id: ong.id,
                    nome: ong.nome,
                    caminho_logo: logoUrl
                };
            });

            res.status(200).json(ongsFormatadas);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar organizações.' });
        }
    }

    // Método para registrar a doação
    async processarDoacao(req, res) {
        try {
            const { ongId, valor, nomeDoador, emailDoador } = req.body;
            if (!ongId || !valor || !nomeDoador) {
                return res.status(400).json({ message: 'Dados da doação incompletos.' });
            }

            // Insere um registro na sua tabela de documentos da ONG
            const { error } = await supabase
                .from('documento_comprobatorio') // Garanta que o nome da tabela está correto
                .insert({
                    instituicao_id: ongId,
                    tipo_documento: 'Recibo de doação',
                    titulo: `Doação recebida de ${nomeDoador}`,
                    valor: valor,
                    detalhes: { doador: { nome: nomeDoador, email: emailDoador } }
                });

            if (error) throw error;
            res.status(201).json({ message: 'Doação registrada com sucesso! Agradecemos sua contribuição.' });
        } catch (error) {
            console.error('Erro ao processar doação:', error);
            res.status(500).json({ message: 'Não foi possível registrar a doação.' });
        }
    }
}

export default new PublicController();