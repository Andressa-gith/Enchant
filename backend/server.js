import express from 'express';
import path from 'path';
import pool from './db/pool.db.js'
import {fileURLToPath} from 'url';
import pageRoutes from './routes/pages.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(pageRoutes);
app.use(userRoutes);

app.listen(PORT, () => {
    console.log(`✅  Server is running in http://localhost:$PORT}`);
})