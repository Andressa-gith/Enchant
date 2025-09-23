import supabase from '../db/supabaseClient.js';

export const protegerRota = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado.' });
    }
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ message: 'Token inválido.' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor ao validar token.' });
    }
};