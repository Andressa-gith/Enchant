const SiteLoader = {
    created: false,
    minDisplayTime: 1000,
    maxDisplayTime: 20000,
    startTime: 0,
    safetyTimeout: null,

    create() {
        if (this.created) return;

        const frases = [
            "Quase lá...",
            "Só mais um instantinho...",
            "Preparando tudo pra você...",
            "Aguenta firme...",
            "Carregando as coisas boas...",
            "Tá quase, confia..."
        ];
        const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];

        const loaderHTML = `
        <div id="site-loader" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 99999; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        ">
            <div style="text-align: center; color: #4E3629; font-family: 'Lexend Deca', sans-serif;">
                <!-- Bolinha girando -->
                <div style="
                    width: 50px; height: 50px; border: 4px solid rgba(236, 158, 7, 0.3);
                    border-top: 4px solid #EC9E07; border-radius: 50%;
                    animation: loaderSpin 1s linear infinite; margin: 0 auto 20px;
                "></div>
                
                <p style="
                    margin: 20px 0 0 0; font-size: 18px; color: #4E3629;
                    font-weight: 400;
                ">${fraseAleatoria}</p>
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

    show() {
        this.create();
        const loader = document.getElementById('site-loader');
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('loader-fade-out');
            document.body.style.overflow = 'hidden';
            this.startTime = Date.now();

            this.safetyTimeout = setTimeout(() => {
                console.warn(`Loader finalizado por segurança após ${this.maxDisplayTime}ms.`);
                this.hide(true);
            }, this.maxDisplayTime);
        }
    },

    hide(force = false) {
        const loader = document.getElementById('site-loader');
        if (!loader) return;

        if (this.safetyTimeout) {
            clearTimeout(this.safetyTimeout);
        }

        const elapsed = Date.now() - this.startTime;
        const remainingTime = force ? 0 : Math.max(0, this.minDisplayTime - elapsed);

        setTimeout(() => {
            loader.classList.add('loader-fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = '';
            }, 500);
        }, remainingTime);
    }
};

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