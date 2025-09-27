import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento completo da UI
    const ui = {
        form: document.getElementById('partnershipForm'),
        partnershipsList: document.getElementById('partnershipsList'),
        totalValueCard: document.getElementById('totalValue'),
        totalPartnershipsCard: document.getElementById('totalPartnerships'),
        activePartnershipsCard: document.getElementById('activePartnerships'),
        successMessage: document.getElementById('success-message'),
        alertMessage: document.getElementById('alert-message'),
        loader: document.getElementById('loader'),
        emptyState: document.getElementById('empty-state'),
        
        // Modal de Edição com Bootstrap
        editModal: new bootstrap.Modal(document.getElementById('editModal')),
        editForm: document.getElementById('editPartnershipForm'),
        editPartnerId: document.getElementById('editPartnerId'), // O hidden input
        saveEditBtn: document.getElementById('saveEditBtn'),
        
        // Modal de Exclusão com Bootstrap
        confirmDeleteModal: new bootstrap.Modal(document.getElementById('confirmDeleteModal')),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    };

    let allPartnerships = [];
    let partnerToDeleteId = null;

    // Funções de controle de UI
    const showLoader = (isLoading) => { if(ui.loader) ui.loader.style.display = isLoading ? 'flex' : 'none'; };
    const showEmptyState = (isEmpty) => { if(ui.emptyState) ui.emptyState.style.display = isEmpty ? 'flex' : 'none'; };
    const showList = (shouldShow) => { if(ui.partnershipsList) ui.partnershipsList.style.display = shouldShow ? 'grid' : 'none'; };

    // Funções de formatação
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indefinida';
    const formatDateForInput = (dateString) => dateString ? dateString.split('T')[0] : '';
    
    // Lógica dos Cards de Estatísticas
    const updateStatsCards = () => {
        const totalValue = allPartnerships.reduce((sum, p) => sum + parseFloat(p.valor_total_parceria || 0), 0);
        const activePartnerships = allPartnerships.filter(p => p.status === 'Ativo').length;
        ui.totalValueCard.textContent = formatCurrency(totalValue);
        ui.totalPartnershipsCard.textContent = allPartnerships.length;
        ui.activePartnershipsCard.textContent = activePartnerships;
    };
    
    // Lógica de Renderização da Lista
    const renderPartnerships = () => {
        ui.partnershipsList.innerHTML = '';
        if (allPartnerships.length === 0) {
            showEmptyState(true); showList(false); return;
        }
        showEmptyState(false); showList(true);

        allPartnerships.forEach(partner => {
            const card = document.createElement('div');
            card.className = 'partnership-card';
            card.innerHTML = `
                <div class="partnership-header">
                    <span class="partnership-name">${partner.nome}</span>
                    <span class="status-badge status-${partner.status.toLowerCase().replace(' ', '-')}">${partner.status}</span>
                </div>
                <p class="partnership-objective">${partner.objetivos || 'Sem objetivos definidos.'}</p>
                <div class="partnership-details">
                    <div class="detail-item"><span class="detail-label">Tipo</span><span class="detail-value">${partner.tipo_setor}</span></div>
                    <div class="detail-item"><span class="detail-label">Valor Total</span><span class="detail-value">${formatCurrency(partner.valor_total_parceria)}</span></div>
                    <div class="detail-item"><span class="detail-label">Início</span><span class="detail-value">${formatDate(partner.data_inicio)}</span></div>
                    <div class="detail-item"><span class="detail-label">Fim</span><span class="detail-value">${formatDate(partner.data_fim)}</span></div>
                </div>
                <div class="action-buttons">
                    <button class="edit-btn" data-id="${partner.id}"><i class="bi bi-pencil-square"></i> Editar</button>
                    <button class="delete-btn" data-id="${partner.id}"><i class="bi bi-trash-fill"></i> Excluir</button>
                </div>
            `;
            ui.partnershipsList.appendChild(card);
        });
    };

    // --- FUNÇÕES DE API ---
    const fetchData = async () => {
        showLoader(true); showList(false); showEmptyState(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado.');
            const response = await fetch('/api/parcerias', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar parcerias.');
            allPartnerships = await response.json();
            updateStatsCards();
            renderPartnerships();
        } catch (error) { showAlert(error.message); renderPartnerships([]); } finally { showLoader(false); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newPartner = Object.fromEntries(formData.entries());
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch('/api/parcerias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(newPartner),
            });
            if (!response.ok) throw new Error('Erro ao adicionar parceria.');
            e.target.reset();
            showSuccess('Parceria adicionada com sucesso!');
            fetchData();
        } catch (error) { showAlert(error.message); }
    };

    const handleUpdate = async () => {
        const id = ui.editPartnerId.value; // Pega o ID do input hidden
        const formData = new FormData(ui.editForm);
        const updatedPartner = Object.fromEntries(formData.entries());
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/parcerias/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(updatedPartner),
            });
            if (!response.ok) throw new Error('Erro ao atualizar parceria.');
            showSuccess('Parceria atualizada com sucesso!');
            ui.editModal.hide();
            fetchData();
        } catch (error) { showAlert(error.message); }
    };

    const handleDelete = async (id) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');
            const response = await fetch(`/api/parcerias/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!response.ok) throw new Error('Erro ao deletar parceria.');
            showSuccess('Parceria excluída com sucesso!');
            fetchData();
        } catch (error) { showAlert(error.message); }
    };
    
    // --- FUNÇÕES DE FEEDBACK VISUAL ---
    const showAlert = (message) => { ui.alertMessage.textContent = message; ui.alertMessage.style.display = 'block'; setTimeout(() => ui.alertMessage.style.display = 'none', 5000); };
    const showSuccess = (message) => { ui.successMessage.textContent = message; ui.successMessage.style.display = 'block'; setTimeout(() => ui.successMessage.style.display = 'none', 4000); };
    
    // --- EVENT LISTENERS ---
    ui.form.addEventListener('submit', handleAdd);
    
    ui.saveEditBtn.addEventListener('click', handleUpdate);
    
    ui.partnershipsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const partnerId = editBtn.dataset.id;
            const partnerToEdit = allPartnerships.find(p => p.id == partnerId);
            if (partnerToEdit) {
                ui.editPartnerId.value = partnerToEdit.id;
                ui.editForm.elements['nome'].value = partnerToEdit.nome;
                // === CORREÇÃO AQUI === 
                // A variável estava errada (partnerTo), o correto é partnerToEdit
                ui.editForm.elements['valor_total_parceria'].value = partnerToEdit.valor_total_parceria;
                ui.editForm.elements['data_inicio'].value = formatDateForInput(partnerToEdit.data_inicio);
                ui.editForm.elements['data_fim'].value = formatDateForInput(partnerToEdit.data_fim);
                ui.editForm.elements['tipo_setor'].value = partnerToEdit.tipo_setor;
                ui.editForm.elements['status'].value = partnerToEdit.status;
                ui.editForm.elements['objetivos'].value = partnerToEdit.objetivos;
                ui.editModal.show();
            }
        }
        if (deleteBtn) {
            partnerToDeleteId = deleteBtn.dataset.id;
            ui.confirmDeleteModal.show();
        }
    });

    ui.confirmDeleteBtn.addEventListener('click', () => {
        if (partnerToDeleteId) {
            handleDelete(partnerToDeleteId);
            partnerToDeleteId = null;
            ui.confirmDeleteModal.hide();
        }
    });
    
    fetchData();
});