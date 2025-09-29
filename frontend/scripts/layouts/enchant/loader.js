const SiteLoader = {
    created: false,
    minDisplayTime: 1500,

    create() {
        if (this.created) return;

        const loaderHTML = `
        <div id="site-loader" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #ecececff 0%, #ffffffff 100%);
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
            this.startTime = Date.now(); // Marcar quando começou
        }
    },

    // Esconder loading (com tempo mínimo)
    hide(force = false) {
        const loader = document.getElementById('site-loader');
        if (!loader) return;

        const elapsed = Date.now() - (this.startTime || 0);
        const remainingTime = force ? 0 : Math.max(0, this.minDisplayTime - elapsed);

        setTimeout(() => {
            loader.classList.add('loader-fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = '';
            }, 500);
        }, remainingTime);
    },

    // Aguardar que tudo carregue REALMENTE
    waitForRealLoad() {
        return new Promise((resolve) => {
            // Aguardar múltiplos eventos
            let loadedCount = 0;
            const requiredLoads = 3;

            const checkLoaded = () => {
                loadedCount++;
                if (loadedCount >= requiredLoads) {
                    resolve();
                }
            };

            // 1. DOM completamente carregado
            if (document.readyState === 'complete') {
                checkLoaded();
            } else {
                window.addEventListener('load', checkLoaded, { once: true });
            }

            // 2. Aguardar fontes carregarem
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(checkLoaded);
            } else {
                setTimeout(checkLoaded, 500); // Fallback para navegadores antigos
            }

            // 3. Aguardar um tempo adicional para recursos assíncronos
            setTimeout(checkLoaded, 800);
        });
    },

    // Auto-hide melhorado para produção
    async autoHide(extraDelay = 0) {
        try {
            await this.waitForRealLoad();
            setTimeout(() => this.hide(), extraDelay);
        } catch (error) {
            console.warn('Erro no carregamento, escondendo loader anyway:', error);
            setTimeout(() => this.hide(true), 2000); // Force hide após 2s
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

// Auto-inicialização melhorada para produção
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('auto-loader')) {
            SiteLoader.show();
            SiteLoader.autoHide(200); // 200ms extra delay
        }
    });
} else {
    // Se DOM já carregou, verificar imediatamente
    if (document.body && document.body.classList.contains('auto-loader')) {
        SiteLoader.show();
        SiteLoader.autoHide(200);
    }
}

// Tornar global
window.SiteLoader = SiteLoader;