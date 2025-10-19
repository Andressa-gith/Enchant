// Aguarda o DOM estar pronto antes de inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}

function inicializar() {
    console.log('🎯 Inicializando lógica da comunidade...');

    const feedContainer = document.getElementById('feed-container');
    const postCreatorContainer = document.getElementById('post-creator-container');
    const btnNovaPostagem = document.getElementById('btn-nova-postagem');
    const modal = document.getElementById('modal-postagem');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const btnCancelar = document.getElementById('btn-cancelar');
    const formPostagem = document.getElementById('form-postagem');
    const modalTitulo = document.getElementById('modal-titulo');
    const postIdInput = document.getElementById('post-id');
    const postTituloInput = document.getElementById('post-titulo');
    const postConteudoInput = document.getElementById('post-conteudo');
    const postImagemInput = document.getElementById('post-imagem');
    const imagePreview = document.getElementById('image-preview');
    const charCount = document.getElementById('char-count');

    // Modal de confirmação de exclusão
    const modalConfirmarExclusao = document.getElementById('modal-confirmar-exclusao');
    const btnCancelarExclusao = document.getElementById('btn-cancelar-exclusao');
    const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');

    let postIdParaExcluir = null;
    let instituicaoIdAtual = null;

    console.log('=== 🔍 DEBUG COMUNIDADE ===');
    console.log('1. Container existe?', !!postCreatorContainer);
    console.log('2. Botão existe?', !!btnNovaPostagem);
    console.log('3. Feed container existe?', !!feedContainer);
    console.log('4. Modal existe?', !!modal);
    console.log('========================');

    /**
     * Obtém o token e ID da instituição do localStorage
     */
    function obterDadosAuth() {
        try {
            const authKey = Object.keys(localStorage).find(key =>
                key.startsWith('sb-') && key.endsWith('-auth-token')
            );

            if (!authKey) {
                console.warn('⚠️ Chave de autenticação do Supabase não encontrada.');
                return { token: null, instituicaoId: null };
            }

            const authDataString = localStorage.getItem(authKey);
            if (!authDataString) {
                console.warn('⚠️ Valor da chave de autenticação está vazio.');
                return { token: null, instituicaoId: null };
            }

            const authData = JSON.parse(authDataString);

            if (authData && authData.access_token) {
                console.log('🔑 Token encontrado!');
                const instituicaoId = authData.user?.id || null;
                return {
                    token: authData.access_token,
                    instituicaoId: instituicaoId
                };
            }

            console.warn('⚠️ Token de acesso não encontrado.');
            return { token: null, instituicaoId: null };

        } catch (error) {
            console.error('❌ Erro ao obter dados de autenticação:', error);
            return { token: null, instituicaoId: null };
        }
    }

    /**
     * Verifica se o usuário está logado
     */
    function verificarLoginStatus() {
        const { token, instituicaoId } = obterDadosAuth();
        const isLoggedIn = !!token;

        instituicaoIdAtual = instituicaoId;
        console.log('🔐 Status de login verificado:', isLoggedIn);
        console.log('🏢 Instituição ID:', instituicaoId);

        if (postCreatorContainer) {
            postCreatorContainer.style.display = isLoggedIn ? 'block' : 'none';
            console.log(`${isLoggedIn ? '✅' : '❌'} Botão de criar postagem: ${isLoggedIn ? 'VISÍVEL' : 'OCULTO'}`);
        }

        return isLoggedIn;
    }

    /**
     * Verifica se a postagem pertence ao usuário logado
     */
    function postagemPertenceAoUsuario(postagemInstituicaoId) {
        return instituicaoIdAtual && postagemInstituicaoId === instituicaoIdAtual;
    }

    /**
     * Renderiza o feed de postagens
     */
    function renderizarFeed(postagens) {
        if (!feedContainer) {
            console.error('❌ Feed container não encontrado!');
            return;
        }

        if (!postagens || postagens.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>Ainda não há publicações</p>
                    <small>Seja o primeiro a compartilhar algo com a comunidade!</small>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = postagens.map(post => {
            const dataPostagem = new Date(post.created_at);
            const dataFormatada = formatarDataRelativa(dataPostagem);

            const nomeInstituicao = post.instituicao ? post.instituicao.nome : 'ONG Desconhecida';
            const logoInstituicao = post.instituicao ? post.instituicao.url_logo : '/assets/imgs/comprador/avatar-padrao.jpg';

            const podeEditar = postagemPertenceAoUsuario(post.instituicao_id);
            const botoesAcao = podeEditar ? `
                <div class="post-actions">
                    <button class="post-action-btn edit" data-id="${post.id}" title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="post-action-btn delete" data-id="${post.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : '';

            const usuarioLogado = !!instituicaoIdAtual;

            const temMercadoPago = post.instituicao?.mp_connected === true;
            const botaoDoar = (temMercadoPago && !usuarioLogado) ? `
                <div class="post-footer">
                    <a href="/?ong=${post.instituicao_id}#parceiros-container" class="btn-doar">
                        <i class="fas fa-heart"></i>
                        Doar
                    </a>
                </div>
            ` : '';

            return `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <a href="/transparencia?id=${post.instituicao_id}" class="post-ong-link">
                            <img src="${logoInstituicao}" alt="Logo de ${nomeInstituicao}" class="post-ong-logo" onerror="this.src='/assets/imgs/comprador/avatar-padrao.jpg'">
                        </a>
                        <div class="post-ong-info">
                            <div class="post-ong-info-header">
                                <a href="/transparencia?id=${post.instituicao_id}" class="post-ong-nome-link">
                                    <h3>${nomeInstituicao}</h3>
                                </a>
                                <span>· ${dataFormatada}</span>
                            </div>
                        </div>
                        ${botoesAcao}
                    </div>
                    <div class="post-body">
                        ${post.titulo ? `<h4>${post.titulo}</h4>` : ''}
                        <p>${post.conteudo}</p>
                        ${post.url_imagem ? `<img src="${post.url_imagem}" alt="${post.titulo || 'Imagem da postagem'}" class="post-image" onerror="this.style.display='none'">` : ''}
                        ${botaoDoar}
                    </div>
                </div>
            `;
        }).join('');

        // Adiciona event listeners aos botões de ação
        adicionarEventListenersBotoes();
    }

    let todasOngs = [];
    let timeoutBusca = null;

    async function carregarOngs() {
        try {
            const response = await fetch('/api/public/todasongs');
            if (!response.ok) throw new Error('Erro ao carregar ONGs');
            todasOngs = await response.json();
            console.log('✅ ONGs carregadas:', todasOngs.length);
        } catch (error) {
            console.error('❌ Erro ao carregar ONGs:', error);
        }
    }

    function buscarOngs(termo) {
        const resultados = document.getElementById('search-results');

        if (!termo.trim()) {
            resultados.innerHTML = '';
            return;
        }

        const filtradas = todasOngs.filter(ong =>
            ong.nome.toLowerCase().includes(termo.toLowerCase()) ||
            (ong.sobre && ong.sobre.toLowerCase().includes(termo.toLowerCase()))
        );

        if (filtradas.length === 0) {
            resultados.innerHTML = '<div class="empty-search">Nenhuma ONG encontrada</div>';
            return;
        }

        resultados.innerHTML = filtradas.slice(0, 5).map(ong => `
                <a href="/transparencia?id=${ong.id}" class="ong-result-item">
                    <img src="${ong.caminho_logo || '/assets/imgs/comprador/avatar-padrao.jpg'}" 
                         alt="${ong.nome}" 
                         class="ong-result-avatar"
                         onerror="this.src='/assets/imgs/comprador/avatar-padrao.jpg'">
                    <div class="ong-result-info">
                        <h4>${ong.nome}</h4>
                        <p>${ong.sobre ? ong.sobre.substring(0, 50) + '...' : 'Sem descrição'}</p>
                    </div>
                </a>
            `).join('');
    }

    document.getElementById('search-ongs')?.addEventListener('input', (e) => {
        clearTimeout(timeoutBusca);
        timeoutBusca = setTimeout(() => {
            buscarOngs(e.target.value);
        }, 300);
    });

    async function carregarAtividades() {
        const container = document.getElementById('atividades-lista');

        try {
            // Aqui você pode fazer múltiplas requisições para diferentes tipos de atividade
            const [doacoes, financeiro] = await Promise.all([
                fetch('/api/public/atividades/doacoes?limit=3').then(r => r.json()).catch(() => []),
                fetch('/api/public/atividades/financeiro?limit=2').then(r => r.json()).catch(() => [])
            ]);

            const atividades = [
                ...doacoes.map(d => ({
                    tipo: 'entrada',
                    texto: `${d.instituicao_nome} recebeu ${d.quantidade} ${d.categoria_nome}`,
                    data: d.data_entrada,
                    icone: 'fa-arrow-down'
                })),
                ...financeiro.map(f => ({
                    tipo: 'financeiro',
                    texto: `${f.instituicao_nome} executou R$ ${f.valor_executado} em ${f.nome_categoria}`,
                    data: f.data_criacao,
                    icone: 'fa-chart-line'
                }))
            ].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5);

            if (atividades.length === 0) {
                container.innerHTML = '<div class="empty-search">Sem atividades recentes</div>';
                return;
            }

            container.innerHTML = atividades.map(ativ => `
                    <div class="atividade-item">
                        <div class="atividade-icon ${ativ.tipo}">
                            <i class="fas ${ativ.icone}"></i>
                        </div>
                        <div class="atividade-content">
                            <p>${ativ.texto}</p>
                            <small>${formatarDataRelativa(new Date(ativ.data))}</small>
                        </div>
                    </div>
                `).join('');

        } catch (error) {
            console.error('❌ Erro ao carregar atividades:', error);
            container.innerHTML = '<div class="empty-search">Erro ao carregar atividades</div>';
        }
    }

    /**
     * Formata a data de forma relativa (ex: "há 2 horas")
     */
    function formatarDataRelativa(data) {
        const agora = new Date();
        const diff = agora - data;
        const segundos = Math.floor(diff / 1000);
        const minutos = Math.floor(segundos / 60);
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);

        if (segundos < 60) return 'agora mesmo';
        if (minutos < 60) return `há ${minutos}min`;
        if (horas < 24) return `há ${horas}h`;
        if (dias < 7) return `há ${dias}d`;

        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
        });
    }

    /**
     * Adiciona event listeners aos botões de editar e excluir
     */
    function adicionarEventListenersBotoes() {
        // Botões de editar
        document.querySelectorAll('.post-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.dataset.id;
                await abrirModalEdicao(postId);
            });
        });

        // Botões de excluir
        document.querySelectorAll('.post-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.id;
                abrirModalConfirmacaoExclusao(postId);
            });
        });
    }

    /**
     * Abre o modal para editar uma postagem
     */
    async function abrirModalEdicao(postId) {
        try {
            console.log('✏️ Carregando postagem para edição:', postId);

            const { token } = obterDadosAuth();
            if (!token) {
                throw new Error('Você precisa estar logado para editar.');
            }

            const response = await fetch(`/api/user/comunidade/postagens/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Não foi possível carregar a postagem.');
            }

            const post = await response.json();

            // Preenche o formulário
            postIdInput.value = post.id;
            postTituloInput.value = post.titulo || '';
            postConteudoInput.value = post.conteudo || '';

            // Atualiza contador de caracteres
            charCount.textContent = post.conteudo.length;
            atualizarContadorCaracteres();

            // Se tem imagem, mostra preview
            if (post.url_imagem) {
                imagePreview.innerHTML = `
                    <img src="${post.url_imagem}" alt="Preview">
                    <div class="image-preview-actions">
                        <button type="button" class="btn-remove-image" id="btn-remover-imagem-atual">
                            <i class="fas fa-times"></i> Remover imagem
                        </button>
                    </div>
                `;
                imagePreview.classList.add('active');

                // Botão para remover imagem atual
                document.getElementById('btn-remover-imagem-atual')?.addEventListener('click', () => {
                    imagePreview.innerHTML = '';
                    imagePreview.classList.remove('active');
                });
            }

            // Atualiza o título do modal
            modalTitulo.textContent = 'Editar Publicação';

            // Abre o modal
            modal.style.display = 'flex';

        } catch (error) {
            console.error('❌ Erro ao carregar postagem:', error);
            mostrarNotificacao(error.message, 'error');
        }
    }

    /**
     * Abre o modal de confirmação de exclusão
     */
    function abrirModalConfirmacaoExclusao(postId) {
        postIdParaExcluir = postId;
        modalConfirmarExclusao.style.display = 'flex';
    }

    /**
     * Exclui uma postagem
     */
    async function excluirPostagem(postId) {
        try {
            console.log('🗑️ Excluindo postagem:', postId);

            const { token } = obterDadosAuth();
            if (!token) {
                throw new Error('Você precisa estar logado para excluir.');
            }

            const response = await fetch(`/api/user/comunidade/postagens/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(errorData.message || 'Não foi possível excluir a postagem.');
            }

            console.log('✅ Postagem excluída com sucesso!');

            // Fecha o modal
            modalConfirmarExclusao.style.display = 'none';
            postIdParaExcluir = null;

            // Remove o card do DOM com animação
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            if (postCard) {
                postCard.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    postCard.remove();

                    // Se não houver mais posts, mostra o empty state
                    const remainingPosts = document.querySelectorAll('.post-card');
                    if (remainingPosts.length === 0) {
                        renderizarFeed([]);
                    }
                }, 300);
            }

            mostrarNotificacao('Publicação excluída com sucesso!', 'success');

        } catch (error) {
            console.error('❌ Erro ao excluir postagem:', error);
            mostrarNotificacao(error.message, 'error');
        }
    }

    /**
     * Carrega o feed de postagens da API
     */
    async function carregarFeed() {
        if (!feedContainer) {
            console.error('❌ Feed container não encontrado!');
            return;
        }

        try {
            console.log('📡 Carregando feed...');
            const response = await fetch('/api/public/comunidade/postagens');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(errorData.message || `Erro do servidor: ${response.status}`);
            }

            const postagens = await response.json();
            console.log(`✅ ${postagens.length} postagens carregadas`);
            renderizarFeed(postagens);

        } catch (error) {
            console.error("❌ Erro ao carregar o feed:", error);
            feedContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Não foi possível carregar as publicações</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    /**
     * Atualiza o contador de caracteres
     */
    function atualizarContadorCaracteres() {
        const length = postConteudoInput.value.length;
        charCount.textContent = length;

        const charCounter = document.querySelector('.char-counter');
        charCounter.classList.remove('warning', 'error');

        if (length > 2000) {
            charCounter.classList.add('error');
        } else if (length > 1800) {
            charCounter.classList.add('warning');
        }
    }

    /**
     * Mostra preview da imagem selecionada
     */
    function mostrarPreviewImagem(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="image-preview-actions">
                    <button type="button" class="btn-remove-image" id="btn-remover-preview">
                        <i class="fas fa-times"></i> Remover imagem
                    </button>
                </div>
            `;
            imagePreview.classList.add('active');

            // Botão para remover preview
            document.getElementById('btn-remover-preview')?.addEventListener('click', () => {
                postImagemInput.value = '';
                imagePreview.innerHTML = '';
                imagePreview.classList.remove('active');
            });
        };
        reader.readAsDataURL(file);
    }

    /**
     * Reseta o formulário
     */
    function resetarFormulario() {
        formPostagem.reset();
        postIdInput.value = '';
        imagePreview.innerHTML = '';
        imagePreview.classList.remove('active');
        charCount.textContent = '0';
        document.querySelector('.char-counter').classList.remove('warning', 'error');
        modalTitulo.textContent = 'Criar Nova Publicação';
    }

    /**
     * Fecha o modal
     */
    function fecharModal() {
        modal.style.display = 'none';
        resetarFormulario();
    }

    /**
     * Mostra notificação toast
     */
    function mostrarNotificacao(mensagem, tipo = 'success') {
        const cor = tipo === 'success' ? '#28a745' : '#dc3545';
        const icone = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

        const toast = document.createElement('div');
        toast.innerHTML = `<i class="fas ${icone}"></i> ${mensagem}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${cor};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 350px;
            font-family: 'Lexend Deca', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.95rem;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Manipula o envio do formulário
     */
    if (formPostagem) {
        formPostagem.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = formPostagem.querySelector('.btn-publicar');
            const isEdicao = !!postIdInput.value;

            submitButton.disabled = true;
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEdicao ? 'Salvando...' : 'Publicando...'}`;

            const formData = new FormData(formPostagem);

            try {
                console.log(`📤 ${isEdicao ? 'Atualizando' : 'Criando'} postagem...`);

                const { token } = obterDadosAuth();
                if (!token) {
                    throw new Error('Token de autenticação não encontrado. Faça login novamente.');
                }

                const url = isEdicao
                    ? `/api/user/comunidade/postagens/${postIdInput.value}`
                    : '/api/user/comunidade/postagens';

                const method = isEdicao ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));

                    if (response.status === 401) {
                        throw new Error('Sessão expirada. Por favor, faça login novamente.');
                    }

                    throw new Error(errorData.message || 'Falha ao processar a postagem.');
                }

                console.log(`✅ Postagem ${isEdicao ? 'atualizada' : 'criada'} com sucesso!`);

                fecharModal();
                await carregarFeed();

                mostrarNotificacao(
                    `Publicação ${isEdicao ? 'atualizada' : 'criada'} com sucesso!`,
                    'success'
                );

            } catch (error) {
                console.error('❌ Erro ao processar postagem:', error);
                mostrarNotificacao(error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = `<i class="fas fa-paper-plane"></i> Publicar`;
            }
        });
    }

    /**
     * Event Listeners
     */

    // Botão Nova Postagem
    if (btnNovaPostagem) {
        btnNovaPostagem.addEventListener('click', () => {
            console.log('📝 Abrindo modal de criação');
            resetarFormulario();
            modal.style.display = 'flex';
        });
    }

    // Botão Fechar Modal
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', fecharModal);
    }

    // Botão Cancelar
    if (btnCancelar) {
        btnCancelar.addEventListener('click', fecharModal);
    }

    // Clique fora do modal
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModal();
            }
        });
    }

    // Contador de caracteres
    if (postConteudoInput) {
        postConteudoInput.addEventListener('input', atualizarContadorCaracteres);
    }

    // Preview de imagem
    if (postImagemInput) {
        postImagemInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                mostrarPreviewImagem(file);
            }
        });
    }

    // Modal de confirmação de exclusão - Cancelar
    if (btnCancelarExclusao) {
        btnCancelarExclusao.addEventListener('click', () => {
            modalConfirmarExclusao.style.display = 'none';
            postIdParaExcluir = null;
        });
    }

    // Modal de confirmação de exclusão - Confirmar
    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', async () => {
            if (postIdParaExcluir) {
                await excluirPostagem(postIdParaExcluir);
            }
        });
    }

    // Clique fora do modal de confirmação
    if (modalConfirmarExclusao) {
        window.addEventListener('click', (e) => {
            if (e.target === modalConfirmarExclusao) {
                modalConfirmarExclusao.style.display = 'none';
                postIdParaExcluir = null;
            }
        });
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    (async function executar() {
        console.log('🚀 Executando inicialização da comunidade...');

        verificarLoginStatus();
        await carregarFeed();
        carregarOngs();
        carregarAtividades();

        setTimeout(() => {
            if (window.SiteLoader) {
                window.SiteLoader.hide();
            }
        }, 500);

        console.log('✅ Comunidade inicializada com sucesso!');
    })();
}

// Adiciona animação de fadeOut ao CSS dinamicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);