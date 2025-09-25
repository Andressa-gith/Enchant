import supabase from '/scripts/supabaseClient.js';

(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSidebar);
    } else {
        initializeSidebar();
    }

    function initializeSidebar() {
        class SidebarManager {
            constructor() {
                this.injectSidebarStyles();
                this.injectSidebarHTML();
                this.initializeSidebarScripts();
            }

            injectSidebarStyles() {
                const css = `
                    :root {
                        --primary-color: #693B11;
                        --accent-color: #EC9E07;
                        --text-color: #333;
                        --light-bg: #ECECEC;
                        --white: #FFFFFF;
                        --shadow: rgba(180, 180, 180, 0.3);
                        --sidebar-width: 290px;
                        --sidebar-collapsed: 50px;
                        --header-height: 56px;
                        --transition: 0.3s ease;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family: "Lexend Deca", sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: var(--white);
                    }

                    .sidebar {
                        position: fixed;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        width: var(--sidebar-collapsed);
                        background-color: var(--light-bg);
                        transition: var(--transition);
                        overflow: hidden;
                        z-index: 800;
                        border-radius: 0 6px 6px 0;
                        display: flex;
                        flex-direction: column;
                    }

                    #sidebarProfileButton {
                        margin-top: auto; /* Empurra o botão de perfil e o de sair para baixo */
                        border-top: 1px solid rgba(0, 0, 0, 0.1); /* Linha divisória acima do perfil */
                        border-radius: 0; /* Remove o arredondamento caso haja */
                    }

                    #sidebarLogoutButton {
                        border-radius: 0; /* Apenas garante que não tenha arredondamento */
                    }

                    @media (min-width: 1025px) {
                        .sidebar {
                            display: block;
                            width: var(--sidebar-collapsed);
                        }
                        .sidebar:hover {
                            width: var(--sidebar-width);
                        }
                        .sidebar:hover .sidebar-nav a span {
                            opacity: 1;
                            visibility: visible;
                        }
                    }

                    .sidebar-nav {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        height: 100%;
                        padding-top: var(--header-height);
                        flex: 1;
                    }

                    .sidebar-nav a {
                        display: flex;
                        align-items: center;
                        color: var(--text-color);
                        padding: 13px;
                        text-decoration: none;
                        white-space: nowrap;
                        transition: var(--transition);
                    }

                    .sidebar-nav a:hover {
                        background-color: rgba(0, 0, 0, 0.05);
                    }

                    .sidebar-nav i {
                        font-size: 1.2rem;
                        margin-right: 20px;
                        color: #4e4e4e;
                        min-width: 20px;
                        text-align: center;
                    }

                    .sidebar-nav span {
                        font-size: 14px;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.2s, visibility 0.2s;
                    }

                    .sidebar-profile {
                        display: none;
                        padding: 15px;
                        flex-direction: column;
                        align-items: center;
                        margin-top: auto;
                        margin-bottom: 10px;
                    }

                    .sidebar-profile-content {
                        display: flex;
                        align-items: center;
                        width: 100%;
                        margin-bottom: 15px;
                    }

                    .sidebar-profile-photo {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 2px solid #CCC;
                        display: none;
                    }

                    .sidebar-profile-icon {
                        font-size: 35px;
                        color: #CCC;
                        margin-right: 15px;
                    }

                    .sidebar-logout {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-color);
                        text-decoration: none;
                        padding: 10px;
                        background-color: rgba(0, 0, 0, 0.05);
                        border-radius: 5px;
                        width: 100%;
                        transition: var(--transition);
                        margin-bottom: 25px;
                    }
                    .sidebar-logout:hover {
                        background-color: rgba(0, 0, 0, 0.1);
                    }
                    .sidebar-logout i {
                        margin-right: 10px;
                    }
                    .sidebar-logout span {
                        font-size: 14px;
                    }

                    .sidebar-logout-footer {
                        /* Esta seção não cresce, ficando sempre no final */
                        padding: 0 8px 15px 8px;
                    }
                    .sidebar-logout-footer a {
                        display: flex;
                        align-items: center;
                        color: var(--text-color);
                        padding: 13px;
                        text-decoration: none;
                        white-space: nowrap;
                        border-radius: 6px;
                        transition: background-color var(--transition);
                    }
                    .sidebar-logout-footer a:hover {
                        background-color: rgba(0, 0, 0, 0.1);
                    }
                    .sidebar-logout-footer i {
                        /* Garante o mesmo tamanho dos outros ícones */
                        font-size: 1.2rem;
                        margin-right: 20px;
                        color: #4e4e4e;
                        min-width: 20px;
                        text-align: center;
                    }
                    .sidebar-logout-footer span {
                        font-size: 14px;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.2s, visibility 0.2s;
                    }

                    .sidebar-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.7);
                        z-index: 799;
                        display: none;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    .sidebar-overlay.show {
                        display: block;
                        opacity: 1;
                    }

                    .main-content {
                        margin-left: var(--sidebar-collapsed);
                        transition: var(--transition);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    
                    .sidebar-logout-footer {
                        margin-top: auto; /* Empurra o botão para o fundo */
                        padding: 0 13px 15px 13px; /* Espaçamento inferior */
                    }
                    .sidebar-logout-footer a {
                        display: flex;
                        align-items: center;
                        color: var(--text-color);
                        padding: 13px;
                        text-decoration: none;
                        white-space: nowrap;
                        transition: var(--transition);
                        border-radius: 6px;
                    }
                    .sidebar-logout-footer a:hover {
                        background-color: rgba(0, 0, 0, 0.05);
                    }

                    @media (max-width: 1024px) {
                        .sidebar {
                            left: -100%;
                            width: var(--sidebar-width);
                            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
                        }
                        .sidebar.open { left: 0; }
                        .sidebar-nav span { opacity: 1; visibility: visible; }

                        .main-content { margin-left: 0; }
                        .sidebar-nav { padding-top: 50px; }

                        .sidebar-profile {
                            display: flex;
                            border-top: 1px solid rgba(0, 0, 0, 0.1);
                        }
                    }
                    
                    @media (min-width: 1025px) {
                        .sidebar:hover {
                            width: var(--sidebar-width);
                        }
                        .sidebar:hover .sidebar-nav a span,
                        .sidebar:hover .sidebar-logout-footer a span {
                            opacity: 1;
                            visibility: visible;
                            transition-delay: 0.1s; /* Pequeno delay para o texto aparecer */
                        }
                    }

                    @media (max-width: 768px) {
                        .sidebar-nav { padding-top: 50px; }
                    }
                `;
                
                const styleElement = document.createElement('style');
                styleElement.innerHTML = css;

                const bootstrapIcons = document.createElement('link');
                bootstrapIcons.rel = 'stylesheet';
                bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css';
                
                const lexendDecaFont = document.createElement('link');
                lexendDecaFont.rel = 'stylesheet';
                lexendDecaFont.href = 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap';
                
                document.head.appendChild(bootstrapIcons);
                document.head.appendChild(lexendDecaFont);
                document.head.appendChild(styleElement);
            }

            injectSidebarHTML() {
                const sidebarHTML = `
                    <aside class="sidebar" id="sidebar">
                        <nav class="sidebar-nav">
                            <a href="/dashboard">
                                <i class="bi bi-table"></i>
                                <span>Dashboard</span>
                            </a>
                            <a href="/mapa">
                                <i class="bi bi-map"></i>
                                <span>Mapa</span>
                            </a>
                            <a href="/doacao">
                                <i class="bi bi-box"></i>
                                <span>Doação</span>
                            </a>
                            <a href="/historico-doacoes">
                                <i class="bi bi-journal"></i>
                                <span>Histórico de doação</span>
                            </a>
                            <a href="/transparencia/relatorios">
                                <i class="bi bi-file-earmark-text"></i>
                                <span>Relatórios</span>
                            </a>
                            <a href="/transparencia/contratos">
                                <i class="bi bi-paperclip me-2"></i>
                                <span>Contratos</span>
                            </a>
                            <a href="/transparencia/notas-auditoria">
                                <i class="bi bi-search"></i>
                                <span>Notas de auditoria</span>
                            </a>
                            <a href="/transparencia/documentos-comprobatorios">
                                <i class="bi bi-folder"></i>
                                <span>Documentos comprobatórios</span>
                            </a>
                            <a href="/transparencia/gestao-financeira">
                                <i class="bi bi-wallet2"></i>
                                <span>Gestão financeira</span>
                            </a>
                            <a href="/transparencia/parcerias">
                                <i class="bi bi-people"></i>
                                <span>Parcerias</span>
                            </a>

                            <a href="/perfil" id="sidebarProfileButton">
                                <i class="bi bi-person-circle"></i>
                                <span>Perfil</span>
                            </a>
                            
                            <a href="#" id="sidebarLogoutButton">
                                <i class="bi bi-box-arrow-right"></i>
                                <span>Sair</span>
                            </a>
                        </nav>
                    </aside>
                    
                    <div class="sidebar-overlay" id="sidebarOverlay"></div>
                    
                    <main class="main-content">
                        <div class="content-area" id="contentArea">
                        </div>
                    </main>
                `;

                const originalContent = document.body.innerHTML;

                const sidebarContainer = document.createElement('div');
                sidebarContainer.id = 'trapp-sidebar-container';
                sidebarContainer.innerHTML = sidebarHTML;
                
                document.body.innerHTML = '';
                document.body.appendChild(sidebarContainer);
                
                const contentArea = document.getElementById('contentArea');
                if (contentArea) {
                    contentArea.innerHTML = originalContent;
                }
            }

            initializeSidebarScripts() {
                class SidebarController {
                    constructor() {
                        this.sidebar = document.getElementById('sidebar');
                        this.sidebarOverlay = document.getElementById('sidebarOverlay');
                        this.sidebarProfilePhoto = document.getElementById('sidebarProfilePhoto');
                        this.sidebarProfileIcon = document.getElementById('sidebarProfileIcon');
                        this.logoutButton = document.getElementById('sidebarLogoutButton');
                        
                        this.init();
                    }

                    init() {
                        this.bindEvents();
                        this.setupSidebarToggle();
                        this.syncProfilePhoto();
                    }

                    bindEvents() {
                        this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
                        
                        window.addEventListener('resize', () => this.handleResize());

                        if(this.logoutButton) {
                            this.logoutButton.addEventListener('click', async (e) => {
                                e.preventDefault();

                                window.isLoggingOut = true;

                                console.log("Botão de sair da sidebar clicado.");
                                const { error } = await supabase.auth.signOut();
                                if (error) {
                                    console.error('Erro ao fazer logout:', error.message);
                                    window.isLoggingOut = false;
                                    alert('Não foi possível sair. Tente novamente.');
                                } else {
                                    // Logout bem-sucedido, redireciona para a página de entrada
                                    window.location.href = '/entrar';
                                }
                            });
                        }
                    }

                    setupSidebarToggle() {
                        window.toggleSidebar = () => this.toggleSidebar();
                        window.openSidebar = () => this.openSidebar();
                        window.closeSidebar = () => this.closeSidebar();
                    }

                    toggleSidebar() {
                        if (window.innerWidth <= 1024) {
                            this.sidebar.classList.toggle('open');
                            this.sidebarOverlay.classList.toggle('show');
                            document.body.style.overflow = this.sidebar.classList.contains('open') ? 'hidden' : '';
                        }
                    }

                    openSidebar() {
                        if (window.innerWidth <= 1024) {
                            this.sidebar.classList.add('open');
                            this.sidebarOverlay.classList.add('show');
                            document.body.style.overflow = 'hidden';
                        }
                    }

                    closeSidebar() {
                        this.sidebar.classList.remove('open');
                        this.sidebarOverlay.classList.remove('show');
                        document.body.style.overflow = '';
                    }

                    handleResize() {
                        if (window.innerWidth > 1024) {
                            this.closeSidebar();
                        }
                    }

                    syncProfilePhoto() {
                        const headerProfilePhoto = document.getElementById('profilePhoto');
                        if (headerProfilePhoto && headerProfilePhoto.src) {
                            this.sidebarProfilePhoto.src = headerProfilePhoto.src;
                            this.sidebarProfilePhoto.style.display = 'inline-block';
                            this.sidebarProfileIcon.style.display = 'none';
                        }
                        
                        const headerProfileName = document.querySelector('.profile-button span');
                        if (headerProfileName) {
                            const sidebarProfileName = document.querySelector('.sidebar-profile-name');
                            sidebarProfileName.textContent = headerProfileName.textContent;
                        }
                    }
                }
                
                new SidebarController();
            }
        }
        
        new SidebarManager();
    }
})();