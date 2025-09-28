import supabase from '/scripts/supabaseClient.js';

class ReportManager {
    constructor() {
        this.ui = {
            tableBody: document.getElementById('tableBody'),
            reportForm: document.getElementById('reportForm'),
            generateBtn: document.getElementById('generateReportBtn'),
            pdfLoading: document.getElementById('pdfLoading'),
            toastContainer: document.getElementById('toastContainer'),
            categorySelect: document.getElementById('categoria_filtro'),
        };
        this.allReports = [];
        this.generateReport = this.generateReport.bind(this);
        this.handleTableClick = this.handleTableClick.bind(this);
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
    }

    showToast(message, type = 'info') {
        if (!this.ui.toastContainer) { alert(message); return; }
        const iconClass = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
        const toast = document.createElement('div');
        toast.className = `toast show ${type}`;
        toast.innerHTML = `<i class="${iconClass}"></i> <span>${message}</span>`;
        this.ui.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    toggleLoading(isLoading, message = 'Aguarde...') {
        const loadingOverlay = this.ui.pdfLoading;
        if(loadingOverlay) {
            // ================== CORREÇÃO AQUI ==================
            // Agora ele busca pela classe específica, e não por qualquer <p>
            const textElement = loadingOverlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            // ===============================================

            if (isLoading) {
                loadingOverlay.classList.add('show');
            } else {
                loadingOverlay.classList.remove('show');
            }
        }
        this.ui.generateBtn.disabled = isLoading;
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
            
            row.innerHTML = `
                <td>${report.responsavel}</td>
                <td class="coluna-periodo">${periodo}</td>
                <td>${report.frequencia_filtro}</td>
                <td>${report.categoria_filtro || 'Geral'}</td>
                <td>${new Date(report.data_geracao).toLocaleDateString('pt-BR')}</td>
                <td>
                    <div class="action-buttons">
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
            this.ui.categorySelect.innerHTML = '<option value="Geral">Todas as Categorias</option>'; // Limpa e adiciona a opção padrão
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.nome;
                option.textContent = cat.nome;
                this.ui.categorySelect.appendChild(option);
            });
        } catch (error) { this.showToast('Não foi possível carregar as categorias.', 'error'); }
    }

    async fetchReports() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/historico-doacoes/relatorios-salvos', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao buscar relatórios.');
            const data = await response.json();
            this.allReports = data.relatorios || [];
            this.renderTable();
        } catch (error) {
            this.allReports = [];
            this.renderTable();
        }
    }
    
    async generateReport(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const reportData = Object.fromEntries(formData.entries());

        if (new Date(reportData.data_fim_filtro) < new Date(reportData.data_inicio_filtro)) {
            this.showToast('A data final não pode ser anterior à data inicial.', 'error');
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
                this.showToast('Nenhum dado encontrado para o período.', 'info');
                if (deveSalvarRegistro) await this.saveReportRecord(reportData, 'vazio'); // Salva registro mesmo se vazio
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

            this.showToast('PDF gerado com sucesso!', 'success');
            const { data: urlData } = supabase.storage.from('donation_report').getPublicUrl(uploadData.path);
            if (urlData.publicUrl) window.open(urlData.publicUrl, '_blank');

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.toggleLoading(false);
        }
    }

    async saveReportRecord(reportData, filePath) {
        this.toggleLoading(true, 'Salvando registro...');
        const { data: { session } } = await supabase.auth.getSession();
        const saveData = { ...reportData, caminho_arquivo_pdf: filePath };
        const saveResponse = await fetch('/api/historico-doacoes/adicionar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify(saveData)
        });
        if (!saveResponse.ok) throw new Error("Erro ao salvar o registro.");
        await this.fetchReports(); // Atualiza a lista na tela
    }

    async handleDelete(reportId) {
        if (confirm('Tem certeza que deseja deletar este registro de relatório? O arquivo PDF não será deletado do storage.')) {
            this.toggleLoading(true, 'Deletando...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const response = await fetch(`/api/historico-doacoes/deletar/${reportId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (!response.ok) throw new Error('Falha ao deletar o relatório.');
                this.showToast('Relatório deletado com sucesso.', 'success');
                await this.fetchReports();
            } catch (error) {
                this.showToast(error.message, 'error');
            } finally {
                this.toggleLoading(false);
            }
        }
    }

    createPDF(reportData, entradas, saidas) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18); doc.text('Relatório de Histórico de Doações', 14, 22);
        doc.setFontSize(11); doc.setTextColor(100);
        doc.text(`Responsável: ${reportData.responsavel}`, 14, 30);
        doc.text(`Período: ${new Date(reportData.data_inicio_filtro).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(reportData.data_fim_filtro).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`, 14, 36);
        doc.text(`Categoria: ${reportData.categoria_filtro || 'Geral'}`, 14, 42);

        if (entradas && entradas.length > 0) {
            doc.setFontSize(14); doc.text('Doações Recebidas (Entradas)', 14, 55);
            doc.autoTable({
                startY: 60,
                head: [['Data', 'Categoria', 'Doador', 'Qtd.', 'Detalhes']],
                body: entradas.map(e => [
                    new Date(e.data_entrada).toLocaleDateString('pt-BR', {timeZone: 'UTC'}), e.categoria?.nome || 'N/A', e.doador_origem_texto, e.quantidade, this.formatJsonDetails(e.detalhes)
                ]),
                headStyles: { fillColor: [114, 51, 15] },
            });
        }
        
        if (saidas && saidas.length > 0) {
            const startY = (doc.lastAutoTable.finalY || 50) + 15;
            doc.setFontSize(14); doc.text('Doações Retiradas (Saídas)', 14, startY - 5);
            doc.autoTable({
                startY: startY,
                head: [['Data', 'Categoria', 'Destinatário', 'Qtd.', 'Observação']],
                body: saidas.map(s => [
                    new Date(s.data_saida).toLocaleDateString('pt-BR', {timeZone: 'UTC'}), s.entrada?.categoria?.nome || 'N/A', s.destinatario || '-', s.quantidade_retirada, s.observacao || '-'
                ]),
                headStyles: { fillColor: [114, 51, 15] },
            });
        }
        
        return doc.output('blob');
    }
    
    formatJsonDetails(details) {
        if (!details || typeof details !== 'object' || Object.keys(details).length === 0) return '-';
        return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('; ');
    }
}

const uuidv4 = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

document.addEventListener('DOMContentLoaded', () => {
    const reportManager = new ReportManager();
    reportManager.init();
});