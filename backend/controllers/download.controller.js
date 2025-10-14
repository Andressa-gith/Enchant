import supabase from '../db/supabaseClient.js';
import path from 'path';

class DownloadController {
    async getFile(req, res) {
        const { instituicaoId, fileName } = req.params;
        
        const bucket = req.path.split('/')[1];

        if (!instituicaoId || !fileName || !bucket) {
            return res.status(400).send('Parâmetros de download inválidos.');
        }

        const filePath = `${instituicaoId}/${fileName}`;

        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .download(filePath);

            if (error) {
                console.error(`Erro ao baixar de ${bucket} no caminho ${filePath}:`, error.message);
                return res.status(404).send('Arquivo não encontrado.');
            }
            
            res.setHeader('Content-Type', data.type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            
            const buffer = await data.arrayBuffer();
            res.send(Buffer.from(buffer));

        } catch (err) {
            console.error('Erro geral no download:', err);
            res.status(500).send('Erro interno ao processar o download.');
        }
    }
}

export default new DownloadController();