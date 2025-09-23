import express from 'express';
import { 
    loginInstituicao,
    enviarEmailResetSenha 
} from '../controllers/auth.controller.js';

const authRouter = express.Router();

authRouter.post('/login', loginInstituicao);

authRouter.post('/esqueci-senha', enviarEmailResetSenha);

export default authRouter;