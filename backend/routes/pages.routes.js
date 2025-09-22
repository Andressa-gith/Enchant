import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageRouter = express.Router();

pageRouter.get('/', (req, res) => {
    console.log(`\n⬆️  Rota / acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

pageRouter.get('/quem-somos', (req, res) => {
    console.log(`\n⬆️  Rota /quem-somos acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'quemsomos.html'));
});

pageRouter.get('/saiba-mais', (req, res) => {
    console.log(`\n⬆️  Rota /saiba-mais acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'saibamais.html'));
});

pageRouter.get('/suporte', (req, res) => {
    console.log(`\n⬆️  Rota /suporte acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'suporte.html'));
});

pageRouter.get('/politica', (req, res) => {
    console.log(`\n⬆️  Rota /politica acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'politicadeprivacidade.html'));
});

pageRouter.get('/pagamento', (req, res) => {
    console.log(`\n⬆️  Rota /pagamento acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'paginapagamento.html'));
});

pageRouter.get('/entrar', (req, res) => {
    console.log(`\n⬆️  Rota /entrar acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'entrar.html'));
});

pageRouter.get('/esqueci', (req, res) => {
    console.log(`\n⬆️  Rota /esqueci acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'esqueciasenha1.html'));
});

export default pageRouter;