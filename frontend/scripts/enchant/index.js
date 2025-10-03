document.addEventListener('DOMContentLoaded', () => {
    const ongsContainer = document.getElementById('ongs-grid');
    const doacaoModalEl = document.getElementById('doacaoModal');
    const doacaoModal = new bootstrap.Modal(doacaoModalEl);
    const formDoacao = document.getElementById('form-doacao');

    // 1. Carrega a lista de ONGs assim que a página abre
    async function carregarOngs() {
        try {
            const response = await fetch('/api/public/ongs');
            if (!response.ok) throw new Error('Falha ao carregar organizações.');
            const ongs = await response.json();
            
            ongsContainer.innerHTML = ''; // Limpa a mensagem "Carregando..."
            if (ongs.length === 0) {
                ongsContainer.innerHTML = '<p>Nenhuma organização encontrada no momento.</p>';
                return;
            }

            ongs.forEach(ong => {
                const card = document.createElement('div');
                card.className = 'card-ong'; // Você precisa estilizar esta classe no seu CSS
                console.log(`${ong.caminho_logo}`);
                card.innerHTML = `
                    <img src="${ong.caminho_logo || '/assets/imgs/comprador/avatar-padrao.jpg'}" alt="Logo de ${ong.nome}" class="card-ong-imagem">
                    <div class="card-ong-conteudo">
                        <h3>${ong.nome}</h3>
                        <p>${ong.descricao_curta || 'Esta organização ainda não adicionou uma descrição.'}</p>
                        <button class="card-ong-link" data-ong-id="${ong.id}" data-ong-nome="${ong.nome}">Doar Agora</button>
                    </div>
                `;
                ongsContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            ongsContainer.innerHTML = '<p>Não foi possível carregar as organizações no momento. Tente novamente mais tarde.</p>';
        }
    }

    // 2. Adiciona um "ouvinte" para os cliques nos botões "Doar Agora"
    ongsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-ong-link')) {
            const ongId = e.target.dataset.ongId;
            const ongNome = e.target.dataset.ongNome;
            
            // Preenche o modal com os dados da ONG selecionada
            document.getElementById('modal-ong-nome').textContent = ongNome;
            document.getElementById('doacao-ong-id').value = ongId;
            
            doacaoModal.show();
        }
    });

    // 3. Lida com o envio do formulário de doação
    formDoacao.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = formDoacao.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processando...';

        const dadosDoacao = {
            ongId: document.getElementById('doacao-ong-id').value,
            nomeDoador: document.getElementById('doacao-nome').value,
            emailDoador: document.getElementById('doacao-email').value,
            valor: parseFloat(document.getElementById('doacao-valor').value)
        };

        try {
            const response = await fetch('/api/public/doar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosDoacao)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            doacaoModal.hide();
            alert(result.message); // Exibe "Doação registrada com sucesso! Agradecemos sua contribuição."

        } catch (error) {
            alert(`Erro: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Confirmar Doação (Simulado)';
        }
    });

    carregarOngs();
});