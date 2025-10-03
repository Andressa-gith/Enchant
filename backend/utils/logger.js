// backend/utils/logger.js

// Cores para o console
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m"
};

// Configuração simples para ligar/desligar os níveis de log
const config = {
    levels: {
        error: true, // Sempre mostrar erros
        warn: true,  // Mostrar avisos
        info: true,  // Mostrar mensagens informativas
        debug: process.env.NODE_ENV !== 'production' // Só mostrar logs de debug se não estiver em produção
    }
};

/**
 * Retorna o timestamp atual formatado para o fuso horário de São Paulo.
 * @returns {string} Timestamp formatado.
 */
const getTimestamp = () => {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const logger = {
    /**
     * Loga uma mensagem informativa.
     * @param {string} message - A mensagem principal.
     * @param {*} [data] - Dados adicionais para logar.
     */
    info: (message, data) => {
        if (config.levels.info) {
            const log = `${colors.cyan}[INFO]${colors.reset} [${getTimestamp()}]: ${message}`;
            data ? console.log(log, data) : console.log(log);
        }
    },

    /**
     * Loga um aviso (warning).
     * @param {string} message - A mensagem de aviso.
     * @param {*} [data] - Dados adicionais para logar.
     */
    warn: (message, data) => {
        if (config.levels.warn) {
            const log = `${colors.yellow}[WARN]${colors.reset} [${getTimestamp()}]: ${message}`;
            data ? console.warn(log, data) : console.warn(log);
        }
    },

    /**
     * Loga um erro.
     * @param {string} message - A mensagem de erro principal.
     * @param {Error} [error] - O objeto de erro (para stack trace).
     */
    error: (message, error) => {
        if (config.levels.error) {
            console.error(`${colors.red}[ERROR]${colors.reset} [${getTimestamp()}]: ${message}`);
            if (error) {
                // Loga o erro em si para vermos o stack trace completo
                console.error(error);
            }
        }
    },

    /**
     * Loga uma mensagem de debug.
     * @param {string} message - A mensagem de debug.
     * @param {*} [data] - Dados adicionais para logar.
     */
    debug: (message, data) => {
        if (config.levels.debug) {
            const log = `${colors.gray}[DEBUG]${colors.reset} [${getTimestamp()}]: ${message}`;
            data ? console.log(log, data) : console.log(log);
        }
    }
};

export default logger;