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
    console.log(`⬆️  Rota /quem-somos acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'quemsomos.html'));
});

pageRouter.get('/saiba-mais', (req, res) => {
    console.log(`⬆️  Rota /saiba-mais acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'saibamais.html'));
});

pageRouter.get('/suporte', (req, res) => {
    console.log(`⬆️  Rota /suporte acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'suporte.html'));
});

pageRouter.get('/politica', (req, res) => {
    console.log(`⬆️  Rota /politica acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'politicadeprivacidade.html'));
});

pageRouter.get('/pagamento', (req, res) => {
    console.log(`⬆️  Rota /pagamento acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'paginapagamento.html'));
});

pageRouter.get('/entrar', (req, res) => {
    console.log(`⬆️  Rota /entrar acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'entrar.html'));
});

pageRouter.get('/esqueci-senha', (req, res) => {
    console.log(`⬆️  Rota /esqueci-senha acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'esqueciasenha.html'));
});

pageRouter.get('/redefinir-senha', (req, res) => {
    console.log(`\n⬆️  Rota /redefinir-senha acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'redefinirsenha.html'));
});

pageRouter.get('/dashboard', (req, res) => {
    console.log(`⬆️  Rota /dashboard acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'dashboard.html'));
});

pageRouter.get('/dashboard/atividades', (req, res) => {
    console.log(`⬆️  Rota /dashboard/atividades acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'atividades.html'));
});

pageRouter.get('/dashboard/alertas-acoes', (req, res) => {
    console.log(`⬆️  Rota /dashboard/alertas-acoes acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'alertas-acoes.html'));
});

pageRouter.get('/mapa', (req, res) => {
    console.log(`⬆️  Rota /mapa acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'mapa.html'));
});

pageRouter.get('/doacao', (req, res) => {
    console.log(`⬆️  Rota /doacao acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'doacao.html'));
});

pageRouter.get('/registrar-doacao', (req, res) => {
    console.log(`⬆️  Rota /registrar-doacao acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'registrar-doacao.html'));
});
pageRouter.get('/retirar-doacao', (req, res) => {
    console.log(`⬆️  Rota /retirar-doacao acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'registrar-retirada.html'));
});

pageRouter.get('/transparencia/relatorios', (req, res) => {
    console.log(`⬆️  Rota /transparencia/relatorios acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia1.html'));
});

pageRouter.get('/transparencia/contratos', (req, res) => {
    console.log(`⬆️  Rota /transparencia/contratos acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia2.html'));
});

pageRouter.get('/transparencia/notas-auditoria', (req, res) => {
    console.log(`⬆️  Rota /transparencia/notas-auditoria acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia3.html'));
});

pageRouter.get('/transparencia/documentos-comprobatorios', (req, res) => {
    console.log(`⬆️  Rota /transparencia/documentos-comprobatorios acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia4.html'));
});

pageRouter.get('/transparencia/gestao-financeira', (req, res) => {
    console.log(`⬆️  Rota /transparencia/gestao-financeira acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia5.html'));
});

pageRouter.get('/transparencia/parcerias', (req, res) => {
    console.log(`⬆️  Rota /transparencia/parcerias acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'transparencia6.html'));
});

pageRouter.get('/perfil', (req, res) => {
    console.log(`⬆️  Rota /perfil acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'perfilcomprador.html'));
});

pageRouter.get('/historico-doacoes', (req, res) => {
    console.log(`⬆️  Rota /historico-doacoes acessada.\n`);
    res.sendFile(path.join(__dirname, '..', 'views', 'comprador', 'historico-doacoes.html'));
});

export default pageRouter;

