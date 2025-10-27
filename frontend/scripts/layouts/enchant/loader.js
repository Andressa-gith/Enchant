const SiteLoader = {
    created: false,
    minDisplayTime: 1000,
    maxDisplayTime: 20000,
    startTime: 0,
    safetyTimeout: null,

    create() {
        if (this.created) return;

        const loaderHTML = `
        <div id="site-loader" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg,rgb(255, 255, 255) 0%, #fffef8 100%);
            z-index: 99999; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        ">
            <div style="text-align: center; color: #4E3629; font-family: 'Lexend Deca', sans-serif;">
                <!-- Canvas para animação desenhada -->
                <canvas id="loader-canvas" width="200" height="200" style="margin: 0 auto 20px;"></canvas>
                
                <p style="
                    margin: 0; font-size: 14px; color: #8B5A2B;
                    letter-spacing: 2px; text-transform: uppercase;
                ">Carregando<span class="loader-dots"></span></p>
            </div>
        </div>
        `;

        const loaderCSS = `
        <style id="site-loader-styles">
            @keyframes dotPulse {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
            
            .loader-dots::after {
                content: '';
                animation: dotPulse 1.5s steps(1) infinite;
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
        requestAnimationFrame(() => {
            this.startAnimation();
        });
    },

    startAnimation() {
        const canvas = document.getElementById('loader-canvas');
        if (!canvas) {
            setTimeout(() => this.startAnimation(), 10);
            return;
        }

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        let frame = 0;
        const totalFrames = 24;
        const fps = 24;
        const frameDelay = 1000 / fps;

        // Função para desenhar com efeito de traço à mão
        function drawHandDrawnCircle(x, y, radius, startAngle, endAngle, lineWidth, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            const steps = 30;
            for (let i = 0; i <= steps; i++) {
                const angle = startAngle + (endAngle - startAngle) * (i / steps);
                // Adiciona variação aleatória pequena para parecer desenhado à mão
                const wobbleX = (Math.random() - 0.5) * 1.5;
                const wobbleY = (Math.random() - 0.5) * 1.5;
                const r = radius + (Math.random() - 0.5) * 0.8;

                const px = x + Math.cos(angle) * r + wobbleX;
                const py = y + Math.sin(angle) * r + wobbleY;

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }


        // Função para desenhar pontos decorativos
        function drawDots(frame) {
            const dots = [
                { x: centerX, y: centerY - 80, size: 4, delay: 0 },
                { x: centerX + 70, y: centerY - 40, size: 3, delay: 6 },
                { x: centerX + 70, y: centerY + 40, size: 3.5, delay: 12 },
                { x: centerX - 70, y: centerY + 40, size: 3, delay: 18 }
            ];

            dots.forEach(dot => {
                const localFrame = (frame - dot.delay + totalFrames) % totalFrames;
                let opacity = 0;
                let scale = 0;

                if (localFrame < 8) {
                    opacity = localFrame / 8;
                    scale = 0.5 + (localFrame / 8) * 0.5;
                } else if (localFrame < 16) {
                    opacity = 1;
                    scale = 1;
                } else {
                    opacity = 1 - (localFrame - 16) / 8;
                    scale = 1 - (localFrame - 16) / 16;
                }

                ctx.globalAlpha = opacity;
                ctx.fillStyle = '#EC9E07';
                ctx.beginPath();
                ctx.arc(
                    dot.x + (Math.random() - 0.5) * 0.5,
                    dot.y + (Math.random() - 0.5) * 0.5,
                    dot.size * scale,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.globalAlpha = 1;
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Círculo externo tracejado girando
            const outerRotation = (frame / totalFrames) * Math.PI * 2;
            for (let i = 0; i < 12; i++) {
                const startAngle = outerRotation + (i * Math.PI / 6);
                const endAngle = startAngle + Math.PI / 12;
                drawHandDrawnCircle(centerX, centerY, 70, startAngle, endAngle, 3, 'rgba(236, 158, 7, 0.4)');
            }

            // Círculo do meio sendo desenhado
            const progress = frame / totalFrames;
            const middleEndAngle = Math.PI * 2 * progress;
            drawHandDrawnCircle(centerX, centerY, 50, -Math.PI / 2, -Math.PI / 2 + middleEndAngle, 3, '#D4860A');


            frame = (frame + 1) % totalFrames;

            if (document.getElementById('loader-canvas')) {
                setTimeout(() => requestAnimationFrame(animate), frameDelay);
            }
        }

        animate();
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