import express from 'express';
import multer from 'multer';
import { getDocumentos, addDocumento, deleteDocumento } from '../controllers/documento.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const documentoRouter = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB
});

documentoRouter.get('/', protegerRota, getDocumentos);

documentoRouter.post('/', protegerRota, upload.single('arquivo_documento'), addDocumento);

documentoRouter.delete('/:id', protegerRota, deleteDocumento);

export default documentoRouter;