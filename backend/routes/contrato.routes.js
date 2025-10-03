import express from 'express';
import multer from 'multer';
import { 
    getContratos, 
    addContrato, 
    deleteContrato 
} from '../controllers/contrato.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const contratoRouter = express.Router();

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 },
});

// Rotas
contratoRouter.get('/', protegerRota, getContratos);

contratoRouter.post('/', protegerRota, upload.single('arquivo_contrato'), addContrato);

contratoRouter.delete('/:id', protegerRota, deleteContrato);

export default contratoRouter;