// backend/server.js  <-- ARQUIVO MODIFICADO

import app from './app.js'; // Importa a aplicação configurada do novo arquivo

const PORT = 3080;

app.listen(PORT, () => {
    console.log(`✅  Server is running in http://localhost:${PORT}`);
});