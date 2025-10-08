import supabase from '../db/supabaseClient.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';
import { generateDonationReceipt } from '../utils/comprovante.js';

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
                .select('id, nome, caminho_logo') // Adicione as colunas que quiser mostrar
                .eq('mp_connected', true);  //so mostra as que tem o mercado pago (pode tirar se quiser)

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

            await supabase.from('documento_comprobatorio').insert({
                instituicao_id: ongId,                      // ID da ONG que receberá a doação
                titulo: `Intenção de Doação de ${nomeDoador}`, // Título inicial
                valor: valor,                               // Valor da doação
                tipo_documento: 'Recibo de Doação',         // Tipo padronizado para doações
                status: 'pendente',
                referencia_externa: externalReference,
                caminho_arquivo: 'doacao_automatica_sem_anexo',
            });

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

            res.status(201).json({
                qr_code: paymentResponse.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: paymentResponse.point_of_interaction.transaction_data.qr_code_base64,
                externalReference: externalReference
            });

        } catch (error) {
            console.error('Erro ao criar cobrança PIX:', error?.cause || error);
            res.status(500).json({ message: 'Não foi possível gerar o PIX.' });
        }
    }

    async receberWebhook(req, res) {
        console.log('Webhook recebido:', req.body);

        try {
            if (req.body.type === 'payment') {
                const paymentId = req.body.data.id;
                const paymentInfo = await payment.get({ id: paymentId });

                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    const externalReference = paymentInfo.external_reference;

                    const { data: docPendente, error: docError } = await supabase
                        .from('documento_comprobatorio')
                        .select('instituicao_id, titulo')
                        .eq('referencia_externa', externalReference)
                        .single();

                    if (docError || !docPendente) throw new Error('Documento pendente não encontrado.');

                    const nomeOriginalDoForm = docPendente.titulo.replace('Intenção de Doação de ', '');

                    const { data: ongData, error: ongError } = await supabase
                        .from('instituicao')
                        .select('nome')
                        .eq('id', docPendente.instituicao_id)
                        .single();

                    if (ongError || !ongData) throw new Error('ONG não encontrada.');

                    const nomeDoador = paymentInfo.payer?.first_name || nomeOriginalDoForm || 'Doador Anônimo';
                    const receiptData = {
                        ongName: ongData.nome,
                        donorName: nomeDoador,
                        amount: paymentInfo.transaction_amount,
                        paymentId: paymentInfo.id,
                        date: new Date()
                    };

                    const pdfBuffer = await generateDonationReceipt(receiptData);

                    const filePath = `${docPendente.instituicao_id}/${externalReference}.pdf`;
                    const { error: uploadError } = await supabase.storage
                        .from('comprovantes')
                        .upload(filePath, pdfBuffer, { contentType: 'application/pdf' });

                    if (uploadError) throw uploadError;

                    await supabase
                        .from('documento_comprobatorio')
                        .update({
                            status: 'confirmado',
                            titulo: `Doação recebida de ${nomeDoador}`,
                            id_pagamento_gateway: paymentInfo.id,
                            caminho_arquivo: filePath
                        })
                        .eq('referencia_externa', externalReference);

                    console.log(`Doação ${paymentInfo.id} confirmada e recibo gerado em: ${filePath}`);
                }
            }
            res.sendStatus(200);

        } catch (error) {
            console.error('Erro no webhook:', error);
            res.sendStatus(500); // Se der erro, o MP tentará notificar novamente
        }
    }

    async verificarStatusDoacao(req, res) {
        try {
            const { refExterna } = req.params;

            const { data, error } = await supabase
                .from('documento_comprobatorio')
                .select('status')
                .eq('referencia_externa', refExterna)
                .single();

            if (error || !data) {
                return res.status(404).json({ status: 'não encontrado' });
            }

            res.status(200).json({ status: data.status });

        } catch (error) {
            res.status(500).json({ message: 'Erro ao verificar status.' });
        }
    }
}

export default new PublicController();