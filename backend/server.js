import express from 'express';
import path from 'path';
import pool from './db/supabaseClient.js'
import {fileURLToPath} from 'url';
import pageRoutes from './routes/pages.routes.js';
import userRoutes from './routes/user.routes.js';
import statusRoutes from './routes/status.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = 3080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/status', statusRoutes);

app.use(pageRoutes);

app.use(userRoutes);

app.use(authRoutes);

app.listen(PORT, () => {
    console.log(`✅  Server is running in http://localhost:${PORT}`);
})