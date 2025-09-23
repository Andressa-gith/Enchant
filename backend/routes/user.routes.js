import express from 'express';
import { cadastrarInstituicao } from '../controllers/user.controller.js';

const userRouter = express.Router();

userRouter.post('/cadastro', cadastrarInstituicao);

export default userRouter;