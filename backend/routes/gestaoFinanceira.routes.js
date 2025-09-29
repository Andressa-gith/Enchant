import express from 'express';
// Importa as funções do nosso controller refeito
import { 
    getFinanceiro, 
    addFinanceiro, 
    updateFinanceiro, 
    deleteFinanceiro 
} from '../controllers/gestaoFinanceira.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const gestaoFinanceiraRouter = express.Router();

// Rota para buscar todos os lançamentos
gestaoFinanceiraRouter.get('/', protegerRota, getFinanceiro);

// Rota para adicionar um novo lançamento (com status automático)
gestaoFinanceiraRouter.post('/', protegerRota, addFinanceiro);

// Rota para editar um lançamento (recalcula o status automaticamente)
gestaoFinanceiraRouter.patch('/:id', protegerRota, updateFinanceiro);

// Rota para excluir um lançamento
gestaoFinanceiraRouter.delete('/:id', protegerRota, deleteFinanceiro);

// A rota PATCH '/:id/status' foi removida pois não é mais necessária.

export default gestaoFinanceiraRouter;