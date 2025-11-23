// backend/middleware/auth.middleware.js
import supabase from '../db/supabaseClient.js';
import logger from '../utils/logger.js';

/**
 * Middleware para proteger rotas que exigem autenticação
 * Valida o token JWT e busca os dados completos da instituição
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 * @param {function} next - Função next do Express
 */
export const protegerRota = async (req, res, next) => {
    try {
        // ✅ 1. Extrai o token do header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            logger.warn(`❌ Acesso sem token - Rota: ${req.method} ${req.path}`);
            return res.status(401).json({ 
                message: 'Token de autenticação não fornecido.',
                tipo_erro: 'auth'
            });
        }

        // ✅ 2. Verifica formato e extrai token
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            logger.warn(`❌ Token mal formatado - Header: ${authHeader.substring(0, 30)}`);
            return res.status(401).json({ 
                message: 'Formato de token inválido. Use: Bearer <token>',
                tipo_erro: 'auth'
            });
        }

        logger.info(`🔑 Token recebido (${token.length} chars) - Rota: ${req.method} ${req.path}`);

        // ✅ 3. Valida o token com Supabase Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError) {
            logger.warn(`❌ Erro ao validar token: ${authError.message}`);
            
            // Mensagens específicas por tipo de erro
            if (authError.message.includes('expired')) {
                return res.status(401).json({ 
                    message: 'Token expirado. Faça login novamente.',
                    tipo_erro: 'auth',
                    detalhes: 'expired'
                });
            }
            
            if (authError.message.includes('invalid')) {
                return res.status(401).json({ 
                    message: 'Token inválido. Faça login novamente.',
                    tipo_erro: 'auth',
                    detalhes: 'invalid'
                });
            }
            
            return res.status(401).json({ 
                message: 'Erro ao validar token.',
                tipo_erro: 'auth'
            });
        }

        if (!user) {
            logger.warn('❌ Token válido mas usuário não encontrado');
            return res.status(401).json({ 
                message: 'Usuário não autenticado.',
                tipo_erro: 'auth'
            });
        }

        logger.info(`✅ Token válido - Usuário: ${user.email} (${user.id})`);

        // ✅ 4. BUSCA OS DADOS COMPLETOS DA INSTITUIÇÃO NO BANCO
        logger.info(`📊 Buscando dados da instituição no banco...`);
        
        const { data: instituicao, error: dbError } = await supabase
            .from('instituicao')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (dbError) {
            logger.error(`❌ Erro ao buscar instituição: ${dbError.message}`);
            logger.error(`   Código: ${dbError.code}`);
            logger.error(`   Detalhes: ${dbError.details}`);
            
            return res.status(500).json({ 
                message: 'Erro ao buscar dados da instituição.',
                tipo_erro: 'database'
            });
        }
        
        if (!instituicao) {
            logger.warn(`❌ Instituição não encontrada no banco - ID: ${user.id}`);
            return res.status(404).json({ 
                message: 'Instituição não encontrada no sistema.',
                tipo_erro: 'not_found'
            });
        }

        logger.info(`✅ Dados da instituição carregados: ${instituicao.nome_instituicao || 'N/A'}`);

        // ✅ 5. SUCESSO! Monta objeto req.user com dados completos
        req.user = {
            id: user.id,
            email: user.email,
            ...instituicao
        };
        
        logger.info(`✅ Autenticação completa - Prosseguindo para o controller`);
        next();

    } catch (error) {
        // ✅ Erro inesperado no middleware
        logger.error('❌ ERRO CRÍTICO no middleware de autenticação');
        logger.error(`   Mensagem: ${error.message}`);
        logger.error(`   Stack: ${error.stack}`);
        
        return res.status(500).json({ 
            message: 'Erro interno no servidor de autenticação.',
            tipo_erro: 'server'
        });
    }
};