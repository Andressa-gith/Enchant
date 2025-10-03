import express from 'express';
import { getDashboardData, getAllActivities } from '../controllers/dashboard.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/', protegerRota, getDashboardData);

dashboardRouter.get('/atividades', protegerRota, getAllActivities);

export default dashboardRouter;