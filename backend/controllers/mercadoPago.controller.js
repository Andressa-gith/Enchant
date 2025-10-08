import axios from 'axios';
import supabase from '../db/supabaseClient.js';

export const generateAuthLink = async (req, res) => {
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

    console.log('🟢 [MP Callback] Iniciando callback...');
    console.log('🟢 [MP Callback] Code:', code ? 'Recebido' : 'Não recebido');
    console.log('🟢 [MP Callback] State (instituicaoId):', instituicaoId);

    if (mpError) {
        console.error('❌ [MP Callback] Erro do Mercado Pago:', mpError);
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-error', message: 'Erro ao conectar: ${mpError}' }, '*');
                window.close();
            </script>
        `);
    }

    if (!code || !instituicaoId) {
        console.error('❌ [MP Callback] Dados incompletos');
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-error', message: 'Dados incompletos' }, '*');
                window.close();
            </script>
        `);
    }

    try {
        console.log('🟢 [MP Callback] Trocando código por tokens...');
        
        const response = await axios.post('https://api.mercadopago.com/oauth/token', {
            client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
            client_id: process.env.MERCADO_PAGO_APP_ID,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.MERCADO_PAGO_REDIRECT_URI,
        });

        console.log('✅ [MP Callback] Tokens recebidos do MP');
        console.log('🟢 [MP Callback] Dados recebidos:', Object.keys(response.data));

        const { access_token, refresh_token, user_id, public_key } = response.data;

        console.log('🟢 [MP Callback] Salvando no banco...');
        console.log('🟢 [MP Callback] Instituição ID:', instituicaoId);

        // Monta objeto apenas com campos que existem
        const updateData = {
            mp_user_id: user_id,
            mp_access_token: access_token,
            mp_refresh_token: refresh_token,
            mp_connected: true,
        };

        // Só adiciona public_key se ele existir
        if (public_key) {
            updateData.mp_public_key = public_key;
        }

        const { data: updatedData, error } = await supabase
            .from('instituicao')
            .update(updateData)
            .eq('id', instituicaoId)
            .select();

        if (error) {
            console.error('❌ [MP Callback] Erro do Supabase:', error);
            throw error;
        }

        console.log('✅ [MP Callback] Salvo com sucesso!');
        console.log('✅ [MP Callback] Dados atualizados:', updatedData);

        res.send(`
            <script>
                window.opener.postMessage({ type: 'mp-success' }, '*');
                window.close();
            </script>
        `);

    } catch (error) {
        console.error("❌ [MP Callback] Erro geral:", error.response?.data || error.message);
        console.error("❌ [MP Callback] Stack:", error.stack);
        
        const errorMsg = error.response?.data?.message || error.message || 'Erro desconhecido';
        
        res.send(`
            <script>
                window.opener.postMessage({ 
                    type: 'mp-error', 
                    message: 'Erro ao salvar tokens: ${errorMsg.replace(/'/g, "\\'")}'
                }, '*');
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
        console.error('❌ [Disconnect] Erro:', error);
        res.status(500).json({ message: 'Erro ao desconectar' });
    }
};