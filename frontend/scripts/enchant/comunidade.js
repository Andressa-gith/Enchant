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
    const formPostagem = document.getElementById('form-postagem');

    // ============================================
    // DEBUG: Mostra informações de autenticação
    // ============================================
    console.log('=== 🔍 DEBUG COMUNIDADE ===');
    console.log('1. Container existe?', !!postCreatorContainer);
    console.log('2. Botão existe?', !!btnNovaPostagem);
    console.log('3. Feed container existe?', !!feedContainer);
    console.log('4. Modal existe?', !!modal);
    console.log('========================');

    /**
     * Obtém o token de autenticação do localStorage
     */
    function obterTokenAuth() {
        try {
            const authKey = Object.keys(localStorage).find(key =>
                key.startsWith('sb-') && key.endsWith('-auth-token')
            );

            if (!authKey) {
                console.warn('⚠️ Chave de autenticação do Supabase não encontrada.');
                return null;
            }

            const authDataString = localStorage.getItem(authKey);
            if (!authDataString) {
                console.warn('⚠️ Valor da chave de autenticação está vazio.');
                return null;
            }

            const authData = JSON.parse(authDataString);

            if (authData && authData.access_token) {
                console.log('🔑 Token encontrado!');
                return authData.access_token;
            }

            console.warn('⚠️ Token de acesso não encontrado.');
            return null;

        } catch (error) {
            console.error('❌ Erro ao obter token:', error);
            return null;
        }
    }

    /**
     * Verifica se o usuário está logado
     */
    function verificarLoginStatus() {
        const token = obterTokenAuth();
        const isLoggedIn = !!token;

        console.log('🔐 Status de login verificado:', isLoggedIn);

        // Atualiza a visibilidade do botão de criar postagem
        if (postCreatorContainer) {
            postCreatorContainer.style.display = isLoggedIn ? 'block' : 'none';
            console.log(`${isLoggedIn ? '✅' : '❌'} Botão de criar postagem: ${isLoggedIn ? 'VISÍVEL' : 'OCULTO'}`);
        }

        return isLoggedIn;
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
                    <i class="fas fa-bullhorn"></i>
                    <p>Ainda não há nenhuma publicação na comunidade. Seja o primeiro!</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = postagens.map(post => {
            const dataPostagem = new Date(post.created_at);
            const dataFormatada = dataPostagem.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            const nomeInstituicao = post.instituicao ? post.instituicao.nome : 'ONG Desconhecida';
            const logoInstituicao = post.instituicao ? post.instituicao.url_logo : '/assets/imgs/comprador/avatar-padrao.jpg';

            return `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${logoInstituicao}" alt="Logo de ${nomeInstituicao}" class="post-ong-logo" onerror="this.src='/assets/imgs/comprador/avatar-padrao.jpg'">
                        <div class="post-ong-info">
                            <h3>${nomeInstituicao}</h3>
                            <span>Publicado em ${dataFormatada}</span>
                        </div>
                    </div>
                    <div class="post-body">
                        ${post.titulo ? `<h4>${post.titulo}</h4>` : ''}
                        <p>${post.conteudo}</p>
                        ${post.url_imagem ? `<img src="${post.url_imagem}" alt="${post.titulo || 'Imagem da postagem'}" class="post-image" onerror="this.style.display='none'">` : ''}
                    </div>
                </div>
            `;
        }).join('');
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
                    <p>Ocorreu um erro ao carregar o feed.</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    /**
     * Mostra notificação toast
     */
    function mostrarNotificacao(mensagem, tipo = 'success') {
        const cor = tipo === 'success' ? '#28a745' : '#dc3545';
        const toast = document.createElement('div');
        toast.textContent = mensagem;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${cor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            font-family: 'Lexend Deca', sans-serif;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Manipula o envio do formulário de nova postagem
     */
    if (formPostagem) {
        formPostagem.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = formPostagem.querySelector('.btn-publicar');
            submitButton.disabled = true;
            submitButton.textContent = 'A publicar...';

            const formData = new FormData(formPostagem);

            try {
                console.log('📤 Enviando nova postagem...');

                const token = obterTokenAuth();

                if (!token) {
                    throw new Error('Token de autenticação não encontrado. Faça login novamente.');
                }

                const headers = {
                    'Authorization': `Bearer ${token}`
                };

                const response = await fetch('/api/user/comunidade/postagens', {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));

                    if (response.status === 401) {
                        throw new Error('Sessão expirada. Por favor, faça login novamente.');
                    }

                    throw new Error(errorData.message || 'Falha ao publicar.');
                }

                console.log('✅ Postagem criada com sucesso!');

                // Fecha o modal
                if (modal) {
                    modal.style.display = 'none';
                }

                // Reseta o formulário
                formPostagem.reset();

                // Recarrega o feed
                await carregarFeed();

                // Feedback visual de sucesso
                mostrarNotificacao('Publicação criada com sucesso!', 'success');

            } catch (error) {
                console.error('❌ Erro ao criar postagem:', error);
                mostrarNotificacao(`Erro: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Publicar';
            }
        });
    }

    /**
     * Configuração dos eventos do modal
     */
    if (btnNovaPostagem && modal && btnFecharModal) {
        console.log('✅ Configurando eventos do modal...');

        btnNovaPostagem.addEventListener('click', () => {
            console.log('📝 Abrindo modal de criação');
            modal.style.display = 'flex';
        });

        btnFecharModal.addEventListener('click', () => {
            modal.style.display = 'none';
            if (formPostagem) formPostagem.reset();
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                if (formPostagem) formPostagem.reset();
            }
        });
    } else {
        console.warn('⚠️ Alguns elementos do modal não foram encontrados:', {
            btnNovaPostagem: !!btnNovaPostagem,
            modal: !!modal,
            btnFecharModal: !!btnFecharModal
        });
    }

    // ============================================
    // EXECUTA A INICIALIZAÇÃO
    // ============================================
    (async function executar() {
        console.log('🚀 Executando inicialização da comunidade...');

        verificarLoginStatus();
        await carregarFeed();

        // Esconde o loader se existir
        setTimeout(() => {
            if (window.SiteLoader) {
                window.SiteLoader.hide();
            }
        }, 500);

        console.log('✅ Comunidade inicializada com sucesso!');
    })();
}