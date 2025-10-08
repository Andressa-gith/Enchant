import express from 'express';
import PublicController from '../controllers/public.controller.js';

const publicRouter = express.Router();

publicRouter.get('/ongs', PublicController.listarOngs);

publicRouter.post('/criar-cobranca', PublicController.criarCobrancaPix);

publicRouter.post('/webhook', PublicController.receberWebhook);

publicRouter.get('/doacao-status/:refExterna', PublicController.verificarStatusDoacao);

export default publicRouter;