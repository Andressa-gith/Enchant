import PDFDocument from 'pdfkit';
import axios from 'axios';

/**
 * Busca uma imagem de uma URL e a retorna como Buffer.
 * @param {string} url - A URL da imagem.
 * @returns {Promise<Buffer|null>}
 */
async function fetchImage(url) {
    if (!url) return null;
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error("Erro ao buscar a imagem do logo:", error.message);
        return null;
    }
}

/**
 * Gera um recibo de doação em PDF com layout aprimorado.
 * @param {object} receiptData - Dados para o recibo.
 * @param {string} receiptData.logoUrl - URL pública do logo da ONG.
 * @returns {Promise<Buffer>} - Uma promise que resolve com o buffer do PDF.
 */
export async function generateDonationReceipt(receiptData) {
    const safeData = {
        ongName: receiptData.ongName || 'Nome da ONG Indisponível',
        donorName: receiptData.donorName || 'Doador Anônimo',
        amount: Number(receiptData.amount),
        paymentId: String(receiptData.paymentId) || 'ID Indisponível',
        logoUrl: receiptData.logoUrl,
        date: receiptData.date instanceof Date ? receiptData.date : new Date()
    };

    const logoBuffer = await fetchImage(safeData.logoUrl);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];
            const pageWidth = doc.page.width;
            const pageCenter = pageWidth / 2;

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- CABEÇALHO COM LOGO E NOME DA ONG ---
            let headerY = 60;
            
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, pageCenter - 35, headerY, { width: 70 });
                    headerY += 85;
                } catch (err) {
                    console.error("Erro ao adicionar logo:", err);
                }
            }

            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text(safeData.ongName, 50, headerY, { 
                   align: 'center',
                   width: pageWidth - 100
               });

            headerY += 25;

            // Data
            doc.fontSize(10)
               .font('Helvetica')
               .fillColor('#666666')
               .text(
                   safeData.date.toLocaleDateString('pt-BR', { 
                       weekday: 'long', 
                       year: 'numeric', 
                       month: 'long', 
                       day: 'numeric' 
                   }), 
                   50, 
                   headerY, 
                   { align: 'center', width: pageWidth - 100 }
               );

            headerY += 30;

            // Linha divisória
            doc.strokeColor("#dddddd")
               .lineWidth(1.5)
               .moveTo(100, headerY)
               .lineTo(pageWidth - 100, headerY)
               .stroke();

            // --- TÍTULO DO RECIBO ---
            let contentY = headerY + 50;
            
            doc.fontSize(28)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text('Recibo de Doação', 50, contentY, { 
                   align: 'center',
                   width: pageWidth - 100
               });

            contentY += 50;

            // --- MENSAGEM DE AGRADECIMENTO ---
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#444444')
               .text(
                   'Em nome da organização, agradecemos imensamente sua generosa doação. Sua contribuição nos ajuda a continuar nosso trabalho e a causar um impacto positivo na comunidade.',
                   80,
                   contentY,
                   { 
                       align: 'center',
                       width: pageWidth - 160,
                       lineGap: 5
                   }
               );

            contentY += 100;

            // --- CAIXA DE DETALHES ---
            const boxX = 120;
            const boxWidth = pageWidth - 240;
            const boxY = contentY;
            const boxHeight = 180;

            // Fundo da caixa
            doc.rect(boxX, boxY, boxWidth, boxHeight)
               .fillAndStroke('#f8f9fa', '#dddddd');

            // Título da seção
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .fillColor('#000000')
               .text('Detalhes da Doação', boxX, boxY + 25, {
                   width: boxWidth,
                   align: 'center'
               });

            let detailsY = boxY + 60;
            const labelX = boxX + 40;
            const valueX = pageCenter - 10;

            // Função para desenhar linhas de detalhes
            function drawDetailLine(label, value, y) {
                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .fillColor('#666666')
                   .text(label, labelX, y, { width: valueX - labelX - 10, align: 'right' });

                doc.fontSize(11)
                   .font('Helvetica')
                   .fillColor('#000000')
                   .text(value, valueX, y, { width: boxX + boxWidth - valueX - 40 });
            }

            // Doador
            drawDetailLine('Doador:', safeData.donorName, detailsY);
            detailsY += 35;

            // Valor
            const valorFormatado = `R$ ${safeData.amount.toFixed(2).replace('.', ',')}`;
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#666666')
               .text('Valor:', labelX, detailsY, { width: valueX - labelX - 10, align: 'right' });

            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#28a745')
               .text(valorFormatado, valueX, detailsY - 2, { width: boxX + boxWidth - valueX - 40 });
            detailsY += 35;

            // ID da Transação
            drawDetailLine('ID da Transação:', safeData.paymentId, detailsY);

            // --- RODAPÉ ---
            const footerY = doc.page.height - 100;
            
            doc.strokeColor("#dddddd")
               .lineWidth(1)
               .moveTo(100, footerY)
               .lineTo(pageWidth - 100, footerY)
               .stroke();

            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#888888')
               .text(
                   'Este é um recibo gerado automaticamente pela plataforma Enchant.',
                   50,
                   footerY + 15,
                   { align: 'center', width: pageWidth - 100 }
               );

            doc.fontSize(9)
               .text(
                   'Para dúvidas, entre em contato com a organização.',
                   50,
                   footerY + 30,
                   { align: 'center', width: pageWidth - 100 }
               );

            doc.fontSize(8)
               .fillColor('#aaaaaa')
               .text(
                   'Salvador, Bahia',
                   50,
                   footerY + 50,
                   { align: 'center', width: pageWidth - 100 }
               );

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}