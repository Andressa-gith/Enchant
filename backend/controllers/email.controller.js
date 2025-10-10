import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Configuração do transportador de email
 * Você precisará configurar suas credenciais SMTP
 */
const criarTransportador = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true para 465, false para outras portas
        auth: {
            user: process.env.SMTP_USER, // seu email
            pass: process.env.SMTP_PASS  // sua senha ou app password
        }
    });
};

/**
 * Enviar email com documentos de requisição
 */
export const enviarEmailRequisicao = async (dadosInstituicao, arquivos) => {
    try {
        const transportador = criarTransportador();

        // Preparar anexos
        const anexos = [];
        for (const [categoria, arquivosCategoria] of Object.entries(arquivos)) {
            arquivosCategoria.forEach((arquivo, index) => {
                anexos.push({
                    filename: `${categoria}_${index + 1}_${arquivo.originalname}`,
                    content: arquivo.buffer,
                    contentType: arquivo.mimetype
                });
            });
        }

        // HTML do email
        const htmlEmail = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Nova Requisição de Cadastro - Enchant</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #555; margin-top: 0;">Dados da Instituição</h3>
                    <p><strong>Nome:</strong> ${dadosInstituicao.nomeInstituicao}</p>
                    <p><strong>Email:</strong> ${dadosInstituicao.email}</p>
                    <p><strong>CNPJ:</strong> ${dadosInstituicao.cnpj}</p>
                    <p><strong>Telefone:</strong> ${dadosInstituicao.telefone}</p>
                    <p><strong>Cidade/Estado:</strong> ${dadosInstituicao.cidade}/${dadosInstituicao.estado}</p>
                    <p><strong>Data da Requisição:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                </div>

                <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #0056b3; margin-top: 0;">Documentos Anexados</h3>
                    <ul>
                        ${Object.entries(arquivos).map(([categoria, files]) => 
                            `<li><strong>${categoria}:</strong> ${files.length} arquivo(s)</li>`
                        ).join('')}
                    </ul>
                    <p style="margin-bottom: 0;"><em>Total de arquivos: ${anexos.length}</em></p>
                </div>

                <div style="border-top: 2px solid #ddd; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
                    <p>Esta é uma notificação automática do sistema Enchant.</p>
                    <p>Para aprovar ou rejeitar esta requisição, acesse o painel administrativo.</p>
                </div>
            </div>
        `;

        // Configurar email
        const mailOptions = {
            from: `"Sistema Enchant" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
            subject: `Nova Requisição de Cadastro - ${dadosInstituicao.nomeInstituicao}`,
            html: htmlEmail,
            attachments: anexos
        };

        // Enviar email
        const info = await transportador.sendMail(mailOptions);
        logger.info(`Email de requisição enviado: ${info.messageId}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Erro ao enviar email de requisição', error);
        throw error;
    }
};

/**
 * Enviar email de confirmação para a instituição
 */
export const enviarEmailConfirmacao = async (email, nomeInstituicao) => {
    try {
        const transportador = criarTransportador();

        const htmlEmail = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Requisição Recebida com Sucesso!</h2>
                
                <p>Olá, <strong>${nomeInstituicao}</strong>!</p>
                
                <p>Recebemos sua requisição de cadastro na plataforma Enchant.</p>
                
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #155724; margin-top: 0;">Próximos Passos</h3>
                    <ol style="color: #155724; margin: 10px 0;">
                        <li>Nossa equipe irá analisar os documentos enviados</li>
                        <li>O processo de análise pode levar até 5 dias úteis</li>
                        <li>Você receberá um email quando sua conta for aprovada</li>
                        <li>Após a aprovação, você poderá fazer login na plataforma</li>
                    </ol>
                </div>

                <p>Se você tiver alguma dúvida, não hesite em nos contatar.</p>
                
                <div style="border-top: 2px solid #ddd; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
                    <p>Atenciosamente,</p>
                    <p><strong>Equipe Enchant</strong></p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Enchant" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Requisição de Cadastro Recebida - Enchant',
            html: htmlEmail
        };

        const info = await transportador.sendMail(mailOptions);
        logger.info(`Email de confirmação enviado para: ${email}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Erro ao enviar email de confirmação', error);
        // Não falhar a requisição se o email de confirmação não for enviado
        return { success: false, error: error.message };
    }
};

/**
 * Enviar email de aprovação
 */
export const enviarEmailAprovacao = async (email, nomeInstituicao) => {
    try {
        const transportador = criarTransportador();

        const htmlEmail = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">🎉 Sua Conta foi Aprovada!</h2>
                
                <p>Olá, <strong>${nomeInstituicao}</strong>!</p>
                
                <p>Temos o prazer de informar que sua requisição de cadastro foi <strong>aprovada</strong>!</p>
                
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #155724; margin-top: 0;">Bem-vindo à Plataforma Enchant!</h3>
                    <p style="color: #155724; margin: 15px 0;">Agora você pode acessar todas as funcionalidades da plataforma.</p>
                    <a href="${process.env.FRONTEND_URL}/login" 
                       style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                        Fazer Login
                    </a>
                </div>

                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #333; margin-top: 0;">Primeiros Passos:</h4>
                    <ul style="color: #555;">
                        <li>Complete seu perfil institucional</li>
                        <li>Configure suas preferências</li>
                        <li>Explore o painel de controle</li>
                        <li>Comece a utilizar nossas ferramentas</li>
                    </ul>
                </div>

                <p>Se precisar de ajuda, nossa equipe está à disposição.</p>
                
                <div style="border-top: 2px solid #ddd; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
                    <p>Atenciosamente,</p>
                    <p><strong>Equipe Enchant</strong></p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Enchant" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '✅ Conta Aprovada - Enchant',
            html: htmlEmail
        };

        const info = await transportador.sendMail(mailOptions);
        logger.info(`Email de aprovação enviado para: ${email}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Erro ao enviar email de aprovação', error);
        return { success: false, error: error.message };
    }
};

/**
 * Enviar email de rejeição
 */
export const enviarEmailRejeicao = async (email, nomeInstituicao, motivo) => {
    try {
        const transportador = criarTransportador();

        const htmlEmail = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc3545;">Atualização sobre sua Requisição</h2>
                
                <p>Olá, <strong>${nomeInstituicao}</strong>!</p>
                
                <p>Após análise cuidadosa, infelizmente não foi possível aprovar sua requisição de cadastro neste momento.</p>
                
                ${motivo ? `
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #721c24; margin-top: 0;">Motivo:</h4>
                    <p style="color: #721c24; margin: 0;">${motivo}</p>
                </div>
                ` : ''}

                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #0c5460; margin-top: 0;">Você pode:</h4>
                    <ul style="color: #0c5460; margin: 10px 0;">
                        <li>Verificar os documentos enviados</li>
                        <li>Corrigir as informações necessárias</li>
                        <li>Fazer uma nova requisição</li>
                    </ul>
                </div>

                <p>Se você tiver dúvidas sobre este processo, entre em contato conosco.</p>
                
                <div style="border-top: 2px solid #ddd; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
                    <p>Atenciosamente,</p>
                    <p><strong>Equipe Enchant</strong></p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Enchant" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Atualização sobre sua Requisição - Enchant',
            html: htmlEmail
        };

        const info = await transportador.sendMail(mailOptions);
        logger.info(`Email de rejeição enviado para: ${email}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Erro ao enviar email de rejeição', error);
        return { success: false, error: error.message };
    }
};