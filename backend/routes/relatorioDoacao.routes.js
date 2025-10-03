import express from 'express';
import { 
    getRelatoriosGerados, gerarRelatorio } from '../controllers/relatorioDoacao.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const relatorioDoacaoRouter = express.Router();

// Rotas
relatorioDoacaoRouter.get('/', protegerRota, getRelatoriosGerados);

relatorioDoacaoRouter.post('/gerar', protegerRota, gerarRelatorio);

export default relatorioDoacaoRouter;