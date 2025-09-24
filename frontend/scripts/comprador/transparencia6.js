 let partnerships = [];
        let editingId = null;

        // Função para formatar moeda
        function formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value || 0);
        }

        // Função para formatar data
        function formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString + 'T00:00:00');
            return date.toLocaleDateString('pt-BR');
        }

        // Função para obter rótulo do tipo
        function getTypeLabel(type) {
            const types = {
                'public': 'Público',
                'ong': 'ONG',
                'private': 'Privado'
            };
            return types[type] || type;
        }

        // Função para obter rótulo do status
        function getStatusLabel(status) {
            const statuses = {
                'active': 'Ativo',
                'renewal': 'Renovação'
            };
            return statuses[status] || status;
        }

        // Função para atualizar as estatísticas
        function updateStats() {
            const totalValue = partnerships.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
            const activeCount = partnerships.filter(p => p.status === 'active').length;
           
            document.getElementById('totalValue').textContent = formatCurrency(totalValue);
            document.getElementById('totalPartnerships').textContent = partnerships.length.toString();
            document.getElementById('activePartnerships').textContent = activeCount.toString();
        }

        // Função para renderizar a lista de parcerias
        function renderPartnerships() {
            const container = document.getElementById('partnershipsList');
           
            if (partnerships.length === 0) {
                container.innerHTML = '<div class="empty-state">Nenhuma parceria cadastrada ainda.</div>';
                return;
            }

            const html = partnerships.map(partnership => `
                <div class="partnership-item">
                    <div class="partnership-header">
                        <div class="partnership-name">${partnership.name}</div>
                        <div class="status-badge status-${partnership.status}">
                            ${getStatusLabel(partnership.status)}
                        </div>
                    </div>
                   
                    <div class="partnership-details">
                        <div class="detail-item">
                            <div class="detail-label">Valor</div>
                            <div class="detail-value">${formatCurrency(partnership.value)}</div>
                        </div>
                       
                        <div class="detail-item">
                            <div class="detail-label">Tipo</div>
                            <div class="detail-value">
                                <span class="type-badge type-${partnership.type}">
                                    ${getTypeLabel(partnership.type)}
                                </span>
                            </div>
                        </div>
                       
                        <div class="detail-item">
                            <div class="detail-label">Data de Início</div>
                            <div class="detail-value">${formatDate(partnership.startDate)}</div>
                        </div>
                       
                        ${partnership.endDate ? `
                        <div class="detail-item">
                            <div class="detail-label">Data de Término</div>
                            <div class="detail-value">${formatDate(partnership.endDate)}</div>
                        </div>
                        ` : ''}
                       
                        <div class="detail-item" style="grid-column: 1 / -1;">
                            <div class="detail-label">Objetivo</div>
                            <div class="detail-value">${partnership.objective}</div>
                        </div>
                    </div>
                   
                    <div class="action-buttons">
                        <button class="edit" onclick="editPartnership(${partnership.id})">
                            Editar
                        </button>
                        <button class="delet" onclick="deletePartnership(${partnership.id})">
                            Excluir
                        </button>
                    </div>
                </div>
            `).join('');
           
            container.innerHTML = html;
        }

        // Função para entrar no modo de edição
        function editPartnership(id) {
            const partnership = partnerships.find(p => p.id === id);
            if (!partnership) return;
           
            editingId = id;

            // Preencher os campos do formulário com os dados da parceria
            document.getElementById('partnerName').value = partnership.name;
            document.getElementById('partnershipValue').value = partnership.value;
            document.getElementById('startDate').value = partnership.startDate;
            document.getElementById('endDate').value = partnership.endDate || '';
            document.getElementById('partnerType').value = partnership.type;
            document.getElementById('status').value = partnership.status;
            document.getElementById('objective').value = partnership.objective;

            // Alterar interface para modo de edição
            document.getElementById('formTitle').textContent = 'Editar Parceria';
            document.getElementById('editingIndicator').style.display = 'block';
            document.getElementById('formSection').classList.add('editing-mode');
            document.getElementById('submitBtn').textContent = 'Salvar Alterações';
            document.getElementById('submitBtn').className = 'btn-save';

            // Adicionar botão cancelar
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn-cancel';
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.onclick = cancelEdit;
            document.getElementById('formButtons').appendChild(cancelBtn);

            // Rolar até o formulário
            document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
        }

        // Função para cancelar edição
        function cancelEdit() {
            editingId = null;
            document.getElementById('partnershipForm').reset();
            
            // Restaurar interface normal
            document.getElementById('formTitle').textContent = 'Cadastrar Nova Parceria';
            document.getElementById('editingIndicator').style.display = 'none';
            document.getElementById('formSection').classList.remove('editing-mode');
            document.getElementById('submitBtn').textContent = 'Adicionar Parceria';
            document.getElementById('submitBtn').className = 'btn';

            // Remover botão cancelar
            const cancelBtn = document.querySelector('.cancel');
            if (cancelBtn) {
                cancelBtn.remove();
            }
        }

        // Função para excluir parceria
        function deletePartnership(id) {
            const partnership = partnerships.find(p => p.id === id);
            if (!partnership) return;
           
            if (confirm(`Tem certeza que deseja excluir a parceria com "${partnership.name}"?`)) {
                partnerships = partnerships.filter(p => p.id !== id);
                updateStats();
                renderPartnerships();
                alert('Parceria excluída com sucesso!');

                // Se estava editando essa parceria, cancelar edição
                if (editingId === id) {
                    cancelEdit();
                }
            }
        }

        // Event listener para o formulário
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('partnershipForm');
           
            form.addEventListener('submit', function(e) {
                e.preventDefault();
               
                // Capturar valores dos campos
                const name = document.getElementById('partnerName').value.trim();
                const value = document.getElementById('partnershipValue').value;
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                const type = document.getElementById('partnerType').value;
                const status = document.getElementById('status').value;
                const objective = document.getElementById('objective').value.trim();
               
                // Validar campos obrigatórios
                if (!name || !value || !startDate || !type || !status || !objective) {
                    alert('Por favor, preencha todos os campos obrigatórios (marcados com *).');
                    return;
                }

                if (editingId) {
                    // Modo edição - atualizar parceria existente
                    const index = partnerships.findIndex(p => p.id === editingId);
                    if (index !== -1) {
                        partnerships[index] = {
                            id: editingId,
                            name: name,
                            value: parseFloat(value),
                            startDate: startDate,
                            endDate: endDate || null,
                            type: type,
                            status: status,
                            objective: objective
                        };
                        
                        alert('Parceria atualizada com sucesso!');
                        cancelEdit();
                    }
                } else {
                    // Modo criação - criar nova parceria
                    const partnership = {
                        id: Date.now(),
                        name: name,
                        value: parseFloat(value),
                        startDate: startDate,
                        endDate: endDate || null,
                        type: type,
                        status: status,
                        objective: objective
                    };
                   
                    partnerships.push(partnership);
                    form.reset();
                    alert('Parceria cadastrada com sucesso!');
                }
               
                // Atualizar interface
                updateStats();
                renderPartnerships();
            });
           
            // Inicializar interface
            updateStats();
            renderPartnerships();
        });