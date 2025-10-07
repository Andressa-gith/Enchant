// routes/mercadoPago.routes.js
import express from 'express';
import { generateAuthLink, handleCallback } from '../controllers/mercadoPago.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js'; // Use seu middleware de autenticação

const mercadoPagoRoutes = express.Router();

// Rota para iniciar a conexão. A ONG será redirecionada para o Mercado Pago
mercadoPagoRoutes.get('/authorize', protegerRota, generateAuthLink);

// Rota para onde o Mercado Pago redirecionará a ONG após a autorização
mercadoPagoRoutes.get('/callback', protegerRota, handleCallback);

export default mercadoPagoRoutes;