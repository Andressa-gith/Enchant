import express from 'express';
import multer from 'multer';
import { getContratos, addContrato } from '../controllers/contrato.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const contratoRouter = express.Router();

// Configuração do Multer para o upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // Limite de 15MB
});

// Rotas
contratoRouter.get('/', protegerRota, getContratos);
// O 'arquivo_contrato' deve ser o mesmo nome usado no FormData do frontend
contratoRouter.post('/', protegerRota, upload.single('arquivo_contrato'), addContrato);

export default contratoRouter;