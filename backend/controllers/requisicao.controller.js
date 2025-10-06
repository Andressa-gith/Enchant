import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Processa uma nova requisição de cadastro de ONG com documentos
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 */
export const processarRequisicao = async (req, res) => {
    logger.info('Iniciando processamento de nova requisição de cadastro...');
    let novoUsuarioId = null;
    let arquivosUpload = [];

    try {
        const {
            nomeInstituicao,
            email,
            cnpj,
            telefone,
            estado,
            cidade,
            senha
        } = req.body;

        // Log sem dados sensíveis
        const debugData = { nomeInstituicao, email, cnpj, telefone, estado, cidade };
        logger.debug('Dados recebidos para requisição:', debugData);

        // ========== VALIDAÇÕES ==========
        if (!nomeInstituicao || !email || !cnpj || !telefone || !estado || !cidade || !senha) {
            logger.warn('Tentativa de cadastro com campos obrigatórios ausentes.');
            return res.status(400).json({ 
                success: false,
                message: 'Todos os campos são obrigatórios.' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido.'
            });
        }

        // Validar CNPJ
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            return res.status(400).json({
                success: false,
                message: 'CNPJ inválido.'
            });
        }

        // Validar senha
        const senhaRegex = /^(?=.*[A-Z])(?=.*\d.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!senhaRegex.test(senha)) {
            return res.status(400).json({
                success: false,
                message: 'A senha não atende aos requisitos mínimos.'
            });
        }

        // Validar arquivos
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum documento foi enviado.'
            });
        }

        // Verificar se declaração de renda foi enviada (obrigatório)
        const temDeclaracaoRenda = Object.keys(req.files).some(key => 
            key.startsWith('declaracao-renda_')
        );

        if (!temDeclaracaoRenda) {
            return res.status(400).json({
                success: false,
                message: 'Declaração de que não possui receita própria suficiente é obrigatória.'
            });
        }

        // Contar categorias diferentes
        const categorias = new Set();
        Object.keys(req.files).forEach(key => {
            const categoria = key.split('_')[0];
            categorias.add(categoria);
        });

        if (categorias.size < 3) {
            return res.status(400).json({
                success: false,
                message: 'É necessário enviar documentos de pelo menos 3 categorias diferentes.'
            });
        }

        // ========== PASSO 1: CRIAR USUÁRIO NO AUTH ==========
        logger.info(`[PASSO 1/4] Criando usuário no Supabase Auth para o email: ${email}`);
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: senha,
            email_confirm: false, // Usuário precisa confirmar email
            user_metadata: {
                nome_instituicao: nomeInstituicao,
                cnpj: cnpj,
                status_requisicao: 'pendente'
            }
        });

        if (authError) {
            if (authError.message.includes('already registered') || authError.code === '23505') {
                logger.warn(`Tentativa de cadastro com email duplicado: ${email}`);
                return res.status(409).json({ 
                    success: false,
                    message: 'Este endereço de email já está cadastrado.' 
                });
            }
            throw authError;
        }

        if (!authData.user) {
            throw new Error('Criação do usuário no Auth falhou sem retornar um erro explícito.');
        }

        novoUsuarioId = authData.user.id;
        logger.info(`[PASSO 1/4] Usuário criado no Auth com sucesso. ID: ${novoUsuarioId}`);

        // ========== PASSO 2: INSERIR DADOS NA TABELA INSTITUIÇÃO ==========
        logger.info(`[PASSO 2/4] Inserindo dados na tabela instituicao para ID: ${novoUsuarioId}`);
        
        const { error: instituicaoError } = await supabaseAdmin
            .from('instituicao')
            .insert({
                id: novoUsuarioId,
                nome: nomeInstituicao,
                email_contato: email,
                cnpj: cnpj,
                tipo_instituicao: 'ONG', // Valor padrão
                primeiro_login: true,
                status_requisicao: 'pendente'
            });

        if (instituicaoError) throw instituicaoError;
        logger.info('[PASSO 2/4] Dados da instituição inseridos com sucesso.');

        // ========== PASSO 3: INSERIR ENDEREÇO E TELEFONE ==========
        logger.info(`[PASSO 3/4] Inserindo endereço e telefone para ID: ${novoUsuarioId}`);
        
        const { error: enderecoError } = await supabaseAdmin
            .from('endereco')
            .insert({
                instituicao_id: novoUsuarioId,
                cidade: cidade,
                estado: estado
            });

        if (enderecoError) throw enderecoError;

        const telefoneFormatado = telefone.replace(/\D/g, '');
        const { error: telefoneError } = await supabaseAdmin
            .from('telefone')
            .insert({
                instituicao_id: novoUsuarioId,
                numero: telefoneFormatado
            });

        if (telefoneError) throw telefoneError;
        logger.info('[PASSO 3/4] Endereço e telefone inseridos com sucesso.');

        // ========== PASSO 4: UPLOAD DOS DOCUMENTOS ==========
        logger.info(`[PASSO 4/4] Iniciando upload de ${Object.keys(req.files).length} documentos...`);
        
        const bucketName = 'requisicao-documentos';
        const documentosMetadata = [];

        for (const [fieldName, fileArray] of Object.entries(req.files)) {
            const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
            const categoria = fieldName.split('_')[0];
            
            // Gerar nome único para o arquivo
            const fileExt = file.originalname.split('.').pop();
            const fileName = `${novoUsuarioId}/${categoria}/${uuidv4()}.${fileExt}`;
            
            logger.debug(`Fazendo upload do arquivo: ${fileName}`);
            
            const { error: uploadError } = await supabaseAdmin.storage
                .from(bucketName)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                logger.error(`Erro ao fazer upload do arquivo ${fileName}`, uploadError);
                throw uploadError;
            }

            arquivosUpload.push(fileName);
            
            // Salvar metadata do documento
            documentosMetadata.push({
                instituicao_id: novoUsuarioId,
                categoria: categoria,
                nome_arquivo: file.originalname,
                caminho_arquivo: fileName,
                tipo_mime: file.mimetype,
                tamanho_bytes: file.size
            });
        }

        // Inserir metadata dos documentos no banco
        const { error: docError } = await supabaseAdmin
            .from('requisicao_documento')
            .insert(documentosMetadata);

        if (docError) throw docError;

        logger.info(`[PASSO 4/4] Upload de ${arquivosUpload.length} documentos concluído com sucesso.`);

        // ========== CRIAR REGISTRO DE REQUISIÇÃO ==========
        const { error: requisicaoError } = await supabaseAdmin
            .from('requisicao_cadastro')
            .insert({
                instituicao_id: novoUsuarioId,
                status: 'pendente',
                observacoes: 'Aguardando análise da documentação'
            });

        if (requisicaoError) throw requisicaoError;

        logger.info(`✅ Requisição de cadastro processada com sucesso para usuário ID: ${novoUsuarioId}`);

        return res.status(201).json({
            success: true,
            message: 'Requisição enviada com sucesso! Você receberá um email quando sua conta for aprovada.',
            userId: novoUsuarioId
        });

    } catch (error) {
        logger.error('ERRO NO PROCESSAMENTO DA REQUISIÇÃO. Iniciando rollback...', error);

        // ========== LÓGICA DE ROLLBACK ==========
        
        // 1. Deletar arquivos do storage
        if (arquivosUpload.length > 0) {
            logger.warn(`Removendo ${arquivosUpload.length} arquivos do storage...`);
            const { error: deleteStorageError } = await supabaseAdmin.storage
                .from('requisicao-documentos')
                .remove(arquivosUpload);
            
            if (deleteStorageError) {
                logger.error('Erro ao remover arquivos do storage durante rollback', deleteStorageError);
            } else {
                logger.info('Arquivos removidos do storage com sucesso.');
            }
        }

        // 2. Deletar usuário do Auth
        if (novoUsuarioId) {
            logger.warn(`Deletando usuário ID ${novoUsuarioId} do Auth...`);
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
            
            if (deleteAuthError) {
                logger.error(`FALHA CRÍTICA NO ROLLBACK! Usuário órfão: ID=${novoUsuarioId}`, deleteAuthError);
            } else {
                logger.info('Usuário deletado do Auth com sucesso.');
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Erro interno ao processar sua requisição. Tente novamente.'
        });
    }
};

/**
 * Busca todas as requisições pendentes (apenas para admin)
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 */
export const listarRequisicoes = async (req, res) => {
    logger.info('Listando requisições de cadastro...');
    try {
        const { data, error } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select(`
                *,
                instituicao:instituicao_id (
                    nome,
                    email_contato,
                    cnpj
                ),
                documentos:requisicao_documento (
                    categoria,
                    nome_arquivo,
                    caminho_arquivo
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            requisicoes: data
        });

    } catch (error) {
        logger.error('Erro ao listar requisições', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar requisições.'
        });
    }
};

/**
 * Aprova ou rejeita uma requisição (apenas para admin)
 * @param {object} req - Objeto de requisição do Express
 * @param {object} res - Objeto de resposta do Express
 */
export const atualizarStatusRequisicao = async (req, res) => {
    logger.info('Atualizando status de requisição...');
    try {
        const { id } = req.params;
        const { status, observacoes } = req.body;

        if (!['aprovado', 'rejeitado'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Use "aprovado" ou "rejeitado".'
            });
        }

        // Buscar a requisição
        const { data: requisicao, error: fetchError } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select('instituicao_id')
            .eq('id', id)
            .single();

        if (fetchError || !requisicao) {
            return res.status(404).json({
                success: false,
                message: 'Requisição não encontrada.'
            });
        }

        // Atualizar status da requisição
        const { error: updateError } = await supabaseAdmin
            .from('requisicao_cadastro')
            .update({
                status,
                observacoes,
                data_avaliacao: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // Se aprovado, atualizar status da instituição e confirmar email
        if (status === 'aprovado') {
            const { error: instituicaoError } = await supabaseAdmin
                .from('instituicao')
                .update({ status_requisicao: 'aprovado' })
                .eq('id', requisicao.instituicao_id);

            if (instituicaoError) throw instituicaoError;

            // Confirmar email do usuário
            const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
                requisicao.instituicao_id,
                { email_confirm: true }
            );

            if (confirmError) {
                logger.warn('Erro ao confirmar email do usuário', confirmError);
            }
        }

        logger.info(`Requisição ID ${id} ${status} com sucesso.`);

        res.status(200).json({
            success: true,
            message: `Requisição ${status} com sucesso!`
        });

    } catch (error) {
        logger.error('Erro ao atualizar status da requisição', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar requisição.'
        });
    }
};