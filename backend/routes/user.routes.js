import express from 'express';
import { cadastrarInstituicao, criarPostagemComunidade } from '../controllers/user.controller.js';
import UserProfileController from '../controllers/perfil.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';
import multer from 'multer';
import supabase from '../db/supabaseClient.js'

const userRouter = express.Router();

//ignore
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens PNG e JPEG são permitidas.'), false);
        }
    }
});

// Rotas
userRouter.post('/cadastro', cadastrarInstituicao);

userRouter.get('/profile', protegerRota, UserProfileController.getProfile);

userRouter.put('/profile', protegerRota, UserProfileController.updateProfile);

userRouter.post('/logout', protegerRota, UserProfileController.logout);

userRouter.post('/tutorial-concluido', protegerRota, UserProfileController.marcarTutorialVisto);

userRouter.post('/comunidade/postagens', protegerRota, upload.single('imagem'), criarPostagemComunidade);

export default userRouter;