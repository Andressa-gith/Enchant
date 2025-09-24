import express from 'express';
import { registrarDoacaoController } from '../controllers/registrarDoacao.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const doacaoRouter = express.Router();

doacaoRouter.post('/registrar-doacao', protegerRota, registrarDoacaoController);

export default doacaoRouter;