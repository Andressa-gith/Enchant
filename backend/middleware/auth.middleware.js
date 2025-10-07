// backend/middleware/auth.middleware.js
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
        
        // BUSCA OS DADOS COMPLETOS DA INSTITUIÇÃO NO BANCO
        const { data: instituicao, error: dbError } = await supabase
            .from('instituicao')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (dbError || !instituicao) {
            return res.status(404).json({ message: 'Instituição não encontrada.' });
        }
        
        req.user = {
            id: user.id,
            email: user.email,
            ...instituicao
        };
        
        next();
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor ao validar token.' });
    }
};