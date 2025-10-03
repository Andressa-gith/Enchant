import express from 'express';
import { cadastrarInstituicao } from '../controllers/user.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';
import UserProfileController from '../controllers/perfil.controller.js';

const userRouter = express.Router();

// Rotas
userRouter.post('/cadastro', cadastrarInstituicao);

userRouter.get('/profile', protegerRota, UserProfileController.getProfile);

userRouter.put('/profile', protegerRota, UserProfileController.updateProfile);

userRouter.post('/logout', protegerRota, UserProfileController.logout);

userRouter.post('/tutorial-concluido', protegerRota, UserProfileController.marcarTutorialVisto);

export default userRouter;