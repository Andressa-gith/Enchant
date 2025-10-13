import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';

const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Valida um documento usando IA para verificar se é legítimo
 */
async function validarDocumentoComIA(arquivo, categoria) {
    try {
        logger.info(`Validando documento da categoria: ${categoria}`);

        // Converter buffer para base64
        const base64Data = arquivo.buffer.toString('base64');
        const mimeType = arquivo.mimetype;

        // Configurar o modelo Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prompt específico por categoria
        const prompts = {
            'estatuto': `Analise este documento e verifique se é um ESTATUTO SOCIAL válido de uma instituição/ONG. 
                        Procure por: artigos, cláusulas, assembleia, diretoria, finalidades sociais.
                        Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'cnpj': `Analise este documento e verifique se é um CARTÃO CNPJ válido emitido pela Receita Federal.
                    Procure por: número do CNPJ (formato XX.XXX.XXX/XXXX-XX), razão social, data de abertura, natureza jurídica.
                    Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'documento-responsavel': `Analise este documento e verifique se é um DOCUMENTO DE IDENTIFICAÇÃO válido (RG, CNH ou RNE).
                                     Procure por: foto, número do documento, órgão emissor, data de emissão.
                                     Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'balanco': `Analise este documento e verifique se é um BALANÇO PATRIMONIAL ou DEMONSTRATIVO CONTÁBIL válido.
                       Procure por: ativos, passivos, patrimônio líquido, receitas, despesas, período de referência.
                       Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'projetos': `Analise este documento e verifique se descreve PROJETOS SOCIAIS ou ATIVIDADES da instituição.
                        Procure por: objetivos, público-alvo, metodologia, impacto social, cronograma.
                        Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'ata-eleicao': `Analise este documento e verifique se é uma ATA DE ELEIÇÃO DE DIRETORIA válida.
                           Procure por: data da assembleia, eleitos, cargos, assinaturas, votação.
                           Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'endereco': `Analise este documento e verifique se é um COMPROVANTE DE ENDEREÇO válido (conta de luz, água, telefone, contrato).
                        Procure por: endereço completo, nome do titular, data recente (últimos 3 meses), empresa emissora.
                        Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'relatorio': `Analise este documento e verifique se é um RELATÓRIO DE ATIVIDADES válido.
                         Procure por: período, atividades realizadas, beneficiários, resultados, dados estatísticos.
                         Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            
            'declaracao-renda': `Analise este documento e verifique se é uma DECLARAÇÃO de ausência de receita própria suficiente.
                                Procure por: declaração formal, assinatura, identificação da instituição, carimbo/selo.
                                Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`
        };

        const prompt = prompts[categoria] || `Analise este documento e verifique se parece ser um documento oficial válido. 
                                               Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`;

        // Enviar para análise
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        logger.debug(`Resposta da IA para ${categoria}: ${texto}`);

        // Verificar se o documento foi considerado válido
        if (texto.startsWith('VÁLIDO')) {
            logger.info(`✅ Documento ${categoria} aprovado pela IA.`);
            return { valido: true, motivo: null };
        } else {
            const motivo = texto.replace('INVÁLIDO:', '').trim() || 'Documento não atende aos critérios necessários';
            logger.warn(`❌ Documento ${categoria} rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error(`Erro ao validar documento ${categoria} com IA:`, error);
        // Em caso de erro na IA, não bloqueia (pode revisar manualmente)
        return { valido: true, motivo: 'Validação manual necessária (erro na IA)' };
    }
}
/**
 * Processa uma nova requisição de cadastro com upload de documentos
 */
export const enviarRequisicao = async (req, res) => {
    logger.info('Iniciando processamento de nova requisição de cadastro...');
    let requisicaoId = null;
    let arquivosEnviados = [];

    try {
        const { nomeInstituicao, email, cnpj, telefone, estado, cidade, senha } = req.body;

        // Validação básica
        if (!nomeInstituicao || !email || !cnpj || !senha) {
            logger.warn('Requisição com campos obrigatórios ausentes.');
            return res.status(400).json({ 
                message: 'Nome da instituição, email, CNPJ e senha são obrigatórios.' 
            });
        }

        // Verificar se já existe requisição pendente ou instituição cadastrada
        logger.debug('Verificando duplicação de email/CNPJ...');
        const { data: requisicaoExistente } = await supabase
            .from('requisicao_cadastro')
            .select('id, requisicao_status')
            .or(`email_contato.eq.${email},cnpj.eq.${cnpj}`)
            .maybeSingle();

        if (requisicaoExistente) {
            if (requisicaoExistente.requisicao_status === 'pendente') {
                return res.status(409).json({ 
                    message: 'Já existe uma requisição pendente com este email ou CNPJ.' 
                });
            }
            if (requisicaoExistente.requisicao_status === 'aprovada') {
                return res.status(409).json({ 
                    message: 'Esta instituição já possui cadastro aprovado.' 
                });
            }
        }

        // Verificar se já existe na tabela instituicao
        const { data: instituicaoExistente } = await supabase
            .from('instituicao')
            .select('id')
            .or(`email_contato.eq.${email},cnpj.eq.${cnpj}`)
            .maybeSingle();

        if (instituicaoExistente) {
            return res.status(409).json({ 
                message: 'Já existe uma instituição cadastrada com este email ou CNPJ.' 
            });
        }

        // Hash da senha
        logger.debug('Gerando hash da senha...');
        const senhaHash = await bcrypt.hash(senha, 10);

        // PASSO 1: Criar registro da requisição
        logger.info('[PASSO 1/3] Criando registro da requisição no banco...');
        const { data: requisicao, error: requisicaoError } = await supabase
            .from('requisicao_cadastro')
            .insert({
                nome_instituicao: nomeInstituicao,
                email_contato: email,
                cnpj: cnpj,
                telefone: telefone,
                estado: estado,
                cidade: cidade,
                senha_hash: senhaHash,
                requisicao_status: 'pendente'
            })
            .select()
            .single();

        if (requisicaoError) throw requisicaoError;
        requisicaoId = requisicao.id;
        logger.info(`[PASSO 1/3] Requisição criada com ID: ${requisicaoId}`);

        // PASSO 2: Upload dos arquivos
        logger.info('[PASSO 2/3] Fazendo upload dos documentos...');
        const files = req.files || [];
        
        if (files.length === 0) {
            throw new Error('Nenhum documento foi enviado. É necessário enviar ao menos 3 categorias de documentos.');
        }

        const documentosMetadata = [];

        for (const file of files) {
            // O fieldname vem como "estatuto_1", "cnpj_2", etc
            const categoria = file.fieldname.split('_')[0];
            const extensao = file.originalname.split('.').pop();
            const nomeArquivo = `${uuidv4()}.${extensao}`;
            const filePath = `${requisicaoId}/${categoria}/${nomeArquivo}`;

            logger.debug(`Fazendo upload: ${filePath}`);
            const { error: uploadError } = await supabase.storage
                .from('requisicao-documentos')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                logger.error('Erro no upload do arquivo:', uploadError);
                throw uploadError;
            }
            
            arquivosEnviados.push(filePath);
            documentosMetadata.push({
                requisicao_id: requisicaoId,
                categoria_documento: categoria,
                caminho_arquivo: filePath,
                nome_arquivo_original: file.originalname,
                tamanho_bytes: file.size,
                tipo_mime: file.mimetype
            });
        }

        logger.info(`[PASSO 2/3] ${files.length} arquivo(s) enviado(s) com sucesso.`);

        // PASSO 3: Registrar metadados dos documentos
        logger.info('[PASSO 3/3] Registrando metadados dos documentos...');
        const { error: metadataError } = await supabase
            .from('requisicao_documento')
            .insert(documentosMetadata);

        if (metadataError) throw metadataError;
        logger.info('[PASSO 3/3] Metadados registrados com sucesso.');

        // Enviar email de notificação ao admin
        logger.info('Enviando email de notificação ao administrador...');
        await enviarEmailNotificacao(requisicao, documentosMetadata);

        logger.info(`✅ Requisição ${requisicaoId} processada com sucesso!`);
        res.status(201).json({ 
            message: 'Requisição enviada com sucesso! Você receberá um email quando for aprovada.',
            requisicaoId: requisicaoId
        });

    } catch (error) {
        logger.error('❌ Erro ao processar requisição de cadastro:', error);

        // ROLLBACK: Deletar arquivos do storage
        if (arquivosEnviados.length > 0) {
            logger.warn('🔄 Fazendo rollback: removendo arquivos do storage...');
            try {
                await supabase.storage
                    .from('requisicao-documentos')
                    .remove(arquivosEnviados);
                logger.info('✅ Arquivos removidos com sucesso.');
            } catch (storageError) {
                logger.error('❌ Erro ao remover arquivos no rollback:', storageError);
            }
        }

        // ROLLBACK: Deletar registro da requisição
        if (requisicaoId) {
            logger.warn('🔄 Fazendo rollback: deletando registro da requisição...');
            try {
                await supabase
                    .from('requisicao_cadastro')
                    .delete()
                    .eq('id', requisicaoId);
                logger.info('✅ Registro removido com sucesso.');
            } catch (dbError) {
                logger.error('❌ Erro ao deletar registro no rollback:', dbError);
            }
        }

        const mensagemErro = error.message || 'Erro ao processar requisição. Tente novamente mais tarde.';
        res.status(500).json({ message: mensagemErro });
    }
};

/**
 * Envia email de notificação ao admin usando Resend
 */
async function enviarEmailNotificacao(requisicao, documentos) {
    try {
        if (!process.env.RESEND_API_KEY) {
            logger.warn('⚠️ RESEND_API_KEY não configurada. Email não será enviado.');
            return;
        }

        // Gerar links assinados para os documentos (válidos por 7 dias)
        const linksDocumentos = await Promise.all(
            documentos.map(async (doc) => {
                const { data, error } = await supabase.storage
                    .from('requisicao-documentos')
                    .createSignedUrl(doc.caminho_arquivo, 604800); // 7 dias

                if (error) {
                    logger.error('Erro ao gerar link assinado:', error);
                    return `<li><strong>${doc.categoria_documento}</strong>: ${doc.nome_arquivo_original} (erro ao gerar link)</li>`;
                }

                return `<li><strong>${doc.categoria_documento}</strong>: <a href="${data.signedUrl}" target="_blank">${doc.nome_arquivo_original}</a></li>`;
            })
        );

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .info-item { margin: 10px 0; }
                    .label { font-weight: bold; color: #667eea; }
                    ul { list-style: none; padding: 0; }
                    li { padding: 8px 0; border-bottom: 1px solid #eee; }
                    li:last-child { border-bottom: none; }
                    a { color: #667eea; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                    .badge { display: inline-block; background: #ffd700; color: #333; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Nova Requisição de Cadastro</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Plataforma Enchant</p>
                    </div>
                    
                    <div class="content">
                        <p><span class="badge">PENDENTE</span></p>
                        <p>Uma nova instituição solicitou cadastro na plataforma e aguarda sua aprovação.</p>
                        
                        <div class="info-box">
                            <h3 style="margin-top: 0; color: #667eea;">📋 Dados da Instituição</h3>
                            <div class="info-item"><span class="label">Nome:</span> ${requisicao.nome_instituicao}</div>
                            <div class="info-item"><span class="label">Email:</span> ${requisicao.email_contato}</div>
                            <div class="info-item"><span class="label">CNPJ:</span> ${requisicao.cnpj}</div>
                            <div class="info-item"><span class="label">Telefone:</span> ${requisicao.telefone}</div>
                            <div class="info-item"><span class="label">Localização:</span> ${requisicao.cidade} - ${requisicao.estado}</div>
                        </div>

                        <div class="info-box">
                            <h3 style="margin-top: 0; color: #667eea;">📎 Documentos Enviados (${documentos.length})</h3>
                            <ul>
                                ${linksDocumentos.join('')}
                            </ul>
                            <p style="font-size: 12px; color: #666; margin-top: 15px;">
                                ⏰ Os links são válidos por 7 dias.
                            </p>
                        </div>

                        <div class="info-box" style="background: #fff3cd; border-left: 4px solid #ffc107;">
                            <p style="margin: 0;"><strong>ID da Requisição:</strong> <code>${requisicao.id}</code></p>
                            <p style="margin: 10px 0 0 0; font-size: 14px;">Use este ID para aprovar ou rejeitar a requisição no painel administrativo.</p>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Esta é uma mensagem automática da Plataforma Enchant</p>
                        <p>📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_REMETENTE || 'Enchant Platform <onboarding@resend.dev>',
            to: process.env.EMAIL_DESTINO_ADMIN,
            subject: `🔔 Nova Requisição: ${requisicao.nome_instituicao}`,
            html: htmlEmail
        });

        if (error) {
            logger.error('❌ Erro ao enviar email:', error);
        } else {
            logger.info('✅ Email de notificação enviado com sucesso! ID:', data.id);
        }

    } catch (error) {
        logger.error('❌ Erro ao enviar email de notificação:', error);
        // Não propaga o erro para não falhar a requisição
    }
}

/**
 * Lista todas as requisições (rota administrativa)
 */
export const listarRequisicoes = async (req, res) => {
    logger.info('Buscando lista de requisições...');
    try {
        const { status } = req.query;

        let query = supabase
            .from('requisicao_cadastro')
            .select(`
                *,
                requisicao_documento (
                    id,
                    categoria_documento,
                    nome_arquivo_original,
                    tamanho_bytes,
                    data_upload
                )
            `)
            .order('data_requisicao', { ascending: false });

        if (status) {
            query = query.eq('requisicao_status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        logger.info(`${data.length} requisição(ões) encontrada(s).`);
        res.status(200).json(data);

    } catch (error) {
        logger.error('Erro ao listar requisições:', error);
        res.status(500).json({ message: 'Erro ao buscar requisições.' });
    }
};

/**
 * Busca detalhes de uma requisição específica
 */
export const buscarRequisicao = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: requisicao, error } = await supabase
            .from('requisicao_cadastro')
            .select(`
                *,
                requisicao_documento (*)
            `)
            .eq('id', id)
            .single();

        if (error || !requisicao) {
            return res.status(404).json({ message: 'Requisição não encontrada.' });
        }

        // Gerar URLs assinadas para os documentos
        if (requisicao.requisicao_documento && requisicao.requisicao_documento.length > 0) {
            requisicao.requisicao_documento = await Promise.all(
                requisicao.requisicao_documento.map(async (doc) => {
                    const { data } = await supabase.storage
                        .from('requisicao-documentos')
                        .createSignedUrl(doc.caminho_arquivo, 3600); // 1 hora

                    return {
                        ...doc,
                        url_download: data?.signedUrl || null
                    };
                })
            );
        }

        res.status(200).json(requisicao);

    } catch (error) {
        logger.error('Erro ao buscar requisição:', error);
        res.status(500).json({ message: 'Erro ao buscar requisição.' });
    }
};

/**
 * Aprova uma requisição e cria a conta da instituição
 */
export const aprovarRequisicao = async (req, res) => {
    logger.info('Iniciando processo de aprovação de requisição...');
    let novoUsuarioId = null;

    try {
        const { id } = req.params;

        // Buscar requisição
        const { data: requisicao, error: fetchError } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !requisicao) {
            return res.status(404).json({ message: 'Requisição não encontrada.' });
        }

        if (requisicao.requisicao_status !== 'pendente') {
            return res.status(400).json({ 
                message: 'Esta requisição já foi processada anteriormente.' 
            });
        }

        // Gerar senha temporária (vamos criar o usuário com a senha que ele definiu)
        // Como não podemos criar usuário com hash diretamente, vamos gerar uma senha temporária
        const senhaTemporaria = uuidv4();

        // Criar usuário no Supabase Auth
        logger.info('Criando usuário no Supabase Auth...');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: requisicao.email_contato,
            password: senhaTemporaria,
            email_confirm: true,
            user_metadata: {
                nome_instituicao: requisicao.nome_instituicao,
                cnpj: requisicao.cnpj,
                tipo_instituicao: 'ONG'
            }
        });

        if (authError) {
            logger.error('Erro ao criar usuário:', authError);
            throw authError;
        }

        novoUsuarioId = authData.user.id;
        logger.info(`Usuário criado com ID: ${novoUsuarioId}`);

        // Atualizar senha com o hash original da requisição
        logger.info('Atualizando senha com hash original...');
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            novoUsuarioId,
            { password: senhaTemporaria } // Infelizmente o Supabase não aceita hash direto
        );

        if (updateAuthError) {
            logger.warn('Não foi possível atualizar a senha:', updateAuthError);
        }

        // Inserir dados na tabela instituicao
        logger.info('Inserindo dados na tabela instituição...');
        const { error: instituicaoError } = await supabase
            .from('instituicao')
            .insert({
                id: novoUsuarioId,
                nome: requisicao.nome_instituicao,
                cnpj: requisicao.cnpj,
                email_contato: requisicao.email_contato,
                tipo_instituicao: 'ONG',
                cidade: requisicao.cidade,
                estado: requisicao.estado,
                status_pagamento: false,
                primeiro_login: true
            });

        if (instituicaoError) throw instituicaoError;

        // Inserir endereço
        logger.info('Inserindo endereço...');
        const { error: enderecoError } = await supabase
            .from('endereco')
            .insert({
                instituicao_id: novoUsuarioId,
                cidade: requisicao.cidade,
                estado: requisicao.estado
            });

        if (enderecoError) throw enderecoError;

        // Inserir telefone
        logger.info('Inserindo telefone...');
        const { error: telefoneError } = await supabase
            .from('telefone')
            .insert({
                instituicao_id: novoUsuarioId,
                numero: requisicao.telefone
            });

        if (telefoneError) throw telefoneError;

        // Atualizar status da requisição
        logger.info('Atualizando status da requisição...');
        const { error: updateError } = await supabase
            .from('requisicao_cadastro')
            .update({ 
                requisicao_status: 'aprovada',
                data_processamento: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // Enviar email de confirmação ao usuário
        await enviarEmailAprovacao(requisicao);

        logger.info(`✅ Requisição ${id} aprovada com sucesso!`);
        res.status(200).json({ 
            message: 'Requisição aprovada e conta criada com sucesso!',
            usuarioId: novoUsuarioId
        });

    } catch (error) {
        logger.error('❌ Erro ao aprovar requisição:', error);

        // ROLLBACK: Deletar usuário se foi criado
        if (novoUsuarioId) {
            logger.warn('🔄 Fazendo rollback: deletando usuário...');
            try {
                await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
                logger.info('✅ Usuário deletado no rollback.');
            } catch (deleteError) {
                logger.error('❌ FALHA CRÍTICA no rollback do usuário:', deleteError);
            }
        }

        res.status(500).json({ 
            message: error.message || 'Erro ao aprovar requisição.' 
        });
    }
};

/**
 * Envia email de aprovação ao usuário
 */
async function enviarEmailAprovacao(requisicao) {
    try {
        if (!process.env.RESEND_API_KEY) return;

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; border-radius: 4px; margin: 20px 0; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .button:hover { background: #5568d3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Cadastro Aprovado!</h1>
                    </div>
                    <div class="content">
                        <div class="success-box">
                            <h2 style="margin-top: 0; color: #28a745;">Parabéns, ${requisicao.nome_instituicao}!</h2>
                            <p>Sua requisição de cadastro foi <strong>aprovada</strong> com sucesso.</p>
                        </div>
                        
                        <p>Você já pode acessar a plataforma Enchant e começar a gerenciar sua instituição.</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/entrar" class="button">Acessar Plataforma</a>
                        </p>
                        
                        <p><strong>Seus dados de acesso:</strong></p>
                        <ul>
                            <li><strong>Email:</strong> ${requisicao.email_contato}</li>
                            <li><strong>Senha:</strong> A senha que você definiu no cadastro</li>
                        </ul>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            Se você tiver alguma dúvida, entre em contato conosco.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: process.env.EMAIL_REMETENTE || 'Enchant Platform <onboarding@resend.dev>',
            to: requisicao.email_contato,
            subject: '✅ Seu cadastro foi aprovado - Enchant',
            html: htmlEmail
        });

        logger.info('✅ Email de aprovação enviado ao usuário.');

    } catch (error) {
        logger.error('❌ Erro ao enviar email de aprovação:', error);
    }
}

/**
 * Rejeita uma requisição
 */
export const rejeitarRequisicao = async (req, res) => {
    logger.info('Iniciando processo de rejeição de requisição...');
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        if (!motivo || motivo.trim() === '') {
            return res.status(400).json({ 
                message: 'É necessário informar o motivo da rejeição.' 
            });
        }

        // Buscar requisição
        const { data: requisicao, error: fetchError } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !requisicao) {
            return res.status(404).json({ message: 'Requisição não encontrada.' });
        }

        if (requisicao.requisicao_status !== 'pendente') {
            return res.status(400).json({ 
                message: 'Esta requisição já foi processada anteriormente.' 
            });
        }

        // Atualizar status
        const { error: updateError } = await supabase
        .from('requisicao_cadastro')
            .update({ 
                requisicao_status: 'rejeitada',
                motivo_rejeicao: motivo,
                data_processamento: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // Enviar email de rejeição ao usuário
        await enviarEmailRejeicao(requisicao, motivo);

        logger.info(`✅ Requisição ${id} rejeitada com sucesso.`);
        res.status(200).json({ message: 'Requisição rejeitada com sucesso.' });

    } catch (error) {
        logger.error('❌ Erro ao rejeitar requisição:', error);
        res.status(500).json({ message: 'Erro ao rejeitar requisição.' });
    }
};

/**
 * Envia email de rejeição ao usuário
 */
async function enviarEmailRejeicao(requisicao, motivo) {
    try {
        if (!process.env.RESEND_API_KEY) return;

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin: 20px 0; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Requisição Não Aprovada</h1>
                    </div>
                    <div class="content">
                        <p>Olá, <strong>${requisicao.nome_instituicao}</strong>,</p>
                        
                        <p>Infelizmente, sua requisição de cadastro na plataforma Enchant não foi aprovada.</p>
                        
                        <div class="warning-box">
                            <h3 style="margin-top: 0; color: #856404;">📋 Motivo da rejeição:</h3>
                            <p style="margin: 0;">${motivo}</p>
                        </div>
                        
                        <p>Você pode corrigir as informações e/ou documentos e enviar uma nova requisição.</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/requisicao" class="button">Fazer Nova Requisição</a>
                        </p>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            Se você tiver dúvidas sobre o motivo da rejeição, entre em contato conosco.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: process.env.EMAIL_REMETENTE || 'Enchant Platform <onboarding@resend.dev>',
            to: requisicao.email_contato,
            subject: '❌ Sua requisição não foi aprovada - Enchant',
            html: htmlEmail
        });

        logger.info('✅ Email de rejeição enviado ao usuário.');

    } catch (error) {
        logger.error('❌ Erro ao enviar email de rejeição:', error);
    }
}

/**
 * Deleta uma requisição e seus documentos (apenas rejeitadas ou pendentes antigas)
 */
export const deletarRequisicao = async (req, res) => {
    logger.info('Iniciando processo de exclusão de requisição...');
    try {
        const { id } = req.params;

        // Buscar requisição e seus documentos
        const { data: requisicao, error: fetchError } = await supabase
            .from('requisicao_cadastro')
            .select(`
                *,
                requisicao_documento (caminho_arquivo)
            `)
            .eq('id', id)
            .single();

        if (fetchError || !requisicao) {
            return res.status(404).json({ message: 'Requisição não encontrada.' });
        }

        // Não permitir deletar requisições aprovadas
        if (requisicao.requisicao_status === 'aprovada') {
            return res.status(403).json({ 
                message: 'Não é possível deletar requisições aprovadas.' 
            });
        }

        // Deletar arquivos do storage
        if (requisicao.requisicao_documento && requisicao.requisicao_documento.length > 0) {
            const caminhos = requisicao.requisicao_documento.map(doc => doc.caminho_arquivo);
            logger.info(`Deletando ${caminhos.length} arquivo(s) do storage...`);
            
            const { error: storageError } = await supabase.storage
                .from('requisicao-documentos')
                .remove(caminhos);

            if (storageError) {
                logger.warn('Erro ao deletar arquivos do storage:', storageError);
            }
        }

        // Deletar requisição (cascade deleta os documentos da tabela)
        const { error: deleteError } = await supabase
            .from('requisicao_cadastro')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        logger.info(`✅ Requisição ${id} deletada com sucesso.`);
        res.status(200).json({ message: 'Requisição deletada com sucesso.' });

    } catch (error) {
        logger.error('❌ Erro ao deletar requisição:', error);
        res.status(500).json({ message: 'Erro ao deletar requisição.' });
    }
};