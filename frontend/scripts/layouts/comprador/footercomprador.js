/**
 * Trapp Full-Stack Solutions
 * Arquivo: footer-component.js
 * Descrição: Componente isolado do Footer com modais de redes sociais - TOTALMENTE RESPONSIVO
 * Instruções: Adicione <script src="footer-component.js" defer></script> ao seu arquivo HTML.
 */

(function() {
    // Garante que o script só rode após o carregamento completo do DOM.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFooter);
    } else {
        initializeFooter();
    }

    function initializeFooter() {
        /**
         * Classe responsável pela injeção e gerenciamento do Footer
         */
        class FooterManager {
            constructor() {
                this.injectFooterStyles();
                this.injectFooterHTML();
                this.initializeFooterScripts();
            }

            /**
             * Injeta apenas os estilos CSS relacionados ao Footer e Modais
             */
            injectFooterStyles() {
                const css = `
                    /* ===== VARIÁVEIS GLOBAIS ===== */
                    :root {
                        --primary-color: #693B11;
                        --accent-color: #EC9E07;
                        --text-color: #333;
                        --light-bg: #ECECEC;
                        --white: #FFFFFF;
                        --shadow: rgba(180, 180, 180, 0.3);
                        --transition: 0.3s ease;
                    }

                    /* Reset completo para evitar conflitos */
                    html {
                        box-sizing: border-box;
                        overflow-x: hidden;
                    }

                    *, *:before, *:after {
                        box-sizing: inherit;
                    }

                    body {
                        font-family: "Lexend Deca", sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: var(--white);
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }

                    /* Container principal para empurrar o footer para baixo */
                    #trapp-footer-container {
                        margin-top: auto;
                    }

                    /* ===== FOOTER - LARGURA TOTAL DA TELA ===== */
                    .main-footer {
                        background-color: #FCF2E8;
                        width: 100vw;
                        position: relative;
                        left: 50%;
                        right: 50%;
                        margin-left: -50vw;
                        margin-right: -50vw;
                        padding: 30px 0;
                        transition: var(--transition);
                    }

                    .footer-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 40px;
                        flex-wrap: wrap;
                        padding: 0 50px;
                        max-width: none;
                        width: 100%;
                    }

                    .footer-left { 
                        flex: 1;
                        max-width: 400px;
                        min-width: 250px;
                    }

                    .footer-logo-display {
                        background-color: #D3D3D3;
                        border: none;
                        height: 60px;
                        border-radius: 5px;
                        width: 200px;
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        background-size: contain;
                        background-position: center;
                        background-repeat: no-repeat;
                    }

                    .footer-logo-display i {
                        font-size: 1.5rem;
                        color: var(--text-color);
                        pointer-events: none;
                    }

                    .footer-text {
                        font-size: 10px;
                        line-height: 1.5;
                        margin-bottom: 10px;
                        word-wrap: break-word;
                    }

                    .footer-right {
                        display: flex;
                        gap: 40px;
                        margin-top: 20px;
                        flex: 1;
                        justify-content: flex-end;
                    }

                    .footer-column {
                        display: flex;
                        flex-direction: column;
                        min-width: 200px;
                        text-align: center;
                    }

                    .footer-column h3 {
                        font-weight: 400;
                        font-size: 16px;
                        color: #535151;
                        margin-bottom: 10px;
                    }

                    .footer-column a, .footer-column button {
                        color: var(--accent-color);
                        text-decoration: none;
                        font-size: 12px;
                        display: block;
                        margin-bottom: 5px;
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 0;
                        text-align: center;
                        word-wrap: break-word;
                    }

                    .footer-column a:hover, .footer-column button:hover {
                        text-decoration: underline;
                        color: #8B7777;
                    }

                    /* ===== MODAIS SOCIAIS ===== */
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.7);
                        z-index: 1100;
                        display: none;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .modal-overlay.show {
                        display: block;
                        opacity: 1;
                    }

                    .social-modal {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) scale(0.9);
                        background-color: var(--white);
                        width: 500px;
                        max-width: 90vw;
                        border-radius: 40px;
                        box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
                        padding: 30px;
                        z-index: 1101;
                        display: none;
                        opacity: 0;
                        transition: opacity 0.3s ease, transform 0.3s ease;
                    }

                    .social-modal.show {
                        display: block;
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }

                    .modal-header {
                        display: flex;
                        justify-content: flex-end;
                        margin-bottom: 20px;
                    }

                    .modal-close {
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                        color: var(--text-color);
                    }

                    .modal-title {
                        font-size: 20px;
                        margin-bottom: 10px;
                        text-align: left;
                        word-wrap: break-word;
                    }

                    .modal-subtitle {
                        font-size: 14px;
                        color: var(--text-color);
                        margin-bottom: 20px;
                        word-wrap: break-word;
                    }

                    .social-input {
                        width: 100%;
                        height: 45px;
                        border-radius: 15px;
                        border: 1.5px solid #535151;
                        padding: 0 15px;
                        margin-bottom: 20px;
                        outline: none;
                        font-size: 14px;
                    }

                    .modal-buttons {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        flex-wrap: wrap;
                    }

                    .btn-confirm, .btn-edit {
                        background-color: rgba(226, 204, 174, 1);
                        border: none;
                        border-radius: 15px;
                        padding: 10px 20px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }
                    
                    .btn-confirm:hover, .btn-edit:hover {
                         background-color: #d8b894;
                    }
                    
                    .btn-edit { 
                        display: none; 
                    }

                    .social-link {
                        text-align: center;
                        margin: 20px 0;
                        word-wrap: break-word;
                    }

                    .social-link a {
                        color: var(--accent-color);
                        font-size: 16px;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }

                    /* ===== RESPONSIVIDADE COMPLETA ===== */

                    /* Tablets em paisagem e desktops pequenos */
                    @media screen and (max-width: 1200px) {
                        .footer-content {
                            padding: 0 30px;
                            gap: 30px;
                        }
                        
                        .footer-column {
                            min-width: 180px;
                        }
                    }

                    /* Tablets */
                    @media screen and (max-width: 1024px) {
                        .main-footer {
                            padding: 25px 0;
                        }

                        .footer-content {
                            padding: 0 25px;
                            gap: 25px;
                        }
                        
                        .footer-left {
                            max-width: 350px;
                        }
                        
                        .footer-right {
                            gap: 25px;
                        }
                        
                        .footer-column {
                            min-width: 160px;
                        }
                        
                        .footer-column h3 {
                            font-size: 15px;
                        }
                        
                        .footer-column a, .footer-column button {
                            font-size: 11px;
                        }

                        .social-modal {
                            width: 400px;
                            border-radius: 30px;
                            padding: 25px;
                        }
                    }

                    /* Tablets pequenos e celulares grandes em paisagem */
                    @media screen and (max-width: 768px) {
                        .main-footer {
                            padding: 20px 0;
                        }

                        .footer-content {
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            gap: 20px;
                            padding: 0 20px;
                        }
                        
                        .footer-left {
                            max-width: 100%;
                            width: 100%;
                            min-width: auto;
                        }

                        .footer-logo-display {
                            margin: 0 auto 15px auto;
                        }
                        
                        .footer-right {
                            flex-direction: column;
                            gap: 15px;
                            width: 100%;
                            margin-top: 0;
                            justify-content: center;
                        }
                        
                        .footer-column {
                            min-width: auto;
                            width: 100%;
                        }
                        
                        .footer-column h3 {
                            font-size: 14px;
                            margin-bottom: 8px;
                        }
                        
                        .footer-column a, .footer-column button {
                            font-size: 12px;
                            margin-bottom: 3px;
                        }
                        
                        .footer-text {
                            font-size: 9px;
                            margin-bottom: 8px;
                            text-align: center;
                        }

                        .social-modal {
                            width: 350px;
                            border-radius: 25px;
                            padding: 20px;
                        }

                        .modal-title {
                            font-size: 18px;
                        }

                        .modal-subtitle {
                            font-size: 13px;
                        }
                        
                        .social-input {
                            height: 42px;
                            font-size: 13px;
                        }
                    }

                    /* Celulares */
                    @media screen and (max-width: 480px) {
                        .main-footer {
                            padding: 15px 0;
                        }

                        .footer-content {
                            padding: 0 15px;
                            gap: 15px;
                        }

                        .footer-logo-display {
                            width: 160px;
                            height: 50px;
                        }

                        .footer-text {
                            font-size: 8px;
                        }

                        .footer-column h3 {
                            font-size: 13px;
                        }

                        .footer-column a, .footer-column button {
                            font-size: 11px;
                        }

                        .social-modal {
                            width: 300px;
                            padding: 15px;
                            border-radius: 20px;
                        }

                        .modal-title {
                            font-size: 16px;
                        }

                        .modal-subtitle {
                            font-size: 12px;
                        }

                        .social-input {
                            height: 40px;
                            font-size: 12px;
                        }

                        .btn-confirm, .btn-edit {
                            font-size: 12px;
                            padding: 8px 16px;
                        }
                    }

                    /* Celulares muito pequenos */
                    @media screen and (max-width: 360px) {
                        .footer-content {
                            padding: 0 10px;
                        }

                        .footer-logo-display {
                            width: 140px;
                            height: 45px;
                        }

                        .footer-text {
                            font-size: 7px;
                        }

                        .footer-column h3 {
                            font-size: 12px;
                        }

                        .footer-column a, .footer-column button {
                            font-size: 10px;
                        }

                        .social-modal {
                            width: 280px;
                            padding: 12px;
                        }

                        .modal-title {
                            font-size: 14px;
                        }

                        .modal-subtitle {
                            font-size: 11px;
                        }
                    }
                `;
                
                const styleElement = document.createElement('style');
                styleElement.innerHTML = css;

                // Adiciona as fontes necessárias
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

            /**
             * Injeta apenas a estrutura HTML do Footer e Modais
             */
            injectFooterHTML() {
                const footerHTML = `
                    <footer class="main-footer">
                        <div class="footer-content">
                            <div class="footer-left">
                                <div class="footer-logo-display" id="footerLogoDisplay">
                                    <i class="bi bi-image" style="font-size: 1.5rem;"></i>
                                </div>
                                <p class="footer-text">De forma alguma o site foi criado com o intuito de desviar os termos relacionados à política de privacidade do cadastrante. O site está disponível para toda e qualquer ajuda em relação aos contatos.</p>
                                <p class="footer-text">© 2025 ENCHANT Brasil</p>
                            </div>
                            <div class="footer-right">
                                <div class="footer-column">
                                    <h3>MAIS INFORMAÇÕES</h3>
                                    <a href="/src/views/comprador/saibamais2.html">Conheça mais sobre o site</a>
                                </div>
                                <div class="footer-column">
                                    <h3>PROTEÇÃO DE DADOS</h3>
                                    <a href="/src/views/comprador/politica2.html">Política de privacidade</a>
                                </div>
                                <div class="footer-column">
                                    <h3>ACOMPANHE NOSSAS REDES</h3>
                                    <button id="instagramBtn">Instagram</button>
                                    <button id="facebookBtn">Facebook</button>
                                </div>
                            </div>
                        </div>
                    </footer>
                    
                    <!-- Modais de Redes Sociais -->
                    <div class="modal-overlay" id="modalOverlay"></div>
                    
                    <div class="social-modal" id="instagramModal">
                        <div class="modal-header">
                            <button class="modal-close" id="closeInstagramModal">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        </div>
                        <h2 class="modal-title">Insira aqui o Instagram da sua empresa</h2>
                        <p class="modal-subtitle">Aqui você pode inserir o Instagram da sua empresa!</p>
                        <hr>
                        <input type="text" class="social-input" id="instagramInput" placeholder="Digite seu @ ou nome de usuário">
                        <div class="social-link" id="instagramLink"></div>
                        <div class="modal-buttons">
                            <button class="btn-confirm" id="confirmInstagram">Confirmar</button>
                            <button class="btn-edit" id="editInstagram">Editar</button>
                        </div>
                    </div>
                    
                    <div class="social-modal" id="facebookModal">
                        <div class="modal-header">
                            <button class="modal-close" id="closeFacebookModal">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        </div>
                        <h2 class="modal-title">Insira aqui o Facebook da sua empresa</h2>
                        <p class="modal-subtitle">Aqui você pode inserir o Facebook da sua empresa!</p>
                        <hr>
                        <input type="text" class="social-input" id="facebookInput" placeholder="Digite seu @ ou nome de usuário">
                        <div class="social-link" id="facebookLink"></div>
                        <div class="modal-buttons">
                            <button class="btn-confirm" id="confirmFacebook">Confirmar</button>
                            <button class="btn-edit" id="editFacebook">Editar</button>
                        </div>
                    </div>
                `;

                // Cria um container para o footer e injeta o HTML
                const footerContainer = document.createElement('div');
                footerContainer.id = 'trapp-footer-container';
                footerContainer.innerHTML = footerHTML;
                
                // Adiciona o footer no final do body
                document.body.appendChild(footerContainer);
            }

            /**
             * Inicializa apenas os scripts relacionados ao Footer e Modais
             */
            initializeFooterScripts() {
                class FooterController {
                    constructor() {
                        this.modalOverlay = document.getElementById('modalOverlay');
                        
                        this.init();
                    }

                    init() {
                        this.setupLogoSyncSystem();
                        this.setupSocialModals();
                    }

                    setupLogoSyncSystem() {
                        // Sistema global de sincronização de logos
                        window.updateFooterLogo = (imageUrl) => {
                            const footerLogoDisplay = document.getElementById('footerLogoDisplay');
                            if (footerLogoDisplay && imageUrl) {
                                footerLogoDisplay.style.backgroundImage = `url(${imageUrl})`;
                                footerLogoDisplay.querySelector('i').style.display = 'none';
                            }
                        };

                        // Escuta por mudanças de logo de outras partes do sistema
                        window.addEventListener('logoUpdated', (event) => {
                            if (event.detail && event.detail.imageUrl) {
                                window.updateFooterLogo(event.detail.imageUrl);
                            }
                        });
                        
                        // Função para resetar o logo
                        window.resetFooterLogo = () => {
                            const footerLogoDisplay = document.getElementById('footerLogoDisplay');
                            if (footerLogoDisplay) {
                                footerLogoDisplay.style.backgroundImage = '';
                                footerLogoDisplay.querySelector('i').style.display = 'flex';
                            }
                        };
                    }

                    setupSocialModals() {
                        const socialConfigs = [
                            { 
                                platform: 'instagram', 
                                btnId: 'instagramBtn', 
                                modalId: 'instagramModal', 
                                closeId: 'closeInstagramModal', 
                                confirmId: 'confirmInstagram', 
                                editId: 'editInstagram', 
                                inputId: 'instagramInput', 
                                linkId: 'instagramLink' 
                            },
                            { 
                                platform: 'facebook', 
                                btnId: 'facebookBtn', 
                                modalId: 'facebookModal', 
                                closeId: 'closeFacebookModal', 
                                confirmId: 'confirmFacebook', 
                                editId: 'editFacebook', 
                                inputId: 'facebookInput', 
                                linkId: 'facebookLink' 
                            }
                        ];

                        socialConfigs.forEach(config => {
                            const btn = document.getElementById(config.btnId);
                            const modal = document.getElementById(config.modalId);
                            const closeBtn = document.getElementById(config.closeId);
                            const confirmBtn = document.getElementById(config.confirmId);
                            const editBtn = document.getElementById(config.editId);
                            const input = document.getElementById(config.inputId);
                            const linkContainer = document.getElementById(config.linkId);

                            btn.addEventListener('click', () => this.openModal(modal));
                            closeBtn.addEventListener('click', () => this.closeModal(modal));
                            confirmBtn.addEventListener('click', () => this.handleSocialConfirm(config.platform, input, linkContainer, confirmBtn, editBtn, btn));
                            editBtn.addEventListener('click', () => this.handleSocialEdit(config.platform, input, linkContainer, confirmBtn, editBtn));
                        });

                        this.modalOverlay.addEventListener('click', () => this.closeAllModals());
                    }

                    openModal(modal) {
                        this.modalOverlay.classList.add('show');
                        modal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }

                    closeModal(modal) {
                        this.modalOverlay.classList.remove('show');
                        modal.classList.remove('show');
                        document.body.style.overflow = '';
                    }

                    closeAllModals() {
                        document.querySelectorAll('.social-modal').forEach(m => m.classList.remove('show'));
                        this.modalOverlay.classList.remove('show');
                        document.body.style.overflow = '';
                    }

                    handleSocialConfirm(platform, input, linkContainer, confirmBtn, editBtn, mainBtn) {
                        const value = input.value.trim();
                        if (value) {
                            const username = value.replace(/^@/, '');
                            const url = platform === 'instagram' ? 
                                `https://www.instagram.com/${username}` : 
                                `https://www.facebook.com/${username}`;
                            
                            linkContainer.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
                            input.style.display = 'none';
                            confirmBtn.style.display = 'none';
                            editBtn.style.display = 'block';
                            
                            const subtitle = input.closest('.social-modal').querySelector('.modal-subtitle');
                            subtitle.textContent = `Aqui você pode editar o ${platform} da sua empresa!`;
                        } else {
                            alert(`Por favor, insira um nome de usuário válido.`);
                        }
                    }

                    handleSocialEdit(platform, input, linkContainer, confirmBtn, editBtn) {
                        input.style.display = 'block';
                        confirmBtn.style.display = 'block';
                        linkContainer.innerHTML = '';
                        editBtn.style.display = 'none';

                        const subtitle = input.closest('.social-modal').querySelector('.modal-subtitle');
                        subtitle.textContent = `Aqui você pode inserir o ${platform} da sua empresa!`;
                    }
                }
                
                // Inicializa o footer
                new FooterController();
            }
        }
        
        // Inicia o processo de criação do footer
        new FooterManager();
    }
})();