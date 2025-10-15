import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import logger from '../utils/logger.js';

/**
 * Cadastra uma nova instituição.
 * 1. Cria o usuário no Supabase Auth.
 * 2. Insere o endereço na tabela 'endereco'.
 * 3. Insere o telefone na tabela 'telefone'.
 * Possui lógica de rollback para deletar o usuário do Auth em caso de falha nos passos 2 ou 3.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const cadastrarInstituicao = async (req, res) => {
    logger.info('Iniciando processo de cadastro de nova instituição...');
    let novoUsuarioId = null;

    try {
        const {
            email_contato, senha, nome_instituicao, cnpj,
            tipo_instituicao, numero, cep, bairro, cidade, estado
        } = req.body;
        
        // Log de debug sem a senha!
        const debugData = { ...req.body };
        delete debugData.senha;
        logger.debug('Dados recebidos para o cadastro:', debugData);

        if (!email_contato || !senha || !nome_instituicao) {
            logger.warn('Tentativa de cadastro com campos obrigatórios ausentes.');
            return res.status(400).json({ message: "Email, senha e nome da instituição são obrigatórios." });
        }

        // --- PASSO 1: Criação do usuário no Auth ---
        logger.info(`[PASSO 1/3] Criando usuário no Supabase Auth para o email: ${email_contato}`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email_contato,
            password: senha,
            options: {
                data: { nome_instituicao, cnpj, tipo_instituicao }
            }
        });

        if (authError) {
            if (authError.message.includes("User already registered")) {
                logger.warn(`Tentativa de cadastro com email duplicado: ${email_contato}`);
                return res.status(409).json({ message: 'Este endereço de email já está cadastrado.' });
            }
            throw authError; // Outros erros de auth (senha fraca, etc.)
        }
        
        if (!authData.user) {
            throw new Error("Criação do usuário no Auth falhou sem retornar um erro explícito.");
        }

        novoUsuarioId = authData.user.id;
        logger.info(`[PASSO 1/3] Usuário criado no Auth com sucesso. ID: ${novoUsuarioId}`);
        
        // --- PASSO 2: Inserção do endereço ---
        logger.info(`[PASSO 2/3] Inserindo endereço para o usuário ID: ${novoUsuarioId}`);
        const { error: enderecoError } = await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cep, bairro, cidade, estado
        });
        if (enderecoError) throw enderecoError;
        logger.info('[PASSO 2/3] Endereço inserido com sucesso.');

        // --- PASSO 3: Inserção do telefone ---
        logger.info(`[PASSO 3/3] Inserindo telefone para o usuário ID: ${novoUsuarioId}`);
        const { error: telefoneError } = await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero
        });
        if (telefoneError) throw telefoneError;
        logger.info('[PASSO 3/3] Telefone inserido com sucesso.');
        
        logger.info(`Instituição ID: ${novoUsuarioId} cadastrada com sucesso em todas as etapas.`);
        return res.status(201).json({ message: 'Instituição cadastrada com sucesso!', userId: novoUsuarioId });

    } catch (error) {
        logger.error('ERRO NO PROCESSO DE CADASTRO. Acionando procedimentos de falha.', error);

        // --- LÓGICA DE ROLLBACK ---
        if (novoUsuarioId) {
            logger.warn(`Iniciando rollback: deletando usuário órfão do Auth com ID ${novoUsuarioId}...`);
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
            if (deleteError) {
                // Este é um erro gravíssimo que precisa ser investigado manualmente
                logger.error(`FALHA CRÍTICA NO ROLLBACK! Usuário pode ter ficado órfão: ID=${novoUsuarioId}`, deleteError);
            } else {
                logger.info(`Rollback bem-sucedido: usuário ID ${novoUsuarioId} deletado do Auth.`);
            }
        }

        return res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.' });
    }
};

/**
 * Cria uma nova postagem na comunidade para a instituição logada.
 * Requer que o usuário esteja autenticado (authMiddleware).
 * Processa o upload de uma imagem opcional.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const criarPostagemComunidade = async (req, res) => {
    try {
        const { titulo, conteudo } = req.body;
        const instituicao_id = req.user.id;
        let caminho_imagem = null;

        if (!conteudo) {
            return res.status(400).json({ message: 'O conteúdo da postagem é obrigatório.' });
        }

        // CORREÇÃO: Lógica de upload manual
        if (req.file) {
            // 1. O ficheiro está em memória (req.file.buffer)
            const file = req.file;
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${instituicao_id}/${fileName}`;

            // 2. Usamos o .upload() do Supabase para enviar o buffer
            const { error: uploadError } = await supabaseAdmin.storage
                .from('imagens-comunidade')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            // 3. Guardamos o caminho do ficheiro bem-sucedido
            caminho_imagem = filePath;
        }

        // 4. Inserimos na base de dados com o caminho da imagem (ou null se não houver imagem)
        const { data: postData, error: insertError } = await supabase
            .from('postagens_comunidade')
            .insert({
                instituicao_id,
                titulo,
                conteudo,
                caminho_imagem
            })
            .select()
            .single();

        if (insertError) throw insertError;

        res.status(201).json(postData);

    } catch (error) {
        console.error('Erro ao criar postagem:', error);
        res.status(500).json({ message: 'Não foi possível criar a postagem.' });
    }
};

/**
 * Busca uma postagem específica da instituição logada
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 */
export const buscarPostagemComunidade = async (req, res) => {
    try {
        const { id } = req.params;
        const instituicao_id = req.user.id;

        const { data, error } = await supabase
            .from('postagens_comunidade')
            .select('*')
            .eq('id', id)
            .eq('instituicao_id', instituicao_id)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Postagem não encontrada.' });
        }

        // Gera URL pública da imagem se existir
        let url_imagem = null;
        if (data.caminho_imagem) {
            const { data: publicUrlData } = supabase.storage
                .from('imagens-comunidade')
                .getPublicUrl(data.caminho_imagem);
            url_imagem = publicUrlData.publicUrl;
        }

        res.status(200).json({
            ...data,
            url_imagem
        });

    } catch (error) {
        console.error('Erro ao buscar postagem:', error);
        res.status(500).json({ message: 'Não foi possível buscar a postagem.' });
    }
};

/**
 * Atualiza uma postagem existente da instituição logada
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 */
export const atualizarPostagemComunidade = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, conteudo } = req.body;
        const instituicao_id = req.user.id;

        if (!conteudo) {
            return res.status(400).json({ message: 'O conteúdo da postagem é obrigatório.' });
        }

        if (conteudo.length > 2000) {
            return res.status(400).json({ message: 'O conteúdo não pode ter mais de 2000 caracteres.' });
        }

        // Verifica se a postagem pertence ao usuário
        const { data: postagemExistente, error: erroVerificacao } = await supabase
            .from('postagens_comunidade')
            .select('*')
            .eq('id', id)
            .eq('instituicao_id', instituicao_id)
            .single();

        if (erroVerificacao || !postagemExistente) {
            return res.status(404).json({ message: 'Postagem não encontrada ou você não tem permissão para editá-la.' });
        }

        let caminho_imagem = postagemExistente.caminho_imagem;

        // Se há um novo arquivo de imagem
        if (req.file) {
            // Remove a imagem antiga se existir
            if (postagemExistente.caminho_imagem) {
                await supabaseAdmin.storage
                    .from('imagens-comunidade')
                    .remove([postagemExistente.caminho_imagem]);
            }

            // Upload da nova imagem
            const file = req.file;
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${instituicao_id}/${fileName}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from('imagens-comunidade')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            caminho_imagem = filePath;
        }

        // Atualiza a postagem
        const { data: postagemAtualizada, error: updateError } = await supabase
            .from('postagens_comunidade')
            .update({
                titulo,
                conteudo,
                caminho_imagem
            })
            .eq('id', id)
            .eq('instituicao_id', instituicao_id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.status(200).json({
            message: 'Postagem atualizada com sucesso!',
            postagem: postagemAtualizada
        });

    } catch (error) {
        console.error('Erro ao atualizar postagem:', error);
        res.status(500).json({ message: 'Não foi possível atualizar a postagem.' });
    }
};

/**
 * Exclui uma postagem da instituição logada
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 */
export const excluirPostagemComunidade = async (req, res) => {
    try {
        const { id } = req.params;
        const instituicao_id = req.user.id;

        // Busca a postagem para verificar permissão e obter o caminho da imagem
        const { data: postagem, error: erroVerificacao } = await supabase
            .from('postagens_comunidade')
            .select('*')
            .eq('id', id)
            .eq('instituicao_id', instituicao_id)
            .single();

        if (erroVerificacao || !postagem) {
            return res.status(404).json({ message: 'Postagem não encontrada ou você não tem permissão para excluí-la.' });
        }

        // Remove a imagem do storage se existir
        if (postagem.caminho_imagem) {
            const { error: deleteStorageError } = await supabaseAdmin.storage
                .from('imagens-comunidade')
                .remove([postagem.caminho_imagem]);

            if (deleteStorageError) {
                console.warn('Erro ao deletar imagem do storage:', deleteStorageError);
                // Continua mesmo se a exclusão da imagem falhar
            }
        }

        // Exclui a postagem do banco
        const { error: deleteError } = await supabase
            .from('postagens_comunidade')
            .delete()
            .eq('id', id)
            .eq('instituicao_id', instituicao_id);

        if (deleteError) throw deleteError;

        res.status(200).json({ message: 'Postagem excluída com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir postagem:', error);
        res.status(500).json({ message: 'Não foi possível excluir a postagem.' });
    }
};