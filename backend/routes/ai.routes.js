import express from 'express';
import { handleChatRequest, buscarNoticiaMunicipio } from '../controllers/ai.controller.js';

const aiRouter = express.Router();

aiRouter.post('/chat', handleChatRequest);
aiRouter.get('/noticias-municipio', buscarNoticiaMunicipio);

export default aiRouter;