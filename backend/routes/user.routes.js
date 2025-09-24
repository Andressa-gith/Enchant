import express from 'express';
import { cadastrarInstituicao } from '../controllers/user.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';
import UserProfileController from '../controllers/perfil.controller.js';

const userRouter = express.Router();

userRouter.post('/cadastro', cadastrarInstituicao);

userRouter.get('/profile', protegerRota, UserProfileController.getProfile);

userRouter.post('/logout', protegerRota, UserProfileController.logout);

export default userRouter;