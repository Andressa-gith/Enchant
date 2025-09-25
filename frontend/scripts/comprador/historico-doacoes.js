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
});