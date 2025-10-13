import express from 'express';
import { 
    generateAuthLink,
    handleCallback, 
    disconnect 
} from '../controllers/mercadoPago.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js'; // Use seu middleware de autenticação

const mercadoPagoRoutes = express.Router();

// Rotas
mercadoPagoRoutes.get('/authorize', generateAuthLink);

mercadoPagoRoutes.get('/callback', handleCallback);

mercadoPagoRoutes.post('/disconnect', protegerRota, disconnect);

export default mercadoPagoRoutes;