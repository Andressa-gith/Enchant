import supabase from '/scripts/supabaseClient.js';

class ReportManager {
    constructor() {
        // Centraliza todos os elementos da UI para fácil acesso
        this.ui = {
            tableBody: document.getElementById('tableBody'),
            reportForm: document.getElementById('reportForm'),
            generateBtn: document.getElementById('generateReportBtn'),
            pdfLoading: document.getElementById('pdfLoading'),
            toastContainer: document.getElementById('toastContainer'),
            categorySelect: document.getElementById('categoria_filtro'),
        };

        // Armazena a lista de relatórios
        this.allReports = [];

        // Garante que o 'this' seja o correto nos métodos de evento
        this.generateReport = this.generateReport.bind(this);
        this.handleTableClick = this.handleTableClick.bind(this);
    }

    /**
     * Inicia o gerenciador, configurando ouvintes de eventos e buscando dados iniciais.
     */
    init() {
        // Validação para garantir que os elementos essenciais existem
        if (!this.ui.reportForm || !this.ui.tableBody || !this.ui.categorySelect) {
            console.error("Erro: Um ou mais elementos essenciais da UI não foram encontrados. Verifique os IDs no seu HTML.");
            return;
        }
        this.setupEventListeners();
        this.fetchReports();
        this.populateCategories();
    }

    /**
     * Configura todos os ouvintes de eventos da página.
     */
    setupEventListeners() {
        this.ui.reportForm.addEventListener('submit', this.generateReport);
        this.ui.tableBody.addEventListener('click', this.handleTableClick);
    }

    /**
     * Exibe uma notificação toast na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} type - O tipo de notificação ('info', 'success', 'error').
     */
    showToast(message, type = 'info') {
        if (!this.ui.toastContainer) {
            // Se o container de toast não existir, usa um alert como alternativa
            alert(message);
            return;
        }
        const icon = type === 'success' ? 'check-circle' : 'exclamation-triangle';
        const toast = document.createElement('div');
        // Adiciona a classe 'show' imediatamente para a animação de entrada
        toast.className = `toast show toast-${type}`;
        toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
        this.ui.toastContainer.appendChild(toast);
        // Remove o toast após 5 segundos
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Controla a exibição do estado de carregamento (spinner e botão desabilitado).
     * @param {boolean} isLoading - True para mostrar o carregamento, false para esconder.
     */
    toggleLoading(isLoading) {
        this.ui.generateBtn.disabled = isLoading;
        this.ui.pdfLoading.style.display = isLoading ? 'flex' : 'none';
    }

    /**
     * Renderiza a tabela de relatórios com os dados atuais.
     */
    renderTable() {
        this.ui.tableBody.innerHTML = '';
        if (this.allReports.length === 0) {
            this.ui.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Nenhum relatório gerado.</td></tr>`;
            return;
        }

        this.allReports.forEach(report => {
            const row = document.createElement('tr');
            
            // ================== CORREÇÃO 2: AJUSTE DE DATA PARA EXIBIÇÃO ==================
            // Força a interpretação da data como UTC para evitar o bug do "dia anterior"
            const dataInicio = new Date(report.data_inicio_filtro);
            const dataFim = new Date(report.data_fim_filtro);
            const options = { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' };
            const periodo = `${dataInicio.toLocaleDateString('pt-BR', options)} - ${dataFim.toLocaleDateString('pt-BR', options)}`;
            // ==============================================================================

            row.innerHTML = `
                <td>${report.responsavel || 'N/A'}</td>
                <td>${periodo}</td>
                <td>${report.frequencia_filtro || 'N/A'}</td>
                <td>${report.categoria_filtro || 'N/A'}</td>
                <td>${new Date(report.data_geracao).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="pdf-btn" data-path="${report.caminho_arquivo_pdf}">
                        <i class="fas fa-download"></i> Baixar
                    </button>
                </td>
            `;
            this.ui.tableBody.appendChild(row);
        });
    }

    /**
     * Busca as categorias no banco de dados e popula o elemento <select>.
     */
    async populateCategories() {
        try {
            const { data: categorias, error } = await supabase.from('categoria').select('nome');
            if (error) throw error;

            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.nome;
                option.textContent = cat.nome;
                this.ui.categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            this.showToast('Não foi possível carregar as categorias.', 'error');
        }
    }

    /**
     * Busca a lista de relatórios já gerados na API.
     */
    async fetchReports() {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Sessão não encontrada. Faça o login novamente.');
            }

            const response = await fetch('/api/relatorios-doacao', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) {
                throw new Error('Falha ao buscar relatórios existentes.');
            }

            this.allReports = await response.json();
            this.renderTable();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    /**
     * Lida com o envio do formulário para gerar um novo relatório.
     * @param {Event} e - O evento de submit do formulário.
     */
    async generateReport(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const reportData = Object.fromEntries(formData.entries());

        // ================== CORREÇÃO 1: VALIDAÇÃO DAS DATAS ==================
        const dataInicio = new Date(reportData.data_inicio_filtro);
        const dataFim = new Date(reportData.data_fim_filtro);

        if (dataFim < dataInicio) {
            this.showToast('A data final não pode ser anterior à data inicial.', 'error');
            return; // Interrompe a execução se a data for inválida
        }
        // ======================================================================
        
        this.toggleLoading(true);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Sessão não encontrada. Faça o login novamente.');
            }

            const response = await fetch('/api/relatorios-doacao/gerar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(reportData)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Erro desconhecido ao gerar relatório.');
            }

            this.showToast('Relatório gerado e salvo com sucesso!', 'success');
            await this.fetchReports(); // Atualiza a tabela com o novo relatório

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Lida com cliques na tabela, especificamente no botão de download.
     * @param {Event} e - O evento de clique.
     */
    handleTableClick(e) {
        const downloadBtn = e.target.closest('.pdf-btn');
        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            if (!filePath) {
                this.showToast('Caminho do arquivo não encontrado no botão.', 'error');
                return;
            }

            // Obtém a URL pública do arquivo no Supabase Storage
            const { data } = supabase.storage.from('donation_report').getPublicUrl(filePath);

            if (data && data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                this.showToast('Não foi possível obter a URL do arquivo. Verifique se o bucket é público.', 'error');
            }
        }
    }
}

// Inicia a classe ReportManager assim que o DOM estiver completamente carregado.
document.addEventListener('DOMContentLoaded', () => {
    const reportManager = new ReportManager();
    reportManager.init();
});