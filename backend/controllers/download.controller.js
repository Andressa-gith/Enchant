import supabase from '../db/supabaseClient.js';
import path from 'path';

class DownloadController {
    async getFile(req, res) {
        const { instituicaoId, fileName } = req.params;
        
        // Extrai o nome do bucket da URL (ex: /download/audit/123/arquivo.pdf -> 'audit')
        const bucket = req.path.split('/')[1];

        if (!instituicaoId || !fileName || !bucket) {
            return res.status(400).send('Parâmetros de download inválidos.');
        }

        const filePath = `${instituicaoId}/${fileName}`;

        try {
            // 1. Baixa o arquivo do Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .download(filePath);

            if (error) {
                console.error(`Erro ao baixar de ${bucket} no caminho ${filePath}:`, error.message);
                return res.status(404).send('Arquivo não encontrado.');
            }
            
            // 2. Detecta o tipo MIME correto
            const ext = path.extname(fileName).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            // 3. FORÇA O DOWNLOAD (não tenta abrir no navegador)
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            
            // 4. Envia o arquivo como buffer
            const buffer = await data.arrayBuffer();
            res.send(Buffer.from(buffer));

        } catch (err) {
            console.error('Erro geral no download:', err);
            res.status(500).send('Erro interno ao processar o download.');
        }
    }
}

export default new DownloadController();