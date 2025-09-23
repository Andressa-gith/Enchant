import express from 'express';
import { getDashboardData } from '../controllers/dashboard.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/', protegerRota, getDashboardData);

export default dashboardRouter;