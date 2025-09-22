    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.accordion-btn').forEach(button => {
        button.addEventListener('click', function() {
          const item = button.parentElement;
          const openItem = document.querySelector('.accordion-item.open');
          
          // Fecha o item atualmente aberto se não for o mesmo
          if (openItem && openItem !== item) {
            openItem.classList.remove('open');
          }
          
          // Alterna o estado do item clicado
          item.classList.toggle('open');
        });
      });
    });