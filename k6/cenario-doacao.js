/**
 * @file k6/cenario-doacao.js
 * @summary Teste de Carga para o FLUXO DE USUÁRIO (Registrar Doação e Listar Documentos).
 * * Simula múltiplos usuários em 3 níveis de carga (Baixa, Média, Alta).
 * @requires k6/http
 * @requires k6/check
 * @requires k6/sleep
 * @requires k6/group
 * @requires k6-utils/1.4.0 (para funções 'random')
 * @requires k6/data (para SharedArray)
 * @requires k6/metrics (para Trend)
 */

// --- 1. Importações de Módulos ---
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { SharedArray } from 'k6/data';
import { Trend } from 'k6/metrics';

// --- 2. Configuração do Teste (Options) ---

/**
 * @summary Configuração principal do teste de carga (Options).
 * Define os cenários, executores e limites de performance (thresholds).
 * @type {import('k6/options').Options}
 */
export const options = {
    // Cenários de Carga Baixa, Média e Alta (em sequência)
    scenarios: {
        carga_baixa: {
            executor: 'ramping-vus',
            startTime: '0s', // Começa imediatamente
            stages: [
                { duration: '10s', target: 10 },
                { duration: '20s', target: 10 },
                { duration: '5s', target: 0 },
            ],
            env: { BASE_URL: 'http://localhost:3080' },
        },
        carga_media: {
            executor: 'ramping-vus',
            startTime: '40s', // Começa após a carga baixa
            stages: [
                { duration: '20s', target: 50 },
                { duration: '30s', target: 50 },
                { duration: '10s', target: 0 },
            ],
            env: { BASE_URL: 'http://localhost:3080' },
        },
        carga_alta: {
            executor: 'ramping-vus',
            startTime: '1m45s', // Começa após a carga média
            stages: [
                { duration: '30s', target: 150 },
                { duration: '30s', target: 150 },
                { duration: '15s', target: 0 },
            ],
            env: { BASE_URL: 'http://localhost:3080' },
        },
    },

    // !! MUDANÇA: Adicionamos thresholds para /api/documentos
    thresholds: {
        'http_req_failed': ['rate<0.01'], // Falha global

        // Thresholds do Endpoint 1 (POST Registrar)
        'http_req_duration{endpoint:registrar-doacao}': ['p(95)<800'],
        'checks{endpoint:registrar-doacao}': ['rate>0.99'],

        // Thresholds do Endpoint 2 (GET Documentos)
        // Um GET de listagem deve ser rápido (ex: 500ms)
        'http_req_duration{endpoint:listar-documentos}': ['p(95)<500'], 
        'checks{endpoint:listar-documentos}': ['rate>0.99'],
    },
};

// --- 3. Métricas Customizadas ---

// Métrica para o POST de registro
const doacaoTrend = new Trend('http_req_duration', true); 

// !! MUDANÇA: Nova métrica para o GET de documentos
const documentosTrend = new Trend('http_req_duration', true);

// --- 4. Carregamento de Massa de Dados ---
const data = new SharedArray('massa de dados de doação', function () {
    // O nome do arquivo no seu script original era 'doacoes-data.json'
    // Se o seu arquivo for 'daoacoes-data.json', ajuste o nome aqui
    return JSON.parse(open('./data/doacoes-data.json')); 
});


// --- 5. Função Setup (Login Dinâmico) ---
// (Esta função continua EXATAMENTE IGUAL)
export function setup() {
    const baseURL = __ENV.BASE_URL || 'http://localhost:3080';
    const email = __ENV.K6_USER_EMAIL;
    const password = __ENV.K6_USER_PASSWORD;

    if (!email || !password) {
        throw new Error('As variáveis de ambiente K6_USER_EMAIL e K6_USER_PASSWORD não foram definidas!');
    }

    const loginURL = `${baseURL}/api/auth/login`;
    const loginPayload = JSON.stringify({
        email: email,
        senha: password,
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(loginURL, loginPayload, params);

    check(res, {
        'login com sucesso (status 200)': (r) => r.status === 200,
        'token recebido no login': (r) => r.json('token') !== null,
    });

    if (res.status !== 200) {
        throw new Error('Falha ao obter token de autenticação no setup. Abortando teste.');
    }

    const token = res.json('token');
    console.log('Login no setup bem-sucedido. Token obtido.');
    return token;
}


// --- 6. Função Principal (O Teste) ---
// !! MUDANÇA: O fluxo de usuário agora testa os dois endpoints
/**
 * @summary Ponto de entrada principal para cada Usuário Virtual (VU).
 * @param {string} token O token JWT retornado pela função `setup`.
 */
export default function (token) {
    const baseURL = __ENV.BASE_URL;
    const doacaoInfo = randomItem(data);

    // --- AÇÃO 1: REGISTRAR DOAÇÃO (POST) ---
    // (Esta parte continua igual)
    group('Endpoint: /api/doacao/registrar-doacao (POST)', function () {
        const url = `${baseURL}/api/doacao/registrar-doacao`;
        const payload = JSON.stringify({
            instituicao_id: doacaoInfo.instituicao_id,
            categoria_id: doacaoInfo.categoria_id,
            quantidade: randomIntBetween(1, 100),
            qualidade: 'Novo',
            doador_origem_texto: `Doador de Teste k6 - ${randomIntBetween(1, 10000)}`,
            detalhes: {
                origem: 'Teste de Carga k6',
                info_extra: 'Item gerado automaticamente'
            }
        });
        const params = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            tags: { endpoint: 'registrar-doacao' },
        };

        const res = http.post(url, payload, params);
        doacaoTrend.add(res.timings.duration, { endpoint: 'registrar-doacao' });

        check(res, {
            'POST /registrar-doacao: status 201': (r) => r.status === 201,
            'POST /registrar-doacao: body contém id': (r) => {
                try { return r.json('id') !== null; } 
                catch (e) { return false; }
            },
        }, { endpoint: 'registrar-doacao' });
    });

    // Simula o usuário "pensando" por 1-3 segundos
    sleep(randomIntBetween(1, 3));

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // !! MUDANÇA: AQUI ESTÁ O NOVO ENDPOINT
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    // --- AÇÃO 2: LISTAR DOCUMENTOS (GET) ---
    group('Endpoint: /api/documentos (GET)', function () {
        
        // URL correta
        const url = `${baseURL}/api/documentos`;
        
        const params = {
            headers: {
                'Authorization': `Bearer ${token}`, // Precisa do token
                'Content-Type': 'application/json',
            },
            // Tag correta para o novo threshold
            tags: {
                endpoint: 'listar-documentos', 
            },
        };

        // Método GET
        const res = http.get(url, params);

        // Adiciona na nova métrica
        documentosTrend.add(res.timings.duration, { endpoint: 'listar-documentos' });

        // Checks corretos baseados no seu controller
        check(res, {
            'GET /documentos: status 200': (r) => r.status === 200,
            'GET /documentos: body é um array': (r) => {
                // Seu controller retorna 'res.status(200).json(data)'
                // onde 'data' é o resultado do Supabase (um array)
                try { return Array.isArray(r.json()); } 
                catch (e) { return false; }
            },
        }, { endpoint: 'listar-documentos' });
    });

    // Pausa final do fluxo
    sleep(randomIntBetween(1, 3));
}