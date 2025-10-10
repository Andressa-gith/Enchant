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
            // Nome da ONG ao lado da logo
            doc.fontSize(20).font('Helvetica-Bold').text(receiptData.ongName, 140, 57);
            
            // Data atual alinhada à direita
            doc.fontSize(10).font('Helvetica').text(new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), { align: 'right' });
            
            doc.moveDown(3);
            doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, 125).lineTo(550, 125).stroke();

            // --- TÍTULO (Centralizado) ---
            doc.moveDown(2);
            doc.fontSize(22).font('Helvetica-Bold').text('Recibo de Doação', { align: 'center' });
            doc.moveDown(2);

            doc.fontSize(12).font('Helvetica').text('Em nome da organização, agradecemos imensamente sua generosa doação. Sua contribuição nos ajuda a continuar nosso trabalho e a causar um impacto positivo na comunidade.', { align: 'center', width: 450 });
            doc.moveDown(3);

            doc.fontSize(14).font('Helvetica-Bold').text('Resumo da Transação', { align: 'center' });
            doc.moveDown();

            const valorFormatado = `R$ ${receiptData.amount.toFixed(2).replace('.', ',')}`;

            // Usando { align: 'center' } nos campos de detalhe
            doc.font('Helvetica-Bold').text('Doador:', { align: 'center' });
            doc.font('Helvetica').text(receiptData.donorName, { align: 'center' });
            doc.moveDown(0.5);

            doc.font('Helvetica-Bold').text('Valor Doado:', { align: 'center' });
            doc.font('Helvetica').text(valorFormatado, { align: 'center' });
            doc.moveDown(0.5);

            doc.font('Helvetica-Bold').text('ID da Transação:', { align: 'center' });
            doc.font('Helvetica').text(receiptData.paymentId, { align: 'center' });

            // --- RODAPÉ ---
            doc.y = 700; 
            doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            
            doc.fontSize(9).text('Este é um recibo gerado automaticamente pela plataforma Enchant. Para dúvidas, entre em contato com a organização.', { align: 'center' });
            doc.fontSize(9).text('Salvador, Bahia', { align: 'center' });
            
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}