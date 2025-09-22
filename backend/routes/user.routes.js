import express from 'express';
import multer from 'multer';
import { cadastrarInstituicao } from '../controllers/user.controller.js';

const userRouter = express.Router();
const upload = multer();

userRouter.post('/cadastro', cadastrarInstituicao);

export default userRouter;