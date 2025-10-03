import express from 'express';
import { 
    getFinanceiro, 
    addFinanceiro, 
    updateFinanceiro, 
    deleteFinanceiro 
} from '../controllers/gestaoFinanceira.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const gestaoFinanceiraRouter = express.Router();

// Rotas
gestaoFinanceiraRouter.get('/', protegerRota, getFinanceiro);

gestaoFinanceiraRouter.post('/', protegerRota, addFinanceiro);

gestaoFinanceiraRouter.patch('/:id', protegerRota, updateFinanceiro);

gestaoFinanceiraRouter.delete('/:id', protegerRota, deleteFinanceiro);

export default gestaoFinanceiraRouter;