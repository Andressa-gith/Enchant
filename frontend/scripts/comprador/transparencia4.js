import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Garante que todos os scripts sejam módulos
    document.querySelectorAll('script[defer]').forEach(script => {
        if (!script.hasAttribute('type')) script.type = 'module';
    });
    
    const ui = {
        form: document.getElementById('documentForm'),
        documentsContainer: document.getElementById('documentsContainer'),
        fileUploadArea: document.querySelector('.file-upload'),
        fileUploadText: document.querySelector('.file-upload p'),
        fileInput: document.getElementById('documentFile'),
    };

    let selectedFile = null;

    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderDocuments = (docs) => {
        ui.documentsContainer.innerHTML = '';
        if (docs.length === 0) {
            ui.documentsContainer.innerHTML = `<div class="empty-state"><p>Nenhum documento adicionado. Use o formulário acima.</p></div>`;
            return;
        }

        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'document-card';
            card.innerHTML = `
                <div class="document-header">
                    <div>
                        <h3 class="document-title">${doc.tipo_documento}</h3>
                        <p class="document-company">${doc.titulo}</p>
                    </div>
                    <div class="document-value">${formatCurrency(doc.valor)}</div>
                </div>
                <div class="document-actions">
                    <button class="view" data-path="${doc.caminho_arquivo}">Visualizar</button>
                    <button class="delete" data-id="${doc.id}">Apagar</button>
                </div>
            `;
            ui.documentsContainer.appendChild(card);
        });
    };

    const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const response = await fetch('/api/documentos', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar documentos.');
            const documents = await response.json();
            renderDocuments(documents);
        } catch (error) { console.error(error); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const { data: { session } } = await supabase.auth.getSession();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            const response = await fetch('/api/documentos', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            if (!response.ok) throw new Error('Erro ao adicionar documento.');
            e.target.reset();
            ui.fileUploadText.textContent = 'Clique para selecionar o arquivo ou arraste aqui';
            selectedFile = null;
            fetchData();
        } catch (error) { 
            console.error(error);
            alert('Falha ao adicionar o documento.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Adicionar Documento';
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja apagar este documento?')) return;
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch(`/api/documentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!response.ok) throw new Error('Erro ao deletar documento.');
            fetchData();
        } catch (error) { 
            console.error(error);
            alert('Falha ao apagar o documento.');
        }
    };
    
    // Delegação de eventos
    ui.documentsContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view');
        const deleteBtn = e.target.closest('.delete');
        if (viewBtn) {
            const filePath = viewBtn.dataset.path;
            const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
            if (data.publicUrl) {
                window.open(data.publicUrl, '_blank');
            } else {
                alert('Não foi possível gerar a URL do arquivo.');
            }
        }
        if (deleteBtn) {
            handleDelete(deleteBtn.dataset.id);
        }
    });

    // Lógica do File Upload
    ui.fileInput.addEventListener('change', () => {
        if (ui.fileInput.files.length > 0) {
            selectedFile = ui.fileInput.files[0];
            ui.fileUploadText.textContent = `Arquivo: ${selectedFile.name}`;
            ui.fileUploadArea.classList.add('valid');
        }
    });

    ui.form.addEventListener('submit', handleAdd);
    fetchData();
});