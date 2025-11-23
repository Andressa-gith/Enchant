import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Valida se uma imagem é apropriada para perfil ou logo
 * @param {Buffer} imageBuffer - Buffer da imagem
 * @param {string} mimeType - Tipo MIME da imagem
 * @param {string} tipo - 'perfil' ou 'logo'
 * @returns {Promise<{valido: boolean, motivo: string|null}>}
 */
export async function validarImagemComIA(imageBuffer, mimeType, tipo = 'perfil') {
    try {
        logger.info(` Validando ${tipo} com IA...`);

        const base64Data = imageBuffer.toString('base64');
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const prompt = tipo === 'perfil' 
            ? `Você é um moderador de conteúdo especializado em validar fotos de perfil.

TAREFA: Analise esta imagem e verifique se é APROPRIADA para uma foto de perfil profissional.

CRITÉRIOS DE REJEIÇÃO OBRIGATÓRIOS:
1. Nudez ou seminudez (qualquer exposição de partes íntimas ou seios)
2. Conteúdo sexual ou sugestivo
3. Violência explícita ou sangue
4. Armas de fogo ou armas brancas em destaque
5. Drogas ilícitas ou parafernália
6. Gestos obscenos ou ofensivos
7. Símbolos de ódio (nazismo, racismo, etc)
8. Imagens perturbadoras ou chocantes

CONTEÚDO ACEITÁVEL:
- Rostos de pessoas (selfies, fotos profissionais)
- Avatares, ilustrações ou desenhos apropriados
- Logos de empresas
- Paisagens, animais, objetos neutros
- Fotos de corpo inteiro com roupas apropriadas

IMPORTANTE:
- Se houver QUALQUER indício de nudez, mesmo parcial, REJEITE
- Roupas de banho em contexto de praia/piscina são aceitáveis
- Fotos profissionais ou casuais apropriadas são aceitáveis

RESPOSTA OBRIGATÓRIA:
- Se APROPRIADO, responda APENAS: "VÁLIDO"
- Se INAPROPRIADO, responda: "INVÁLIDO: [especifique o motivo brevemente]"

Exemplos de respostas INVÁLIDAS corretas:
- "INVÁLIDO: Imagem contém nudez ou conteúdo sexual"
- "INVÁLIDO: Presença de violência explícita"
- "INVÁLIDO: Gestos ofensivos detectados"
- "INVÁLIDO: Armas visíveis na imagem"

Analise agora:`
            : `Você é um moderador de conteúdo especializado em validar logos de organizações.

TAREFA: Analise esta imagem e verifique se é APROPRIADA para um logo institucional.

CRITÉRIOS DE REJEIÇÃO OBRIGATÓRIOS:
1. Conteúdo sexual, nudez ou sugestivo
2. Violência explícita ou armas
3. Símbolos de ódio (suástica, KKK, etc)
4. Drogas ilícitas
5. Gestos obscenos
6. Conteúdo perturbador ou chocante
7. Imagens de pessoas (logos devem ser abstratos/simbólicos)

CONTEÚDO ACEITÁVEL:
- Logos corporativos profissionais
- Símbolos abstratos, ícones, emblemas
- Letras, tipografia, monogramas
- Ilustrações vetoriais apropriadas
- Mascotes ou personagens apropriados
- Símbolos religiosos respeitosos (cruz, estrela de Davi, crescente islâmico)

IMPORTANTE:
- Logos NÃO devem conter fotos de pessoas reais
- Devem ser apropriados para uso institucional público
- Não podem ter conotação ofensiva ou controversa

RESPOSTA OBRIGATÓRIA:
- Se APROPRIADO, responda APENAS: "VÁLIDO"
- Se INAPROPRIADO, responda: "INVÁLIDO: [especifique o motivo brevemente]"

Exemplos de respostas INVÁLIDAS corretas:
- "INVÁLIDO: Logo contém foto de pessoa real (use ilustração)"
- "INVÁLIDO: Símbolo ofensivo ou de ódio detectado"
- "INVÁLIDO: Conteúdo inapropriado para logo institucional"

Analise agora:`;

        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType, data: base64Data } },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        logger.info(` Resposta da IA para ${tipo}: ${texto}`);

        if (texto.startsWith('VÁLIDO')) {
            logger.info(` ${tipo} aprovado pela IA.`);
            return { valido: true, motivo: null };
        } else {
            let motivo = texto.replace(/^INVÁLIDO:?\s*/i, '').trim();
            
            if (!motivo || motivo.length < 10) {
                motivo = tipo === 'perfil' 
                    ? 'A imagem não é apropriada para foto de perfil (conteúdo inadequado detectado)'
                    : 'A imagem não é apropriada para logo institucional (conteúdo inadequado detectado)';
            }
            
            logger.warn(` ${tipo} rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error(` Erro ao validar ${tipo}:`, error);
        // EM CASO DE ERRO, REJEITA POR SEGURANÇA
        return { 
            valido: false, 
            motivo: 'Não foi possível validar a imagem. Por favor, tente com outra imagem ou contate o suporte.' 
        };
    }
}