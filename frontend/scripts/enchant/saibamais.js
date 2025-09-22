        // Smooth scroll para os links de navegação
        document.querySelectorAll('.nav-menu .nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Atualizar link ativo
                    document.querySelectorAll('.nav-menu .nav-link').forEach(l => l.classList.remove('active'));
                    this.classList.add('active');

                    // Fechar menu em mobile após clique
                    if (window.innerWidth <= 992) {
                        closeMobileNav();
                    }
                }
            });
        });

        // Destacar seção atual no scroll
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('.section');
            const navLinks = document.querySelectorAll('.nav-menu .nav-link');
            
            let currentSection = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 150;
                const sectionHeight = section.offsetHeight;
                
                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    currentSection = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        });

        // Funcionalidade do menu mobile
        const mobileNavToggle = document.getElementById('mobileNavToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        function openMobileNav() {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
            mobileNavToggle.innerHTML = '<span class="material-symbols-outlined">left_panel_close</span>';
            mobileNavToggle.style.left = '320px';
        }

        function closeMobileNav() {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            mobileNavToggle.innerHTML = '<span class="material-symbols-outlined">left_panel_open</span>';
            mobileNavToggle.style.left = '20px';
        }

        mobileNavToggle.addEventListener('click', () => {
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileNav();
            } else {
                openMobileNav();
            }
        });

        overlay.addEventListener('click', closeMobileNav);

        // Fechar menu ao redimensionar para desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                closeMobileNav();
            }
        });
