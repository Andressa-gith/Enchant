import express from 'express';
import multer from 'multer';
import {
    processarRequisicao,
    listarRequisicoes,
    atualizarStatusRequisicao
} from '../controllers/requisicao.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const requisicaoRouter = express.Router();

// Configuração do Multer para múltiplos arquivos
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo
        files: 50 // Máximo de 50 arquivos
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.'));
        }
    }
});

// Rotas públicas
requisicaoRouter.post(
    '/enviar',
    upload.any(), // Aceita qualquer quantidade de arquivos com qualquer nome de campo
    processarRequisicao
);

// Rotas protegidas (admin)
requisicaoRouter.get(
    '/listar',
    protegerRota,
    listarRequisicoes
);

requisicaoRouter.patch(
    '/:id/status',
    protegerRota,
    atualizarStatusRequisicao
);

export default requisicaoRouter;