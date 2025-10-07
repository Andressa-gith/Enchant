// controllers/mercadoPago.controller.js
import axios from 'axios';
import supabase from '../db/supabaseClient.js';

// Função para gerar o link de autorização e redirecionar a ONG
export const generateAuthLink = (req, res) => {
    const appId = process.env.MERCADO_PAGO_APP_ID;
    const redirectUri = process.env.MERCADO_PAGO_REDIRECT_URI;

    const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&redirect_uri=${redirectUri}`;
    
    res.redirect(authUrl);

};

// Função para lidar com o callback do Mercado Pago após a autorização
export const handleCallback = async (req, res) => {
    const { code } = req.query; // Código de autorização temporário
    const instituicaoId = req.user.id; // ID da ONG logada

    if (!code) {
        return res.status(400).send('Erro: Código de autorização não encontrado.');
    }

    try {
        // Troca o código temporário pelos tokens de acesso permanentes
        const response = await axios.post('https://api.mercadopago.com/oauth/token', {
            client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
            client_id: process.env.MERCADO_PAGO_APP_ID,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.MERCADO_PAGO_REDIRECT_URI,
        });

        const { access_token, refresh_token, user_id } = response.data;

        // Salva os tokens na tabela da instituição
        const { error } = await supabase
            .from('instituicao')
            .update({
                mp_user_id: user_id,
                mp_access_token: access_token,
                mp_refresh_token: refresh_token,
                mp_connected: true,
            })
            .eq('id', instituicaoId);

        if (error) throw error;

        // Redireciona a ONG para o painel de controle com uma mensagem de sucesso
        res.redirect('/painel/configuracoes?status=mp-conectado');

    } catch (error) {
        console.error("Erro ao conectar com Mercado Pago:", error.response?.data || error.message);
        res.redirect('/painel/configuracoes?status=mp-erro');
    }
};