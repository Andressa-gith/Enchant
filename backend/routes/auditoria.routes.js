import express from 'express';
import multer from 'multer';
import { 
    getAuditorias, 
    addAuditoria, 
    updateAuditoriaStatus, 
    deleteAuditoria 
} from '../controllers/auditoria.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const auditoriaRouter = express.Router();

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 },
});

// Rotas
auditoriaRouter.get('/', protegerRota, getAuditorias);

auditoriaRouter.post('/', protegerRota, upload.single('arquivo_auditoria'), addAuditoria);

auditoriaRouter.patch('/:id/status', protegerRota, updateAuditoriaStatus);

auditoriaRouter.delete('/:id', protegerRota, deleteAuditoria);

export default auditoriaRouter;