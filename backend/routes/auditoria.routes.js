import express from 'express';
import multer from 'multer';
import { getAuditorias, addAuditoria } from '../controllers/auditoria.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const auditoriaRouter = express.Router();

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // Limite de 20MB
});

// Rotas
auditoriaRouter.get('/', protegerRota, getAuditorias);
// O 'arquivo_auditoria' deve ser o mesmo nome usado no FormData do frontend
auditoriaRouter.post('/', protegerRota, upload.single('arquivo_auditoria'), addAuditoria);

export default auditoriaRouter;