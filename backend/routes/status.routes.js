import express from 'express';
import { checkDbConnection } from '../controllers/status.controller.js';

const statusRouter = express.Router();

statusRouter.get('/', checkDbConnection);

export default statusRouter;