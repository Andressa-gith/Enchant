import express from 'express';
import { getParcerias, addParceria, updateParceria, deleteParceria } from '../controllers/parceria.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const parceriaRouter = express.Router();

parceriaRouter.get('/', protegerRota, getParcerias);

parceriaRouter.post('/', protegerRota, addParceria);

parceriaRouter.put('/:id', protegerRota, updateParceria); // PUT para atualização completa

parceriaRouter.delete('/:id', protegerRota, deleteParceria);

export default parceriaRouter;