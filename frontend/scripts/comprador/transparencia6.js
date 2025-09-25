import supabase from '/scripts/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    // Garante que o script seja um módulo
    if (!document.querySelector('script[src="/scripts/comprador/transparencia6.js"][type="module"]')) {
        const scriptTag = document.querySelector('script[src="/scripts/comprador/transparencia6.js"]');
        if (scriptTag) scriptTag.type = 'module';
    }

    // Mapeamento dos elementos da UI
    const ui = {
        totalValueCard: document.getElementById('totalValue'),
        totalPartnershipsCard: document.getElementById('totalPartnerships'),
        activePartnershipsCard: document.getElementById('activePartnerships'),
        addForm: document.getElementById('partnershipForm'),
        partnershipsList: document.getElementById('partnershipsList'),
        editModal: document.getElementById('editModal'),
        editForm: document.getElementById('editPartnershipForm'),
        closeModalBtn: document.querySelector('#editModal .close'),
        cancelModalBtn: document.querySelector('.btn-cancel'),
    };

    let allPartnerships = [];
    let editingPartnerId = null;

    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indefinida';

    const updateStatsCards = () => {
        const totalValue = allPartnerships.reduce((sum, p) => sum + parseFloat(p.valor_total_parceria || 0), 0);
        const activePartnerships = allPartnerships.filter(p => p.status === 'Ativo').length;
        ui.totalValueCard.textContent = formatCurrency(totalValue);
        ui.totalPartnershipsCard.textContent = allPartnerships.length;
        ui.activePartnershipsCard.textContent = activePartnerships;
    };

    const renderPartnerships = () => {
        ui.partnershipsList.innerHTML = '';
        if (allPartnerships.length === 0) {
            ui.partnershipsList.innerHTML = `<div class="empty-state">Nenhuma parceria cadastrada ainda.</div>`;
            return;
        }
        allPartnerships.forEach(partner => {
            const today = new Date();
            const endDate = partner.data_fim ? new Date(partner.data_fim) : null;
            const isExpired = endDate && endDate < today;
            let currentStatus = isExpired ? 'Expirado' : partner.status;
            const card = document.createElement('div');
            card.className = 'partnership-item';
            card.innerHTML = `
                <div class="partnership-header">
                    <span class="partnership-name">${partner.nome}</span>
                    <span class="status-badge status-${currentStatus.toLowerCase()}">${currentStatus}</span>
                </div>
                <p class="detail-value">${partner.objetivos || 'Sem objetivos definidos.'}</p>
                <div class="partnership-details">
                    <div class="detail-item">
                        <span class="detail-label">Tipo</span>
                        <span class="type-badge type-${partner.tipo_setor.toLowerCase()}">${partner.tipo_setor}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Valor Total</span>
                        <span class="detail-value">${formatCurrency(partner.valor_total_parceria)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Início</span>
                        <span class="detail-value">${formatDate(partner.data_inicio)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fim</span>
                        <span class="detail-value">${formatDate(partner.data_fim)}</span>
                    </div>
                </div>
                <div class="action-buttons">
                    ${!isExpired ? `<button class="edit" data-id="${partner.id}">Alterar</button>` : ''}
                    <button class="delet" data-id="${partner.id}">Apagar</button>
                </div>
            `;
            ui.partnershipsList.appendChild(card);
        });
    };

    const openEditModal = (partner) => {
        editingPartnerId = partner.id;
        ui.editForm.elements['nome'].value = partner.nome;
        ui.editForm.elements['valor_total_parceria'].value = partner.valor_total_parceria;
        ui.editForm.elements['data_inicio'].value = partner.data_inicio.split('T')[0];
        ui.editForm.elements['data_fim'].value = partner.data_fim ? partner.data_fim.split('T')[0] : '';
        ui.editForm.elements['tipo_setor'].value = partner.tipo_setor;
        ui.editForm.elements['status'].value = partner.status;
        ui.editForm.elements['objetivos'].value = partner.objetivos;
        ui.editModal.style.display = 'block';
    };

    const closeEditModal = () => {
        editingPartnerId = null;
        ui.editModal.style.display = 'none';
        ui.editForm.reset();
    };
    
    const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const response = await fetch('/api/parcerias', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error('Falha ao carregar parcerias.');
            allPartnerships = await response.json();
            updateStatsCards();
            renderPartnerships();
        } catch (error) { console.error(error); }
    };

    // --- FUNÇÃO handleAdd CORRIGIDA ---
    const handleAdd = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // CORREÇÃO: Usando Object.fromEntries para pegar os dados pelos `name` corretos do HTML
        const newPartner = Object.fromEntries(formData.entries());

        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch('/api/parcerias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(newPartner),
            });
            if (!response.ok) throw new Error('Erro ao adicionar parceria.');
            e.target.reset();
            fetchData();
        } catch (error) { console.error(error); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedPartner = Object.fromEntries(formData.entries());
        
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch(`/api/parcerias/${editingPartnerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(updatedPartner),
            });
            if (!response.ok) throw new Error('Erro ao atualizar parceria.');
            closeEditModal();
            fetchData();
        } catch (error) { console.error(error); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja apagar esta parceria? Esta ação não pode ser desfeita.')) return;
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const response = await fetch(`/api/parcerias/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!response.ok) throw new Error('Erro ao deletar parceria.');
            fetchData();
        } catch (error) { console.error(error); }
    };

    ui.addForm.addEventListener('submit', handleAdd);
    ui.editForm.addEventListener('submit', handleUpdate);
    ui.closeModalBtn.addEventListener('click', closeEditModal);
    ui.cancelModalBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => { if (e.target == ui.editModal) closeEditModal(); });

    ui.partnershipsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit');
        const deleteBtn = e.target.closest('.delet');
        if (editBtn) {
            const partnerId = editBtn.dataset.id;
            const partnerToEdit = allPartnerships.find(p => p.id == partnerId);
            if (partnerToEdit) openEditModal(partnerToEdit);
        }
        if (deleteBtn) {
            const partnerId = deleteBtn.dataset.id;
            handleDelete(partnerId);
        }
    });
    
    fetchData();
});