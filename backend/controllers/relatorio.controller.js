import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const brevoClient = SibApiV3Sdk.ApiClient.instance;
const brevoApiKey = brevoClient.authentications['api-key'];
brevoApiKey.apiKey = process.env.BREVO_API_KEY;
const brevoApiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

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

async function enviarEmailNotificacaoComBotoes(requisicao, documentos) {
    try {
        if (!process.env.RESEND_API_KEY) {
            logger.warn('⚠️ RESEND_API_KEY não configurada. Email não será enviado.');
            return;
        }

        const baseUrl = process.env.BASE_URL || 'https://enchant.onrender.com';
        
        const urlAprovar = `${baseUrl}/api/requisicao/aprovar-email/${requisicao.token_aprovacao}`;
        const urlRejeitar = `${baseUrl}/api/requisicao/rejeitar-email/${requisicao.token_aprovacao}`;

        // ✅ Usar supabaseAdmin para gerar signed URLs
        const linksDocumentos = await Promise.all(
            documentos.map(async (doc) => {
                const { data, error } = await supabaseAdmin.storage
                    .from('requisicao-documentos')
                    .createSignedUrl(doc.caminho_arquivo, 604800);

                if (error) {
                    logger.error(`Erro ao gerar signed URL para ${doc.caminho_arquivo}:`, error);
                    return `<li><strong>${doc.categoria_documento}</strong>: ${doc.nome_arquivo_original} (erro ao gerar link)</li>`;
                }

                if (!data || !data.signedUrl) {
                    logger.warn(`Signed URL vazia para ${doc.caminho_arquivo}`);
                    return `<li><strong>${doc.categoria_documento}</strong>: ${doc.nome_arquivo_original} (link indisponível)</li>`;
                }

                return `
                    <li>
                        <strong>${doc.categoria_documento}</strong>: 
                        <a href="${data.signedUrl}" 
                           target="_blank" 
                           download="${doc.nome_arquivo_original}"
                           style="color: #8B5CF6; text-decoration: underline;">
                            ${doc.nome_arquivo_original}
                        </a>
                    </li>
                `;
            })
        );

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6; 
                        color: #1F2937;
                        background: #f5f5f5;
                        padding: 20px;
                        margin: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #FFFFFF;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                        padding: 30px 20px;
                        text-align: center;
                    }
                    .header h1 {
                        color: #FFFFFF;
                        font-size: 24px;
                        margin: 0;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .info-box {
                        background: #F9FAFB;
                        border: 1px solid #E5E7EB;
                        border-radius: 8px;
                        padding: 20px;
                        margin: 20px 0;
                    }
                    .info-box h3 {
                        color: #8B5CF6;
                        font-size: 16px;
                        margin: 0 0 15px 0;
                    }
                    .info-row {
                        padding: 8px 0;
                        border-bottom: 1px solid #E5E7EB;
                    }
                    .info-row:last-child {
                        border-bottom: none;
                    }
                    .info-label {
                        font-weight: 600;
                        color: #6B7280;
                        display: inline-block;
                        width: 100px;
                    }
                    .documents-list {
                        list-style: none;
                        padding: 0;
                        margin: 15px 0 0 0;
                    }
                    .documents-list li {
                        padding: 10px;
                        background: #FFFFFF;
                        border-radius: 6px;
                        margin-bottom: 8px;
                        border-left: 3px solid #8B5CF6;
                        font-size: 14px;
                    }
                    .documents-list strong {
                        color: #8B5CF6;
                        font-size: 11px;
                        text-transform: uppercase;
                    }
                    .button-container {
                        text-align: center;
                        margin: 30px 0;
                        padding: 20px;
                        background: #F9FAFB;
                        border-radius: 8px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        margin: 0 5px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 14px;
                    }
                    .btn-approve {
                        background: #10B981;
                        color: #FFFFFF;
                    }
                    .btn-reject {
                        background: #EF4444;
                        color: #FFFFFF;
                    }
                    .footer {
                        background: #F9FAFB;
                        padding: 20px;
                        text-align: center;
                        border-top: 1px solid #E5E7EB;
                        font-size: 12px;
                        color: #6B7280;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Nova Requisição de Cadastro</h1>
                        <p style="color: #E9D5FF; margin: 5px 0 0 0; font-size: 14px;">
                            Enchant - Painel Administrativo
                        </p>
                    </div>
                    
                    <div class="content">
                        <p style="margin: 0 0 20px 0; font-size: 15px;">
                            Uma nova instituição solicitou cadastro na plataforma. 
                            Os documentos foram validados pela IA. ✅
                        </p>
                        
                        <div class="info-box">
                            <h3>Informações da Instituição</h3>
                            <div class="info-row">
                                <span class="info-label">Nome:</span>
                                <span>${requisicao.nome_instituicao}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Email:</span>
                                <span>${requisicao.email_contato}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">CNPJ:</span>
                                <span>${requisicao.cnpj}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Telefone:</span>
                                <span>${requisicao.telefone}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Localização:</span>
                                <span>${requisicao.cidade} - ${requisicao.estado}</span>
                            </div>
                        </div>
                        
                        <div class="info-box">
                            <h3>Documentos Enviados (${documentos.length})</h3>
                            <ul class="documents-list">
                                ${linksDocumentos.join('')}
                            </ul>
                            <p style="color: #6B7280; font-size: 11px; margin: 10px 0 0 0;">
                                Links válidos por 7 dias
                            </p>
                        </div>
                        
                        <div class="button-container">
                            <p style="margin: 0 0 15px 0; font-size: 15px; font-weight: 600; color: #374151;">
                                Revisar e Decidir
                            </p>
                            <a href="${urlAprovar}" class="button btn-approve">
                                ✅ Aprovar Cadastro
                            </a>
                            <a href="${urlRejeitar}" class="button btn-reject">
                                ❌ Rejeitar Cadastro
                            </a>
                        </div>
                        
                        <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin: 20px 0 0 0;">
                            ID: ${requisicao.id}
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p style="margin: 0;">
                            <strong>Enchant</strong> - Plataforma de Gestão para ONGs
                        </p>
                        <p style="margin: 5px 0 0 0;">
                            Salvador, Bahia • Brasil
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const emailConfig = {
            from: process.env.EMAIL_REMETENTE || 'Enchant <onboarding@resend.dev>',
            to: process.env.EMAIL_DESTINO_ADMIN,
            subject: `Nova Requisição: ${requisicao.nome_instituicao}`,
            html: htmlEmail,
            headers: {
                'X-Entity-Ref-ID': requisicao.id,
            },
            tags: [
                { name: 'category', value: 'requisicao-cadastro' },
                { name: 'instituicao', value: requisicao.nome_instituicao }
            ]
        };

        await resend.emails.send(emailConfig);
        logger.info('✅ Email enviado ao admin (Resend) com sucesso.');
    } catch (error) {
        logger.error('❌ Erro ao enviar email para admin:', error);
    }
}

/**
 * Envia email de aprovação ao usuário
 */
async function enviarEmailAprovacao(requisicao) {
    try {
        if (!process.env.BREVO_API_KEY) {
            logger.warn('⚠️ BREVO_API_KEY não configurada. Email não será enviado.');
            return;
        }

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6; 
                        color: #1F2937;
                        background: linear-gradient(135deg, #F3E8FF 0%, #E0E7FF 100%);
                        padding: 20px;
                    }
                    .email-wrapper {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #FFFFFF;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        padding: 40px 30px;
                        text-align: center;
                    }
                    .header h1 {
                        color: #FFFFFF;
                        font-size: 32px;
                        font-weight: 700;
                        margin-bottom: 8px;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .success-banner {
                        background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
                        border: 2px solid #10B981;
                        border-radius: 12px;
                        padding: 28px;
                        margin-bottom: 30px;
                        text-align: center;
                    }
                    .success-banner h2 {
                        color: #065F46;
                        font-size: 24px;
                        margin-bottom: 12px;
                    }
                    .card {
                        background: #F9FAFB;
                        border: 2px solid #E5E7EB;
                        border-radius: 12px;
                        padding: 24px;
                        margin: 24px 0;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                        color: #FFFFFF;
                        padding: 16px 48px;
                        border-radius: 10px;
                        text-decoration: none;
                        font-weight: 700;
                        font-size: 16px;
                    }
                    .footer {
                        background: #F9FAFB;
                        padding: 24px 30px;
                        text-align: center;
                        border-top: 2px solid #E5E7EB;
                    }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header">
                        <h1>✅ Cadastro Aprovado!</h1>
                        <p style="color: #D1FAE5; font-size: 16px;">Bem-vindo à Plataforma Enchant</p>
                    </div>
                    
                    <div class="content">
                        <div class="success-banner">
                            <h2>🎉 Parabéns, ${requisicao.nome_instituicao}!</h2>
                            <p>Sua requisição foi aprovada com sucesso! Você já pode acessar a plataforma.</p>
                        </div>
                        
                        <div class="card">
                            <h3>🔐 Dados de Acesso</h3>
                            <p><strong>Email:</strong> ${requisicao.email_contato}</p>
                            <p><strong>Senha:</strong> A senha que você definiu no cadastro</p>
                        </div>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/entrar" class="button">
                                🚀 Acessar Plataforma
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Enchant</strong> - Transformando a gestão de instituições sociais</p>
                        <p>Salvador, Bahia • Brasil</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.sender = { 
            name: "Enchant Platform", 
            email: process.env.EMAIL_REMETENTE || "noreply@enchant.com" 
        };
        sendSmtpEmail.to = [{ email: requisicao.email_contato }];
        sendSmtpEmail.subject = "✅ Cadastro Aprovado - Plataforma Enchant";
        sendSmtpEmail.htmlContent = htmlEmail;

        await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
        logger.info('✅ Email de aprovação enviado ao usuário (Brevo).');
    } catch (error) {
        logger.error('❌ Erro ao enviar email de aprovação (Brevo):', error);
    }
}

/**
 * Envia email de rejeição ao usuário
 */
async function enviarEmailRejeicao(requisicao, motivo) {
    try {
        if (!process.env.BREVO_API_KEY) {
            logger.warn('⚠️ BREVO_API_KEY não configurada. Email não será enviado.');
            return;
        }

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #FFFFFF;
                        border-radius: 16px;
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
                        padding: 40px 30px;
                        text-align: center;
                    }
                    .header h1 {
                        color: #FFFFFF;
                        font-size: 28px;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .alert-banner {
                        background: #FEF3C7;
                        border: 2px solid #F59E0B;
                        border-radius: 12px;
                        padding: 24px;
                        margin: 24px 0;
                    }
                    .button {
                        display: inline-block;
                        background: #8B5CF6;
                        color: #FFFFFF;
                        padding: 14px 40px;
                        border-radius: 10px;
                        text-decoration: none;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Requisição Não Aprovada</h1>
                    </div>
                    <div class="content">
                        <p>Olá, <strong>${requisicao.nome_instituicao}</strong>,</p>
                        <p>Infelizmente, sua requisição de cadastro não foi aprovada.</p>
                        
                        <div class="alert-banner">
                            <h3>📋 Motivo da rejeição:</h3>
                            <p>${motivo}</p>
                        </div>
                        
                        <p>Você pode corrigir as informações e enviar uma nova requisição.</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/requisicao" class="button">
                                Fazer Nova Requisição
                            </a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.sender = { 
            name: "Enchant Platform", 
            email: process.env.EMAIL_REMETENTE || "noreply@enchant.com" 
        };
        sendSmtpEmail.to = [{ email: requisicao.email_contato }];
        sendSmtpEmail.subject = "❌ Sua requisição não foi aprovada - Enchant";
        sendSmtpEmail.htmlContent = htmlEmail;

        await brevoApiInstance.sendTransacEmail(sendSmtpEmail);
        logger.info('✅ Email de rejeição enviado ao usuário (Brevo).');
    } catch (error) {
        logger.error('❌ Erro ao enviar email de rejeição (Brevo):', error);
    }
}

/**
 * Envia email de rejeição ao usuário
 */

export const enviarRequisicao = async (req, res) => {
    logger.info('Iniciando processamento de requisição...');
    let requisicaoId = null;
    let arquivosEnviados = [];

    try {
        // ✅ CORRIGIDO: Nomes dos campos atualizados
        const { 
            nome_instituicao,      // era: nomeInstituicao
            tipo_instituicao,      // 🆕 NOVO
            email, 
            cnpj, 
            tel,                   // era: telefone
            cep,                   // 🆕 NOVO
            estado, 
            cidade, 
            bairro,                // 🆕 NOVO
            senha 
        } = req.body;

        // ✅ VALIDAÇÃO ATUALIZADA
        if (!nome_instituicao || !email || !cnpj || !senha) {
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
                nome_instituicao: nome_instituicao,     // ✅
                tipo_instituicao: tipo_instituicao,     // 🆕
                email_contato: email,
                cnpj, 
                telefone: tel,                          // ✅ tel -> telefone (coluna do banco)
                cep: cep,                               // 🆕
                estado, 
                cidade,
                bairro: bairro,                         // 🆕
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
        
        console.log('✅ [APROVAÇÃO] Iniciando processo...');

        if (!token) {
            return res.status(400).send('<h1>❌ Token inválido</h1>');
        }

        const { data: requisicao, error } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('token_aprovacao', token)
            .single();

        if (error || !requisicao) {
            return res.status(404).send(`
                <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: #EF4444;">❌ Requisição não encontrada</h1>
                </body>
                </html>
            `);
        }

        if (requisicao.requisicao_status !== 'pendente') {
            return res.status(400).send(`
                <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: #F59E0B;">⚠️ Já processada</h1>
                </body>
                </html>
            `);
        }

        // ========== CRIAR USUÁRIO ==========
        console.log('✅ [APROVAÇÃO] Criando usuário no Auth...');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: requisicao.email_contato,
            password: requisicao.senha_original,
            email_confirm: true,
            user_metadata: {
                nome_instituicao: requisicao.nome_instituicao,
                cnpj: requisicao.cnpj,
                tipo_instituicao: requisicao.tipo_instituicao || 'ONG' // ✅ Fallback
            }
        });

        if (authError) {
            console.error('❌ [APROVAÇÃO] Erro ao criar usuário:', authError);
            throw authError;
        }
        
        novoUsuarioId = authData.user.id;
        console.log('✅ [APROVAÇÃO] Usuário criado. ID:', novoUsuarioId);

        // ========== AGUARDAR TRIGGER ==========
        console.log('⏳ [APROVAÇÃO] Aguardando trigger criar instituição...');
        let tentativas = 0;
        let instituicaoExiste = false;

        while (tentativas < 15 && !instituicaoExiste) {
            const { data: checkInstituicao, error: checkError } = await supabaseAdmin
                .from('instituicao')
                .select('id, tipo_instituicao')
                .eq('id', novoUsuarioId)
                .maybeSingle();

            if (checkInstituicao && !checkError) {
                console.log('✅ [APROVAÇÃO] Instituição criada:', checkInstituicao);
                instituicaoExiste = true;
            } else {
                tentativas++;
                console.log(`⏳ Tentativa ${tentativas}/15...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!instituicaoExiste) {
            throw new Error('❌ Timeout: Trigger não criou a instituição');
        }

        // ========== ATUALIZAR DADOS COMPLETOS ==========
        console.log('✅ [APROVAÇÃO] Atualizando dados da instituição...');
        const { error: instituicaoError } = await supabaseAdmin
            .from('instituicao')
            .update({
                nome: requisicao.nome_instituicao,
                tipo_instituicao: requisicao.tipo_instituicao || 'ONG',
                cnpj: requisicao.cnpj,
                email_contato: requisicao.email_contato,
                primeiro_login: true
            })
            .eq('id', novoUsuarioId);

        if (instituicaoError) throw instituicaoError;

        // ========== INSERIR ENDEREÇO ==========
        console.log('✅ [APROVAÇÃO] Inserindo endereço...');
        const { error: enderecoError } = await supabaseAdmin
            .from('endereco')
            .insert({
                instituicao_id: novoUsuarioId,
                cep: requisicao.cep,
                bairro: requisicao.bairro,
                cidade: requisicao.cidade,
                estado: requisicao.estado
            });

        if (enderecoError) throw enderecoError;

        // ========== INSERIR TELEFONE ==========
        console.log('✅ [APROVAÇÃO] Inserindo telefone...');
        const { error: telefoneError } = await supabaseAdmin
            .from('telefone')
            .insert({
                instituicao_id: novoUsuarioId,
                numero: requisicao.telefone
            });

        if (telefoneError) throw telefoneError;

        // ========== ATUALIZAR REQUISIÇÃO ==========
        console.log('✅ [APROVAÇÃO] Atualizando status da requisição...');
        await supabase.from('requisicao_cadastro').update({
            requisicao_status: 'aprovada',
            data_processamento: new Date().toISOString(),
            token_aprovacao: null,
            senha_original: null
        }).eq('id', requisicao.id);

        // ========== ENVIAR EMAIL ==========
        console.log('✅ [APROVAÇÃO] Enviando email...');
        await enviarEmailAprovacao(requisicao);

        console.log('✅ [APROVAÇÃO] ✨ PROCESSO CONCLUÍDO! ✨');
        
        res.send(`
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: #10B981;">✅ Requisição Aprovada!</h1>
                <p><strong>${requisicao.nome_instituicao}</strong> foi aprovada com sucesso.</p>
                <p>Um email foi enviado com as instruções de acesso.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 14px;">Você pode fechar esta página.</p>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('❌ [APROVAÇÃO] ERRO:', error);
        
        // ========== ROLLBACK ==========
        if (novoUsuarioId) {
            console.log('🔄 [ROLLBACK] Limpando dados...');
            await supabaseAdmin.from('telefone').delete().eq('instituicao_id', novoUsuarioId);
            await supabaseAdmin.from('endereco').delete().eq('instituicao_id', novoUsuarioId);
            await supabaseAdmin.from('instituicao').delete().eq('id', novoUsuarioId);
            await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
            console.log('🔄 [ROLLBACK] Concluído.');
        }
        
        res.status(500).send(`
            <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: #EF4444;">❌ Erro ao processar aprovação</h1>
                <p>Ocorreu um erro. Por favor, tente novamente.</p>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    ${error.message}
                </p>
            </body>
            </html>
        `);
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


