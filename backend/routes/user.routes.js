import express from 'express';
import { 
    cadastrarInstituicao, 
    criarPostagemComunidade,
    buscarPostagemComunidade,      
    atualizarPostagemComunidade,   
    excluirPostagemComunidade      
} from '../controllers/user.controller.js';
import UserProfileController from '../controllers/perfil.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';
import multer from 'multer';
import supabase from '../db/supabaseClient.js'

const userRouter = express.Router();

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png' || 
            file.mimetype === 'image/jpeg' || 
            file.mimetype === 'image/jpg' ||
            file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens PNG, JPEG e WEBP são permitidas.'), false);
        }
    }
});

// Rotas existentes
userRouter.post('/cadastro', cadastrarInstituicao);
userRouter.get('/profile', protegerRota, UserProfileController.getProfile);
userRouter.put('/profile', protegerRota, UserProfileController.updateProfile);
userRouter.post('/logout', protegerRota, UserProfileController.logout);
userRouter.post('/tutorial-concluido', protegerRota, UserProfileController.marcarTutorialVisto);

userRouter.post('/comunidade/postagens', 
    protegerRota, 
    upload.single('imagem'), 
    criarPostagemComunidade
);

// ← ADICIONAR ESTAS 3 ROTAS NOVAS:

// Buscar uma postagem específica
userRouter.get('/comunidade/postagens/:id', 
    protegerRota, 
    buscarPostagemComunidade
);

// Atualizar postagem
userRouter.put('/comunidade/postagens/:id', 
    protegerRota, 
    upload.single('imagem'), 
    atualizarPostagemComunidade
);

// Excluir postagem
userRouter.delete('/comunidade/postagens/:id', 
    protegerRota, 
    excluirPostagemComunidade
);

export default userRouter;