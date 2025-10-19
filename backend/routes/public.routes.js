import express from 'express';
import PublicController from '../controllers/public.controller.js';

const publicRouter = express.Router();

publicRouter.get('/ongs', PublicController.listarOngs);

publicRouter.get('/todasongs', PublicController.listarOngsTodas);

publicRouter.post('/criar-cobranca', PublicController.criarCobrancaPix);

publicRouter.post('/webhook', PublicController.receberWebhook);

publicRouter.get('/doacao-status/:refExterna', PublicController.verificarStatusDoacao);

publicRouter.get('/transparencia', PublicController.getDadosTransparencia);

publicRouter.get('/comunidade/postagens', PublicController.listarTodasPostagens);

publicRouter.get('/atividades/doacoes', PublicController.listarAtividadesDoacoes);

publicRouter.get('/atividades/financeiro', PublicController.listarAtividadesFinanceiro);

export default publicRouter;