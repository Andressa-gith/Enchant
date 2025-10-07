import supabase from '../db/supabaseClient.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});
const payment = new Payment(client);

class PublicController {
    async listarOngs(req, res) {
        try {
            // Busca na sua tabela unificada de usuários
            const { data, error } = await supabase
                .from('instituicao')
                .select('id, nome, caminho_logo, chave_pix') // Adicione as colunas que quiser mostrar

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
                    caminho_logo: logoUrl,
                    chave_pix: ong.chave_pix
                };
            });

            res.status(200).json(ongsFormatadas);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar organizações.' });
        }
    }

    async criarCobrancaPix(req, res) {
        try {
            const { ongId, valor, nomeDoador, emailDoador } = req.body;

            // 1. BUSCA AS CREDENCIAIS DA ONG NO SEU BANCO
            const { data: ong, error: ongError } = await supabase
                .from('instituicao')
                .select('mp_access_token')
                .eq('id', ongId)
                .single();

            if (ongError || !ong || !ong.mp_access_token) {
                console.error("ONG não encontrada ou não conectada ao MP:", ongId);
                return res.status(400).json({
                    message: 'Esta organização ainda não está habilitada para receber doações. Por favor, tente doar para outra.'
                });
            }

            // 2. INICIALIZA O CLIENTE COM O TOKEN DA ONG
            const clientOng = new MercadoPagoConfig({ accessToken: ong.mp_access_token });
            const paymentOng = new Payment(clientOng);

            const externalReference = crypto.randomUUID();

            // ... (o código para inserir o documento 'pendente' continua igual) ...
            await supabase.from('documento_comprobatorio').insert({ /* ... */ });

            // 3. CRIA A COBRANÇA USANDO O CLIENTE ESPECÍFICO DA ONG
            const paymentResponse = await paymentOng.create({
                body: {
                    transaction_amount: Number(valor),
                    description: `Doação para a causa via Enchant`,
                    payment_method_id: 'pix',
                    payer: { email: emailDoador, first_name: nomeDoador },
                    notification_url: `${process.env.BASE_URL}/api/public/webhook`,
                    external_reference: externalReference,
                }
            });

            // 4. Envie os dados do PIX (QR Code) para o frontend
            res.status(201).json({
                qr_code: paymentResponse.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: paymentResponse.point_of_interaction.transaction_data.qr_code_base64,
            });

        } catch (error) {
            console.error('Erro ao criar cobrança PIX:', error?.cause || error);
            res.status(500).json({ message: 'Não foi possível gerar o PIX.' });
        }
    }

    async receberWebhook(req, res) {
        // Apenas para verificar no console que o webhook está chegando
        console.log('Webhook recebido:', req.body);

        try {
            if (req.body.type === 'payment') {
                const paymentId = req.body.data.id;

                // Busque as informações completas do pagamento
                const paymentInfo = await payment.get({ id: paymentId });

                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    // Pagamento aprovado!
                    // Atualize o status no seu banco de dados
                    await supabase
                        .from('documento_comprobatorio')
                        .update({
                            status: 'confirmado',
                            titulo: `Doação recebida de ${paymentInfo.payer.first_name}`, // Atualiza título
                            caminho_arquivo: paymentInfo.id
                        })
                        .eq('referencia_externa', paymentInfo.external_reference);
                }
            }

            // Responda ao Mercado Pago para confirmar o recebimento da notificação
            res.sendStatus(200);

        } catch (error) {
            console.error('Erro no webhook:', error);
            res.sendStatus(500); // Se der erro, o MP tentará notificar novamente
        }
    }
}

export default new PublicController();