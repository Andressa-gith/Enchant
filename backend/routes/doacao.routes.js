import express from 'express';
import { registrarDoacaoController, registrarRetiradaController } from '../controllers/doacao.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const doacaoRouter = express.Router();

doacaoRouter.post('/registrar-doacao', protegerRota, registrarDoacaoController);

doacaoRouter.post('/registrar-retirada', protegerRota, registrarRetiradaController);

export default doacaoRouter;