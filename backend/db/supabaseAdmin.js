import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// Este cliente usa a SERVICE_KEY e tem poderes de administrador.
// Use-o APENAS no back-end para tarefas que exigem privilégios elevados.
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: {
        autoRefreshToken: false,
        persistSession: false
        }
    }
);

export default supabaseAdmin;