<<<<<<< Updated upstream
import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        tableBody: document.getElementById('tableBody'),
        reportForm: document.getElementById('reportForm'),
        generateBtn: document.getElementById('generateReportBtn'),
        pdfLoading: document.getElementById('pdfLoading'),
        toastContainer: document.getElementById('toastContainer'),
        categorySelect: document.getElementById('categoria_filtro'),
    };

    let allReports = [];

    const showToast = (message, type = 'info') => {
        alert(message);
    };
    
    const toggleLoading = (isLoading) => {
        ui.generateBtn.disabled = isLoading;
        ui.pdfLoading.style.display = isLoading ? 'flex' : 'none';
    };

    const renderTable = () => {
        ui.tableBody.innerHTML = '';
        if (allReports.length === 0) {
            ui.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">Nenhum relatório gerado.</td></tr>`;
            return;
        }
        allReports.forEach(report => {
            const row = document.createElement('tr');
            const periodo = `${new Date(report.data_inicio_filtro).toLocaleDateString('pt-BR')} - ${new Date(report.data_fim_filtro).toLocaleDateString('pt-BR')}`;
            row.innerHTML = `
                <td>${report.responsavel}</td>
                <td>${periodo}</td>
                <td>${report.frequencia_filtro}</td>
                <td>${report.categoria_filtro}</td>
                <td>${new Date(report.data_geracao).toLocaleDateString('pt-BR')}</td>
                <td><button class="pdf-btn" data-path="${report.caminho_arquivo_pdf}"><i class="fas fa-download"></i> Baixar</button></td>
            `;
            ui.tableBody.appendChild(row);
        });
    };
    
    // NOVA FUNÇÃO: Popula o select de categorias
    const populateCategories = async () => {
        const { data: categorias, error } = await supabase.from('categoria').select('nome');
        if (error) {
            console.error('Erro ao buscar categorias:', error);
            return;
        }
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.nome;
            option.textContent = cat.nome;
            ui.categorySelect.appendChild(option);
        });
    };

    const fetchReports = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const response = await fetch('/api/relatorios-doacao', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao buscar relatórios.');
            allReports = await response.json();
            renderTable();
        } catch (error) { showToast(error.message, 'error'); }
    };

    const generateReport = async (e) => {
        e.preventDefault();
        toggleLoading(true);
        const formData = new FormData(e.target);
        const reportData = Object.fromEntries(formData.entries());
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch('/api/relatorios-doacao/gerar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(reportData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao gerar relatório.');
            showToast('Relatório gerado e salvo com sucesso!', 'success');
            fetchReports();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            toggleLoading(false);
        }
    };
    
    ui.reportForm.addEventListener('submit', generateReport);
    
    ui.tableBody.addEventListener('click', (e) => {
        const downloadBtn = e.target.closest('.pdf-btn');
        if (downloadBtn) {
            const filePath = downloadBtn.dataset.path;
            const { data } = supabase.storage.from('donation_report').getPublicUrl(filePath);
            if (data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                showToast('Não foi possível obter a URL. Verifique se o bucket é público.', 'error');
            }
        }
    });

    // --- INICIALIZAÇÃO ---
    fetchReports();
    populateCategories(); // Chama a nova função na inicialização
=======
// scripts/comprador/historico-doacoes.js
class HistoricoDoacoes {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {};
        this.relatoriosSalvos = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHistorico();
        this.loadRelatoriosSalvos();
    }

    setupEventListeners() {
        // Toggle de filtros
        document.getElementById('filtersToggle')?.addEventListener('click', () => {
            this.toggleFilters();
        });

        // Limpar filtros
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Aplicar filtros
        const filterInputs = ['startDateFilter', 'endDateFilter', 'typeFilter', 'categoryFilter'];
        filterInputs.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.applyFilters();
            });
        });

        // BOTÃO ADICIONAR - adiciona à lista lateral
        document.getElementById('generateReportBtn')?.addEventListener('click', () => {
            this.adicionarRelatorio();
        });
    }

    async loadHistorico() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/historico-doacoes?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Erro ao carregar histórico');

            const data = await response.json();
            this.renderTable(data.data);
            this.renderPagination(data.pagination);

        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.showToast('Erro ao carregar histórico de doações', 'error');
        }
    }

    async loadRelatoriosSalvos() {
        try {
            const response = await fetch('/api/historico-doacoes/relatorios-salvos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Erro ao carregar relatórios salvos');

            const data = await response.json();
            this.relatoriosSalvos = data.relatorios;
            this.renderRelatoriosList();

        } catch (error) {
            console.error('Erro ao carregar relatórios salvos:', error);
        }
    }

    renderRelatoriosList() {
        // Criar container se não existir
        let container = document.getElementById('relatorios-salvos-list');
        if (!container) {
            container = document.createElement('div');
            container.id = 'relatorios-salvos-list';
            container.className = 'relatorios-list';
            
            // Inserir após o formulário
            const form = document.getElementById('reportForm');
            if (form && form.parentNode) {
                form.parentNode.insertBefore(container, form.nextSibling);
            }
        }

        container.innerHTML = '<h4>Relatórios Salvos</h4>';

        if (this.relatoriosSalvos.length === 0) {
            container.innerHTML += '<p class="no-reports">Nenhum relatório salvo ainda.</p>';
            return;
        }

        this.relatoriosSalvos.forEach(relatorio => {
            const item = document.createElement('div');
            item.className = 'relatorio-item';
            item.innerHTML = `
                <div class="relatorio-info">
                    <strong>${relatorio.responsavel}</strong>
                    <span class="periodo">${relatorio.periodo}</span>
                    <span class="tipo">${relatorio.tipo} - ${relatorio.categoria}</span>
                    <span class="data">Gerado em: ${relatorio.dataGeracao}</span>
                </div>
                <div class="relatorio-actions">
                    <button class="pdf-btn" onclick="window.historicoInstance.gerarPDF(${relatorio.id})">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <span class="status status-${relatorio.status.toLowerCase()}">${relatorio.status}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    async adicionarRelatorio() {
        const formData = new FormData(document.getElementById('reportForm'));
        const reportData = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/historico-doacoes/adicionar-relatorio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(reportData)
            });

            if (!response.ok) throw new Error('Erro ao adicionar relatório');

            const data = await response.json();
            
            this.showToast('Relatório adicionado à lista!', 'success');
            this.loadRelatoriosSalvos(); // Recarregar lista

        } catch (error) {
            console.error('Erro ao adicionar relatório:', error);
            this.showToast('Erro ao adicionar relatório', 'error');
        }
    }

    async gerarPDF(relatorioId) {
        try {
            document.getElementById('pdfLoading').style.display = 'flex';

            const response = await fetch(`/api/historico-doacoes/gerar-pdf/${relatorioId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Erro ao gerar PDF');

            const data = await response.json();
            
            // Aqui você usa os dados retornados para gerar o PDF com jsPDF
            this.criarPDFRelatorio(data.relatorio);
            
            this.showToast('PDF gerado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            this.showToast('Erro ao gerar PDF', 'error');
        } finally {
            document.getElementById('pdfLoading').style.display = 'none';
        }
    }

    criarPDFRelatorio(relatorioData) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configurar PDF
        doc.setFontSize(18);
        doc.text('Relatório de Doações', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Instituição: ${relatorioData.instituicao}`, 20, 40);
        doc.text(`Responsável: ${relatorioData.responsavel}`, 20, 50);
        doc.text(`Período: ${relatorioData.periodo.inicio} - ${relatorioData.periodo.fim}`, 20, 60);
        doc.text(`Tipo: ${relatorioData.tipo}`, 20, 70);
        doc.text(`Categoria: ${relatorioData.categoria}`, 20, 80);

        // Estatísticas
        doc.setFontSize(14);
        doc.text('Estatísticas:', 20, 100);
        doc.setFontSize(12);
        doc.text(`Total de Doações: ${relatorioData.estatisticas.totalDoacoes}`, 20, 110);
        doc.text(`Total de Itens: ${relatorioData.estatisticas.totalItens}`, 20, 120);
        doc.text(`Total de Doadores: ${relatorioData.estatisticas.totalDoadores}`, 20, 130);

        // Baixar o PDF
        doc.save(`relatorio_doacoes_${relatorioData.id}.pdf`);
    }

    // Outros métodos permanecem iguais...
    renderTable(doacoes) {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        doacoes.forEach(doacao => {
            const row = document.createElement('div');
            row.className = 'table-row1';
            row.innerHTML = `
                <div>${doacao.data}</div>
                <div>${doacao.tipo}</div>
                <div>${doacao.categoria}</div>
                <div>${doacao.origem}</div>
                <div>
                    <button class="pdf-btn1" onclick="window.historicoInstance.downloadPDFDoacao(${doacao.id})">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            `;
            tbody.appendChild(row);
        });
    }

    // Método para gerar PDF de uma doação individual
    async downloadPDFDoacao(doacaoId) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // PDF simples para doação individual
            doc.setFontSize(16);
            doc.text('Comprovante de Doação', 20, 20);
            doc.setFontSize(12);
            doc.text(`ID da Doação: ${doacaoId}`, 20, 40);
            doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 20, 50);
            
            doc.save(`doacao_${doacaoId}.pdf`);
            this.showToast('PDF da doação gerado!', 'success');
        } catch (error) {
            console.error('Erro ao gerar PDF da doação:', error);
            this.showToast('Erro ao gerar PDF da doação', 'error');
        }
    }

    // Resto dos métodos permanecem iguais...
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast1 toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => toast.remove(), 5000);
    }

    // Outros métodos de filtro, paginação etc. permanecem iguais
    applyFilters() {
        const startDate = document.getElementById('startDateFilter')?.value;
        const endDate = document.getElementById('endDateFilter')?.value;
        const type = document.getElementById('typeFilter')?.value;
        const category = document.getElementById('categoryFilter')?.value;

        this.filters = {};
        if (startDate) this.filters.startDate = startDate;
        if (endDate) this.filters.endDate = endDate;
        if (type) this.filters.type = type;
        if (category) this.filters.category = category;

        this.currentPage = 1;
        this.loadHistorico();
        this.updateActiveFiltersCount();
    }

    clearFilters() {
        this.filters = {};
        this.currentPage = 1;
        
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('categoryFilter').value = '';

        this.loadHistorico();
        this.updateActiveFiltersCount();
    }

    updateActiveFiltersCount() {
        const count = Object.keys(this.filters).length;
        const countElement = document.getElementById('activeFiltersCount');
        
        if (countElement) {
            if (count > 0) {
                countElement.textContent = count;
                countElement.style.display = 'inline';
            } else {
                countElement.style.display = 'none';
            }
        }
    }

    toggleFilters() {
        const content = document.getElementById('filtersContent');
        const toggle = document.getElementById('filtersToggle');
        
        if (content && toggle) {
            content.classList.toggle('active');
            toggle.classList.toggle('active');
        }
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        if (pagination.currentPage > 1) {
            const prevBtn = this.createPaginationButton(
                pagination.currentPage - 1, 
                '<i class="fas fa-chevron-left"></i>'
            );
            paginationContainer.appendChild(prevBtn);
        }

        for (let i = 1; i <= pagination.totalPages; i++) {
            if (i === pagination.currentPage || 
                i === 1 || 
                i === pagination.totalPages || 
                Math.abs(i - pagination.currentPage) <= 2) {
                
                const pageBtn = this.createPaginationButton(i, i);
                if (i === pagination.currentPage) {
                    pageBtn.classList.add('active');
                }
                paginationContainer.appendChild(pageBtn);
            }
        }

        if (pagination.currentPage < pagination.totalPages) {
            const nextBtn = this.createPaginationButton(
                pagination.currentPage + 1, 
                '<i class="fas fa-chevron-right"></i>'
            );
            paginationContainer.appendChild(nextBtn);
        }
    }

    createPaginationButton(page, text) {
        const btn = document.createElement('button');
        btn.className = 'pagination-btn1';
        btn.innerHTML = text;
        btn.onclick = () => {
            this.currentPage = page;
            this.loadHistorico();
        };
        return btn;
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.historicoInstance = new HistoricoDoacoes();
>>>>>>> Stashed changes
});