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
    const logoBuffer = await fetchImage(receiptData.logoUrl);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            if (logoBuffer) {
                doc.image(logoBuffer, 50, 45, { width: 70 });
            }
            doc.fontSize(10).font('Helvetica')
               .text('sexta-feira, 10 de outubro de 2025', { align: 'right' });

            doc.moveDown(2); // Aumenta o espaço após o cabeçalho
            
            doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, 100).lineTo(550, 100).stroke();

            doc.moveDown(2);
            doc.fontSize(22).font('Helvetica-Bold').text('Recibo de Doação', { align: 'center' });
            doc.moveDown(2);

            // --- CORPO DO TEXTO ---
            doc.fontSize(12).font('Helvetica');
            // AJUSTE: Corpo do texto agora centralizado
            doc.text('Em nome da organização, agradecemos imensamente sua generosa doação. Sua contribuição nos ajuda a continuar nosso trabalho e a causar um impacto positivo na comunidade.', { align: 'center' });
            doc.moveDown(3);

            // --- DETALHES DA TRANSAÇÃO ---
            doc.fontSize(14).font('Helvetica-Bold').text('Resumo da Transação', { align: 'center' });
            doc.moveDown();
            
            // AJUSTE: Detalhes da transação centralizados
            const centerX = doc.page.width / 2;
            const labelWidth = 120; // Largura estimada para os rótulos

            doc.font('Helvetica-Bold').text('Doador:', centerX - labelWidth, doc.y, { width: labelWidth, align: 'right' });
            doc.font('Helvetica').text(receiptData.donorName, centerX + 10, doc.y);

            doc.moveDown(0.5);
            const valorY = doc.y;
            doc.font('Helvetica-Bold').text('Valor Doado:', centerX - labelWidth, valorY, { width: labelWidth, align: 'right' });
            doc.font('Helvetica').text(`R$ ${receiptData.amount.toFixed(2).replace('.', ',')}`, centerX + 10, valorY);

            doc.moveDown(0.5);
            const idY = doc.y;
            doc.font('Helvetica-Bold').text('ID da Transação:', centerX - labelWidth, idY, { width: labelWidth, align: 'right' });
            doc.font('Helvetica').text(receiptData.paymentId, centerX + 10, idY);

            // --- RODAPÉ ---
            // Posiciona o rodapé mais para o final da página
            doc.y = 700; 
            doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            
            // AJUSTE: Rodapé centralizado
            doc.fontSize(9).text('Este é um recibo gerado automaticamente pela plataforma Enchant. Para dúvidas, entre em contato com a organização.', { align: 'center' });
            doc.fontSize(9).text('Salvador, Bahia', { align: 'center' });
            
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}