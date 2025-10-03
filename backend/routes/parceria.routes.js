import express from 'express';
import { 
    getParcerias, 
    addParceria, 
    updateParceria, 
    deleteParceria 
} from '../controllers/parceria.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const parceriaRouter = express.Router();

// Rotas
parceriaRouter.get('/', protegerRota, getParcerias);

parceriaRouter.post('/', protegerRota, addParceria);

parceriaRouter.put('/:id', protegerRota, updateParceria);

parceriaRouter.delete('/:id', protegerRota, deleteParceria);

export default parceriaRouter;