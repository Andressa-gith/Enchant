import supabase from '/scripts/supabaseClient.js';

class ReportManager {
    constructor() {
        this.ui = {
            tableBody: document.getElementById('tableBody'),
            reportForm: document.getElementById('reportForm'),
            generateBtn: document.getElementById('generateReportBtn'),
            pdfLoading: document.getElementById('pdfLoading'),
            categorySelect: document.getElementById('categoria_filtro'),

            // --- Modal de Confirmação (Excluir) ---
            modalOverlay: document.getElementById('confirmationModal'),
            modalMessage: document.getElementById('modalMessage'),
            modalConfirmBtn: document.getElementById('modalConfirmBtn'),
            modalCancelBtn: document.getElementById('modalCancelBtn'),

            // --- Modal de Informação (Substituto do Toast) ---
            infoModalOverlay: document.getElementById('infoModal'),
            infoModalIcon: document.getElementById('infoModalIcon'),
            infoModalTitle: document.getElementById('infoModalTitle'),
            infoModalMessage: document.getElementById('infoModalMessage'),
            infoModalOkBtn: document.getElementById('infoModalOkBtn'),
        };
        this.allReports = [];
        this.onConfirmCallback = null; // Armazena a ação de confirmação

        // Faz o 'this' funcionar nos callbacks
        this.generateReport = this.generateReport.bind(this);
        this.handleTableClick = this.handleTableClick.bind(this);
        // Modal de Confirmação
        this.executeConfirmation = this.executeConfirmation.bind(this);
        this.hideModal = this.hideModal.bind(this);
        // Modal de Informação
        this.hideInfoModal = this.hideInfoModal.bind(this);
    }

    init() {
        if (!this.ui.reportForm || !this.ui.tableBody) return;
        this.setupEventListeners();
        this.fetchReports();
        this.populateCategories();
    }

    setupEventListeners() {
        this.ui.reportForm.addEventListener('submit', this.generateReport);
        this.ui.tableBody.addEventListener('click', this.handleTableClick);

        // --- Listeners do Modal de Confirmação (Excluir) ---
        if (this.ui.modalConfirmBtn && this.ui.modalCancelBtn) {
            this.ui.modalConfirmBtn.addEventListener('click', this.executeConfirmation);
            this.ui.modalCancelBtn.addEventListener('click', this.hideModal);
            this.ui.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.ui.modalOverlay) this.hideModal();
            });
        }

        // --- Listeners do Modal de Informação ---
        if (this.ui.infoModalOkBtn && this.ui.infoModalOverlay) {
            this.ui.infoModalOkBtn.addEventListener('click', this.hideInfoModal);
            this.ui.infoModalOverlay.addEventListener('click', (e) => {
                if (e.target === this.ui.infoModalOverlay) this.hideInfoModal();
            });
        }
    }

    // --- Funções do Modal de Confirmação (Excluir) ---
    showConfirmationModal(message, onConfirm) {
        if (!this.ui.modalOverlay) return;
        this.onConfirmCallback = onConfirm;
        this.ui.modalMessage.textContent = message;
        this.ui.modalOverlay.classList.add('show');
    }

    hideModal() {
        if (!this.ui.modalOverlay) return;
        this.ui.modalOverlay.classList.remove('show');
        this.onConfirmCallback = null;
    }

    executeConfirmation() {
        if (this.onConfirmCallback) {
            this.onConfirmCallback();
        }
        this.hideModal();
    }
    // --- FIM Funções Modal Confirmação ---


    // --- Funções do Modal de Informação (Substituto do Toast) ---
    showInfoModal(message, type = 'info') {
        if (!this.ui.infoModalOverlay) {
            alert(message); // Fallback caso o modal não exista
            return;
        }

        const titles = {
            success: 'Sucesso!',
            error: 'Ocorreu um Erro',
            info: 'Atenção'
        };
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        // Limpa classes antigas
        this.ui.infoModalIcon.className = 'modal-icon';
        this.ui.infoModalTitle.className = 'modal-title';
        this.ui.infoModalOkBtn.className = 'modal-btn modal-btn-ok';

        // Adiciona novas classes
        this.ui.infoModalIcon.classList.add(type);
        this.ui.infoModalTitle.classList.add(type);
        this.ui.infoModalOkBtn.classList.add(type);

        // Define o conteúdo
        this.ui.infoModalIcon.innerHTML = `<i class="${icons[type] || icons['info']}"></i>`;
        this.ui.infoModalTitle.textContent = titles[type] || titles['info'];
        this.ui.infoModalMessage.textContent = message;

        this.ui.infoModalOverlay.classList.add('show');
    }

    hideInfoModal() {
        if (!this.ui.infoModalOverlay) return;
        this.ui.infoModalOverlay.classList.remove('show');
    }
    // --- FIM: Funções do Modal de Informação ---


    toggleLoading(isLoading, message = 'Aguarde...') {
        const loadingOverlay = this.ui.pdfLoading;
        if (loadingOverlay) {
            const textElement = loadingOverlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            if (isLoading) {
                loadingOverlay.classList.add('show');
            } else {
                loadingOverlay.classList.remove('show');
            }
        }
        if (this.ui.generateBtn) {
            this.ui.generateBtn.disabled = isLoading;
        }
    }


    renderTable() {
        this.ui.tableBody.innerHTML = '';
        if (!this.allReports || this.allReports.length === 0) {
            this.ui.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Nenhum relatório salvo.</td></tr>`;
            return;
        }
        this.allReports.forEach(report => {
            const row = document.createElement('tr');
            const options = { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' };
            const periodo = `${new Date(report.data_inicio_filtro).toLocaleDateString('pt-BR', options)} - ${new Date(report.data_fim_filtro).toLocaleDateString('pt-BR', options)}`;

            // --- Responsividade da Tabela (data-label) ---
            row.innerHTML = `
                <td data-label="Responsável">${report.responsavel}</td>
                <td data-label="Período" class="coluna-periodo">${periodo}</td>
                <td data-label="Frequência">${report.frequencia_filtro}</td>
                <td data-label="Categoria">${report.categoria_filtro || 'Geral'}</td>
                <td data-label="Data">${new Date(report.data_geracao).toLocaleDateString('pt-BR')}</td>
                <td data-label="Ações">
                    <div class.action-buttons">
                        <button class="pdf-btn" data-report-id="${report.id}" title="Baixar PDF">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="delete-btn" data-report-id="${report.id}" title="Deletar Relatório">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;

            this.ui.tableBody.appendChild(row);
        });
    }

    async populateCategories() {
        try {
            const { data: categorias, error } = await supabase.from('categoria').select('nome').order('nome');
            if (error) throw error;
            this.ui.categorySelect.innerHTML = '<option value="Geral">Todas as Categorias</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.nome;
                option.textContent = cat.nome;
                this.ui.categorySelect.appendChild(option);
            });
        } catch (error) {
            this.showInfoModal('Não foi possível carregar as categorias.', 'error');
        }
    }

    async fetchReports() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão não encontrada. Faça login novamente.");

            const response = await fetch('/api/historico-doacoes/relatorios-salvos', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao buscar relatórios.');
            const data = await response.json();
            this.allReports = data.relatorios || [];
            this.renderTable();
        } catch (error) {
            this.allReports = [];
            this.renderTable();
            this.showInfoModal(error.message, 'error');
        } finally {
            setTimeout(() => {
                window.SiteLoader?.hide();
            }, 500);
        }
    }

    async generateReport(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const reportData = Object.fromEntries(formData.entries());

        if (new Date(reportData.data_fim_filtro) < new Date(reportData.data_inicio_filtro)) {
            this.showInfoModal('A data final não pode ser anterior à data inicial.', 'error');
            return;
        }

        await this.processPdfGeneration(reportData, true);
    }

    async handleTableClick(e) {
        const downloadBtn = e.target.closest('.pdf-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (downloadBtn) {
            const reportId = downloadBtn.dataset.reportId;
            const reportData = this.allReports.find(r => r.id == reportId);
            if (reportData) {
                await this.processPdfGeneration(reportData, false);
            }
        } else if (deleteBtn) {
            const reportId = deleteBtn.dataset.reportId;
            this.handleDelete(reportId);
        }
    }

    async processPdfGeneration(reportData, deveSalvarRegistro) {
        this.toggleLoading(true, 'Buscando dados...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão não encontrada. Faça login novamente.");

            const params = new URLSearchParams({
                data_inicio_filtro: reportData.data_inicio_filtro,
                data_fim_filtro: reportData.data_fim_filtro,
                categoria_filtro: reportData.categoria_filtro || 'Geral',
            });
            const dataResponse = await fetch(`/api/historico-doacoes/dados-pdf?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!dataResponse.ok) throw new Error('Falha ao buscar dados para o PDF.');

            const { entradas, saidas } = await dataResponse.json();
            if (entradas.length === 0 && saidas.length === 0) {
                this.showInfoModal('Nenhum dado encontrado para o período.', 'info');
                return;
            }

            this.toggleLoading(true, 'Gerando PDF...');
            const pdfBlob = this.createPDF(reportData, entradas, saidas);

            this.toggleLoading(true, 'Enviando para o Storage...');
            const fileName = `relatorios/${session.user.id}/${uuidv4()}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('donation_report').upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: false });
            if (uploadError) throw new Error('Falha ao enviar PDF para o Storage.');

            if (deveSalvarRegistro) {
                await this.saveReportRecord(reportData, uploadData.path);
            }

            this.showInfoModal('PDF gerado com sucesso!', 'success');

            const { data: urlData } = supabase.storage.from('donation_report').getPublicUrl(uploadData.path);
            if (urlData.publicUrl) window.open(urlData.publicUrl, '_blank');

        } catch (error) {
            this.showInfoModal(error.message, 'error');
        } finally {
            this.toggleLoading(false);
        }
    }

    async saveReportRecord(reportData, filePath) {
        this.toggleLoading(true, 'Salvando registro...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão não encontrada.");

        const saveData = { ...reportData, caminho_arquivo_pdf: filePath };
        const saveResponse = await fetch('/api/historico-doacoes/adicionar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify(saveData)
        });
        if (!saveResponse.ok) throw new Error("Erro ao salvar o registro.");
        await this.fetchReports(); // Atualiza a lista na tela
    }

    // Modal de Confirmação (Exclusão)
    async handleDelete(reportId) {
        const message = 'Tem certeza que deseja deletar este registro de relatório? O arquivo PDF não será deletado do storage.';

        // Mostra o modal de confirmação
        this.showConfirmationModal(message, async () => {
            this.toggleLoading(true, 'Deletando...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sessão não encontrada.");

                const response = await fetch(`/api/historico-doacoes/deletar/${reportId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (!response.ok) throw new Error('Falha ao deletar o relatório.');

                this.showInfoModal('Relatório deletado com sucesso.', 'success');
                await this.fetchReports(); // Atualiza a tabela
            } catch (error) {
                this.showInfoModal(error.message, 'error');
            } finally {
                this.toggleLoading(false);
            }
        });
    }


    createPDF(reportData, entradas, saidas) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18); doc.text('Relatório de Histórico de Doações', 14, 22);
        doc.setFontSize(11); doc.setTextColor(100);
        doc.text(`Responsável: ${reportData.responsavel}`, 14, 30);

        // ================== AQUI ESTAVA O ERRO ==================
        // Corrigido de 'repoData' para 'reportData'
        doc.text(`Período: ${new Date(reportData.data_inicio_filtro).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(reportData.data_fim_filtro).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`, 14, 36);
        // ========================================================

        doc.text(`Categoria: ${reportData.categoria_filtro || 'Geral'}`, 14, 42);

        let startY = 55;

        if (entradas && entradas.length > 0) {
            doc.setFontSize(14); doc.text('Doações Recebidas (Entradas)', 14, startY);
            doc.autoTable({
                startY: startY + 5,
                head: [['Data', 'Categoria', 'Doador', 'Qtd.', 'Detalhes']],
                body: entradas.map(e => [
                    new Date(e.data_entrada).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), e.categoria?.nome || 'N/A', e.doador_origem_texto, e.quantidade, this.formatJsonDetails(e.detalhes)
                ]),
                headStyles: { fillColor: [114, 51, 15] },
            });
            startY = doc.lastAutoTable.finalY;
        } else {
            doc.setFontSize(11); doc.text('Nenhuma entrada registrada neste período.', 14, startY + 5);
            startY += 10;
        }


        if (saidas && saidas.length > 0) {
            startY += 15;
            doc.setFontSize(14); doc.text('Doações Retiradas (Saídas)', 14, startY - 5);
            doc.autoTable({
                startY: startY,
                head: [['Data', 'Categoria', 'Destinatário', 'Qtd.', 'Observação']],
                body: saidas.map(s => [
                    new Date(s.data_saida).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), s.entrada?.categoria?.nome || 'N/A', s.destinatario || '-', s.quantidade_retirada, s.observacao || '-'
                ]),
                headStyles: { fillColor: [114, 51, 15] },
            });
        } else {
            startY += 15;
            doc.setFontSize(11); doc.text('Nenhuma saída registrada neste período.', 14, startY - 5);
        }

        return doc.output('blob');
    }

    formatJsonDetails(details) {
        if (!details || typeof details !== 'object' || Object.keys(details).length === 0) return '-';
        return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('; ');
    }
}

const uuidv4 = () => ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

document.addEventListener('DOMContentLoaded', () => {
    const reportManager = new ReportManager();
    reportManager.init();
});