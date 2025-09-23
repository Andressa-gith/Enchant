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

pageRouter.get('/esqueci-senha', (req, res) => {
    console.log(`\n⬆️  Rota /esqueci-senha acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'esqueciasenha.html'));
});

pageRouter.get('/redefinir-senha', (req, res) => {
    console.log(`\n⬆️  Rota /redefinir-senha acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'redefinirsenha.html'));
});

pageRouter.get('/dashboard', (req, res) => {
    console.log(`\n⬆️  Rota /dashboard acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'dashboard.html')); // Garanta que o nome do arquivo está correto
});

pageRouter.get('/doacao', (req, res) => {
    console.log(`\n⬆️  Rota /doacao acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'doacao.html')); // Garanta que o nome do arquivo está correto
});

pageRouter.get('/registrar-doacao', (req, res) => {
    console.log(`\n⬆️  Rota /doacao acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'registrar-doacao.html')); // Garanta que o nome do arquivo está correto
});

export default pageRouter;