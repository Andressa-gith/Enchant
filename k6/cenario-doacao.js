/**
 * @file k6/cenario-doacao.js
 * @summary Teste de Carga para o Cenário de Registro de Doação.
 * * Simula múltiplos usuários registrando doações simultaneamente para
 * avaliar a performance do endpoint /api/doacao/registrar-doacao.
 * * @requires k6/http
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
import { SharedArray } from 'k6/data'; // Para carregar os dados do JSON
import { Trend } from 'k6/metrics'; // Para criar métricas customizadas

// --- 2. Configuração do Teste (Options) ---

/**
 * @summary Configuração principal do teste de carga (Options).
 * Define os cenários, executores e limites de performance (thresholds).
 * @type {import('k6/options').Options}
 */
export const options = {
    scenarios: {
        // 'registrar_doacao_carga' é o nome do nosso cenário.
        // Isso aparecerá nos relatórios do Grafana.
        registrar_doacao_carga: {
            executor: 'ramping-vus', // 'ramping-vus' é o executor que permite 'stages' (rampas)
            startVUs: 0,

            // Definição das rampas de carga:
            // 1. Ramp-up: Sobe de 0 a 50 usuários em 20s.
            // 2. Soak Test: Mantém 50 usuários por 30s (aqui é o teste real).
            // 3. Ramp-down: Desce de 50 a 0 usuários em 10s.
            stages: [
                { duration: '20s', target: 50 },
                { duration: '30s', target: 50 },
                { duration: '10s', target: 0 },
            ],

            // 'env' define variáveis de ambiente que o script pode usar.
            // Isso permite passar valores padrão, mas prioriza o que vem da linha de comando.
            env: {
                BASE_URL: 'http://localhost:3080',
                K6_TOKEN: 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImRDRnNoVjBsdWUvUmxmTXciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3h6dHJ2dnB4aGNjYWNrem9hYWx6LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjMWFkNjdjYS1lMjE1LTQ2MzktYjY3Mi02ZTlkN2E5ODU0YTYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYyMzA5MDc5LCJpYXQiOjE3NjIzMDU0NzksImVtYWlsIjoiZ3VpbGhlcm1lLm9saXZlckBiYS5lc3R1ZGFudGUuc2VuYWkuYnIiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNucGoiOiIxNi4yMDAuMzQ5LzAwMDEtMDciLCJlbWFpbCI6Imd1aWxoZXJtZS5vbGl2ZXJAYmEuZXN0dWRhbnRlLnNlbmFpLmJyIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5vbWVfaW5zdGl0dWljYW8iOiJJbnN0aXR1acOnw6NvIDEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImMxYWQ2N2NhLWUyMTUtNDYzOS1iNjcyLTZlOWQ3YTk4NTRhNiIsInRpcG9faW5zdGl0dWljYW8iOiJPTkcifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MjMwNTQ3OX1dLCJzZXNzaW9uX2lkIjoiZDUxMDEyN2ItMmM4MS00Y2I2LTk0MmYtYmM3YjY1OTM1YzhkIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.iokq-M1A7RmQUvzgj_x6GybAJ89lk2ajOtz7sTD9GTE', // Um valor "default"
            },
        },
    },

    // Thresholds (Limites de Aceitação)
    // Se qualquer um destes falhar, o k6 sairá com 'exit code 1' (erro).
    thresholds: {
        // 1. Falha global: Menos de 1% de todas as requisições HTTP podem falhar.
        'http_req_failed': ['rate<0.01'],

        // 2. Limite de performance (P95): 95% das requisições para o endpoint 'registrar-doacao'
        //    devem responder em menos de 800ms.
        //    A tag '{endpoint:registrar-doacao}' é o que conecta isso à nossa métrica.
        'http_req_duration{endpoint:registrar-doacao}': ['p(95)<800'],

        // 3. Limite de sucesso funcional: Mais de 99% dos 'checks' (verificações)
        //    para o endpoint 'registrar-doacao' devem passar.
        'checks{endpoint:registrar-doacao}': ['rate>0.99'],
    },
};

// --- 3. Métricas Customizadas ---

/**
 * Métrica customizada (Trend) para medir o tempo de resposta
 * *especificamente* do endpoint de registro de doação.
 * Isso nos permite criar thresholds e ver gráficos isolados para esta rota.
 * @type {import('k6/metrics').Trend}
 */
const doacaoTrend = new Trend('http_req_duration', true); // O 'true' indica que é uma métrica de tempo

// --- 4. Carregamento de Massa de Dados ---

/**
 * Carrega a massa de dados (JSON) e a compartilha entre todos os VUs.
 * O k6 lê este arquivo apenas UMA vez (na inicialização) e o
 * coloca na memória, otimizando a performance.
 * @type {SharedArray}
 */
const data = new SharedArray('massa de dados de doação', function () {
    // O k6 espera que a função retorne um array
    return JSON.parse(open('./data/doacoes-data.json'));
});


// --- 5. Função Principal (O Teste) ---

/**
 * @summary Ponto de entrada principal para cada Usuário Virtual (VU).
 * Esta função é executada em loop por cada VU durante o teste.
 * @export
 * @default
 */
export default function () {

    // Pega as variáveis de ambiente definidas no 'options' ou passadas via terminal
    // Este é o método "profissional" para evitar "chumbar" (hardcode) tokens no script.
    const baseURL = __ENV.BASE_URL;
    const token = __ENV.K6_TOKEN;

    // Pega um item (instituição/categoria) aleatório do nosso arquivo JSON
    const doacaoInfo = randomItem(data);

    // 'group' é usado para agrupar requisições relacionadas.
    // No Grafana Cloud, isso cria seções recolhíveis, facilitando a análise.
    group('Endpoint: /api/doacao/registrar-doacao (POST)', function () {

        const url = `${baseURL}/api/doacao/registrar-doacao`;

        /**
         * O 'payload' (corpo da requisição) é montado dinamicamente
         * com dados do nosso JSON (`doacaoInfo`) e dados aleatórios (`randomIntBetween`).
         * Isso simula melhor o uso real da aplicação.
         */
        const payload = JSON.stringify({
            instituicao_id: doacaoInfo.instituicao_id, // Dado real do JSON
            categoria_id: doacaoInfo.categoria_id,     // Dado real do JSON
            quantidade: randomIntBetween(1, 100),    // Dado aleatório
            qualidade: 'Novo', // Valor fixo (pode ser randomizado se necessário)
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
                'Authorization': `Bearer ${token}`, // Usa o token pego do ENV
            },
            // As 'tags' são essenciais. Elas 'etiquetam' esta requisição,
            // permitindo que nossos Thresholds e a métrica 'doacaoTrend'
            // filtrem os resultados *apenas* para este endpoint.
            tags: {
                endpoint: 'registrar-doacao',
            },
        };

        // 1. Executa a requisição POST
        const res = http.post(url, payload, params);

        // 2. Adiciona o tempo de resposta (em ms) à nossa métrica customizada
        //    Isso alimenta o threshold 'http_req_duration{...}'
        doacaoTrend.add(res.timings.duration, { endpoint: 'registrar-doacao' });

        // 3. Verificações (Checks) funcionais.
        //    Isso alimenta o threshold 'checks{...}'
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
            // Adiciona a tag aos checks também, para o threshold 'checks' funcionar
            { endpoint: 'registrar-doacao' });
    });

    // IMPORTANTE: O `sleep` fica FORA do `group`.
    // Isso simula o "tempo de pensamento" do usuário (think time) entre as ações,
    // e garante que esse 'tempo parado' não afete a métrica `http_req_duration`
    // do nosso endpoint (que é medida dentro do 'group').
    // Usamos um tempo aleatório para evitar picos "sincronizados" no servidor.
    sleep(randomIntBetween(1, 3)); // Dorme entre 1 e 3 segundos
}