import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import pageRoutes from './routes/pages.routes.js';
import userRoutes from './routes/user.routes.js';
import statusRoutes from './routes/status.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import doacaoRoutes from './routes/doacao.routes.js'
import relatorioRoutes from './routes/relatorio.routes.js';
import contratoRoutes from './routes/contrato.routes.js';
import auditoriaRoutes from './routes/auditoria.routes.js';
import gestaoFinanceiraRoutes from './routes/gestaoFinanceira.routes.js';
import parceriaRoutes from './routes/parceria.routes.js';
import documentoRoutes from './routes/documento.routes.js';
import historicoRoutes from './routes/historico-doacoes.routes.js';
import publicRoutes from './routes/public.routes.js';

const app = express();
const PORT = 3080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(pageRoutes);

app.use('/api/status', statusRoutes);

app.use('/api/user', userRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/doacao', doacaoRoutes);

app.use('/api/relatorios', relatorioRoutes);

app.use('/api/contratos', contratoRoutes);

app.use('/api/auditorias', auditoriaRoutes);

app.use('/api/financeiro', gestaoFinanceiraRoutes);

app.use('/api/parcerias', parceriaRoutes);

app.use('/api/documentos', documentoRoutes);

app.use('/api/historico-doacoes', historicoRoutes);

app.use('/api/public', publicRoutes);

app.listen(PORT, () => {
    console.log(`✅  Server is running in http://localhost:${PORT}`);
})

export default app;