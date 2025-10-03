import supabase from '../db/supabaseAdmin.js';
import logger from '../utils/logger.js';

class UserProfileController {
    /**
     * Busca os dados de perfil completos da instituição logada, incluindo informações de tabelas relacionadas.
     * Gera URLs assinadas para a foto de perfil e logo, se existirem.
     * @param {object} req - Objeto de requisição do Express.
     * @param {object} res - Objeto de resposta do Express.
     */
    async getProfile(req, res) {
        logger.info('Iniciando busca de dados de perfil...');
        try {
            const usuarioId = req.user.id;
            logger.debug(`Buscando perfil para o usuário ID: ${usuarioId}`);

            const { data, error } = await supabase
                .from('instituicao')
                .select('nome, email_contato, cnpj, caminho_foto_perfil, caminho_logo, telefone ( numero ), endereco ( cidade, estado ), primeiro_login')
                .eq('id', usuarioId)
                .single();

            if (error) throw error;
            
            if (!data) {
                logger.warn(`Perfil não encontrado na tabela 'instituicao' para o usuário ID: ${usuarioId}`);
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }

            const fone = Array.isArray(data.telefone) ? data.telefone[0] : data.telefone;
            const end = Array.isArray(data.endereco) ? data.endereco[0] : data.endereco;

            const profileData = {
                nome: data.nome,
                email_contato: data.email_contato,
                email: req.user.email,
                cnpj: data.cnpj,
                primeiro_login: data.primeiro_login,
                telefone: fone?.numero || null,
                cidade: end?.cidade || null,
                estado: end?.estado || null,
                url_foto_perfil: null,
                url_logo: null
            };
            
            if (data.caminho_foto_perfil) {
                logger.info(`Gerando URL assinada para foto do perfil: ${data.caminho_foto_perfil}`);
                const { data: urlData, error: urlError } = await supabase.storage
                    .from('profile-photos')
                    .createSignedUrl(data.caminho_foto_perfil, 3600); // URL válida por 1 hora

                if (urlError) {
                    logger.warn('Falha ao gerar URL assinada para foto. Usando URL pública como fallback.', urlError);
                    const { data: publicUrl } = supabase.storage.from('profile-photos').getPublicUrl(data.caminho_foto_perfil);
                    profileData.url_foto_perfil = publicUrl?.publicUrl;
                } else {
                    profileData.url_foto_perfil = urlData.signedUrl;
                }
            }

            if (data.caminho_logo) {
                logger.info(`Gerando URL assinada para logo: ${data.caminho_logo}`);
                const { data: urlData, error: urlError } = await supabase.storage
                    .from('logos')
                    .createSignedUrl(data.caminho_logo, 3600); // URL válida por 1 hora

                if (urlError) {
                    logger.warn('Falha ao gerar URL assinada para logo. Usando URL pública como fallback.', urlError);
                    const { data: publicUrl } = supabase.storage.from('logos').getPublicUrl(data.caminho_logo);
                    profileData.url_logo = publicUrl?.publicUrl;
                } else {
                    profileData.url_logo = urlData.signedUrl;
                }
            }
            
            logger.info(`Dados do perfil para o usuário ID: ${usuarioId} enviados com sucesso.`);
            res.status(200).json(profileData); 

        } catch (error) {
            logger.error('Erro ao buscar dados do perfil.', error);
            res.status(500).json({ message: 'Erro interno ao buscar dados do perfil.' });
        }
    }

    /**
     * Atualiza os dados de perfil da instituição logada em múltiplas tabelas (auth, instituicao, telefone, endereco).
     * @param {object} req - Objeto de requisição do Express.
     * @param {object} res - Objeto de resposta do Express.
     */
    async updateProfile(req, res) {
        logger.info('Iniciando processo de atualização de perfil...');
        try {
            const usuarioId = req.user.id;
            const { nome, email_contato, email, senha, cnpj, telefone, cidade, estado, caminho_foto_perfil, caminho_logo } = req.body;

            // Log de debug sem dados sensíveis (senha)
            const debugData = { ...req.body };
            delete debugData.senha;
            logger.debug(`Dados recebidos para atualização do usuário ID: ${usuarioId}`, debugData);

            // 1. Atualiza dados de autenticação (email/senha), se fornecidos
            const authUpdateData = {};
            if (email && email !== req.user.email) authUpdateData.email = email;
            if (senha) authUpdateData.password = senha;

            if (Object.keys(authUpdateData).length > 0) {
                logger.info(`Atualizando dados de autenticação (email/senha) para o usuário ID: ${usuarioId}`);
                const { error: authError } = await supabase.auth.admin.updateUserById(usuarioId, authUpdateData);
                if (authError) {
                    if (authError.message.includes('unique constraint') || authError.code === 'unexpected_failure') {
                        logger.warn(`Tentativa de atualizar para um e-mail que já está em uso: ${email}`);
                        return res.status(409).json({ message: 'Este e-mail já está em uso.' });
                    }
                    throw authError;
                }
            }
            
            // 2. Atualiza a tabela 'instituicao'
            const instituicaoData = { nome, email_contato, cnpj, caminho_foto_perfil, caminho_logo };
            Object.keys(instituicaoData).forEach(key => instituicaoData[key] === undefined && delete instituicaoData[key]);
            if (Object.keys(instituicaoData).length > 0) {
                logger.info(`Atualizando tabela 'instituicao' para o usuário ID: ${usuarioId}`);
                const { error: instituicaoError } = await supabase.from('instituicao').update(instituicaoData).eq('id', usuarioId);
                if (instituicaoError) throw instituicaoError;
            }

            // 3. Usa 'upsert' para a tabela 'telefone'
            if (telefone !== undefined) {
                logger.info(`Fazendo upsert do telefone para o usuário ID: ${usuarioId}`);
                const { error: telefoneError } = await supabase.from('telefone').upsert({ numero: telefone, instituicao_id: usuarioId }, { onConflict: 'instituicao_id' });
                if (telefoneError) throw telefoneError;
            }

            // 4. Usa 'upsert' para a tabela 'endereco'
            if (cidade !== undefined || estado !== undefined) {
                logger.info(`Fazendo upsert do endereço para o usuário ID: ${usuarioId}`);
                const { error: enderecoError } = await supabase.from('endereco').upsert({ cidade: cidade, estado: estado, instituicao_id: usuarioId }, { onConflict: 'instituicao_id' });
                if (enderecoError) throw enderecoError;
            }
            
            logger.info(`Perfil do usuário ID: ${usuarioId} atualizado com sucesso.`);
            res.status(200).json({ message: 'Perfil atualizado com sucesso!' });

        } catch (error) {
            logger.error('Erro ao atualizar o perfil.', error);
            res.status(500).json({ message: 'Erro interno ao atualizar o perfil.' });
        }
    }

    /**
     * Marca o primeiro login do usuário como falso, indicando que o tutorial foi visto.
     * @param {object} req - Objeto de requisição do Express.
     * @param {object} res - Objeto de resposta do Express.
     */
    async marcarTutorialVisto(req, res) {
        logger.info('Marcando o tutorial como visto...');
        try {
            const usuarioId = req.user.id;
            logger.debug(`Atualizando 'primeiro_login' para false para o usuário ID: ${usuarioId}`);
                        
            const { error } = await supabase
                .from('instituicao')
                .update({ primeiro_login: false })
                .eq('id', usuarioId);

            if (error) throw error;

            logger.info(`Status do tutorial atualizado para o usuário ID: ${usuarioId}`);
            res.status(200).json({ message: 'Tutorial marcado como concluído.' });

        } catch (error) {
            logger.error('Erro ao marcar tutorial como visto.', error);
            res.status(500).json({ message: 'Não foi possível atualizar o status do tutorial.' });
        }
    }
    
    /**
     * Processa a requisição de logout. (OBS: A invalidação do token ocorre no frontend).
     * @param {object} req - Objeto de requisição do Express.
     * @param {object} res - Objeto de resposta do Express.
     */
    logout(req, res) {
        logger.info('Requisição de logout recebida no servidor.');
        try {
            // A principal lógica de logout (limpar o token) é feita no cliente.
            // O servidor pode limpar cookies httpOnly se estiverem sendo usados.
            // res.clearCookie('auth_token'); // Exemplo se estivesse usando cookies.
            
            res.status(200).json({ message: 'Logout sinalizado pelo servidor.' });
        } catch (error) {
            logger.error('Erro no endpoint de logout.', error);
            res.status(500).json({ message: 'Erro interno ao fazer logout.' });
        }
    }
}

export default new UserProfileController();