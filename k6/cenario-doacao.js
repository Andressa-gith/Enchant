/**
 * @file k6/cenario-doacao.js
 * @summary Teste de Carga para o Cenário de Registro de Doação.
 * * Este script agora inclui uma função `setup` para obter um token
 * * de autenticação dinamicamente antes de iniciar o teste de carga.
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
    scenarios: {
        // 'registrar_doacao_carga' é o nome do nosso cenário.
        registrar_doacao_carga: {
            executor: 'ramping-vus', // 'ramping-vus' é o executor que permite 'stages' (rampas)
            startVUs: 0,

            // Definição das rampas de carga:
            stages: [
                { duration: '20s', target: 50 },
                { duration: '30s', target: 50 },
                { duration: '10s', target: 0 },
            ],

            // 'env' define variáveis de ambiente que o script pode usar.
            // Removemos o K6_TOKEN daqui, pois será obtido no 'setup'.
            env: {
                BASE_URL: 'http://localhost:3080',
            },
        },
    },

    // Thresholds (Limites de Aceitação)
    thresholds: {
        // 1. Falha global: Menos de 1% de todas as requisições HTTP podem falhar.
        'http_req_failed': ['rate<0.01'],

        // 2. Limite de performance (P95): 95% das requisições para 'registrar-doacao'
        //    devem responder em menos de 800ms.
        'http_req_duration{endpoint:registrar-doacao}': ['p(95)<800'],

        // 3. Limite de sucesso funcional: Mais de 99% dos 'checks' (verificações)
        //    para 'registrar-doacao' devem passar.
        'checks{endpoint:registrar-doacao}': ['rate>0.99'],
    },
};

// --- 3. Métricas Customizadas ---

/**
 * Métrica customizada (Trend) para medir o tempo de resposta
 * *especificamente* do endpoint de registro de doação.
 * @type {import('k6/metrics').Trend}
 */
const doacaoTrend = new Trend('http_req_duration', true); // O 'true' indica que é uma métrica de tempo

// --- 4. Carregamento de Massa de Dados ---

/**
 * Carrega a massa de dados (JSON) e a compartilha entre todos os VUs.
 * O k6 lê este arquivo apenas UMA vez (na inicialização).
 * @type {SharedArray}
 */
const data = new SharedArray('massa de dados de doação', function () {
    // O k6 espera que a função retorne um array
    return JSON.parse(open('./data/doacoes-data.json'));
});


// --- 5. Função Setup (Login Dinâmico) ---

/**
 * @summary Roda UMA VEZ antes do teste para obter o token de autenticação.
 * Lê o e-mail e a senha das variáveis de ambiente (passadas pelo .yml).
 * @export
 * @returns {string} O token de autenticação JWT.
 */
export function setup() {
    // Pega as variáveis de ambiente que vamos definir no .yml
    // O '||' garante um fallback caso o BASE_URL não seja passado
    const baseURL = __ENV.BASE_URL || 'http://localhost:3080';
    const email = __ENV.K6_USER_EMAIL;
    const password = __ENV.K6_USER_PASSWORD;

    // Validação para garantir que as ENVs foram passadas
    if (!email || !password) {
        throw new Error('As variáveis de ambiente K6_USER_EMAIL e K6_USER_PASSWORD não foram definidas!');
    }

    const loginURL = `${baseURL}/api/auth/login`;
    const loginPayload = JSON.stringify({
        email: email,
        senha: password,
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    // Faz a UMA requisição de login
    const res = http.post(loginURL, loginPayload, params);

    // Verifica se o login deu certo
    check(res, {
        'login com sucesso (status 200)': (r) => r.status === 200,
        'token recebido no login': (r) => r.json('token') !== null,
    });

    // Se o login falhar (status != 200), o k6 aborta o teste de carga
    if (res.status !== 200) {
        throw new Error('Falha ao obter token de autenticação no setup. Abortando teste.');
    }

    // Extrai e retorna o token para a função 'default'
    const token = res.json('token');
    console.log('Login no setup bem-sucedido. Token obtido.');
    return token;
}


// --- 6. Função Principal (O Teste) ---

/**
 * @summary Ponto de entrada principal para cada Usuário Virtual (VU).
 * Esta função é executada em loop por cada VU durante o teste.
 * @export
 * @default
 * @param {string} token O token JWT retornado pela função `setup`.
 */
export default function (token) {

    // Pega o baseURL (o token agora vem do argumento 'token')
    const baseURL = __ENV.BASE_URL;

    // Pega um item (instituição/categoria) aleatório do nosso arquivo JSON
    const doacaoInfo = randomItem(data);

    // 'group' é usado para agrupar requisições relacionadas
    group('Endpoint: /api/doacao/registrar-doacao (POST)', function () {

        const url = `${baseURL}/api/doacao/registrar-doacao`;

        /**
         * O 'payload' (corpo da requisição) é montado dinamicamente
         * com dados do nosso JSON (`doacaoInfo`) e dados aleatórios (`randomIntBetween`).
         */
        const payload = JSON.stringify({
            instituicao_id: doacaoInfo.instituicao_id, // Dado real do JSON
            categoria_id: doacaoInfo.categoria_id,     // Dado real do JSON
            quantidade: randomIntBetween(1, 100),    // Dado aleatório
            qualidade: 'Novo', // Valor fixo
            doador_origem_texto: `Doador de Teste k6 - ${randomIntBetween(1, 10000)}`,
            detalhes: {
                origem: 'Teste de Carga k6',
                info_extra: 'Item gerado automaticamente'
            }
        });

        /**
         * Parâmetros da requisição, incluindo Headers e Tags.
         */
        const params = {
            headers: {
                'Content-Type': 'application/json',
                // Usa o token DINÂMICO obtido no 'setup'
                'Authorization': `Bearer ${token}`,
            },
            // 'tags' etiquetam a requisição para os thresholds
            tags: {
                endpoint: 'registrar-doacao',
            },
        };

        // 1. Executa a requisição POST
        const res = http.post(url, payload, params);

        // 2. Adiciona o tempo de resposta (em ms) à nossa métrica customizada
        doacaoTrend.add(res.timings.duration, { endpoint: 'registrar-doacao' });

        // 3. Verificações (Checks) funcionais
        check(res, {
            'retornou status 201 (Created)': (r) => r.status === 201,
            'retornou um corpo (body) na resposta': (r) => r.body.length > 0,
            'body contém o id da doação criada': (r) => {
                try {
                    const body = r.json(); // Tenta converter o body para JSON
                    return body && body.id; // Verifica se o JSON tem a chave 'id'
                } catch (e) {
                    return false; // Se não for um JSON válido, o check falha
                }
            },
        },
            // Adiciona a tag aos checks também
            { endpoint: 'registrar-doacao' });
    });

    // Pausa (think time) FORA do 'group' para não inflar a métrica
    sleep(randomIntBetween(1, 3)); // Dorme entre 1 e 3 segundos
}