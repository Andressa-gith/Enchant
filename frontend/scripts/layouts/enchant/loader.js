const SiteLoader = {
    created: false,

    // Criar o HTML e CSS do loader
    create() {
        if (this.created) return;

        const loaderHTML = `
        <div id="site-loader" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #f8f2e8 0%, #e2ccae 100%);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        ">
            <div style="
                text-align: center;
                color: #4E3629;
                font-family: 'Lexend Deca', sans-serif;
            ">
                <!-- Spinner -->
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(236, 158, 7, 0.3);
                    border-top: 4px solid #EC9E07;
                    border-radius: 50%;
                    animation: loaderSpin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                
                <!-- Logo -->
                <h2 style="
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: 700;
                    color: #4E3629;
                    font-family: 'Passion One', serif;
                ">Enchant</h2>
                
                <p style="
                    margin: 0;
                    font-size: 14px;
                    color: #8B5A2B;
                    opacity: 0.8;
                ">Carregando...</p>
            </div>
        </div>
        `;

        const loaderCSS = `
        <style id="site-loader-styles">
            @keyframes loaderSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .loader-fade-out {
                opacity: 0 !important;
                visibility: hidden !important;
            }
        </style>
        `;

        document.head.insertAdjacentHTML('beforeend', loaderCSS);
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
        this.created = true;
    },

    // Mostrar loading
    show() {
        this.create();
        const loader = document.getElementById('site-loader');
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('loader-fade-out');
            document.body.style.overflow = 'hidden';
        }
    },

    // Esconder loading
    hide() {
        const loader = document.getElementById('site-loader');
        if (loader) {
            loader.classList.add('loader-fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = '';
            }, 500);
        }
    },

    // Auto-hide quando página carregar
    autoHide(delay = 200) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.hide(), delay);
            });
        } else {
            setTimeout(() => this.hide(), delay);
        }
    },

    // Para formulários/AJAX
    showForAction(asyncAction) {
        return new Promise(async (resolve, reject) => {
            this.show();
            try {
                const result = await asyncAction();
                this.hide();
                resolve(result);
            } catch (error) {
                this.hide();
                reject(error);
            }
        });
    }
};

// Auto-inicialização simples
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar loading automaticamente se a classe 'auto-loader' existir no body
    if (document.body.classList.contains('auto-loader')) {
        SiteLoader.show();
        SiteLoader.autoHide();
    }
});

// Tornar global para usar em qualquer lugar
window.SiteLoader = SiteLoader;