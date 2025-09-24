import express from 'express';
import { getFinanceiro, addFinanceiro, updateValorExecutado, updateStatusFinanceiro } from '../controllers/gestaoFinanceira.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const gestaoFinanceiraRouter = express.Router();

// Rota para buscar os dados (com filtro opcional de ano, ex: /api/financeiro?ano=2024)
gestaoFinanceiraRouter.get('/', protegerRota, getFinanceiro);

// Rota para adicionar uma nova categoria
gestaoFinanceiraRouter.post('/', protegerRota, addFinanceiro);

// Rota para atualizar o valor executado de um item específico
gestaoFinanceiraRouter.patch('/:id/valor-executado', protegerRota, updateValorExecutado);

gestaoFinanceiraRouter.patch('/:id/status', protegerRota, updateStatusFinanceiro);

export default gestaoFinanceiraRouter;