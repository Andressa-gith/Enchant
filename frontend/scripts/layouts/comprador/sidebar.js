import supabase from '/scripts/supabaseClient.js';

// ----- FUNÇÕES DO MODAL (Não foram alteradas) -----
function createSimpleLogoutModal() {
    const existingModal = document.getElementById('simple-logout-modal');
    if (existingModal) existingModal.remove();
    const modalHTML = `
        <div id="simple-logout-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;">
            <div style="background: white; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); max-width: 420px; width: 90%; transform: scale(0.9); transition: transform 0.3s ease; overflow: hidden; border-radius: 8px;">
                <div style="background: white; color: #3d2106; padding: 24px; text-align: center;">
                    <i class="bi bi-box-arrow-right" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Confirmar Saída</h3>
                </div>
                <div style="padding: 32px 24px; text-align: center;"><p style="margin: 0; color: #4a5568; font-size: 16px;">Tem certeza que deseja sair da sua conta?</p></div>
                <div style="padding: 0 24px 24px; display: flex; gap: 12px; justify-content: center;">
                    <button id="simple-cancel-btn" style="padding: 12px 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f7fafc; color: #4a5568; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">Cancelar</button>
                    <button id="simple-confirm-btn" style="padding: 12px 24px; border: none; border-radius: 8px; background: #3d2106; color: white; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"><span id="simple-btn-text">Sair</span></button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('simple-logout-modal');
}
function showSimpleLogoutModal(logoutCallback) {
    return new Promise((resolve) => {
        const modal = createSimpleLogoutModal();
        const cancelBtn = document.getElementById('simple-cancel-btn'), confirmBtn = document.getElementById('simple-confirm-btn'), btnText = document.getElementById('simple-btn-text');
        setTimeout(() => { modal.style.opacity = '1'; modal.querySelector('div').style.transform = 'scale(1)'; }, 10);
        const closeModal = () => { modal.style.opacity = '0'; modal.querySelector('div').style.transform = 'scale(0.9)'; setTimeout(() => { modal.remove(); document.body.style.overflow = ''; }, 300); };
        cancelBtn.onclick = () => { closeModal(); resolve(false); };
        modal.onclick = (e) => { if (e.target === modal) { closeModal(); resolve(false); } };
        const escHandler = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); closeModal(); resolve(false); } };
        document.addEventListener('keydown', escHandler);
        confirmBtn.onclick = async () => { confirmBtn.disabled = true; btnText.textContent = 'Saindo...'; try { await logoutCallback(); closeModal(); resolve(true); } catch (error) { console.error('Erro no logout:', error); confirmBtn.disabled = false; btnText.textContent = 'Sair'; resolve(false); } };
    });
}


// ----- CLASSE QUE CONTROLA A SIDEBAR -----
class SidebarController {
    constructor(sidebarElement, overlayElement, logoutButton) {
        this.sidebar = sidebarElement;
        this.sidebarOverlay = overlayElement;
        this.logoutButton = logoutButton;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupSidebarToggle();
        this.setActiveLink();
    }

    bindEvents() {
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }
        if (this.logoutButton) {
            this.logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await showSimpleLogoutModal(async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) { console.error('Erro ao fazer logout:', error.message); throw error; }
                    window.location.href = '/entrar';
                });
            });
        }
        window.addEventListener('resize', () => this.handleResize());
    }

    setActiveLink() {
        if (!this.sidebar) return;
        const currentPath = window.location.pathname;
        const sidebarLinks = this.sidebar.querySelectorAll('.sidebar-nav a');
        let bestMatch = null;
        sidebarLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            if (!linkPath || linkPath === '#') return;
            if (currentPath.startsWith(linkPath) && linkPath !== '/') {
                if (!bestMatch || linkPath.length > bestMatch.getAttribute('href').length) {
                    bestMatch = link;
                }
            }
        });
        // Trata o caso da página inicial (dashboard) separadamente
        if (currentPath === '/' || currentPath === '/dashboard') {
             const dashboardLink = this.sidebar.querySelector('a[href="/dashboard"]');
             if (dashboardLink) bestMatch = dashboardLink;
        }
        sidebarLinks.forEach(link => link.classList.remove('active'));
        if (bestMatch) {
            bestMatch.classList.add('active');
        }
    }

    setupSidebarToggle() {
        window.toggleSidebar = () => this.toggleSidebar();
        window.openSidebar = () => this.openSidebar();
        window.closeSidebar = () => this.closeSidebar();
    }

    toggleSidebar() {
        if (window.innerWidth <= 1024 && this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.toggle('open');
            this.sidebarOverlay.classList.toggle('show');
            document.body.style.overflow = this.sidebar.classList.contains('open') ? 'hidden' : '';
        }
    }

    openSidebar() {
        if (window.innerWidth <= 1024 && this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.add('open');
            this.sidebarOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeSidebar() {
        if (this.sidebar && this.sidebarOverlay) {
            this.sidebar.classList.remove('open');
            this.sidebarOverlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    handleResize() {
        if (window.innerWidth > 1024) {
            this.closeSidebar();
        }
    }
}


// ----- CLASSE QUE GERENCIA A CRIAÇÃO DA SIDEBAR -----
class SidebarManager {
    constructor() {
        this.injectSidebarStyles();
        this.injectSidebarHTML();
        this.initializeSidebarScripts();
    }

    injectSidebarStyles() {
        const css = `
            :root { --primary-color: #FF0000; --sidebar-width: 290px; --sidebar-collapsed: 50px; --transition: 0.3s ease; }
            body { font-family: "Lexend Deca", sans-serif; margin: 0; }
            .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: var(--sidebar-collapsed); background-color: #ECECEC; transition: var(--transition); overflow: hidden; z-index: 800; display: flex; flex-direction: column; }
            #sidebarProfileButton { margin-top: auto; border-top: 1px solid rgba(0, 0, 0, 0.1); }
            .sidebar-nav { display: flex; flex-direction: column; flex: 1; padding-top: 56px; }
            .sidebar-nav a { display: flex; align-items: center; color: #333; padding: 13px; text-decoration: none; white-space: nowrap; transition: var(--transition); }
            .sidebar-nav span { font-size: 14px; opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s; }
            .sidebar-nav i { font-size: 1.2rem; margin-right: 20px; color: #4e4e4e; min-width: 20px; text-align: center; }
            /* EFEITO HOVER E ACTIVE APLICADO AQUI */
            .sidebar-nav a:hover, .sidebar-nav a.active { background-color: #caae8d; color: black; }
            .sidebar-nav a:hover i, .sidebar-nav a.active i { color: black; }
            .main-content { margin-left: var(--sidebar-collapsed); transition: var(--transition); }
            .sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); z-index: 799; display: none; opacity: 0; transition: opacity 0.3s ease; }
            .sidebar-overlay.show { display: block; opacity: 1; }
            @media (min-width: 1025px) { .sidebar:hover { width: var(--sidebar-width); } .sidebar:hover .sidebar-nav span { opacity: 1; visibility: visible; transition-delay: 0.1s; } }
            @media (max-width: 1024px) { .main-content { margin-left: 0; } .sidebar { left: -100%; width: var(--sidebar-width); box-shadow: 2px 0 10px rgba(0,0,0,0.2); } .sidebar.open { left: 0; } .sidebar-nav span { opacity: 1; visibility: visible; } }
        `;
        const styleElement = document.createElement('style'); styleElement.innerHTML = css; document.head.appendChild(styleElement);
        const bootstrapIcons = document.createElement('link'); bootstrapIcons.rel = 'stylesheet'; bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css';
        const lexendDecaFont = document.createElement('link'); lexendDecaFont.rel = 'stylesheet'; lexendDecaFont.href = 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap';
        document.head.appendChild(bootstrapIcons); document.head.appendChild(lexendDecaFont);
    }

    injectSidebarHTML() {
        // SUA ESTRUTURA HTML ORIGINAL MANTIDA
        const sidebarHTML = `
            <aside class="sidebar" id="sidebar">
                <nav class="sidebar-nav">
                    <a href="/dashboard"><i class="bi bi-table"></i><span>Dashboard</span></a>
                    <a href="/mapa"><i class="bi bi-map"></i><span>Mapa</span></a>
                    <a href="/doacao"><i class="bi bi-box"></i><span>Doação</span></a>
                    <a href="/historico-doacoes"><i class="bi bi-journal"></i><span>Histórico de doação</span></a>
                    <a href="/transparencia/relatorios"><i class="bi bi-file-earmark-text"></i><span>Relatórios</span></a>
                    <a href="/transparencia/contratos"><i class="bi bi-paperclip"></i><span>Contratos</span></a>
                    <a href="/transparencia/notas-auditoria"><i class="bi bi-search"></i><span>Notas de auditoria</span></a>
                    <a href="/transparencia/documentos-comprobatorios"><i class="bi bi-folder"></i><span>Documentos comprobatórios</span></a>
                    <a href="/transparencia/gestao-financeira"><i class="bi bi-wallet2"></i><span>Gestão financeira</span></a>
                    <a href="/transparencia/parcerias"><i class="bi bi-people"></i><span>Parcerias</span></a>
                    <a href="/perfil" id="sidebarProfileButton"><i class="bi bi-person-circle"></i><span>Perfil</span></a>
                    <a href="#" id="sidebarLogoutButton"><i class="bi bi-box-arrow-right"></i><span>Sair</span></a>
                </nav>
            </aside>
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
            <main class="main-content"><div class="content-area" id="contentArea"></div></main>
        `;
        const originalContent = document.body.innerHTML;
        const sidebarContainer = document.createElement('div'); sidebarContainer.id = 'trapp-sidebar-container'; sidebarContainer.innerHTML = sidebarHTML;
        document.body.innerHTML = ''; document.body.appendChild(sidebarContainer);
        document.getElementById('contentArea').innerHTML = originalContent;
    }

    initializeSidebarScripts() {
        // CORREÇÃO DE TIMING APLICADA AQUI
        const sidebarElement = document.getElementById('sidebar');
        const overlayElement = document.getElementById('sidebarOverlay');
        const logoutButton = document.getElementById('sidebarLogoutButton');

        if (sidebarElement && overlayElement) {
            new SidebarController(sidebarElement, overlayElement, logoutButton);
        } else {
            console.error("ERRO CRÍTICO: Não foi possível encontrar os elementos da sidebar. O script não será inicializado.");
        }
    }
}


// ----- PONTO DE ENTRADA PRINCIPAL DO SCRIPT -----
(function () {
    const initializeSidebar = () => {
        if (window.location.pathname.startsWith('/entrar') || window.location.pathname.startsWith('/cadastro')) {
            return;
        }
        new SidebarManager();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeSidebar);
    else initializeSidebar();
})();