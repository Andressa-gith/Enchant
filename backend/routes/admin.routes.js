import express from 'express';
import {
    visualizarRequisicao,
    downloadDocumento,
    estatisticasRequisicoes
} from '../controllers/admin.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const adminRouter = express.Router();

// Ver detalhes de uma requisição específica
adminRouter.get('/requisicoes/:id', protegerRota, visualizarRequisicao);

// Download de documento específico
adminRouter.get('/documentos/:id/download', protegerRota, downloadDocumento);

// Estatísticas gerais
adminRouter.get('/requisicoes/stats', protegerRota, estatisticasRequisicoes);

export default adminRouter;