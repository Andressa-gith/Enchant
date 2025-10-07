document.addEventListener('DOMContentLoaded', () => {
    const ongsContainer = document.getElementById('ongs-grid');
    const doacaoModalEl = document.getElementById('doacaoModal');
    const doacaoModal = new bootstrap.Modal(doacaoModalEl);
    const formDoacao = document.getElementById('form-doacao');
    const inputBusca = document.getElementById('input-busca');
    const paginacaoContainer = document.getElementById('paginacao-container');
    const mensagemVazia = document.getElementById('mensagem-vazia');
    
    let ongsList = [];
    let ongsFiltradas = [];
    let paginaAtual = 1;
    const itensPorPagina = 6;

    // Carrega ONGs
    async function carregarOngs() {
        try {
            const response = await fetch('/api/public/ongs');
            if (!response.ok) throw new Error('Falha ao carregar organizações.');
            const ongs = await response.json();
            ongsList = ongs;
            ongsFiltradas = ongs;
            
            renderizarOngs();
            renderizarPaginacao();
        } catch (error) {
            console.error(error);
            ongsContainer.innerHTML = '<p class="mensagem-erro">Não foi possível carregar as organizações no momento. Tente novamente mais tarde.</p>';
        }
    }

    // Renderiza ONGs na página atual
    function renderizarOngs() {
        ongsContainer.innerHTML = '';
        
        if (ongsFiltradas.length === 0) {
            mensagemVazia.style.display = 'block';
            paginacaoContainer.innerHTML = '';
            return;
        }
        
        mensagemVazia.style.display = 'none';
        
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        const ongsParaMostrar = ongsFiltradas.slice(inicio, fim);
        
        ongsParaMostrar.forEach(ong => {
            const card = document.createElement('div');
            card.className = 'card-ong';
            card.innerHTML = `
                <img src="${ong.caminho_logo || '/assets/imgs/comprador/avatar-padrao.jpg'}" 
                     alt="Logo de ${ong.nome}" 
                     class="card-ong-imagem"
                     onerror="this.src='/assets/imgs/comprador/avatar-padrao.jpg'">
                <div class="card-ong-conteudo">
                    <h3>${ong.nome}</h3>
                    <p>${ong.descricao_curta || 'Esta organização ainda não adicionou uma descrição.'}</p>
                    <button class="card-ong-link" data-ong-id="${ong.id}" data-ong-nome="${ong.nome}">
                        Doar Agora
                    </button>
                </div>
            `;
            ongsContainer.appendChild(card);
        });
    }

    // Renderiza paginação
    function renderizarPaginacao() {
        paginacaoContainer.innerHTML = '';
        
        const totalPaginas = Math.ceil(ongsFiltradas.length / itensPorPagina);
        
        if (totalPaginas <= 1) return;
        
        // Botão anterior
        const btnAnterior = document.createElement('button');
        btnAnterior.className = 'btn-pagina';
        btnAnterior.innerHTML = '←';
        btnAnterior.disabled = paginaAtual === 1;
        btnAnterior.onclick = () => {
            if (paginaAtual > 1) {
                paginaAtual--;
                renderizarOngs();
                renderizarPaginacao();
                scrollParaOngs();
            }
        };
        paginacaoContainer.appendChild(btnAnterior);
        
        // Números das páginas
        for (let i = 1; i <= totalPaginas; i++) {
            const btnPagina = document.createElement('button');
            btnPagina.className = 'btn-pagina';
            if (i === paginaAtual) btnPagina.classList.add('active');
            btnPagina.textContent = i;
            btnPagina.onclick = () => {
                paginaAtual = i;
                renderizarOngs();
                renderizarPaginacao();
                scrollParaOngs();
            };
            paginacaoContainer.appendChild(btnPagina);
        }
        
        // Botão próximo
        const btnProximo = document.createElement('button');
        btnProximo.className = 'btn-pagina';
        btnProximo.innerHTML = '→';
        btnProximo.disabled = paginaAtual === totalPaginas;
        btnProximo.onclick = () => {
            if (paginaAtual < totalPaginas) {
                paginaAtual++;
                renderizarOngs();
                renderizarPaginacao();
                scrollParaOngs();
            }
        };
        paginacaoContainer.appendChild(btnProximo);
    }

    // Scroll suave para área das ONGs
    function scrollParaOngs() {
        document.querySelector('.container-parceiros').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    // Sistema de busca
    inputBusca.addEventListener('input', (e) => {
        const termoBusca = e.target.value.toLowerCase().trim();
        
        if (!termoBusca) {
            ongsFiltradas = ongsList;
        } else {
            ongsFiltradas = ongsList.filter(ong => {
                return ong.nome.toLowerCase().includes(termoBusca) ||
                       (ong.descricao_curta && ong.descricao_curta.toLowerCase().includes(termoBusca)) ||
                       (ong.area_atuacao && ong.area_atuacao.toLowerCase().includes(termoBusca));
            });
        }
        
        paginaAtual = 1; // Volta para primeira página ao buscar
        renderizarOngs();
        renderizarPaginacao();
    });

    // Abre modal de doação
    ongsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-ong-link')) {
            const ongId = e.target.dataset.ongId;
            const ongNome = e.target.dataset.ongNome;
            
            document.getElementById('modal-ong-nome').textContent = ongNome;
            document.getElementById('doacao-ong-id').value = ongId;
            formDoacao.reset();
            
            doacaoModal.show();
        }
    });

    // Envio do formulário de doação
    formDoacao.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const ongId = document.getElementById('doacao-ong-id').value;
        const nomeDoador = document.getElementById('doacao-nome').value;
        const emailDoador = document.getElementById('doacao-email').value;
        const valor = parseFloat(document.getElementById('doacao-valor').value);

        e.submitter.disabled = true;
        e.submitter.textContent = 'Gerando PIX...';

        try {
            const response = await fetch('/api/public/criar-cobranca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ongId, valor, nomeDoador, emailDoador })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ocorreu um erro desconhecido.');
            }

            const pixData = await response.json();

            document.getElementById('pix-codigo').value = pixData.qr_code; // Código Copia e Cola

            const canvasElement = document.getElementById('qrcode-container');
            new QRious({
                element: canvasElement,
                value: pixData.qr_code, // O texto do QR Code
                size: 250,
                foreground: 'black',
                level: 'H'
            });

            // Mostre a área do PIX
            document.getElementById('form-doacao').style.display = 'none';
            document.getElementById('area-pix-gerado').style.display = 'block';

        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            // Reabilite o botão
            e.submitter.disabled = false;
            e.submitter.textContent = 'Doar';
        }

    });

    // Botão copiar PIX
    document.getElementById('btn-copiar-pix').addEventListener('click', () => {
        const pixCodeText = document.getElementById('pix-codigo');
        pixCodeText.select();
        document.execCommand('copy');

        const feedback = document.getElementById('copiado-feedback');
        feedback.style.display = 'inline';
        setTimeout(() => { feedback.style.display = 'none'; }, 2000);
    });

    // Reseta formulário ao fechar modal
    doacaoModalEl.addEventListener('hidden.bs.modal', () => {
        formDoacao.reset();
        document.getElementById('form-doacao').style.display = 'block';
        document.getElementById('area-pix-gerado').style.display = 'none';
    });

    carregarOngs();
});