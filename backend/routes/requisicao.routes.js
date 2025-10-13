import express from 'express';
import multer from 'multer';
import {
    enviarRequisicao,
    listarRequisicoes,
    buscarRequisicao,
    aprovarRequisicao,
    rejeitarRequisicao,
    deletarRequisicao
} from '../controllers/requisicao.controller.js';
import { protegerRota } from '../middleware/auth.middleware.js';

const requisicaoRouter = express.Router();

// Configuração do Multer para múltiplos arquivos
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB por arquivo
        files: 20 // Máximo de 20 arquivos
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

// ========== ROTAS ADMINISTRATIVAS (PROTEGIDAS) ==========

// Listar todas as requisições (com filtro opcional por status)
requisicaoRouter.get('/listar', protegerRota, listarRequisicoes);

// Buscar detalhes de uma requisição específica
requisicaoRouter.get('/:id', protegerRota, buscarRequisicao);

// Aprovar requisição
requisicaoRouter.patch('/:id/aprovar', protegerRota, aprovarRequisicao);

// Rejeitar requisição
requisicaoRouter.patch('/:id/rejeitar', protegerRota, rejeitarRequisicao);

// Deletar requisição
requisicaoRouter.delete('/:id', protegerRota, deletarRequisicao);

export default requisicaoRouter;