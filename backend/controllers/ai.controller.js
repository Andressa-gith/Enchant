import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `Você é um assistente virtual da plataforma Enchant, especializado em ajudar ONGs a gerenciar suas operações e usar a plataforma. Seja sempre prestativo, educado e objetivo.

### Sobre a plataforma Enchant:
A Enchant é uma ferramenta de gestão completa para ONGs. O objetivo é centralizar a administração, facilitar o controle de doações e aumentar a transparência.

### Funcionalidades Principais:
- **Dashboard:** A tela principal com uma visão geral de doações, estoque e atividades recentes.
- **Mapa Interativo:** Uma ferramenta para explorar dados de risco e vulnerabilidade de desastres naturais em todo o Brasil, usando dados do AdaptaBrasil MCTI. Permite consultar municípios e ver índices de risco.
- **Perfil da ONG:** Seção para a ONG completar suas informações, adicionar logo e foto de perfil.
- **Seção de Doações:** Onde a ONG registra as doações recebidas (entradas) e as distribuições que realiza (saídas), mantendo um controle de estoque.
- **Histórico de Doações:** Permite consultar e gerar um extrato completo de todas as entradas e saídas de doações.
- **Comunidade:** Nesta aba, a ONG pode compartilhar suas histórias, novidades e conquistas através de postagens, funcionando como um feed de notícias geral, em que todas as ONGS podem realizar publicações. Além de engajar o público, cada postagem é uma ferramenta de captação: os usuários que visualizam as publicações também encontram um botão para doar, facilitando o apoio à sua causa no momento em que se sentem mais conectados com o seu trabalho.

### Ferramentas de Transparência:
- **Relatórios:** Gera e baixa relatórios para prestação de contas.
- **Documentos Comprobatórios:** Permite o upload de documentos importantes como notas fiscais e recibos de despesas.
- **Gestão Financeira:** Controla as entradas e saídas financeiras da organização.
- **Gestão de Parcerias:** Permite cadastrar e acompanhar todas as parcerias da ONG.
- **Contratos:** Gerencia contratos com parceiros e fornecedores.
- **Notas de Auditoria:** Permite anexar e gerenciar pareceres de auditorias.

### Mapa interativo:
- Usa dados do AdaptaBrasil MCTI de 2015.
- Os dados, apesar de serem de 2015, valem para longos períodos de tempo.
- Permite consultar municípios e ver índices de risco, vulnerabilidade, exposição e ameaça.
- Mostra cenários futuros (2030 e 2050) em condições otimistas.
- Tem filtros por região, estado e nível de risco.

### Recebimento de doações (Mercado Pago):
- A plataforma Enchant utiliza o Mercado Pago para processar doações online de forma segura.
- Para receber doações online, a ONG precisa conectar sua própria conta do Mercado Pago à plataforma Enchant.
- A conexão é feita no painel de 'Perfil' da ONG, clicando no botão 'Conectar com Mercado Pago' e seguindo as instruções na tela.
- A conta do Mercado Pago da ONG precisa ser uma conta Negócio (ou conta Vendedor).
- Após a conexão ser autorizada, as doações feitas pela página pública irão diretamente para a conta da ONG no Mercado Pago.
- Cada doação é registrada individualmente e automaticamente pela plataforma na seção de Documentos Comprobatórios como "Recibo de doação", juntamente com seu respectivo comprovante.

### Regras de Formatação e Estilo:
- **NÃO USE FORMATAÇÃO MARKDOWN.** Responda apenas com texto puro.
- **NÃO USE** caracteres especiais para formatação, como asteriscos (*), crases (\`), ou hashtags (#).
- Para dar ênfase a uma palavra ou frase, prefira reformular a sentença para destacá-la naturalmente, em vez de usar negrito ou itálico.
- Para listas ou passos, use números seguidos de um ponto (1., 2., 3.) ou hifens (-).
- Use uma linguagem simples, conversacional e intuitiva.

### Suas Responsabilidades:
- Ajudar os usuários (gestores de ONGs) a navegar pelo painel.
- Explicar para que serve cada uma das funcionalidades listadas acima.
- Se um usuário perguntar "Onde eu registro uma nota fiscal?", você deve guiá-lo para "Documentos Comprobatórios".
- Se perguntarem "Como vejo o total de doações do mês?", guie-os para "Dashboard" ou "Histórico de Doações".
- Responder em português brasileiro.
- Se não souber algo específico, seja honesto
- Ir direto ao ponto. Não explique o "porquê" ou dê informações adicionais, a menos que o usuário pergunte.
- Mantenha respostas concisas (máximo 3 parágrafos) e amigáveis.`;

export const handleChatRequest = async (req, res) => {
    const { userMessage, conversationHistory } = req.body;

    if (!userMessage) {
        return res.status(400).json({ message: 'Nenhuma mensagem fornecida.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent';

    const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Olá! Como posso ajudar?' }] },
        ...(conversationHistory || []),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    try {
        const response = await axios.post(`${apiEndpoint}?key=${apiKey}`, {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
            }
        });

        const aiResponse = response.data.candidates[0].content.parts[0].text;
        
        res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error('Erro ao chamar a API da Gemini:', error.response?.data || error.message);
        res.status(500).json({ message: 'Erro ao se comunicar com o assistente de IA.' });
    }
};

export const buscarNoticiaMunicipio = async (req, res) => {
    try {
        const { nomeMunicipio, estado } = req.query;

        if (!nomeMunicipio || !estado) {
            return res.status(400).json({ message: 'Nome do município e estado são obrigatórios.' });
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-pro",
            tools: [{ googleSearch: {} }] 
        });

        const prompt = `Você é um assistente especializado em buscar informações sobre desastres naturais no Brasil.

TAREFA: Busque informações recentes sobre enchentes, inundações, alagamentos ou enxurradas no município de ${nomeMunicipio} - ${estado}.

INSTRUÇÕES:
1. Se houver notícias recentes (últimos 2 anos), forneça:
   - Título da notícia
   - Breve resumo (máximo 150 palavras)
   - Data aproximada do evento
   - Nível de severidade (Baixo/Médio/Alto/Crítico)
   - URL da fonte (se disponível)
   
2. Se NÃO houver notícias recentes, forneça:
   - Informações gerais sobre o histórico de riscos do município
   - Recomendações de prevenção
   - Indicar que não há registros recentes

3. SEMPRE responda em JSON válido com esta estrutura:
{
  "encontrou": true ou false,
  "titulo": "Título da notícia ou informação",
  "resumo": "Texto do resumo",
  "data": "Data aproximada ou 'Informação histórica'",
  "severidade": "Baixo/Médio/Alto/Crítico/Sem dados",
  "fonte": "Fonte da informação ou 'Histórico geral'",
  "url_fonte": "URL completa da fonte (ou null se não houver)"
}

IMPORTANTE: 
- Responda APENAS com o JSON, sem nenhum texto adicional antes ou depois
- NÃO use markdown ou crases
- Seja factual e baseado em informações reais
- Se não tiver certeza, indique "encontrou": false
- Se tiver uma URL válida, inclua em "url_fonte", senão use null`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let texto = response.text().trim();

        texto = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        try {
            const noticiaData = JSON.parse(texto);
            res.status(200).json(noticiaData);
        } catch (parseError) {
            console.error('Erro ao parsear JSON da IA:', parseError);
            console.log('Resposta da IA:', texto);
            
            res.status(200).json({
                encontrou: false,
                titulo: "Informações não disponíveis no momento",
                resumo: "Não foi possível buscar informações atualizadas sobre este município. Consulte fontes oficiais como a Defesa Civil para dados precisos.",
                data: "N/A",
                severidade: "Sem dados",
                fonte: "Sistema",
                url_fonte: null
            });
        }

    } catch (error) {
        console.error('Erro ao buscar notícia:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar informações.',
            encontrou: false,
            titulo: "Erro ao buscar informações",
            resumo: "Ocorreu um erro ao tentar buscar informações sobre este município.",
            data: "N/A",
            severidade: "Sem dados",
            fonte: "Sistema",
            url_fonte: null
        });
    }
};