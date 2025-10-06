document.addEventListener('DOMContentLoaded', () => {
    const ongsContainer = document.getElementById('ongs-grid');
    const doacaoModalEl = document.getElementById('doacaoModal');
    const doacaoModal = new bootstrap.Modal(doacaoModalEl);
    const formDoacao = document.getElementById('form-doacao');
    let ongsList = [];

    // 1. Carrega a lista de ONGs assim que a página abre
    async function carregarOngs() {
        try {
            const response = await fetch('/api/public/ongs');
            if (!response.ok) throw new Error('Falha ao carregar organizações.');
            const ongs = await response.json();
            ongsList = ongs;

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

        // Dados do formulário
        const ongId = document.getElementById('doacao-ong-id').value;
        const nomeDoador = document.getElementById('doacao-nome').value;
        const valor = parseFloat(document.getElementById('doacao-valor').value);

        // Encontra a ONG selecionada para pegar a chave pix
        const ongSelecionada = ongsList.find(ong => ong.id === ongId);
        if (!ongSelecionada || !ongSelecionada.chave_pix) {
            alert('Esta organização não configurou uma chave Pix para doações.');
            return;
        }

        const formatarTextoPix = (texto, limite) => {
            return texto
                .normalize("NFD") // Separa os acentos das letras
                .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
                .replace(/\s+/g, ' ') // Troca um ou mais espaços por um único underline
                .substring(0, limite); // Limita o tamanho do texto
        };

        const pixCode = gerarPixCopiaECola({
            merchantName: formatarTextoPix(ongSelecionada.nome, 25),
            merchantCity: formatarTextoPix(ongSelecionada.cidade || "SAO PAULO", 15),
            pixKey: ongSelecionada.chave_pix,
            infoAdicional: '***',
            transactionAmount: valor,
        });

        document.getElementById('pix-codigo').value = pixCode;

        const canvasElement = document.getElementById('qrcode-container');
        new QRious({
            element: canvasElement,
            value: pixCode,
            size: 250, // Tamanho do QR Code em pixels
            foreground: 'black', // Cor dos pontos
            level: 'H' // Nível de correção de erro (L, M, Q, H)
        });

        document.getElementById('form-doacao').style.display = 'none';
        document.getElementById('area-pix-gerado').style.display = 'block';

        // --- REGISTRO NO BACKEND (em paralelo) ---
        // Envia os dados para o backend criar o recibo
        fetch('/api/public/doar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ongId, valor, nomeDoador, emailDoador: document.getElementById('doacao-email').value })
        }).then(res => console.log("Recibo de doação registrado no backend."))
            .catch(err => console.error("Erro ao registrar recibo:", err));
    });

    // Lógica do botão de copiar
    document.getElementById('btn-copiar-pix').addEventListener('click', () => {
        const pixCodeText = document.getElementById('pix-codigo');
        pixCodeText.select();
        document.execCommand('copy');

        const feedback = document.getElementById('copiado-feedback');
        feedback.style.display = 'inline';
        setTimeout(() => { feedback.style.display = 'none'; }, 2000);
    });

    carregarOngs();
});