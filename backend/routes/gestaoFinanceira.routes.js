import express from 'express';
// ADICIONADAS AS NOVAS FUNÇÕES
import { getFinanceiro, addFinanceiro, updateFinanceiro, updateStatusFinanceiro, deleteFinanceiro } from '../controllers/gestaoFinanceira.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const gestaoFinanceiraRouter = express.Router();

// Rotas existentes
gestaoFinanceiraRouter.get('/', protegerRota, getFinanceiro);
gestaoFinanceiraRouter.post('/', protegerRota, addFinanceiro);
gestaoFinanceiraRouter.patch('/:id/status', protegerRota, updateStatusFinanceiro);

// NOVAS ROTAS PARA EDIÇÃO COMPLETA E EXCLUSÃO
gestaoFinanceiraRouter.patch('/:id', protegerRota, updateFinanceiro); // Rota para o modal de edição
gestaoFinanceiraRouter.delete('/:id', protegerRota, deleteFinanceiro); // Rota para o botão de excluir

export default gestaoFinanceiraRouter;