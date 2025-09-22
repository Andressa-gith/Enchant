// CSS do Footer
    const footerCSS = `
        footer {
            background-color: #fcf2e8;
            font-family: "Lexend Deca", sans-serif;
            width: 100%;
            padding: 2rem 1rem;
        }

        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .footer-left {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .footer-logo {
            width: 180px;
            height: auto;
            margin-bottom: 1rem;
        }

        .footer-left p {
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            text-align: justify;
            margin-bottom: 1rem;
            max-width: 100%;
        }

        .copyright {
            font-size: 10px;
            color: #666;
            margin-top: 0.5rem;
        }

        .footer-right {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .footer-column {
            text-align: left;
        }

        .footer-column h3 {
            font-weight: 400;
            font-size: 13px;
            color: #535151;
            margin-bottom: 0.8rem;
            text-transform: uppercase;
        }

        .footer-column a {
            color: #EC9E07;
            text-decoration: none;
            font-size: 12px;
            display: block;
            margin-bottom: 0.3rem;
            transition: color 0.3s ease;
        }

        .footer-column a:hover {
            text-decoration: underline;
            color: #8B7777;
        }

        /* Tablets - 768px+ */
        @media (min-width: 768px) {
            footer {
                padding: 2rem 2rem;
            }

            .footer-container {
                flex-direction: row;
                justify-content: space-between;
                align-items: flex-start;
                gap: 2rem;
            }

            .footer-left {
                flex: 0 0 45%;
                max-width: 400px;
            }

            .footer-logo {
                width: 180px;
            }

            .footer-right {
                flex: 0 0 50%;
                flex-direction: row;
                justify-content: space-between;
                gap: 1rem;
                min-width: 0;
            }

            .footer-column {
                flex: 1;
                min-width: 120px;
            }

            .footer-column h3 {
                font-size: 12px;
                margin-bottom: 0.7rem;
            }

            .footer-column a {
                font-size: 11px;
            }
        }

        /* Desktop médio - 1024px+ */
        @media (min-width: 1024px) {
            footer {
                padding: 2.5rem 3rem;
            }

            .footer-container {
                gap: 3rem;
            }

            .footer-left {
                flex: 0 0 40%;
            }

            .footer-logo {
                width: 200px;
            }

            .footer-left p {
                font-size: 13px;
            }

            .footer-right {
                flex: 0 0 55%;
                gap: 1.5rem;
            }

            .footer-column {
                min-width: 150px;
            }

            .footer-column h3 {
                font-size: 13px;
                margin-bottom: 0.8rem;
            }

            .footer-column a {
                font-size: 12px;
            }
        }

        /* Ajuste específico para 1280x800 */
        @media (min-width: 1200px) and (max-width: 1366px) {
            footer {
                padding: 2rem 2.5rem;
            }

            .footer-container {
                max-width: 1150px;
                gap: 2.5rem;
            }

            .footer-left {
                flex: 0 0 38%;
                max-width: 380px;
            }

            .footer-logo {
                width: 190px;
                margin-bottom: 1rem;
            }

            .footer-left p {
                font-size: 12px;
                line-height: 1.5;
            }

            .footer-right {
                flex: 0 0 58%;
                gap: 1.2rem;
            }

            .footer-column {
                min-width: 140px;
            }

            .footer-column h3 {
                font-size: 12px;
                margin-bottom: 0.7rem;
            }

            .footer-column a {
                font-size: 11px;
                margin-bottom: 0.25rem;
            }

            .copyright {
                font-size: 10px;
                margin-top: 0.8rem;
            }
        }

        /* Desktop grande - 1400px+ */
        @media (min-width: 1400px) {
            footer {
                padding: 3rem 4rem;
            }

            .footer-container {
                max-width: 1300px;
                gap: 5rem;
            }

            .footer-logo {
                width: 220px;
            }

            .footer-left p {
                font-size: 14px;
            }

            .footer-right {
                gap: 3rem;
            }

            .footer-column {
                min-width: 200px;
            }
        }

        /* Mobile pequeno - ajustes finos */
        @media (max-width: 480px) {
            footer {
                padding: 1.5rem 1rem;
            }

            .footer-container {
                gap: 1.5rem;
            }

            .footer-logo {
                width: 160px;
            }

            .footer-left p {
                font-size: 11px;
            }

            .footer-column h3 {
                font-size: 12px;
                margin-bottom: 0.6rem;
            }

            .footer-column a {
                font-size: 11px;
            }
        }

        /* Mobile muito pequeno */
        @media (max-width: 320px) {
            .footer-logo {
                width: 140px;
            }

            .footer-left p {
                font-size: 10px;
            }

            .copyright {
                font-size: 9px;
            }
        }
    `;// enchant-footer.js - Footer Responsivo Completo
(function() {
    'use strict';

    // CSS do Footer
    const footerCSS = `
        footer {
            background-color: #fcf2e8;
            padding: 20px 50px;
            font-family: "Lexend Deca", sans-serif;
        }

        .footer-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: flex-start;
            gap: 40px;
        }

        .footer-left {
            max-width: 400px;
            font-size: 12px;
            height: 180px;
        }

        .footer-left p {
            font-size: 10px;
        }

        .footer-left img {
            width: 200px;
            height: auto;
        }



        .footer-logo {
            margin-bottom: 10px;
        }

        .footer-right {
            display: flex;
            gap: 40px;
            margin-top: 20px;
        }

        .footer-column {
            flex: 2;
            min-width: 200px;
            text-align: center;
        }

        .footer-column h3 {
            font-weight: 400;
            font-size: 14px;
            color: #535151;
            margin-bottom: 10px;
        }

        .footer-column a {
            color: #EC9E07;
            text-decoration: none;
            font-size: 12px;
            display: block;
            margin-bottom: 5px;
        }

        .footer-column a:hover {
            text-decoration: underline;
            color: #8B7777;
        }

        /* Mobile - até 798px */
        @media (max-width: 798px) {
            footer {
                padding: 20px 30px;
            }

            .footer-container {
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 5px;
            }

            .footer-left {
                max-width: 100%;
            }

            .copyright {
                margin-bottom: 20px;
            }

            .footer-logo {
                height: 50px;
            }

            .footer-right {
                flex-direction: column;
                gap: 20px;
                width: 100%;
            }

            .footer-column {
                min-width: auto;
            }

            .footer-column h3 {
                font-weight: 400;
                font-size: 12px;
                color: #535151;
                margin-bottom: 10px;
            }

            .footer-column a {
                color: #EC9E07;
                text-decoration: none;
                font-size: 10px;
                display: block;
                margin-bottom: 5px;
            }
        }

        /* Desktop médio - 799px a 1023px */
        @media (min-width: 799px) and (max-width: 1023px) {
            footer {
                padding: 20px 50px;
                font-family: "Lexend Deca", sans-serif;
            }

            .footer-container {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: flex-start;
                gap: 40px;
            }

            .footer-left {
                max-width: 280px;
            }

            .footer-left p {
                font-size: 10px;
            }

            .footer-logo {
                height: 50px;
                margin-bottom: 10px;
            }

            .footer-right {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .footer-column {
                flex: 2;
                min-width: 100px;
                text-align: center;
            }

            .footer-column h3 {
                font-weight: 400;
                font-size: 10px;
                color: #535151;
                margin-bottom: 10px;
            }

            .footer-column a {
                color: #EC9E07;
                text-decoration: none;
                font-size: 8px;
                display: block;
                margin-bottom: 5px;
            }

            .footer-column a:hover {
                text-decoration: underline;
            }
        }

        /* Desktop - 1024px a 1499px */
        @media (min-width: 1024px) and (max-width: 1499px) {
            footer {
                padding: 20px 50px;
                font-family: "Lexend Deca", sans-serif;
            }

            .footer-container {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: flex-start;
                gap: 40px;
            }

            .footer-left {
                max-width: 400px;
                font-size: 12px;
            }

            .footer-logo {
                height: 60px;
                margin-bottom: 20px;
            }

            .footer-right {
                display: flex;
                gap: 20px;
                margin-top: 20px;
            }

            .footer-column {
                flex: 2;
                min-width: 200px;
                text-align: center;
            }

            .footer-column h3 {
                font-weight: 400;
                font-size: 14px;
                color: #535151;
                margin-bottom: 10px;
            }

            .footer-column a {
                color: #EC9E07;
                text-decoration: none;
                font-size: 12px;
                margin-bottom: 5px;
            }

            .footer-column a:hover {
                text-decoration: underline;
            }


        }

        /* Desktop grande - 1500px e acima */
        @media (min-width: 1500px) {
            footer {
                padding: 20px 50px;
                font-family: "Lexend Deca", sans-serif;
            }

            .footer-container {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: flex-start;
                gap: 40px;
            }

            .footer-left {
                max-width: 400px;
                font-size: 12px;
            }

            .footer-logo {
                height: 70px;
                margin-bottom: 10px;
            }

            .footer-right {
                display: flex;
                gap: 20px;
                margin-top: 20px;
            }

            .footer-column {
                flex: 2;
                min-width: 200px;
                text-align: center;
            }

            .footer-column h3 {
                font-weight: 400;
                font-size: 14px;
                color: #535151;
                margin-bottom: 10px;
            }

            .footer-column a {
                color: #EC9E07;
                text-decoration: none;
                font-size: 12px;
                margin-bottom: 5px;
            }

            .footer-column a:hover {
                text-decoration: underline;
            }
        }
    `;

    // HTML do Footer
    const footerHTML = `
        <footer>
            <div class="footer-container">
                <div class="footer-left">
                    <img src="/assets/imgs/enchant/logo-enchant.png" 
                            alt="Logo Enchant" 
                            class="footer-logo" 
                            title="Logo-Enchant" />
                    <p>
                        De forma alguma o ENCHANT foi criado com o intuito de desviar os
                        termos relacionados à política de privacidade do cadastrante. O site
                        está disponível para toda e qualquer ajuda em relação aos contatos.
                        O site que aqui explica não aceita qualquer violência verbal, sendo
                        contra toda e qualquer atividade agressiva.
                    </p>
                    <p class="copyright">© 2025 ENCHANT Brasil</p>
                </div>
                <div class="footer-right">
                    <div class="footer-column">
                        <h3>MAIS INFORMAÇÕES</h3>
                        <a href="/saiba-mais" title="Conheça mais sobre o ENCHANT - clique">
                            Conheça mais sobre o ENCHANT
                        </a>
                    </div>
                    <div class="footer-column" title="PROTEÇÃO DE DADOS - clique">
                        <h3>PROTEÇÃO DE DADOS</h3>
                        <a href="/politica">Política de privacidade</a>
                    </div>
                    <div class="footer-column" title="ACOMPANHE NOSSAS REDES - clique">
                        <h3>ACOMPANHE NOSSAS REDES</h3>
                        <a href="https://www.instagram.com/enchant_pa?igsh=MXE5MTZqendmdDJheQ%3D%3D&utm_source=qr" 
                            target="_blank">
                            Instagram - enchant_pa
                        </a>
                        <a href="https://www.linkedin.com/in/enchant-pa-4a5079358?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" 
                            target="_blank">
                            LinkedIn - enchant_pa
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    `;

    // Classe principal do Footer
    class EnchantFooter {
        constructor(options = {}) {
            this.containerId = options.containerId || 'enchant-footer';
            this.autoInject = options.autoInject !== false;
            this.loadGoogleFonts = options.loadGoogleFonts !== false;
            
            if (this.autoInject) {
                this.init();
            }
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.render());
            } else {
                this.render();
            }
        }

        injectCSS() {
            // Verifica se o CSS já foi injetado
            if (document.getElementById('enchant-footer-styles')) {
                return;
            }

            const style = document.createElement('style');
            style.id = 'enchant-footer-styles';
            style.textContent = footerCSS;
            document.head.appendChild(style);
        }

        loadFonts() {
            if (!this.loadGoogleFonts || document.getElementById('enchant-footer-fonts')) {
                return;
            }

            const link = document.createElement('link');
            link.id = 'enchant-footer-fonts';
            link.href = 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;500&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        render() {
            // Carrega fonts e CSS
            this.loadFonts();
            this.injectCSS();

            // Encontra ou cria o container
            let container = document.getElementById(this.containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = this.containerId;
                document.body.appendChild(container);
            }

            // Injeta o HTML
            container.innerHTML = footerHTML;

            // Setup dos event listeners
            this.setupEventListeners(container);

            // Atualiza copyright com ano atual
            this.updateCopyright(container);
        }

        setupEventListeners(container) {
            // Smooth scroll para links internos
            const internalLinks = container.querySelectorAll('a[href^="#"], a[href$=".html"]:not([target="_blank"])');
            internalLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href.startsWith('#')) {
                        e.preventDefault();
                        const targetElement = document.querySelector(href);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });
            });

            // Analytics para links externos
            const externalLinks = container.querySelectorAll('a[target="_blank"]');
            externalLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'click', {
                            'event_category': 'footer',
                            'event_label': link.href
                        });
                    }
                    console.log('Footer: Link externo acessado -', link.href);
                });
            });
        }

        updateCopyright(container) {
            const currentYear = new Date().getFullYear();
            const copyrightElement = container.querySelector('.copyright');
            if (copyrightElement) {
                copyrightElement.textContent = `© ${currentYear} ENCHANT Brasil`;
            }
        }

        // Método para adicionar nova coluna
        addColumn(title, links, container = null) {
            if (!container) {
                container = document.getElementById(this.containerId);
            }
            
            const footerRight = container.querySelector('.footer-right');
            if (!footerRight) return;

            const newColumn = document.createElement('div');
            newColumn.className = 'footer-column';
            
            let columnHTML = `<h3>${title}</h3>`;
            links.forEach(link => {
                const target = link.external ? 'target="_blank"' : '';
                const title = link.title ? `title="${link.title}"` : '';
                columnHTML += `<a href="${link.url}" ${target} ${title}>${link.text}</a>`;
            });
            
            newColumn.innerHTML = columnHTML;
            footerRight.appendChild(newColumn);
            this.setupEventListeners(container);
        }

        // Método para atualizar links
        updateLinks(columnTitle, newLinks) {
            const container = document.getElementById(this.containerId);
            const columns = container.querySelectorAll('.footer-column');
            
            columns.forEach(column => {
                const h3 = column.querySelector('h3');
                if (h3 && h3.textContent === columnTitle) {
                    // Remove links antigos
                    const oldLinks = column.querySelectorAll('a');
                    oldLinks.forEach(link => link.remove());
                    
                    // Adiciona novos links
                    newLinks.forEach(link => {
                        const a = document.createElement('a');
                        a.href = link.url;
                        a.textContent = link.text;
                        if (link.external) a.target = '_blank';
                        if (link.title) a.title = link.title;
                        column.appendChild(a);
                    });
                }
            });
            
            this.setupEventListeners(container);
        }
    }

    // Função de inicialização global
    window.initEnchantFooter = function(options = {}) {
        return new EnchantFooter(options);
    };

    // Auto-inicialização se houver elemento com ID específico
    function autoInit() {
        const autoContainer = document.getElementById('enchant-footer') || 
                             document.getElementById('footer-container') ||
                             document.querySelector('[data-enchant-footer]');
        
        if (autoContainer) {
            new EnchantFooter({ 
                containerId: autoContainer.id || 'enchant-footer',
                autoInject: true 
            });
        }
    }

    // Inicialização automática quando DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Disponibiliza a classe globalmente
    window.EnchantFooter = EnchantFooter;

})();
