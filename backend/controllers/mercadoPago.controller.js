// backend/controllers/mercadoPago.controller.js
import axios from 'axios';
import supabase from '../db/supabaseClient.js';

export const generateAuthLink = async (req, res) => {
    // Pega o ID da query string
    const instituicaoId = req.query.id;
    
    if (!instituicaoId) {
        return res.status(400).send('ID da instituição não fornecido');
    }

    const appId = process.env.MERCADO_PAGO_APP_ID;
    const redirectUri = process.env.MERCADO_PAGO_REDIRECT_URI;

    const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${instituicaoId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    res.redirect(authUrl);
};

export const handleCallback = async (req, res) => {
    const { code, state, error: mpError } = req.query;
    const instituicaoId = state;

    if (mpError) {
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-error', message: 'Erro ao conectar' }, '*');
                window.close();
            </script>
        `);
    }

    if (!code || !instituicaoId) {
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-error', message: 'Dados incompletos' }, '*');
                window.close();
            </script>
        `);
    }

    try {
        const response = await axios.post('https://api.mercadopago.com/oauth/token', {
            client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
            client_id: process.env.MERCADO_PAGO_APP_ID,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.MERCADO_PAGO_REDIRECT_URI,
        });

        const { access_token, refresh_token, user_id, public_key } = response.data;

        const { error } = await supabase
            .from('instituicao')
            .update({
                mp_user_id: user_id,
                mp_access_token: access_token,
                mp_refresh_token: refresh_token,
                mp_public_key: public_key,
                mp_connected: true,
            })
            .eq('id', instituicaoId);

        if (error) throw error;

        // Fecha a janela e notifica sucesso
        res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-success' }, '*');
                window.close();
            </script>
        `);

    } catch (error) {
        console.error("Erro:", error.response?.data || error.message);
        res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-error', message: 'Erro ao salvar tokens' }, '*');
                window.close();
            </script>
        `);
    }
};

export const disconnect = async (req, res) => {
    try {
        const instituicaoId = req.user.id;
        
        const { error } = await supabase
            .from('instituicao')
            .update({
                mp_user_id: null,
                mp_access_token: null,
                mp_refresh_token: null,
                mp_public_key: null,
                mp_connected: false,
            })
            .eq('id', instituicaoId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao desconectar' });
    }
};