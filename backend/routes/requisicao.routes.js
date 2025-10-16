import express from 'express';
import multer from 'multer';
import {
    enviarRequisicao,
    listarRequisicoes,
    buscarRequisicao,
    aprovarRequisicao,
    rejeitarRequisicao,
    deletarRequisicao,
    aprovarRequisicaoPorEmail,
    rejeitarRequisicaoPorEmail,
    confirmarRejeicaoPorEmail
} from '../controllers/requisicao.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const requisicaoRouter = express.Router();

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024,
        files: 20
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (tiposPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.'));
        }
    }
});

// ========== ROTAS PÚBLICAS ==========

// Enviar nova requisição de cadastro
requisicaoRouter.post('/enviar', upload.any(), enviarRequisicao);

// ========== ROTAS DE APROVAÇÃO VIA EMAIL (SEM AUTENTICAÇÃO) ==========

// Aprovar requisição via link do email
requisicaoRouter.get('/aprovar-email/:token', aprovarRequisicaoPorEmail);

// Rejeitar requisição via link do email (mostra formulário)
requisicaoRouter.get('/rejeitar-email/:token', rejeitarRequisicaoPorEmail);

// Confirmar rejeição com motivo
requisicaoRouter.post('/rejeitar-email/:token/confirmar', confirmarRejeicaoPorEmail);

// ========== ROTAS ADMINISTRATIVAS (PROTEGIDAS) ==========

// Listar todas as requisições
requisicaoRouter.get('/listar', protegerRota, listarRequisicoes);

// Buscar detalhes de uma requisição específica
requisicaoRouter.get('/:id', protegerRota, buscarRequisicao);

// Aprovar requisição (via painel admin)
requisicaoRouter.patch('/:id/aprovar', protegerRota, aprovarRequisicao);

// Rejeitar requisição (via painel admin)
requisicaoRouter.patch('/:id/rejeitar', protegerRota, rejeitarRequisicao);

// Deletar requisição
requisicaoRouter.delete('/:id', protegerRota, deletarRequisicao);

export default requisicaoRouter;