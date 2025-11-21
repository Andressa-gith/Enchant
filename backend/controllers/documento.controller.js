import supabase from '../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Valida documento comprobatório usando IA
 */
async function validarDocumentoComIA(arquivo) {
    try {
        logger.info(' Validando documento comprobatório com IA...');

        const base64Data = arquivo.buffer.toString('base64');
        const mimeType = arquivo.mimetype;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `Você é um especialista em análise de documentos financeiros e comprobatórios.

TAREFA: Analise este documento e verifique se é um DOCUMENTO COMPROBATÓRIO válido.

ELEMENTOS que o documento DEVE conter (pelo menos 3 dos seguintes):
1. Identificação do emitente (nome, CNPJ/CPF, endereço)
2. Identificação do destinatário/beneficiário
3. Data de emissão ou realização
4. Descrição do serviço/produto/transação
5. Valor monetário ou quantitativo
6. Número do documento (nota fiscal, recibo, comprovante)
7. Assinatura, carimbo ou validação digital

DOCUMENTOS VÁLIDOS incluem:
- Notas fiscais (NF-e, NFS-e, NFC-e)
- Recibos de pagamento ou doação
- Comprovantes de transferência bancária (PIX, TED, DOC)
- Boletos pagos com comprovante
- Orçamentos aprovados/assinados
- Cupons fiscais
- Faturas e duplicatas
- Comprovantes de depósito
- Extratos bancários
- Contracheques/holerites

DOCUMENTOS INVÁLIDOS:
- Imagens genéricas sem informações financeiras
- Documentos ilegíveis ou corrompidos
- Prints de conversas sem valor comprobatório
- Documentos sem identificação clara
- Arquivos em branco ou com conteúdo irrelevante

RESPOSTA OBRIGATÓRIA:
- Se VÁLIDO, responda APENAS: "VÁLIDO"
- Se INVÁLIDO, responda: "INVÁLIDO: [explique especificamente o motivo]"

Exemplos de respostas INVÁLIDAS corretas:
- "INVÁLIDO: Documento não possui identificação do emitente"
- "INVÁLIDO: Não há valor monetário especificado no documento"
- "INVÁLIDO: Imagem ilegível, não é possível verificar as informações"
- "INVÁLIDO: Documento não aparenta ser um comprovante financeiro válido"
- "INVÁLIDO: Falta data de emissão e número do documento"

Analise agora:`;

        const result = await model.generateContent([
            { inlineData: { mimeType: mimeType, data: base64Data } },
            prompt
        ]);

        const response = await result.response;
        const texto = response.text().trim().toUpperCase();

        logger.info(` Resposta da IA: ${texto}`);

        if (texto.startsWith('VÁLIDO')) {
            logger.info(' Documento comprobatório aprovado pela IA.');
            return { valido: true, motivo: null };
        } else {
            let motivo = texto.replace(/^INVÁLIDO:?\s*/i, '').trim();
            
            if (!motivo || motivo.length < 10) {
                motivo = 'O documento não atende aos requisitos de um comprovante válido (faltam informações essenciais como emitente, valor ou data)';
            }
            
            logger.warn(` Documento rejeitado: ${motivo}`);
            return { valido: false, motivo: motivo };
        }

    } catch (error) {
        logger.error(' Erro ao validar documento:', error);
        return { 
            valido: false, 
            motivo: 'Erro ao processar o documento. Verifique se o arquivo está corrompido ou tente novamente mais tarde.' 
        };
    }
}

/**
 * Busca todos os documentos comprobatórios da instituição logada.
 */
export const getDocumentos = async (req, res) => {
    logger.info('Iniciando busca de documentos comprobatórios...');
    try {
        const instituicaoId = req.user.id;
        logger.debug(`Buscando documentos para a instituição ID: ${instituicaoId}`);

        const { data, error } = await supabase
            .from('documento_comprobatorio')
            .select('*, gestao_financeira(nome_categoria)')
            .eq('instituicao_id', instituicaoId)
            .eq('status', 'confirmado')
            .order('data_criacao', { ascending: false });

        if (error) throw error;

        logger.info(`Busca de documentos bem-sucedida. ${data.length} registros encontrados.`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Erro ao buscar documentos comprobatórios.', error);
        res.status(500).json({ message: 'Erro ao buscar documentos.' });
    }
};

/**
 * Atualiza um documento comprobatório.
 */
export const updateDocumento = async (req, res) => {
    logger.info('Iniciando processo de atualização de documento...');
    const { id } = req.params;
    const instituicaoId = req.user.id;

    try {
        const { titulo, valor, tipo_documento } = req.body;
        let updateData = {};

        if (titulo !== undefined) updateData.titulo = titulo;
        if (valor !== undefined) updateData.valor = parseFloat(valor);
        if (tipo_documento !== undefined) updateData.tipo_documento = tipo_documento;

        if (req.file) {
            logger.info(`Novo arquivo recebido para o documento ID: ${id}. Validando com IA...`);
            
            // ✅ VALIDAÇÃO COM IA para arquivo de atualização
            const validacao = await validarDocumentoComIA(req.file);
            if (!validacao.valido) {
                logger.warn(` Documento rejeitado pela IA: ${validacao.motivo}`);
                return res.status(400).json({ 
                    message: 'Documento inválido detectado pela análise automática.',
                    detalhes: validacao.motivo,
                    tipo_erro: 'validacao_ia'
                });
            }
            
            logger.info(' Documento aprovado pela IA. Prosseguindo com atualização...');
            
            const { data: docAntigo, error: fetchError } = await supabase
                .from('documento_comprobatorio')
                .select('caminho_arquivo')
                .match({ id: id, instituicao_id: instituicaoId })
                .single();
            
            if (fetchError || !docAntigo) {
                return res.status(404).json({ message: 'Documento não encontrado ou sem permissão.' });
            }
            const caminhoArquivoAntigo = docAntigo.caminho_arquivo;

            const novoFilePath = `${instituicaoId}/${uuidv4()}-${req.file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('comprovantes')
                .upload(novoFilePath, req.file.buffer, { contentType: req.file.mimetype });

            if (uploadError) throw uploadError;
            logger.info(`Novo arquivo enviado para: ${novoFilePath}`);
            updateData.caminho_arquivo = novoFilePath;

            if (caminhoArquivoAntigo) {
                await supabase.storage.from('comprovantes').remove([caminhoArquivoAntigo]);
                logger.info(`Arquivo antigo (${caminhoArquivoAntigo}) deletado do Storage.`);
            }
        }
        
        const { data, error } = await supabase
            .from('documento_comprobatorio')
            .update(updateData)
            .match({ id: id, instituicao_id: instituicaoId })
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            logger.warn(`Documento ID: ${id} não encontrado para atualização.`);
            return res.status(404).json({ message: 'Documento não encontrado ou sem permissão.' });
        }

        logger.info(`Documento ID: ${id} atualizado com sucesso.`);
        res.status(200).json({ message: 'Documento atualizado com sucesso!', data: updateData });

    } catch (error) {
        logger.error(`Erro ao atualizar documento ID: ${id}.`, error);
        res.status(500).json({ message: 'Erro interno ao atualizar documento.' });
    }
};

/**
 * Adiciona um novo documento comprobatório COM VALIDAÇÃO POR IA
 */
export const addDocumento = async (req, res) => {
    logger.info('Iniciando processo de adição de novo documento...');
    let filePath;
    try {
        const instituicaoId = req.user.id;
        const { titulo, tipo_documento, valor, gestao_financeira_id } = req.body;
        logger.debug('Dados recebidos para novo documento:', { titulo, tipo_documento, valor, gestao_financeira_id });

        if (!req.file) {
            logger.warn('Tentativa de adicionar documento sem arquivo.');
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
        }

        // ✅ VALIDAÇÃO COM IA
        const file = req.file;
        logger.info(' Validando documento comprobatório com IA...');
        const validacao = await validarDocumentoComIA(file);

        if (!validacao.valido) {
            logger.warn(` Documento rejeitado pela IA: ${validacao.motivo}`);
            return res.status(400).json({ 
                message: 'Documento inválido detectado pela análise automática.',
                detalhes: validacao.motivo,
                tipo_erro: 'validacao_ia'
            });
        }

        logger.info(' Documento aprovado pela IA. Prosseguindo com upload...');

        // 1. Upload do arquivo
        filePath = `${instituicaoId}/${uuidv4()}-${file.originalname}`;
        logger.info(`Fazendo upload do arquivo de documento para: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('comprovantes')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;
        logger.info('Upload do arquivo de documento realizado com sucesso.');

        // 2. Inserção no banco de dados
        logger.info('Inserindo metadados do documento no banco de dados...');
        const { data, error: insertError } = await supabase
            .from('documento_comprobatorio')
            .insert({
                instituicao_id: instituicaoId,
                titulo,
                tipo_documento,
                valor: parseFloat(valor),
                caminho_arquivo: filePath,
                gestao_financeira_id: gestao_financeira_id || null,
                status: 'confirmado'
            })
            .select()
            .single();

        if (insertError) throw insertError;

        logger.info('Documento adicionado com sucesso!', { id: data.id });
        res.status(201).json({ 
            message: 'Documento validado e adicionado com sucesso!', 
            data 
        });

    } catch (error) {
        logger.error('Erro no processo de adicionar documento.', error);
        
        if (filePath) {
            logger.warn(`Erro detectado. Tentando fazer rollback do arquivo: ${filePath}`);
            await supabase.storage.from('comprovantes').remove([filePath]);
            logger.info('Rollback do arquivo no Storage concluído.');
        }

        res.status(500).json({ message: 'Erro ao adicionar documento.' });
    }
};

/**
 * Deleta um documento comprobatório e seu arquivo associado no Storage.
 */
export const deleteDocumento = async (req, res) => {
    logger.info('Iniciando processo de exclusão de documento...');
    try {
        const instituicaoId = req.user.id;
        const { id } = req.params;
        logger.debug(`Tentando deletar documento ID: ${id}`);

        const { data: doc, error: fetchError } = await supabase
            .from('documento_comprobatorio')
            .select('caminho_arquivo')
            .eq('id', id)
            .eq('instituicao_id', instituicaoId)
            .single();

        if (fetchError || !doc) {
            logger.warn(`Documento ID: ${id} não encontrado para exclusão ou usuário sem permissão.`);
            return res.status(404).json({ message: 'Documento não encontrado ou você não tem permissão.' });
        }

        const { error: deleteDbError } = await supabase
            .from('documento_comprobatorio')
            .delete()
            .eq('id', id);
        if (deleteDbError) throw deleteDbError;
        logger.info(`Registro do documento ID: ${id} deletado do banco de dados.`);
        
        const { error: deleteStorageError } = await supabase.storage
            .from('comprovantes')
            .remove([doc.caminho_arquivo]);
        if (deleteStorageError) {
            logger.warn(`Falha ao remover arquivo do Storage para documento ID: ${id}.`, deleteStorageError);
        }

        logger.info(`Documento ID: ${id} deletado com sucesso.`);
        res.status(200).json({ message: 'Documento deletado com sucesso!' });
        
    } catch (error) {
        logger.error('Erro ao deletar documento.', error);
        res.status(500).json({ message: 'Erro ao deletar documento.' });
    }
};