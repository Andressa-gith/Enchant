import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



/**
 * Gera um token seguro para aprovação
 */
function gerarTokenAprovacao() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Valida um documento usando IA
 */
async function validarDocumentoComIA(arquivo, categoria) {
    try {
        logger.info(`Validando documento da categoria: ${categoria}`);

        const base64Data = arquivo.buffer.toString('base64');
        const mimeType = arquivo.mimetype;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompts = {
            'estatuto': `Analise este documento e verifique se é um ESTATUTO SOCIAL válido de uma instituição/ONG. 
                        Procure por: artigos, cláusulas, assembleia, diretoria, finalidades sociais.
                        Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'cnpj': `Analise este documento e verifique se é um CARTÃO CNPJ válido emitido pela Receita Federal.
                    Procure por: número do CNPJ, razão social, data de abertura, natureza jurídica.
                    Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'documento-responsavel': `Analise este documento e verifique se é um DOCUMENTO DE IDENTIFICAÇÃO válido (RG, CNH ou RNE).
                                     Procure por: foto, número do documento, órgão emissor.
                                     Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'balanco': `Analise este documento e verifique se é um BALANÇO PATRIMONIAL válido.
                       Procure por: ativos, passivos, patrimônio líquido, receitas, despesas.
                       Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'projetos': `Analise este documento e verifique se descreve PROJETOS SOCIAIS.
                        Procure por: objetivos, público-alvo, metodologia, impacto social.
                        Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'ata-eleicao': `Analise este documento e verifique se é uma ATA DE ELEIÇÃO válida.
                           Procure por: data da assembleia, eleitos, cargos, assinaturas.
                           Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'endereco': `Analise este documento e verifique se é um COMPROVANTE DE ENDEREÇO válido.
                        Procure por: endereço completo, nome do titular, data recente.
                        Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'relatorio': `Analise este documento e verifique se é um RELATÓRIO DE ATIVIDADES válido.
                         Procure por: período, atividades realizadas, beneficiários, resultados.
                         Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`,
            'declaracao-renda': `Analise este documento e verifique se é uma DECLARAÇÃO válida.
                                Procure por: declaração formal, assinatura, identificação da instituição.
                                Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo breve]".`
        };

        const prompt = prompts[categoria] || `Analise este documento e verifique se é válido. Responda APENAS "VÁLIDO" ou "INVÁLIDO: [motivo]".`;

        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType, data: base64Data } },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        if (texto.startsWith('VÁLIDO')) {
            logger.info(`✅ Documento ${categoria} aprovado pela IA.`);
            return { valido: true, motivo: null };
        } else {
            const motivo = texto.replace('INVÁLIDO:', '').trim() || 'Documento não atende aos critérios';
            logger.warn(`❌ Documento ${categoria} rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error(`Erro ao validar documento ${categoria}:`, error);
        return { valido: true, motivo: 'Validação manual necessária (erro na IA)' };
    }
}

/**
 * Envia email de notificação ao admin COM BOTÕES
 */
async function enviarEmailNotificacaoComBotoes(requisicao, documentos) {
    try {
        if (!process.env.RESEND_API_KEY) {
            logger.warn('⚠️ RESEND_API_KEY não configurada.');
            return;
        }

        const baseUrl = process.env.BASE_URL || 'https://enchant.onrender.com';
        const urlAprovar = `${baseUrl}/api/requisicao/aprovar-email/${requisicao.token_aprovacao}`;
        const urlRejeitar = `${baseUrl}/api/requisicao/rejeitar-email/${requisicao.token_aprovacao}`;

        const linksDocumentos = await Promise.all(
            documentos.map(async (doc) => {
                const { data, error } = await supabase.storage
                    .from('requisicao-documentos')
                    .createSignedUrl(doc.caminho_arquivo, 604800);

                if (error) {
                    return `<li><strong>${doc.categoria_documento}</strong>: ${doc.nome_arquivo_original}</li>`;
                }

                return `<li><strong>${doc.categoria_documento}</strong>: <a href="${data.signedUrl}" target="_blank" style="color: #8B5CF6;">${doc.nome_arquivo_original}</a></li>`;
            })
        );

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #F3E8FF 0%, #E0E7FF 100%); padding: 20px; }
                    .email-wrapper { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
                    .header { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #FFFFFF; font-size: 28px; font-weight: 700; }
                    .content { padding: 40px 30px; }
                    .card { background: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; padding: 24px; margin: 24px 0; }
                    .card h3 { color: #8B5CF6; font-size: 18px; margin-bottom: 20px; }
                    .info-row { padding: 12px 0; border-bottom: 1px solid #E5E7EB; }
                    .info-label { font-weight: 600; color: #8B5CF6; }
                    ul { list-style: none; padding: 0; }
                    li { padding: 10px; background: #FFFFFF; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #8B5CF6; }
                    .action-section { background: linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%); border-radius: 12px; padding: 32px 24px; margin: 30px 0; text-align: center; }
                    .button { display: inline-block; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 10px; }
                    .button-approve { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; }
                    .button-reject { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #FFFFFF; }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header">
                        <h1>🎉 Nova Requisição</h1>
                        <p style="color: #E9D5FF;">Plataforma Enchant</p>
                    </div>
                    <div class="content">
                        <div class="card">
                            <h3>📋 Dados da Instituição</h3>
                            <div class="info-row"><span class="info-label">Nome:</span> ${requisicao.nome_instituicao}</div>
                            <div class="info-row"><span class="info-label">Email:</span> ${requisicao.email_contato}</div>
                            <div class="info-row"><span class="info-label">CNPJ:</span> ${requisicao.cnpj}</div>
                            <div class="info-row"><span class="info-label">Telefone:</span> ${requisicao.telefone}</div>
                            <div class="info-row"><span class="info-label">Localização:</span> ${requisicao.cidade} - ${requisicao.estado}</div>
                        </div>
                        <div class="card">
                            <h3>📎 Documentos (${documentos.length})</h3>
                            <ul>${linksDocumentos.join('')}</ul>
                        </div>
                        <div class="action-section">
                            <h3 style="color: #5B21B6;">🔍 Analisar Requisição</h3>
                            <p style="color: #6B7280; margin-bottom: 20px;">Revise os documentos e escolha:</p>
                            <a href="${urlAprovar}" class="button button-approve">✅ Aprovar</a>
                            <a href="${urlRejeitar}" class="button button-reject">❌ Rejeitar</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: process.env.EMAIL_REMETENTE || 'Enchant <onboarding@resend.dev>',
            to: process.env.EMAIL_DESTINO_ADMIN,
            subject: `🔔 Nova Requisição: ${requisicao.nome_instituicao}`,
            html: htmlEmail
        });

        logger.info('✅ Email enviado ao admin.');
    } catch (error) {
        logger.error('❌ Erro ao enviar email:', error);
    }
}

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
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #F3E8FF 0%, #E0E7FF 100%); padding: 20px; }
                    .email-wrapper { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
                    .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
                    .header h1 { color: #FFFFFF; font-size: 32px; }
                    .content { padding: 40px 30px; }
                    .success-banner { background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); border: 2px solid #10B981; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 30px; }
                    .success-banner h2 { color: #065F46; font-size: 24px; margin-bottom: 12px; }
                    .card { background: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; padding: 24px; margin: 24px 0; }
                    .card h3 { color: #8B5CF6; margin-bottom: 16px; }
                    .credential-item { background: #FFFFFF; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #8B5CF6; }
                    .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: #FFFFFF; padding: 16px 48px; border-radius: 10px; text-decoration: none; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header">
                        <h1>✅ Cadastro Aprovado!</h1>
                        <p style="color: #D1FAE5;">Bem-vindo à Enchant</p>
                    </div>
                    <div class="content">
                        <div class="success-banner">
                            <h2>🎉 Parabéns, ${requisicao.nome_instituicao}!</h2>
                            <p style="color: #047857;">Sua requisição foi aprovada com sucesso!</p>
                        </div>
                        <div class="card">
                            <h3>🔐 Dados de Acesso</h3>
                            <div class="credential-item">
                                <strong>Email:</strong> ${requisicao.email_contato}
                            </div>
                            <div class="credential-item">
                                <strong>Senha:</strong> A senha que você definiu no cadastro
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/entrar" class="button">
                                🚀 Acessar Plataforma
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: process.env.EMAIL_REMETENTE || 'Enchant <onboarding@resend.dev>',
            to: requisicao.email_contato,
            subject: '✅ Cadastro Aprovado - Enchant',
            html: htmlEmail
        });

        logger.info('✅ Email de aprovação enviado.');
    } catch (error) {
        logger.error('❌ Erro ao enviar email:', error);
    }
}

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

// ========== CONTROLLERS EXPORTADOS ==========

/**
 * Processa nova requisição
 */
export const enviarRequisicao = async (req, res) => {
    logger.info('Iniciando processamento de requisição...');
    let requisicaoId = null;
    let arquivosEnviados = [];

    try {
        const { nomeInstituicao, email, cnpj, telefone, estado, cidade, senha } = req.body;

        if (!nomeInstituicao || !email || !cnpj || !senha) {
            return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
        }

        const { data: requisicaoExistente } = await supabase
            .from('requisicao_cadastro')
            .select('id, requisicao_status')
            .or(`email_contato.eq.${email},cnpj.eq.${cnpj}`)
            .maybeSingle();

        if (requisicaoExistente?.requisicao_status === 'pendente') {
            return res.status(409).json({ message: 'Já existe uma requisição pendente.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const tokenAprovacao = gerarTokenAprovacao();

        const files = req.files || [];
        if (files.length === 0) {
            throw new Error('Envie pelo menos 3 categorias de documentos.');
        }

        logger.info(`🤖 Validando ${files.length} documento(s)...`);
        const documentosInvalidos = [];

        for (const file of files) {
            const categoria = file.fieldname.split('_')[0];
            const validacao = await validarDocumentoComIA(file, categoria);

            if (!validacao.valido) {
                documentosInvalidos.push({
                    categoria,
                    arquivo: file.originalname,
                    motivo: validacao.motivo
                });
            }
        }

        if (documentosInvalidos.length > 0) {
            const mensagemErro = documentosInvalidos.map(doc =>
                `• ${doc.categoria}: ${doc.arquivo} - ${doc.motivo}`
            ).join('\n');

            return res.status(400).json({
                message: 'Um ou mais documentos inválidos:',
                detalhes: mensagemErro,
                documentos_invalidos: documentosInvalidos
            });
        }

        const { data: requisicao, error: requisicaoError } = await supabase
            .from('requisicao_cadastro')
            .insert({
                nome_instituicao: nomeInstituicao,
                email_contato: email,
                cnpj, telefone, estado, cidade,
                senha_hash: senhaHash,
                senha_original: senha,
                requisicao_status: 'pendente',
                token_aprovacao: tokenAprovacao
            })
            .select()
            .single();

        if (requisicaoError) throw requisicaoError;
        requisicaoId = requisicao.id;

        const documentosMetadata = [];
        for (const file of files) {
            const categoria = file.fieldname.split('_')[0];
            const extensao = file.originalname.split('.').pop();
            const filePath = `${requisicaoId}/${categoria}/${uuidv4()}.${extensao}`;

            const { error: uploadError } = await supabase.storage
                .from('requisicao-documentos')
                .upload(filePath, file.buffer, { contentType: file.mimetype });

            if (uploadError) throw uploadError;

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

        const { error: metadataError } = await supabase
            .from('requisicao_documento')
            .insert(documentosMetadata);

        if (metadataError) throw metadataError;

        await enviarEmailNotificacaoComBotoes(requisicao, documentosMetadata);

        logger.info(`✅ Requisição ${requisicaoId} processada!`);
        res.status(201).json({
            message: 'Requisição enviada com sucesso!',
            requisicaoId
        });

    } catch (error) {
        logger.error('❌ Erro:', error);

        if (arquivosEnviados.length > 0) {
            await supabase.storage.from('requisicao-documentos').remove(arquivosEnviados);
        }
        if (requisicaoId) {
            await supabase.from('requisicao_cadastro').delete().eq('id', requisicaoId);
        }

        res.status(500).json({ message: error.message || 'Erro ao processar requisição.' });
    }
};

/**
 * Listar todas as requisições (para painel admin)
 */
export const listarRequisicoes = async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = supabase
            .from('requisicao_cadastro')
            .select('*')
            .order('data_criacao', { ascending: false });

        if (status) {
            query = query.eq('requisicao_status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        logger.error('❌ Erro ao listar requisições:', error);
        res.status(500).json({ message: 'Erro ao listar requisições.' });
    }
};

/**
 * Buscar detalhes de uma requisição específica
 */
export const buscarRequisicao = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('requisicao_cadastro')
            .select(`
                *,
                requisicao_documento (*)
            `)
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Requisição não encontrada.' });
        }

        res.status(200).json(data);
    } catch (error) {
        logger.error('❌ Erro ao buscar requisição:', error);
        res.status(500).json({ message: 'Erro ao buscar requisição.' });
    }
};

/**
 * Aprovar via email
 */
export const aprovarRequisicaoPorEmail = async (req, res) => {
    let novoUsuarioId = null;

    try {
        const { token } = req.params;

        const { data: requisicao, error } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('token_aprovacao', token)
            .single();

        if (error || !requisicao || requisicao.requisicao_status !== 'pendente') {
            return res.status(404).send('<h1>Requisição não encontrada ou já processada</h1>');
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: requisicao.email_contato,
            password: requisicao.senha_original,
            email_confirm: true,
            user_metadata: {
                nome_instituicao: requisicao.nome_instituicao,
                cnpj: requisicao.cnpj
            }
        });

        if (authError) throw authError;
        novoUsuarioId = authData.user.id;

        await supabase.from('instituicao').insert({
            id: novoUsuarioId,
            nome: requisicao.nome_instituicao,
            cnpj: requisicao.cnpj,
            email_contato: requisicao.email_contato,
            tipo_instituicao: 'ONG',
            cidade: requisicao.cidade,
            estado: requisicao.estado,
            primeiro_login: true
        });

        await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cidade: requisicao.cidade,
            estado: requisicao.estado
        });

        await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero: requisicao.telefone
        });

        await supabase.from('requisicao_cadastro').update({
            requisicao_status: 'aprovada',
            data_processamento: new Date().toISOString(),
            token_aprovacao: null,
            senha_original: null
        }).eq('id', requisicao.id);

        await enviarEmailAprovacao(requisicao);

        res.send(`
            <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: #10B981;">✅ Requisição Aprovada!</h1>
                <p><strong>${requisicao.nome_instituicao}</strong> foi aprovada.</p>
                <p>Um email foi enviado com as instruções de acesso.</p>
            </body>
            </html>
        `);

    } catch (error) {
        logger.error('Erro ao aprovar:', error);
        if (novoUsuarioId) {
            await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
        }
        res.status(500).send('<h1>Erro ao processar aprovação</h1>');
    }
};

/**
 * Rejeitar via email (mostra formulário)
 */
export const rejeitarRequisicaoPorEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const { data: requisicao } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('token_aprovacao', token)
            .single();

        if (!requisicao || requisicao.requisicao_status !== 'pendente') {
            return res.status(404).send('<h1>Requisição não encontrada</h1>');
        }

        res.send(`
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial; padding: 40px; max-width: 500px; margin: 0 auto;">
                <h1 style="color: #EF4444;">❌ Rejeitar Requisição</h1>
                <p><strong>Instituição:</strong> ${requisicao.nome_instituicao}</p>
                <form action="/api/requisicao/rejeitar-email/${token}/confirmar" method="POST">
                    <label><strong>Motivo da Rejeição:</strong></label><br>
                    <textarea name="motivo" required style="width: 100%; min-height: 100px; padding: 10px; margin-top: 10px;"></textarea>
                    <br><br>
                    <button type="submit" style="background: #EF4444; color: white; padding: 12px 30px; border: none; border-radius: 8px; cursor: pointer;">Confirmar Rejeição</button>
                </form>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('<h1>Erro</h1>');
    }
};

/**
 * Confirmar rejeição com motivo
 */
export const confirmarRejeicaoPorEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const { motivo } = req.body;

        const { data: requisicao } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('token_aprovacao', token)
            .single();

        if (!requisicao) {
            return res.status(404).send('<h1>Requisição não encontrada</h1>');
        }

        await supabase.from('requisicao_cadastro').update({
            requisicao_status: 'rejeitada',
            motivo_rejeicao: motivo,
            data_processamento: new Date().toISOString(),
            token_aprovacao: null
        }).eq('id', requisicao.id);

        await enviarEmailRejeicao(requisicao, motivo);

        res.send(`
            <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: #EF4444;">❌ Requisição Rejeitada</h1>
                <p><strong>${requisicao.nome_instituicao}</strong> foi rejeitada.</p>
                <p>Um email foi enviado com o motivo.</p>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('<h1>Erro</h1>');
    }
};

/**
 * Aprovar requisição (via painel admin)
 */
export const aprovarRequisicao = async (req, res) => {
    let novoUsuarioId = null;

    try {
        const { id } = req.params;

        const { data: requisicao, error } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !requisicao) {
            return res.status(404).json({ message: 'Requisição não encontrada.' });
        }

        if (requisicao.requisicao_status !== 'pendente') {
            return res.status(400).json({ message: 'Esta requisição já foi processada.' });
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: requisicao.email_contato,
            password: requisicao.senha_original,
            email_confirm: true,
            user_metadata: {
                nome_instituicao: requisicao.nome_instituicao,
                cnpj: requisicao.cnpj
            }
        });

        if (authError) throw authError;
        novoUsuarioId = authData.user.id;

        await supabase.from('instituicao').insert({
            id: novoUsuarioId,
            nome: requisicao.nome_instituicao,
            cnpj: requisicao.cnpj,
            email_contato: requisicao.email_contato,
            tipo_instituicao: 'ONG',
            cidade: requisicao.cidade,
            estado: requisicao.estado,
            primeiro_login: true
        });

        await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cidade: requisicao.cidade,
            estado: requisicao.estado
        });

        await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero: requisicao.telefone
        });

        await supabase.from('requisicao_cadastro').update({
            requisicao_status: 'aprovada',
            data_processamento: new Date().toISOString(),
            token_aprovacao: null,
            senha_original: null
        }).eq('id', requisicao.id);

        await enviarEmailAprovacao(requisicao);

        logger.info(`✅ Requisição ${id} aprovada com sucesso.`);
        res.status(200).json({ message: 'Requisição aprovada com sucesso!' });

    } catch (error) {
        logger.error('❌ Erro ao aprovar requisição:', error);
        if (novoUsuarioId) {
            await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
        }
        res.status(500).json({ message: 'Erro ao aprovar requisição.' });
    }
};

/**
 * Rejeitar requisição (via painel admin)
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

        const { error: updateError } = await supabase
            .from('requisicao_cadastro')
            .update({ 
                requisicao_status: 'rejeitada',
                motivo_rejeicao: motivo,
                data_processamento: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        await enviarEmailRejeicao(requisicao, motivo);

        logger.info(`✅ Requisição ${id} rejeitada com sucesso.`);
        res.status(200).json({ message: 'Requisição rejeitada com sucesso.' });

    } catch (error) {
        logger.error('❌ Erro ao rejeitar requisição:', error);
        res.status(500).json({ message: 'Erro ao rejeitar requisição.' });
    }
};

/**
 * Deletar requisição
 */
export const deletarRequisicao = async (req, res) => {
    logger.info('Iniciando processo de exclusão de requisição...');
    try {
        const { id } = req.params;

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

        if (requisicao.requisicao_status === 'aprovada') {
            return res.status(403).json({ 
                message: 'Não é possível deletar requisições aprovadas.' 
            });
        }

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