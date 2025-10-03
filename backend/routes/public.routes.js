import express from 'express';
import PublicController from '../controllers/public.controller.js';

const publicRouter = express.Router();

publicRouter.get('/ongs', PublicController.listarOngs);

publicRouter.post('/doar', PublicController.processarDoacao);

export default publicRouter;