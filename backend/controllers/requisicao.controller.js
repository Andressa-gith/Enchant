import supabase from '../db/supabaseClient.js';
import supabaseAdmin from '../db/supabaseAdmin.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ CONFIGURAR NODEMAILER (GMAIL)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

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
            logger.info(` Documento ${categoria} aprovado pela IA.`);
            return { valido: true, motivo: null };
        } else {
            const motivo = texto.replace('INVÁLIDO:', '').trim() || 'Documento não atende aos critérios';
            logger.warn(` Documento ${categoria} rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error(`Erro ao validar documento ${categoria}:`, error);
        return { valido: true, motivo: 'Validação manual necessária (erro na IA)' };
    }
}



/**
 * Envia email para o ADMIN com botões de aprovação/rejeição (RESEND)
 */
/**
 * Envia email para o ADMIN com botões de aprovação/rejeição (RESEND)
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
                const { data, error } = await supabaseAdmin.storage
                    .from('requisicao-documentos')
                    .createSignedUrl(doc.caminho_arquivo, 604800);

                if (error || !data?.signedUrl) {
                    return `<li><strong>${doc.categoria_documento}</strong>: ${doc.nome_arquivo_original} (link indisponível)</li>`;
                }

                return `
                    <li style="padding: 10px; background: #FFFFFF; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #8B4513;">
                        <strong style="color: #693B11; font-size: 11px; text-transform: uppercase; font-family: 'Lexend Deca', sans-serif;">${doc.categoria_documento}</strong>: 
                        <a href="${data.signedUrl}" target="_blank" style="color: #8B4513; text-decoration: underline; font-family: 'Lexend Deca', sans-serif;">
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
                <link href="https://fonts.googleapis.com/css2?family=Passion+One:wght@400;700&family=Lexend+Deca:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="font-family: 'Lexend Deca', sans-serif; background-color: #F5F5F5; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 2px solid #8B4513;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #8B4513 0%, #693B11 100%); padding: 35px 20px; text-align: center;">
                        <h1 style="font-family: 'Passion One', cursive; color: #FFFFFF; font-size: 36px; margin: 0; font-weight: 400; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">Nova Requisição de Cadastro</h1>
                        <p style="font-family: 'Lexend Deca', sans-serif; color: #F5E6D3; margin: 10px 0 0 0; font-size: 15px; font-weight: 300;">Enchant - Painel Administrativo</p>
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 35px 25px;">
                        <p style="margin: 0 0 25px 0; font-size: 15px; color: #333; font-family: 'Lexend Deca', sans-serif; line-height: 1.6;">
                            Uma nova instituição solicitou cadastro na plataforma Enchant. Todos os documentos foram validados automaticamente pela IA 
                        </p>
                        
                        <!-- Info Card -->
                        <div style="background: linear-gradient(135deg, #F5E6D3 0%, #E8D4BA 100%); border: 2px solid #8B4513; border-radius: 10px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(139,69,19,0.1);">
                            <h3 style="color: #693B11; font-size: 20px; margin: 0 0 18px 0; font-family: 'Lexend Deca', sans-serif; font-weight: 600; border-bottom: 2px solid #8B4513; padding-bottom: 10px;"> Informações da Instituição</h3>
                            <p style="margin: 8px 0; font-family: 'Lexend Deca', sans-serif; color: #333; font-size: 14px; line-height: 1.8;"><strong style="color: #693B11;">Nome:</strong> ${requisicao.nome_instituicao}</p>
                            <p style="margin: 8px 0; font-family: 'Lexend Deca', sans-serif; color: #333; font-size: 14px; line-height: 1.8;"><strong style="color: #693B11;">Email:</strong> ${requisicao.email_contato}</p>
                            <p style="margin: 8px 0; font-family: 'Lexend Deca', sans-serif; color: #333; font-size: 14px; line-height: 1.8;"><strong style="color: #693B11;">CNPJ:</strong> ${requisicao.cnpj}</p>
                            <p style="margin: 8px 0; font-family: 'Lexend Deca', sans-serif; color: #333; font-size: 14px; line-height: 1.8;"><strong style="color: #693B11;">Telefone:</strong> ${requisicao.telefone}</p>
                            <p style="margin: 8px 0; font-family: 'Lexend Deca', sans-serif; color: #333; font-size: 14px; line-height: 1.8;"><strong style="color: #693B11;">Localização:</strong> ${requisicao.cidade} - ${requisicao.estado}</p>
                        </div>
                        
                        <!-- Documents Card -->
                        <div style="background: linear-gradient(135deg, #F5E6D3 0%, #E8D4BA 100%); border: 2px solid #8B4513; border-radius: 10px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(139,69,19,0.1);">
                            <h3 style="color: #693B11; font-size: 20px; margin: 0 0 18px 0; font-family: 'Lexend Deca', sans-serif; font-weight: 600; border-bottom: 2px solid #8B4513; padding-bottom: 10px;"> Documentos Enviados (${documentos.length})</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                ${linksDocumentos.join('')}
                            </ul>
                            <p style="color: #666; font-size: 11px; margin: 12px 0 0 0; font-family: 'Lexend Deca', sans-serif; font-style: italic;"> Links válidos por 7 dias</p>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="text-align: center; margin: 35px 0; padding: 25px; background: linear-gradient(135deg, #F5E6D3 0%, #E8D4BA 100%); border-radius: 10px; border: 2px solid #8B4513; box-shadow: 0 2px 8px rgba(139,69,19,0.1);">
                            <p style="margin: 0 0 20px 0; font-size: 17px; font-weight: 600; color: #693B11; font-family: 'Lexend Deca', sans-serif;"> Revisar e Decidir</p>
                            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                <a href="${urlAprovar}" style="display: inline-block; background: linear-gradient(135deg, #8B4513 0%, #693B11 100%); color: #FFFFFF; padding: 14px 35px; margin: 5px; border-radius: 8px; text-decoration: none; font-weight: 600; font-family: 'Lexend Deca', sans-serif; font-size: 15px; box-shadow: 0 4px 12px rgba(139,69,19,0.3); transition: transform 0.2s;"> Aprovar Requisição</a>
                                <a href="${urlRejeitar}" style="display: inline-block; background: transparent; color: #8B4513; border: 2px solid #8B4513; padding: 14px 35px; margin: 5px; border-radius: 8px; text-decoration: none; font-weight: 600; font-family: 'Lexend Deca', sans-serif; font-size: 15px; transition: all 0.2s;"> Rejeitar Requisição</a>
                            </div>
                        </div>
                        
                        <p style="text-align: center; color: #999; font-size: 12px; margin: 25px 0 0 0; font-family: 'Lexend Deca', sans-serif; font-style: italic;">ID da Requisição: ${requisicao.id}</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: linear-gradient(135deg, #8B4513 0%, #693B11 100%); padding: 25px; text-align: center;">
                        <p style="margin: 0; color: #F5E6D3; font-size: 13px; font-family: 'Lexend Deca', sans-serif;"><strong style="color: #FFFFFF; font-size: 16px;">Enchant</strong></p>
                        <p style="margin: 5px 0 0 0; color: #F5E6D3; font-size: 12px; font-family: 'Lexend Deca', sans-serif;">Salvador, Bahia • Brasil</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await resend.emails.send({
            from: 'Enchant <onboarding@resend.dev>',
            to: process.env.EMAIL_DESTINO_ADMIN,
            subject: ` Nova Requisição: ${requisicao.nome_instituicao}`,
            html: htmlEmail
        });

        logger.info('✅ Email enviado ao admin (Resend).');
    } catch (error) {
        logger.error('❌ Erro ao enviar email ao admin:', error);
    }
}

/**
 * Envia email de APROVAÇÃO para o USUÁRIO (NODEMAILER)
 */
async function enviarEmailAprovacao(requisicao) {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            logger.warn('⚠️ Credenciais de email não configuradas.');
            return;
        }

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <link href="https://fonts.googleapis.com/css2?family=Passion+One:wght@400;700&family=Lexend+Deca:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="font-family: 'Lexend Deca', sans-serif; background-color: #F5F5F5; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1.5px solid #4E3629;">
                    
                    <!-- Header Success -->
                    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="font-family: 'Passion One', cursive; color: #FFFFFF; font-size: 32px; font-weight: 400; margin: 0 0 8px 0;">✅ Cadastro Aprovado!</h1>
                        <p style="font-family: 'Lexend Deca', sans-serif; color: #D1FAE5; font-size: 16px; margin: 0;">Bem-vindo à Plataforma Enchant</p>
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 40px 30px;">
                        <!-- Welcome Message -->
                        <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); border: 2px solid #10B981; border-radius: 8px; padding: 28px; margin-bottom: 30px; text-align: center;">
                            <h2 style="color: #065F46; font-size: 24px; margin: 0 0 12px 0; font-family: 'Lexend Deca', sans-serif; font-weight: 600;">🎉 Parabéns, ${requisicao.nome_instituicao}!</h2>
                            <p style="color: #047857; font-size: 15px; margin: 0; font-family: 'Lexend Deca', sans-serif;">Sua requisição foi aprovada com sucesso! Você já pode começar a usar a plataforma.</p>
                        </div>
                        
                        <!-- Login Info -->
                        <div style="background: #F9E7D2; border: 2px solid #C79E76; border-radius: 8px; padding: 24px; margin: 24px 0;">
                            <h3 style="color: #693B11; font-size: 18px; margin: 0 0 16px 0; font-family: 'Lexend Deca', sans-serif; font-weight: 600;">🔐 Dados de Acesso</h3>
                            <div style="background: #FFFFFF; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #C79E76;">
                                <p style="color: #757575; font-size: 13px; font-weight: 600; margin: 0 0 4px 0; font-family: 'Lexend Deca', sans-serif;">EMAIL DE LOGIN</p>
                                <p style="color: #4E3629; font-size: 16px; font-weight: 600; margin: 0; font-family: 'Lexend Deca', sans-serif;">${requisicao.email_contato}</p>
                            </div>
                            <div style="background: #FFFFFF; padding: 16px; border-radius: 8px; border-left: 3px solid #C79E76;">
                                <p style="color: #757575; font-size: 13px; font-weight: 600; margin: 0 0 4px 0; font-family: 'Lexend Deca', sans-serif;">SENHA</p>
                                <p style="color: #4E3629; font-size: 16px; font-weight: 600; margin: 0; font-family: 'Lexend Deca', sans-serif;">A senha que você definiu no cadastro</p>
                            </div>
                        </div>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/entrar" 
                               style="display: inline-block; background: #e2ccae; color: #3d2106; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; font-family: 'Lexend Deca', sans-serif; box-shadow: 0 4px 12px rgba(202,174,141,0.4);">
                                🚀 Acessar Plataforma
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #C79E76; margin: 32px 0;">
                        
                        <!-- Next Steps -->
                        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 2px solid #F59E0B; border-radius: 8px; padding: 24px;">
                            <h3 style="color: #92400E; font-size: 18px; margin: 0 0 16px 0; font-family: 'Lexend Deca', sans-serif; font-weight: 600;">📋 Próximos Passos</h3>
                            <ol style="color: #78350F; font-size: 15px; margin: 0; padding-left: 20px; font-family: 'Lexend Deca', sans-serif;">
                                <li style="margin-bottom: 12px;">Clique no botão acima para acessar a plataforma</li>
                                <li style="margin-bottom: 12px;">Faça login com seu email e senha</li>
                                <li style="margin-bottom: 12px;">Complete as informações do seu perfil</li>
                                <li style="margin-bottom: 12px;">Configure a foto de perfil da instituição</li>
                                <li>Explore todas as funcionalidades disponíveis</li>
                            </ol>
                        </div>
                        
                        <p style="color: #757575; font-size: 14px; text-align: center; margin-top: 24px; font-family: 'Lexend Deca', sans-serif;">💬 Precisa de ajuda? Responda este email!</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #F9E7D2; padding: 24px 30px; text-align: center; border-top: 2px solid #C79E76;">
                        <p style="color: #4E3629; font-size: 13px; margin: 4px 0; font-family: 'Lexend Deca', sans-serif;"><strong style="color: #693B11;">Enchant</strong> - Transformando a gestão de instituições sociais</p>
                        <p style="color: #757575; font-size: 13px; margin: 4px 0; font-family: 'Lexend Deca', sans-serif;">Salvador, Bahia • Brasil</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"Enchant Platform" <${process.env.EMAIL_USER}>`,
            to: requisicao.email_contato,
            subject: '✅ Cadastro Aprovado - Plataforma Enchant',
            html: htmlEmail
        };

        await transporter.sendMail(mailOptions);
        logger.info(`✅ Email de aprovação enviado para ${requisicao.email_contato} (Nodemailer)`);
    } catch (error) {
        logger.error('❌ Erro ao enviar email de aprovação:', error);
        console.error('Detalhes:', error.message);
    }
}

/**
 * Envia email de REJEIÇÃO para o USUÁRIO (NODEMAILER)
 */
async function enviarEmailRejeicao(requisicao, motivo) {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            logger.warn('⚠️ Credenciais de email não configuradas.');
            return;
        }

        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <link href="https://fonts.googleapis.com/css2?family=Passion+One:wght@400;700&family=Lexend+Deca:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            </head>
            <body style="font-family: 'Lexend Deca', sans-serif; background-color: #F5F5F5; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1.5px solid #4E3629;">
                    
                    <!-- Header Error -->
                    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="font-family: 'Passion One', cursive; color: #FFFFFF; font-size: 28px; font-weight: 400; margin: 0;">❌ Requisição Não Aprovada</h1>
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 40px 30px;">
                        <p style="font-size: 15px; color: #535151; margin: 0 0 20px 0; font-family: 'Lexend Deca', sans-serif;">Olá, <strong style="color: #4E3629;">${requisicao.nome_instituicao}</strong>,</p>
                        
                        <p style="font-size: 15px; color: #535151; margin: 0 0 20px 0; font-family: 'Lexend Deca', sans-serif;">Infelizmente, sua requisição de cadastro na plataforma Enchant não foi aprovada.</p>
                        
                        <!-- Reason Box -->
                        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 2px solid #F59E0B; border-radius: 8px; padding: 24px; margin: 24px 0;">
                            <h3 style="color: #92400E; font-size: 18px; margin: 0 0 12px 0; font-family: 'Lexend Deca', sans-serif; font-weight: 600;">📋 Motivo da rejeição:</h3>
                            <p style="color: #78350F; font-size: 15px; margin: 0; line-height: 1.7; font-family: 'Lexend Deca', sans-serif;">${motivo}</p>
                        </div>
                        
                        <p style="font-size: 15px; color: #535151; margin: 0 0 30px 0; font-family: 'Lexend Deca', sans-serif;">Você pode corrigir as informações e/ou documentos e enviar uma nova requisição.</p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center;">
                            <a href="${process.env.BASE_URL || 'https://enchant.onrender.com'}/requisicao" 
                               style="display: inline-block; background: #e2ccae; color: #3d2106; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-family: 'Lexend Deca', sans-serif; font-size: 14px; box-shadow: 0 4px 12px rgba(202,174,141,0.4);">
                                Fazer Nova Requisição
                            </a>
                        </div>
                        
                        <p style="color: #757575; font-size: 14px; text-align: center; margin-top: 30px; font-family: 'Lexend Deca', sans-serif;">💬 Se tiver dúvidas, responda este email.</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #F9E7D2; padding: 24px; text-align: center; border-top: 2px solid #C79E76;">
                        <p style="margin: 0; color: #4E3629; font-size: 12px; font-family: 'Lexend Deca', sans-serif;"><strong>Enchant</strong> - Salvador, Bahia • Brasil</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"Enchant Platform" <${process.env.EMAIL_USER}>`,
            to: requisicao.email_contato,
            subject: '❌ Sua requisição não foi aprovada - Enchant',
            html: htmlEmail
        };

        await transporter.sendMail(mailOptions);
        logger.info(`✅ Email de rejeição enviado para ${requisicao.email_contato} (Nodemailer)`);
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
        const { 
            nome_instituicao,
            tipo_instituicao,
            email, 
            cnpj, 
            tel,
            cep,
            estado, 
            cidade, 
            bairro,
            senha 
        } = req.body;

        if (!nome_instituicao || !email || !cnpj || !senha) {
            return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
        }

        // ✅ NOVA VALIDAÇÃO - Verifica CNPJ e EMAIL já cadastrados
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        // Verifica se já existe requisição APROVADA com este CNPJ
        const { data: requisicaoExistenteCNPJ } = await supabase
            .from('requisicao_cadastro')
            .select('id, requisicao_status, nome_instituicao')
            .eq('cnpj', cnpjLimpo)
            .eq('requisicao_status', 'aprovada')
            .maybeSingle();

        if (requisicaoExistenteCNPJ) {
            return res.status(409).json({ 
                message: `Este CNPJ já está cadastrado no sistema para a instituição "${requisicaoExistenteCNPJ.nome_instituicao}".`,
                campo: 'cnpj'
            });
        }

        // Verifica se já existe requisição APROVADA com este EMAIL
        const { data: requisicaoExistenteEmail } = await supabase
            .from('requisicao_cadastro')
            .select('id, requisicao_status, nome_instituicao')
            .eq('email_contato', email.toLowerCase())
            .eq('requisicao_status', 'aprovada')
            .maybeSingle();

        if (requisicaoExistenteEmail) {
            return res.status(409).json({ 
                message: `Este email já está cadastrado no sistema para a instituição "${requisicaoExistenteEmail.nome_instituicao}".`,
                campo: 'email'
            });
        }

        // Verifica se já existe requisição PENDENTE com este EMAIL ou CNPJ
        const { data: requisicaoPendente } = await supabase
            .from('requisicao_cadastro')
            .select('id, requisicao_status, cnpj, email_contato')
            .or(`email_contato.eq.${email.toLowerCase()},cnpj.eq.${cnpjLimpo}`)
            .eq('requisicao_status', 'pendente')
            .maybeSingle();

        if (requisicaoPendente) {
            const campoIgual = requisicaoPendente.cnpj === cnpjLimpo ? 'CNPJ' : 'Email';
            return res.status(409).json({ 
                message: `Já existe uma requisição pendente com este ${campoIgual}. Aguarde a análise ou entre em contato conosco.`,
                campo: campoIgual.toLowerCase()
            });
        }

        // Verifica se o CNPJ já está na tabela de instituições (já aprovado e ativo)
        const { data: instituicaoExistente } = await supabase
            .from('instituicao')
            .select('id, nome')
            .eq('cnpj', cnpjLimpo)
            .maybeSingle();

        if (instituicaoExistente) {
            return res.status(409).json({ 
                message: `Este CNPJ já está cadastrado para a instituição "${instituicaoExistente.nome}".`,
                campo: 'cnpj'
            });
        }

        // Verifica se o EMAIL já está no auth do Supabase
        const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
        const emailExisteNoAuth = authUser.users.some(
            user => user.email?.toLowerCase() === email.toLowerCase()
        );

        if (emailExisteNoAuth) {
            return res.status(409).json({ 
                message: 'Este email já está cadastrado no sistema. Tente fazer login ou recuperar sua senha.',
                campo: 'email'
            });
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
                nome_instituicao: nome_instituicao,
                tipo_instituicao: tipo_instituicao,
                email_contato: email.toLowerCase(),
                cnpj: cnpjLimpo, 
                telefone: tel,
                cep: cep,
                estado, 
                cidade,
                bairro: bairro,
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
        console.log('✅ [APROVAÇÃO] Token recebido:', token);

        if (!token) {
            console.error('❌ [APROVAÇÃO] Token não fornecido na URL');
            return res.status(400).send('<h1>❌ Token inválido</h1>');
        }

        const { data: requisicao, error } = await supabase
            .from('requisicao_cadastro')
            .select('*')
            .eq('token_aprovacao', token)
            .single();

        console.log('✅ [APROVAÇÃO] Resultado da busca:', { 
            encontrou: !!requisicao, 
            erro: error?.message,
            status: requisicao?.requisicao_status 
        });

        if (error || !requisicao) {
            console.error('❌ [APROVAÇÃO] Requisição não encontrada. Erro:', error);
            return res.status(404).send(`
                <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: #EF4444;">❌ Requisição não encontrada</h1>
                    <p>Este link pode ter expirado ou já foi processado.</p>
                    <p style="color: #999; font-size: 12px;">Token: ${token}</p>
                </body>
                </html>
            `);
        }

        if (requisicao.requisicao_status !== 'pendente') {
            console.warn('⚠️ [APROVAÇÃO] Requisição já processada:', requisicao.requisicao_status);
            return res.status(400).send(`
                <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: #F59E0B;">⚠️ Requisição já processada</h1>
                    <p>Status atual: <strong>${requisicao.requisicao_status}</strong></p>
                </body>
                </html>
            `);
        }

        console.log('✅ [APROVAÇÃO] Criando usuário no Auth...');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: requisicao.email_contato,
            password: requisicao.senha_original,
            email_confirm: true,
            user_metadata: {
                nome_instituicao: requisicao.nome_instituicao,
                cnpj: requisicao.cnpj
            }
        });

        if (authError) {
            console.error('❌ [APROVAÇÃO] Erro ao criar usuário:', authError);
            throw authError;
        }
        
        novoUsuarioId = authData.user.id;
        console.log('✅ [APROVAÇÃO] Usuário criado. ID:', novoUsuarioId);

        console.log('✅ [APROVAÇÃO] Inserindo dados nas tabelas...');
        
        // Instituição
        await supabase.from('instituicao').insert({
            id: novoUsuarioId,
            nome: requisicao.nome_instituicao,
            tipo_instituicao: requisicao.tipo_instituicao,
            cnpj: requisicao.cnpj,
            email_contato: requisicao.email_contato,
        });

        // Endereço
        await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cep: requisicao.cep,
            bairro: requisicao.bairro,
            cidade: requisicao.cidade,
            estado: requisicao.estado
        });

        // Telefone
        await supabase.from('telefone').insert({
            instituicao_id: novoUsuarioId,
            numero: requisicao.telefone
        });

        console.log('✅ [APROVAÇÃO] Atualizando status da requisição...');
        await supabase.from('requisicao_cadastro').update({
            requisicao_status: 'aprovada',
            data_processamento: new Date().toISOString(),
            token_aprovacao: null,
            senha_original: null
        }).eq('id', requisicao.id);

        console.log('✅ [APROVAÇÃO] Enviando email de confirmação...');
        await enviarEmailAprovacao(requisicao);

        console.log('✅ [APROVAÇÃO] Processo concluído com sucesso!');
        
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
        console.error('❌ [APROVAÇÃO] Erro catastrófico:', error);
        
        if (novoUsuarioId) {
            console.log('🔄 [ROLLBACK] Deletando usuário órfão:', novoUsuarioId);
            await supabaseAdmin.auth.admin.deleteUser(novoUsuarioId);
        }
        
        res.status(500).send(`
            <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1 style="color: #EF4444;">❌ Erro ao processar aprovação</h1>
                <p>Ocorreu um erro inesperado. Por favor, tente novamente.</p>
                <p style="color: #999; font-size: 12px;">${error.message}</p>
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
            tipo_instituicao: requisicao.tipo_instituicao || 'ONG',
            cidade: requisicao.cidade,
            estado: requisicao.estado,
            primeiro_login: true
        });

        await supabase.from('endereco').insert({
            instituicao_id: novoUsuarioId,
            cep: requisicao.cep,
            bairro: requisicao.bairro,
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
}
