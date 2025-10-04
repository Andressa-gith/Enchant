import express from 'express';
import multer from 'multer';
import { 
    getDocumentos, 
    addDocumento,
    updateDocumento,
    deleteDocumento 
} from '../controllers/documento.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const documentoRouter = express.Router();

// Configuração do Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

// Rotas
documentoRouter.get('/', protegerRota, getDocumentos);

documentoRouter.post('/', protegerRota, upload.single('arquivo_documento'), addDocumento);

documentoRouter.put('/:id', protegerRota, upload.single('arquivo_documento'), updateDocumento);

documentoRouter.delete('/:id', protegerRota, deleteDocumento);

export default documentoRouter;