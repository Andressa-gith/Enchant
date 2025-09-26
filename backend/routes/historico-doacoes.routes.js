import express from 'express';
import { 
    getHistoricoDoacoes, 
    adicionarRelatorio,
    getRelatoriosSalvos,
    gerarPDFRelatorio
} from '../controllers/historico-doacoes.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const historicoRouter = express.Router();

// Rota para buscar histórico com filtros e paginação
historicoRouter.get('/', protegerRota, getHistoricoDoacoes);

// Rota para ADICIONAR relatório à lista (botão "Adicionar")
historicoRouter.post('/adicionar-relatorio', protegerRota, adicionarRelatorio);

// Rota para buscar relatórios salvos
historicoRouter.get('/relatorios-salvos', protegerRota, getRelatoriosSalvos);

// Rota para GERAR PDF de um relatório específico (botão "PDF")
historicoRouter.get('/gerar-pdf/:id', protegerRota, gerarPDFRelatorio);

export default historicoRouter;