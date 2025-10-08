import PDFDocument from 'pdfkit';

/**
 * Gera um recibo de doação em PDF e retorna como um Buffer.
 * @param {object} receiptData - Dados para o recibo.
 * @param {string} receiptData.ongName - Nome da ONG.
 * @param {string} receiptData.donorName - Nome do doador.
 * @param {number} receiptData.amount - Valor da doação.
 * @param {string} receiptData.paymentId - ID do pagamento do Mercado Pago.
 * @param {Date} receiptData.date - Data da doação.
 * @returns {Promise<Buffer>} - Uma promise que resolve com o buffer do PDF.
 */
export function generateDonationReceipt(receiptData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // Cabeçalho
            doc.fontSize(20).font('Helvetica-Bold').text('Recibo de Doação', { align: 'center' });
            doc.moveDown();

            // Corpo
            doc.fontSize(12).font('Helvetica');
            doc.text(`Agradecemos sinceramente sua doação para a organização ${receiptData.ongName}.`);
            doc.moveDown();

            doc.text('Detalhes da Doação:', { underline: true });
            doc.moveDown(0.5);

            doc.font('Helvetica-Bold').text('Doador: ', { continued: true }).font('Helvetica').text(receiptData.donorName);
            doc.font('Helvetica-Bold').text('Valor: ', { continued: true }).font('Helvetica').text(`R$ ${receiptData.amount.toFixed(2).replace('.', ',')}`);
            doc.font('Helvetica-Bold').text('Data: ', { continued: true }).font('Helvetica').text(receiptData.date.toLocaleDateString('pt-BR'));
            doc.font('Helvetica-Bold').text('ID da Transação: ', { continued: true }).font('Helvetica').text(receiptData.paymentId);
            doc.moveDown();

            // Rodapé
            doc.fontSize(10).text('Este recibo foi gerado automaticamente pela plataforma Enchant.', { align: 'center' });
            
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}