import express from 'express';
import { 
    getDashboardData, 
    getAllActivities, 
    getAllAlerts 
} from '../controllers/dashboard.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const dashboardRouter = express.Router();

// Rotas
dashboardRouter.get('/', protegerRota, getDashboardData);

dashboardRouter.get('/atividades', protegerRota, getAllActivities);

dashboardRouter.get('/alertas', protegerRota, getAllAlerts);

export default dashboardRouter;