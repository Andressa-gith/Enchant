const SiteLoader = {
    created: false,
    minDisplayTime: 1000, // Tempo mínimo de exibição para evitar "piscadas"
    maxDisplayTime: 20000, // Timeout de segurança para evitar que fique travado
    startTime: 0,
    safetyTimeout: null,

    create() {
        if (this.created) return;

        const loaderHTML = `
        <div id="site-loader" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #ecececff 0%, #ffffffff 100%);
            z-index: 99999; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        ">
            <div style="text-align: center; color: #4E3629; font-family: 'Lexend Deca', sans-serif;">
                <div style="
                    width: 50px; height: 50px; border: 4px solid rgba(236, 158, 7, 0.3);
                    border-top: 4px solid #EC9E07; border-radius: 50%;
                    animation: loaderSpin 1s linear infinite; margin: 0 auto 20px;
                "></div>
                <h2 style="
                    margin: 0 0 10px 0; font-size: 28px; font-weight: 700;
                    color: #4E3629; font-family: 'Passion One', serif;
                ">Enchant</h2>
                <p style="
                    margin: 0; font-size: 14px; color: #8B5A2B; opacity: 0.8;
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

    /**
     * Apenas mostra o loader e ativa um timer de segurança.
     * Não tenta mais detectar nada.
     */
    show() {
        this.create();
        const loader = document.getElementById('site-loader');
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('loader-fade-out');
            document.body.style.overflow = 'hidden';
            this.startTime = Date.now();
            
            // Timeout de segurança caso o hide() nunca seja chamado
            this.safetyTimeout = setTimeout(() => {
                console.warn(`Loader finalizado por segurança após ${this.maxDisplayTime}ms.`);
                this.hide(true); // O 'true' força o hide imediato
            }, this.maxDisplayTime);
        }
    },

    /**
     * Esconde o loader. Esta função deve ser chamada manualmente pelo JS da sua página.
     */
    hide(force = false) {
        const loader = document.getElementById('site-loader');
        if (!loader) return;

        // Limpa o timeout de segurança
        if (this.safetyTimeout) {
            clearTimeout(this.safetyTimeout);
        }

        const elapsed = Date.now() - this.startTime;
        const remainingTime = force ? 0 : Math.max(0, this.minDisplayTime - elapsed);

        setTimeout(() => {
            loader.classList.add('loader-fade-out');
            // Aguarda a transição de fade-out terminar antes de remover
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = '';
            }, 500); // 500ms é a duração da transição CSS
        }, remainingTime);
    }
};

// Auto-inicialização (não precisa mexer aqui)
function initLoader() {
    if (document.body && (document.body.classList.contains('auto-loader') || document.getElementById('mapa'))) {
        SiteLoader.show();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoader);
} else {
    initLoader();
}

window.SiteLoader = SiteLoader;