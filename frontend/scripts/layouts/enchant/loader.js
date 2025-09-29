const SiteLoader = {
    created: false,
    minDisplayTime: 1500,
    maxDisplayTime: 15000,
    pendingResources: new Set(),

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
            this.startTime = Date.now();
            
            // Detectar automaticamente o que precisa carregar
            this.detectResources();
            
            // Timeout de segurança
            this.safetyTimeout = setTimeout(() => {
                console.warn('Loader timeout após', this.maxDisplayTime, 'ms');
                this.hide(true);
            }, this.maxDisplayTime);
        }
    },

    // Detectar recursos que precisam carregar
    detectResources() {
        this.pendingResources.clear();

        // Detectar mapa Leaflet
        if (document.getElementById('mapa')) {
            this.pendingResources.add('map');
            this.waitForMap();
        }

        // Detectar Canvas (Chart.js)
        if (document.querySelector('canvas')) {
            this.pendingResources.add('charts');
            this.waitForCharts();
        }

        // Se não tiver recursos específicos, só aguardar window.load
        if (this.pendingResources.size === 0) {
            this.waitForBasicLoad();
        }
    },

    // Aguardar mapa carregar
    waitForMap() {
        const checkMap = setInterval(() => {
            // Verificar se variáveis globais do mapa existem
            if (window.geojsonLayer && window.dadosDosMunicipios?.size > 0) {
                clearInterval(checkMap);
                this.markResourceLoaded('map');
            }
        }, 200);

        // Timeout específico para mapa
        setTimeout(() => {
            clearInterval(checkMap);
            this.markResourceLoaded('map');
        }, 10000);
    },

    // Aguardar gráficos carregarem
    waitForCharts() {
        const checkCharts = setInterval(() => {
            const canvas = document.querySelector('canvas');
            if (canvas && window.Chart) {
                clearInterval(checkCharts);
                this.markResourceLoaded('charts');
            }
        }, 200);

        setTimeout(() => {
            clearInterval(checkCharts);
            this.markResourceLoaded('charts');
        }, 8000);
    },

    // Aguardar carregamento básico
    waitForBasicLoad() {
        if (document.readyState === 'complete') {
            setTimeout(() => this.hide(), 500);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.hide(), 500);
            }, { once: true });
        }
    },

    // Marcar recurso como carregado
    markResourceLoaded(resource) {
        this.pendingResources.delete(resource);
        console.log(`✅ Recurso carregado: ${resource}, pendentes:`, this.pendingResources.size);
        
        // Se todos recursos carregaram, esconder
        if (this.pendingResources.size === 0) {
            setTimeout(() => this.hide(), 800);
        }
    },

    hide(force = false) {
        const loader = document.getElementById('site-loader');
        if (!loader) return;

        if (this.safetyTimeout) {
            clearTimeout(this.safetyTimeout);
        }

        const elapsed = Date.now() - (this.startTime || 0);
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

// Auto-inicialização
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('auto-loader') || document.getElementById('mapa')) {
            SiteLoader.show();
        }
    });
} else {
    if (document.body && (document.body.classList.contains('auto-loader') || document.getElementById('mapa'))) {
        SiteLoader.show();
    }
}

window.SiteLoader = SiteLoader;