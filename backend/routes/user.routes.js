// backend/routes/user.routes.js
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
import logger from '../utils/logger.js';

const userRouter = express.Router();

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        logger.info(` Arquivo recebido: ${file.originalname} (${file.mimetype})`);
        
        const tiposPermitidos = [
            'image/png', 
            'image/jpeg', 
            'image/jpg',
            'image/webp',
            'image/svg+xml'
        ];
        
        if (tiposPermitidos.includes(file.mimetype)) {
            logger.info(` Tipo de arquivo aceito: ${file.mimetype}`);
            cb(null, true);
        } else {
            logger.warn(` Tipo de arquivo rejeitado: ${file.mimetype}`);
            cb(new Error(`Formato não permitido. Use JPG, PNG, WEBP ou SVG. Recebido: ${file.mimetype}`), false);
        }
    }
});

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        logger.error(` Erro do Multer: ${err.code} - ${err.message}`);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'Arquivo muito grande. Tamanho máximo: 2MB',
                tipo_erro: 'upload'
            });
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                message: 'Campo de arquivo inesperado',
                tipo_erro: 'upload'
            });
        }
        
        return res.status(400).json({ 
            message: `Erro no upload: ${err.message}`,
            tipo_erro: 'upload'
        });
    }
    
    if (err) {
        logger.error(`❌ Erro no upload: ${err.message}`);
        return res.status(400).json({ 
            message: err.message,
            tipo_erro: 'upload'
        });
    }
    
    next();
};

const logRequest = (req, res, next) => {
    logger.info(` ${req.method} ${req.path}`);
    if (req.file) {
        logger.info(`    Arquivo: ${req.file.originalname} (${req.file.size} bytes)`);
    }
    next();
};

userRouter.post('/cadastro', cadastrarInstituicao);

userRouter.get('/profile', logRequest, protegerRota, UserProfileController.getProfile);
userRouter.put('/profile', logRequest, protegerRota, UserProfileController.updateProfile);
userRouter.post('/logout', logRequest, protegerRota, UserProfileController.logout);
userRouter.post('/tutorial-concluido', logRequest, protegerRota, UserProfileController.marcarTutorialVisto);

userRouter.post(
    '/profile/foto',
    logRequest,
    protegerRota,
    upload.single('foto'),
    handleMulterError,
    UserProfileController.uploadFotoPerfil
);

userRouter.post(
    '/profile/logo',
    logRequest,
    protegerRota,
    upload.single('logo'),
    handleMulterError,
    UserProfileController.uploadLogo
);

userRouter.post(
    '/comunidade/postagens',
    logRequest,
    protegerRota, 
    upload.single('imagem'),
    handleMulterError,
    criarPostagemComunidade
);

userRouter.get(
    '/comunidade/postagens/:id',
    logRequest,
    protegerRota, 
    buscarPostagemComunidade
);

userRouter.put(
    '/comunidade/postagens/:id',
    logRequest,
    protegerRota, 
    upload.single('imagem'),
    handleMulterError,
    atualizarPostagemComunidade
);

userRouter.delete(
    '/comunidade/postagens/:id',
    logRequest,
    protegerRota, 
    excluirPostagemComunidade
);

export default userRouter;