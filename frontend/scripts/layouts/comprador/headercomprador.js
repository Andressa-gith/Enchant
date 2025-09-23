(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHeader);
    } else {
        initializeHeader();
    }

    function initializeHeader() {
        class HeaderManager {
            constructor() {
                this.injectHeaderStyles();
                this.injectHeaderHTML();
                this.initializeHeaderScripts();
            }

            injectHeaderStyles() {
                const css = `
                    :root {
                        --primary-color: #693B11;
                        --accent-color: #EC9E07;
                        --text-color: #333;
                        --light-bg: #ECECEC;
                        --white: #FFFFFF;
                        --shadow: rgba(180, 180, 180, 0.3);
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

                    .main-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: var(--header-height);
                        background-color: var(--white);
                        box-shadow: 0 1px 3px var(--shadow);
                        z-index: 1000;
                        transition: var(--transition);
                    }

                    .header-content {
                        display: flex;
                        align-items: center;
                        height: 100%;
                        padding: 0 1rem;
                        transition: var(--transition);
                    }

                    .sidebar-toggle {
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0.5rem;
                        color: var(--text-color);
                        margin-right: 15px;
                        display: none;
                    }

                    .logo-da-ong {
                        position: relative;
                        background-color: #D3D3D3;
                        border: none;
                        border-radius: 5px;
                        width: 220px;
                        height: 38px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: auto;
                        color: #D3D3D3;
                    }
                    
                    #inicio{
                       color: #D3D3D3;
                       justify-content: center;
                       align-items: center;
                    }

                    .logo-da-ong input {
                        display: none;
                    }

                    .logo-da-ong i {
                        font-size: 1.5rem;
                        color: var(--text-color);
                    }

                    .logo-preview {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-size: contain;
                        background-position: center;
                        background-repeat: no-repeat;
                        border-radius: 5px;
                        display: none;
                    }

                    .remove-logo {
                        position: absolute;
                        top: 2px;
                        right: 2px;
                        background: rgba(255, 255, 255, 0.8);
                        border: none;
                        border-radius: 50%;
                        width: 16px;
                        height: 16px;
                        font-size: 10px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                    }

                    .desktop-nav {
                        display: flex;
                        align-items: center;
                        gap: 2rem;
                        margin-right: 2rem;
                    }

                    .desktop-nav a {
                        color: var(--text-color);
                        text-decoration: none;
                        font-size: 14px;
                        font-weight: 400;
                        transition: color 0.2s;
                    }

                    .right-section {
                        display: flex;
                        align-items: center;
                        margin-left: auto;
                    }

                    .profile-section {
                        position: relative;
                    }

                    .profile-button {
                        background: none;
                        border: none;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        cursor: pointer;
                        font-size: 14px;
                        color: var(--text-color);
                        padding: 0;
                    }

                    .profile-photo {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 2px solid #CCC;
                        display: none;
                    }

                    .profile-icon {
                        font-size: 35px;
                        color: #CCC;
                    }

                    .profile-dropdown {
                        position: absolute;
                        top: 120%;
                        right: 0;
                        background: var(--light-bg);
                        border-radius: 8px;
                        padding: 10px;
                        min-width: 150px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        display: none;
                        z-index: 1001;
                    }
                    
                    .profile-dropdown.show {
                        display: block;
                    }

                    .dropdown-item {
                        display: flex;
                        align-items: center;
                        padding: 8px 15px;
                        text-decoration: none;
                        color: var(--text-color);
                        border-radius: 6px;
                        transition: background-color 0.2s;
                        font-size: 14px;
                    }

                    .dropdown-item:hover {
                        background-color: #e0e0e0;
                        color: var(--text-color);
                    }

                    .dropdown-item i {
                        margin-right: 10px;
                        font-size: 16px;
                    }

                    @media (max-width: 1024px) {
                        .desktop-nav, .right-section { display: none; }
                        .sidebar-toggle { display: block; }
                        
                        .header-content {
                            position: relative;
                            padding: 0 0.5rem;
                            justify-content: flex-start;
                        }
                        
                        .logo-da-ong {
                            position: absolute;
                            left: 50%;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            width: 180px;
                            margin-right: 0;
                        }
                        
                        .main-header { height: 50px; }
                    }

                    @media (max-width: 768px) {
                        .logo-da-ong { width: 130px; }
                        .profile-dropdown { right: -50px; margin-top: 10px; }
                    }

                    body {
                        padding-top: var(--header-height);
                    }

                    @media (max-width: 1024px) {
                        body {
                            padding-top: 50px;
                        }
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

            injectHeaderHTML() {
                const headerHTML = `
                    <header class="main-header">
                        <div class="header-content">
                            <button class="sidebar-toggle" id="sidebarToggle">
                                <i class="bi bi-list"></i>
                            </button>
                            <a href="/src/views/comprador/dashboard.html" id="inicio"><div class="logo-da-ong" id="logoUpload">Inicio-do-site-dashboard</a>
                                <div class="logo-da-ong">
                                </div>
                            </div>
                            <div class="right-section">
                                <nav class="desktop-nav">
                                    <a href="/src/views/comprador/quemsomos2.html">Quem somos?</a>
                                    <a href="/src/views/comprador/saibamais2.html">Saiba mais</a>
                                </nav>
                                <div class="profile-section">
                                    <button class="profile-button" id="profileButton">
                                        <img id="profilePhoto" class="profile-photo" src="" alt="Foto do Usuário">
                                        <i id="profileIcon" class="bi bi-person-circle profile-icon"></i>
                                        <span>Nome do Usuário</span>
                                    </button>
                                    <div class="profile-dropdown" id="profileDropdown">
                                        <a class="dropdown-item" href="/src/views/comprador/perfilcomprador.html"><i class="bi bi-person"></i> Perfil</a>
                                        <a class="dropdown-item" href="/src/views/comprador/telainicialparaocomprador.html"><i class="bi bi-box-arrow-right"></i> Sair</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                `;

                const headerContainer = document.createElement('div');
                headerContainer.id = 'trapp-header-container';
                headerContainer.innerHTML = headerHTML;
                
                document.body.insertBefore(headerContainer, document.body.firstChild);
            }

            initializeHeaderScripts() {
                class HeaderNavigation {
                    constructor() {
                        this.sidebarToggle = document.getElementById('sidebarToggle');
                        this.profileButton = document.getElementById('profileButton');
                        this.profileDropdown = document.getElementById('profileDropdown');
                        
                        this.init();
                    }

                    init() {
                        this.bindEvents();
                        this.setupImageUploads();
                        this.setupProfilePhoto();
                    }

                    bindEvents() {
                        this.sidebarToggle.addEventListener('click', () => {
                            if (typeof toggleSidebar === 'function') {
                                toggleSidebar();
                            }
                        });
                        
                        this.profileButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.toggleProfileDropdown();
                        });
                        
                        document.addEventListener('click', (e) => {
                            if (!this.profileButton.contains(e.target) && !this.profileDropdown.contains(e.target)) {
                                this.profileDropdown.classList.remove('show');
                            }
                        });
                    }

                    toggleProfileDropdown() {
                        this.profileDropdown.classList.toggle('show');
                    }

                    setupImageUploads() {
                        const logoInput = document.getElementById('logoInput');
                        const logoPreview = document.getElementById('logoPreview');
                        const removeLogo = document.getElementById('removeLogo');

                        if (logoInput && logoPreview && removeLogo) {
                            logoInput.addEventListener('change', (e) => this.handleImageUpload(e.target, logoPreview));
                            removeLogo.addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.removeImage(logoInput, logoPreview);
                            });
                        }
                    }

                    handleImageUpload(input, preview) {
                        if (input.files && input.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                preview.style.backgroundImage = `url(${e.target.result})`;
                                preview.style.display = 'block';
                                preview.parentElement.querySelector('i').style.display = 'none';
                            };
                            reader.readAsDataURL(input.files[0]);
                        }
                    }

                    removeImage(input, preview) {
                        input.value = '';
                        preview.style.display = 'none';
                        preview.style.backgroundImage = '';
                        preview.parentElement.querySelector('i').style.display = 'block';
                    }

                    setupProfilePhoto() {
                        const profileIcon = document.getElementById('profileIcon');
                        const profilePhoto = document.getElementById('profilePhoto');

                        const profilePhotoInput = document.createElement('input');
                        profilePhotoInput.type = 'file';
                        profilePhotoInput.accept = 'image/*';
                        profilePhotoInput.style.display = 'none';
                        document.body.appendChild(profilePhotoInput);

                        if (profileIcon) {
                            profileIcon.addEventListener('click', (e) => {
                                e.stopPropagation();
                                profilePhotoInput.click();
                            });
                        }

                        profilePhotoInput.addEventListener('change', function() {
                            if (this.files && this.files[0]) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    const imageUrl = e.target.result;
                                    if (profilePhoto) {
                                        profilePhoto.src = imageUrl;
                                        profilePhoto.style.display = 'inline-block';
                                    }
                                    if (profileIcon) profileIcon.style.display = 'none';
                                    
                                    const sidebarProfilePhoto = document.getElementById('sidebarProfilePhoto');
                                    const sidebarProfileIcon = document.getElementById('sidebarProfileIcon');
                                    if (sidebarProfilePhoto) {
                                        sidebarProfilePhoto.src = imageUrl;
                                        sidebarProfilePhoto.style.display = 'inline-block';
                                    }
                                    if (sidebarProfileIcon) {
                                        sidebarProfileIcon.style.display = 'none';
                                    }
                                };
                                reader.readAsDataURL(this.files[0]);
                            }
                        });
                    }
                }
                
                new HeaderNavigation();
            }
        }
        
        new HeaderManager();
    }
})();