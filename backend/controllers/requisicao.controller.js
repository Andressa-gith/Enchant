import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { 
    enviarEmailRequisicao, 
    enviarEmailConfirmacao,
    enviarEmailAprovacao,
    enviarEmailRejeicao 
} from './email.controller.js';

/**
 * Processa uma nova requisição de cadastro de ONG com documentos
 * VERSÃO COM EMAIL - Envia documentos por email ao invés de storage
 */
export const processarRequisicaoComEmail = async (req, res) => {
    logger.info('Iniciando processamento de nova requisição de cadastro (com email)...');
    let novoUsuarioId = null;

    if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
        success: false,
        message: 'Nenhum documento foi enviado.'
    });
}

if (!req.files || Object.keys(req.files).length === 0) {
    // ...
}

// ADICIONE ESTA LINHA AQUI
logger.info('Nomes dos campos de ficheiro recebidos:', Object.keys(req.files));

// A validação continua abaixo...
const temDeclaracaoRenda = Object.keys(req.files).some(key => 
    key.startsWith('declaracao-renda_')
);

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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido.'
            });
        }

        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            return res.status(400).json({
                success: false,
                message: 'CNPJ inválido.'
            });
        }

        const senhaRegex = /^(?=.*[A-Z])(?=.*\d.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!senhaRegex.test(senha)) {
            return res.status(400).json({
                success: false,
                message: 'A senha não atende aos requisitos mínimos.'
            });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum documento foi enviado.'
            });
        }

        // Verificar declaração de renda
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
            email_confirm: false,
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
                tipo_instituicao: 'ONG',
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

        // ========== PASSO 4: ENVIAR EMAIL COM DOCUMENTOS ==========
        logger.info(`[PASSO 4/4] Enviando email com ${Object.keys(req.files).length} documentos...`);
        
        // Organizar arquivos por categoria
        const arquivosPorCategoria = {};
        for (const [fieldName, fileArray] of Object.entries(req.files)) {
            const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
            const categoria = fieldName.split('_')[0];
            
            if (!arquivosPorCategoria[categoria]) {
                arquivosPorCategoria[categoria] = [];
            }
            
            arquivosPorCategoria[categoria].push(file);
        }

        // Enviar email para admin com os documentos
        try {
            await enviarEmailRequisicao({
                nomeInstituicao,
                email,
                cnpj,
                telefone,
                cidade,
                estado
            }, arquivosPorCategoria);
            
            logger.info('[PASSO 4/4] Email com documentos enviado com sucesso.');
        } catch (emailError) {
            logger.error('Erro ao enviar email com documentos', emailError);
            // Continuar mesmo se falhar o email
        }

        // ========== CRIAR REGISTRO DE REQUISIÇÃO ==========
        const { error: requisicaoError } = await supabaseAdmin
            .from('requisicao_cadastro')
            .insert({
                instituicao_id: novoUsuarioId,
                status: 'pendente',
                observacoes: 'Aguardando análise da documentação'
            });

        if (requisicaoError) throw requisicaoError;

        // Enviar email de confirmação para a instituição
        try {
            await enviarEmailConfirmacao(email, nomeInstituicao);
        } catch (emailError) {
            logger.warn('Erro ao enviar email de confirmação', emailError);
        }

        logger.info(`✅ Requisição de cadastro processada com sucesso para usuário ID: ${novoUsuarioId}`);

        return res.status(201).json({
            success: true,
            message: 'Requisição enviada com sucesso! Você receberá um email quando sua conta for aprovada.',
            userId: novoUsuarioId
        });

    } catch (error) {
        logger.error('ERRO NO PROCESSAMENTO DA REQUISIÇÃO. Iniciando rollback...', error);

        // ========== LÓGICA DE ROLLBACK ==========
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
 * Atualizar status da requisição (com notificação por email)
 */
export const atualizarStatusRequisicaoComEmail = async (req, res) => {
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

        // Buscar a requisição com dados da instituição
        const { data: requisicao, error: fetchError } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select(`
                *,
                instituicao:instituicao_id (
                    id,
                    nome,
                    email_contato
                )
            `)
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

        // Se aprovado
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

            // Enviar email de aprovação
            try {
                await enviarEmailAprovacao(
                    requisicao.instituicao.email_contato,
                    requisicao.instituicao.nome
                );
            } catch (emailError) {
                logger.warn('Erro ao enviar email de aprovação', emailError);
            }
        } 
        // Se rejeitado
        else if (status === 'rejeitado') {
            const { error: instituicaoError } = await supabaseAdmin
                .from('instituicao')
                .update({ status_requisicao: 'rejeitado' })
                .eq('id', requisicao.instituicao_id);

            if (instituicaoError) throw instituicaoError;

            // Enviar email de rejeição
            try {
                await enviarEmailRejeicao(
                    requisicao.instituicao.email_contato,
                    requisicao.instituicao.nome,
                    observacoes
                );
            } catch (emailError) {
                logger.warn('Erro ao enviar email de rejeição', emailError);
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
            message: 'Erro interno ao atualizar o status da requisição.'
        });
    }
};

// Adicione esta função que estava faltando no seu arquivo

/**
 * Lista todas as requisições de cadastro
 */
export const listarRequisicoes = async (req, res) => {
    logger.info('Listando todas as requisições de cadastro...');
    try {
        const { data: requisicoes, error } = await supabaseAdmin
            .from('requisicao_cadastro')
            .select(`
                id,
                status,
                created_at,
                instituicao:instituicao_id (
                    id,
                    nome,
                    cnpj,
                    email_contato
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            data: requisicoes
        });

    } catch (error) {
        logger.error('Erro ao listar requisições', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao buscar as requisições.'
        });
    }
};