import express from 'express';
import multer from 'multer';
import { 
    getRelatorios, 
    addRelatorio, 
    deleteRelatorio 
} from '../controllers/relatorio.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const relatorioRouter = express.Router();

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// Rotas
relatorioRouter.get('/', protegerRota, getRelatorios);

relatorioRouter.post('/', protegerRota, upload.single('arquivo_relatorio'), addRelatorio);

relatorioRouter.delete('/:id', protegerRota, deleteRelatorio);

export default relatorioRouter;