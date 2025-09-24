
// Array para armazenar os documentos
let documents = [];
let nextId = 1;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    renderDocuments();
});

function initializeEventListeners() {
    // Event listener para mudança no input de arquivo
    document.getElementById('documentFile').addEventListener('change', function(e) {
        const label = document.querySelector('.file-input-label');
        if (e.target.files.length > 0) {
            label.textContent = ` ${e.target.files[0].name}`;

        } else {
            label.textContent = 'Clique para selecionar arquivo';
          
        }
    });

    // Event listener para envio do formulário
    document.getElementById('documentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('documentFile');
        const companyName = document.getElementById('companyName').value;
        const documentType = document.getElementById('documentType').value;
        const documentValue = parseFloat(document.getElementById('documentValue').value);
        
        if (!fileInput.files[0]) {
            alert('Por favor, selecione um arquivo.');
            return;
        }
        
        // Criar novo documento
        const newDocument = {
            id: nextId++,
            title: `${documentType} - ${companyName}`,
            company: companyName,
            type: documentType,
            value: documentValue,
            date: new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
            filename: fileInput.files[0].name
        };
        
        documents.push(newDocument);
        renderDocuments();
        
        // Limpar formulário
        clearForm();
        
        // Mostrar confirmação
        alert('Documento adicionado com sucesso!');
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function renderDocuments() {
    const container = document.getElementById('documentsContainer');
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"></div>
               
                <p>Adicione o primeiro documento usando o formulário acima.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = documents.map(doc => `
        <div class="document-card">
            <div class="document-header">
                <div>
                    <div class="document-title">${doc.title}</div>
                    <div class="document-company">Data: ${doc.date}</div>
                </div>
                <div class="document-value">${formatCurrency(doc.value)}</div>
            </div>
            <div class="document-type">${doc.type}</div>
            <div class="document-actions">
                <div class="left-actions">
                    <button class="view" onclick="viewDocument('${doc.filename}')">
                      Visualizar
                    </button>
                    <button class="download" onclick="downloadDocument('${doc.filename}')">
                        Download
                    </button>
                </div>
                <div class="right-actions">
                    <button class="delete" onclick="deleteDocument(${doc.id})">
                         Excluir
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function clearForm() {
    document.getElementById('documentForm').reset();
    document.querySelector('.file-input-label').textContent = 'Clique para selecionar arquivo';
    
}

function viewDocument(filename) {
    alert(`Visualizando documento: ${filename}\n\nEm uma implementação real, isto abriria o documento em uma nova aba ou modal.`);
}

function downloadDocument(filename) {
    alert(`Baixando documento: ${filename}\n\nEm uma implementação real, isto iniciaria o download do arquivo.`);
}

function deleteDocument(id) {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
        documents = documents.filter(doc => doc.id !== id);
        renderDocuments();
    }
}