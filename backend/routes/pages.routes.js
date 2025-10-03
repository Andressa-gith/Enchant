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
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'dashboard.html'));
});

pageRouter.get('/dashboard/atividades', (req, res) => {
    console.log(`\n⬆️  Rota /dashboard/atividades acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'atividades.html'));
});

pageRouter.get('/dashboard/alertas-acoes', (req, res) => {
    console.log(`\n⬆️  Rota /dashboard/alertas-acoes acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'alertas-acoes.html'));
});

pageRouter.get('/mapa', (req, res) => {
    console.log(`\n⬆️  Rota /mapa acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'mapa.html')); // Garanta que o nome do arquivo está correto
});

pageRouter.get('/perfil', (req, res) => {
    console.log(`\n⬆️  Rota /perfil acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'perfilcomprador.html')); // Garanta que o nome do arquivo está correto
});

pageRouter.get('/doacao', (req, res) => {
    console.log(`\n⬆️  Rota /doacao acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'doacao.html'));
});

pageRouter.get('/registrar-doacao', (req, res) => {
    console.log(`\n⬆️  Rota /registrar-doacao acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'registrar-doacao.html'));
});
pageRouter.get('/retirar-doacao', (req, res) => {
    console.log(`\n⬆️  Rota /retirar-doacao acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'registrar-retirada.html'));
});

pageRouter.get('/transparencia/relatorios', (req, res) => {
    console.log(`\n⬆️  Rota /transparencia/relatorios acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia1.html'));
});

pageRouter.get('/transparencia/contratos', (req, res) => {
    console.log(`\n⬆️  Rota /transparencia/contratos acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia2.html'));
});

pageRouter.get('/transparencia/notas-auditoria', (req, res) => {
    console.log(`\n⬆️  Rota /transparencia/notas-auditoria acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia3.html'));
});

pageRouter.get('/transparencia/documentos-comprobatorios', (req, res) => {
    console.log(`\n⬆️  Rota /transparencia/documentos-comprobatorios acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia4.html'));
});

pageRouter.get('/transparencia/gestao-financeira', (req, res) => {
    console.log(`\n⬆️  Rota /transparencia/gestao-financeira acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia5.html'));
});

pageRouter.get('/transparencia/parcerias', (req, res) => {
    console.log(`\n⬆️  Rota /transparencia/parcerias acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia6.html'));
});

pageRouter.get('/perfil', (req, res) => {
    console.log(`\n⬆️  Rota /perfil acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'perfilcomprador.html')); // Garanta que o nome do arquivo está correto
});

pageRouter.get('/historico-doacoes', (req, res) => {
    console.log(`\n⬆️  Rota /historico-doacoes acessada.`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'historico-doacoes.html')); // Garanta que o nome do arquivo está correto
});

export default pageRouter;

