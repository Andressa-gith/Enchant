import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import pageRoutes from './routes/pages.routes.js';
import userRoutes from './routes/user.routes.js';
import statusRoutes from './routes/status.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import doacaoRoutes from './routes/doacao.routes.js'

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

app.listen(PORT, () => {
    console.log(`✅  Server is running in http://localhost:${PORT}`);
})