// header.js
class HeaderComponent {
  constructor() {
    this.headerHTML = `
      <header>
        <nav id="fixado" class="navbar navbar-expand-lg navbar-light bg-light">
          <!-- Adicionando a imagem à esquerda da navbar -->
          <a class="navbar-brand" href="/">
            <img src="/assets/imgs/enchant/logo-enchant.png" width="120" height="auto" alt="Logo" class="img" />
          </a>
          <button id="icone" class="navbar-toggler" type="button" data-toggle="collapse"
            data-target="#conteudoNavbarSuportado" aria-controls="conteudoNavbarSuportado" aria-expanded="false"
            aria-label="Alterna navegação">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="conteudoNavbarSuportado">
            <ul class="navbar-nav menu-lateral">
              <li class="nav-item">
                <a id="quem" class="nav-link" href="/quem-somos" title="Quem somos">Quem somos?</a>
              </li>
              <li class="nav-item">
                <a id="saiba" class="nav-link" href="/saiba-mais" title="Saiba mais">Saiba mais</a>
              </li>
              <li class="nav-item">
                <a id="suporte-header" class="nav-link" href="/suporte" title="Suporte">Suporte</a>
              </li>
              <li class="nav-item">
                <a id="entrar" class="nav-link" href="/entrar" title="Entrar">Entrar</a>
              </li>
            </ul>
            <!-- O botão permanece inalterado -->
              <a href="/#plans">
              <button class="btn btn-brown" type="button" id="doeagora">
                Junte-se a nós
              </button>
            </a>
          </div>
        </nav>
      </header>
    `;

    this.headerCSS = `
      @import url("https://fonts.googleapis.com/css2?family=Passion+One:wght@400;700;900&display=swap");
      @import url("https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap");

      * {
        margin: 0;
        padding: 0;
        font-family: "Lexend Deca", sans-serif;
      }

      #fixado {
        position: fixed;
        width: 100%;
        z-index: 1000;
        top: 0;
        left: 0;
        padding-left: 16px;
        padding-right: 16px;
      }

      .navbar-nav {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        font-size: 16px !important;
        gap: 0.5rem;
        margin-left: 20px;
      }

      .menu-lateral {
        justify-content: flex-start;
        text-align: left;
      }

      .img {
        margin-top: -0.6rem;
        margin-left: 1rem;
      }

      #dona1,
      #doap,
      #doain {
        font-size: 14px;
      }

      #conteudoNavbarSuportado {
        text-align: left;
      }

      .nav-centralizada {
        gap: 1px;
        display: flex;
        justify-content: flex-start;
      }

      .nav-item {
        margin: 0 5px;
      }

      #icone {
        border: none;
        outline: none;
        position: relative;
        text-decoratin:none;
      }

      #icone:focus {
        box-shadow: none;
        outline: none;
      }

      /* ANIMAÇÃO DO TOGGLER HAMBÚRGUER */
      .navbar-toggler-icon {
        background-image: none !important;
        position: relative;
        width: 20px;
        height: 2px;
        background-color: #333;
        transition: all 0.3s ease;
        transform-origin: center;
      }

      .navbar-toggler-icon::before,
      .navbar-toggler-icon::after {
        content: '';
        position: absolute;
        left: 0;
        width: 20px;
        height: 2px;
        background-color: #333;
        transition: all 0.3s ease;
        transform-origin: center;
      }

      .navbar-toggler-icon::before {
        top: -6px;
      }

      .nav-link{
        font-size: 14px !important;
      }

      .navbar-toggler-icon::after {
        bottom: -6px;
      }

      /* Estado ativo - transforma em X */
      #icone.active .navbar-toggler-icon {
        background-color: transparent;
      }

      #icone.active .navbar-toggler-icon::before {
        top: 0;
        transform: rotate(45deg);
      }

      #icone.active .navbar-toggler-icon::after {
        bottom: 0;
        transform: rotate(-45deg);
      }

      /* Animação suave do botão inteiro */
      #icone:hover {
        transform: scale(1.05);
      }

      #icone:active {
        transform: scale(0.95);
      }

      .btn-brown,
      #doeagora {
        background-color: rgba(226, 204, 174, 1);
        border-color: rgba(226, 204, 174, 1);
        color: #4E3629;
        font-weight: 700;
        font-family: "Lexend Deca";
      }

      #doeagora {
        font-size: 16px;
        width: 9rem;
        margin-right: 2rem;
        border: none;
      }

      #doeagora:hover {
        background-color: #caae8d;
        color: #3d2106;
        transition: .2s;
      }

      #doeagora:focus {
        text-decoration: none;
      }

      /* ANIMAÇÃO APENAS PARA MOBILE - telas menores que 992px */
      @media (max-width: 991px) {
        .navbar-collapse {
          transition: max-height 1.5s ease-out, padding 1.5s ease-out;
          max-height: 0;
          overflow: hidden;
          padding-top: 0;
          padding-bottom: 0;
        }

        .navbar-collapse.show {
          max-height: 300px;
          padding-top: 10px;
          padding-bottom: 10px;
        }

        .navbar-collapse.collapsing {
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
          transition: max-height 1.5s ease-out, padding 1.5s ease-out;
        }
      }

      /* COMPORTAMENTO NORMAL PARA DESKTOP - telas maiores que 991px */
      @media (min-width: 992px) {
        .navbar-collapse {
          display: flex !important;
          flex-basis: auto;
          max-height: none;
          overflow: visible;
          padding: 0;
          opacity: 1;
          transition: none;
        }

        .navbar-collapse.show,
        .navbar-collapse.collapsing {
          display: flex !important;
          max-height: none;
          overflow: visible;
          padding: 0;
          transition: none;
        }
      }

      /* Remover animações dos itens - deixar simples */
      .navbar-collapse .nav-item,
      .navbar-collapse .btn-brown {
        opacity: 1;
        transform: none;
        transition: none;
      }

      /* RESPONSIVIDADE PARA HEADER */
      @media (min-width: 1000px) {
        .navbar-nav {
          margin-left: 20px;
          margin-right: auto;
        }
      }

      @media (max-width: 1024px) {
        .mr-auto {
          border: none;
        }
      }

      /* Corrigido para não interferir com o comportamento do Bootstrap */
      @media (max-width: 991px) {
        .navbar-brand {
          margin-right: 0;
        }

        .navbar-toggler {
          margin-right: 15px;
        }

        /* Remove o alinhamento centralizado em telas menores */
        #conteudoNavbarSuportado {
          text-align: left !important;
        }

        .navbar-collapse.show .navbar-nav,
        .navbar-collapse.collapsing .navbar-nav {
          flex-direction: column;
          align-items: flex-start;
          margin-left: 0;
          margin-right: 0;
          width: 100%;
        }

        .nav-centralizada {
          display: block;
          width: 100%;
          text-align: left;
          justify-content: flex-start;
        }

        .btn-brown {
          margin: 10px 0;
          justify-content: flex-start;
          display: block;
          margin-right: auto;
        }

        /* Garante que os itens de dropdown também fiquem alinhados à esquerda */
        .dropdown-menu {
          text-align: left;
          padding-left: 15px;
        }
      }

      @media (max-width: 768px) {
        .btn-brown {
          width: auto;
          padding: 5px 15px;
          font-size: 16px;
        }

        .img {
          margin-left: 0;
        }
      }
    `;
  }

  // Método para inserir o CSS no head da página
  injectCSS() {
    const existingStyle = document.getElementById('header-styles');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'header-styles';
      style.textContent = this.headerCSS;
      document.head.appendChild(style);
    }
  }

  // Método para inserir o header em um elemento específico
  render(targetElementId) {
    this.injectCSS();
    const targetElement = document.getElementById(targetElementId);
    if (targetElement) {
      targetElement.innerHTML = this.headerHTML;
      // Aguarda um pouco para garantir que o DOM foi atualizado
      setTimeout(() => {
        this.initializeEventListeners();
        this.initializeBootstrapToggler();
      }, 100);
    } else {
      console.error(`Elemento com ID "${targetElementId}" não encontrado.`);
    }
  }

  // Método para inserir o header no início do body
  renderAtTop() {
    document.addEventListener('DOMContentLoaded', () => {
      this.injectCSS();
      const headerContainer = document.createElement('section');
      headerContainer.innerHTML = this.headerHTML;
      document.body.insertBefore(headerContainer, document.body.firstChild);
      // Aguarda um pouco para garantir que o DOM foi atualizado
      setTimeout(() => {
        this.initializeEventListeners();
        this.initializeBootstrapToggler();
      }, 100);
    });
  }

  // Método para inicializar o comportamento do toggler manualmente
  initializeBootstrapToggler() {
    const toggler = document.getElementById('icone');
    const target = document.getElementById('conteudoNavbarSuportado');
    
    if (toggler && target) {
      // Evento principal do toggler - ABRE e FECHA o menu APENAS EM MOBILE
      toggler.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Só aplica animação em telas mobile
        if (window.innerWidth <= 991) {
          const isCurrentlyOpen = target.classList.contains('show');
          
          if (isCurrentlyOpen) {
            this.closeMenu(toggler, target);
          } else {
            this.openMenu(toggler, target);
          }
        }
      });

      // Fechar menu ao clicar nos links (comportamento mobile)
      const navLinks = target.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 991 && target.classList.contains('show')) {
            this.closeMenu(toggler, target);
          }
        });
      });

      // Fechar menu ao clicar fora dele (apenas mobile)
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 991 && 
            !toggler.contains(e.target) && 
            !target.contains(e.target) && 
            target.classList.contains('show')) {
          
          this.closeMenu(toggler, target);
        }
      });

      // Fechar menu ao pressionar ESC (apenas mobile)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && 
            window.innerWidth <= 991 && 
            target.classList.contains('show')) {
          
          this.closeMenu(toggler, target);
        }
      });

      // Limpar classes ao redimensionar para desktop
      window.addEventListener('resize', () => {
        if (window.innerWidth > 991) {
          target.classList.remove('show', 'collapsing');
          toggler.classList.remove('active');
          toggler.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // Método para abrir o menu com animação
  openMenu(toggler, target) {
    target.classList.remove('collapsing');
    target.classList.add('show');
    toggler.setAttribute('aria-expanded', 'true');
    toggler.classList.add('active');
  }

  // Método para fechar o menu - tempo correto
  closeMenu(toggler, target) {
    target.classList.add('collapsing');
    target.classList.remove('show');
    toggler.setAttribute('aria-expanded', 'false');
    toggler.classList.remove('active');
    
    setTimeout(() => {
      target.classList.remove('collapsing');
    }, 1500); // 1.5 segundos para coincidir
  }

  // Método para configurar os caminhos das páginas
  setPaths(paths = {}) {
    const defaultPaths = {
      home: '../index.html',
      quemsomos: 'quemsomos1.html',
      saibamais: 'saibamais1.html',
      suporte: 'ajuda.html',
      entrar: 'entrar1.html',
      logo: '../IMAGENS/imagemprincipal.png'
    };

    const finalPaths = { ...defaultPaths, ...paths };

    this.headerHTML = `
      <header>
        <nav id="fixado" class="navbar navbar-expand-lg navbar-light bg-light">
          <a class="navbar-brand" href="${finalPaths.home}">
            <img src="${finalPaths.logo}" width="120" height="auto" alt="Logo" class="img" />
          </a>
          <button id="icone" class="navbar-toggler" type="button" data-toggle="collapse"
            data-target="#conteudoNavbarSuportado" aria-controls="conteudoNavbarSuportado" aria-expanded="false"
            aria-label="Alterna navegação">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="conteudoNavbarSuportado">
            <ul class="navbar-nav menu-lateral">
              <li class="nav-item">
                <a id="quem" class="nav-link" href="${finalPaths.quemsomos}" title="Quem somos">Quem somos?</a>
              </li>
              <li class="nav-item">
                <a id="saiba" class="nav-link" href="${finalPaths.saibamais}" title="Saiba mais">Saiba mais</a>
              </li>
              <li class="nav-item">
                <a id="suporte-header" class="nav-link" href="${finalPaths.ajuda}" title="Suporte">Suporte</a>
              </li>
              <li class="nav-item">
                <a id="entrar" class="nav-link" href="${finalPaths.entrar}" title="Entrar">Entrar</a>
              </li>
            </ul>
            <a href="${finalPaths.home}">
              <button class="btn btn-brown" type="button" id="doeagora">
                Junte-se a nós
              </button>
            </a>
          </div>
        </nav>
      </header>
    `;
  }

  // Inicializar event listeners específicos do header
  initializeEventListeners() {
    this.highlightCurrentPage();
  }

  // Método para destacar a página atual no menu
  highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      if (currentPath.includes(linkPath.replace('.html', '')) || 
          (currentPath === '/' && linkPath.includes('index'))) {
        link.classList.add('active');
        link.style.color = '#4E3629';
      }
    });
  }

  // Método para carregar as dependências necessárias (Bootstrap, FontAwesome)
  static loadDependencies() {
    return new Promise((resolve) => {
      const dependencies = [
        {
          type: 'css',
          href: 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css',
          integrity: 'sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO',
          crossorigin: 'anonymous'
        },
        {
          type: 'css',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
        }
      ];

      dependencies.forEach(dep => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = dep.href;
        if (dep.integrity) link.integrity = dep.integrity;
        if (dep.crossorigin) link.crossOrigin = dep.crossorigin;
        document.head.appendChild(link);
      });

      // Carregar scripts do Bootstrap de forma sequencial
      const scripts = [
        {
          src: 'https://code.jquery.com/jquery-3.3.1.slim.min.js',
          integrity: 'sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo',
          crossorigin: 'anonymous'
        },
        {
          src: 'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js',
          integrity: 'sha384-ZMP7rVo3mIykV+2+9J3UJ46jBk0WLaUAdn689aCwoqbBJiSnjAK/l8WvCWPIPm49',
          crossorigin: 'anonymous'
        },
        {
          src: 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js',
          integrity: 'sha384-ChfqqxuZUCnJSK3+MXmPNIyE6ZbWh2IMqE241rYiqJxyMiZ6OW/JmZQ5stwEULTy',
          crossorigin: 'anonymous'
        }
      ];

      let loadedScripts = 0;
      scripts.forEach((scriptInfo, index) => {
        const script = document.createElement('script');
        script.src = scriptInfo.src;
        if (scriptInfo.integrity) script.integrity = scriptInfo.integrity;
        if (scriptInfo.crossorigin) script.crossOrigin = scriptInfo.crossorigin;
        
        script.onload = () => {
          loadedScripts++;
          if (loadedScripts === scripts.length) {
            resolve();
          }
        };
        
        document.head.appendChild(script);
      });
    });
  }
}

// Função utilitária para facilitar o uso
async function initializeHeader(targetElementId = null, customPaths = {}) {
  // Carregar dependências primeiro
  await HeaderComponent.loadDependencies();
  
  const header = new HeaderComponent();
  
  if (Object.keys(customPaths).length > 0) {
    header.setPaths(customPaths);
  }
  
  if (targetElementId) {
    header.render(targetElementId);
  } else {
    header.renderAtTop();
  }
  
  return header;
}

// Exportar para uso global
window.HeaderComponent = HeaderComponent;
window.initializeHeader = initializeHeader;