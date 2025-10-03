import express from 'express';
import { 
    getRelatoriosSalvos,
    adicionarRelatorio,
    getDadosParaPDF,
    deletarRelatorio
} from '../controllers/historico-doacoes.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const historicoRouter = express.Router();

// Rotas
historicoRouter.get('/relatorios-salvos', protegerRota, getRelatoriosSalvos);

historicoRouter.post('/adicionar', protegerRota, adicionarRelatorio);

historicoRouter.get('/dados-pdf', protegerRota, getDadosParaPDF);

historicoRouter.delete('/deletar/:id', protegerRota, deletarRelatorio);

export default historicoRouter;