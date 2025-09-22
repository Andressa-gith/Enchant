document.addEventListener('DOMContentLoaded', function () {

  const form = document.querySelector('.containersubsub');
  const emailInput = document.getElementById('email');

  console.log('Formulário encontrado:', form); // Debug
  console.log('Campo email encontrado:', emailInput); // Debug

  if (!form || !emailInput) {
    console.error('Formulário ou campo de email não encontrado');
    return;
  }

  // Função simples para mostrar mensagem
  function mostrarMensagem(mensagem, tipo = 'erro') {
    // Tentar usar o modal primeiro
    const modal = document.getElementById('mensagemModal');
    const modalBody = document.getElementById('mensagemModalBody');
    const modalLabel = document.getElementById('mensagemModalLabel');

    if (modal && modalBody && modalLabel) {
      modalBody.textContent = mensagem;
      
      if (tipo === 'sucesso') {
        modalLabel.textContent = 'Sucesso';
        modalLabel.style.color = '#28a745';
      } else {
        modalLabel.textContent = 'Atenção';
        modalLabel.style.color = '#dc3545';
      }

      // Tentar mostrar modal de diferentes formas
      try {
        if (typeof $ !== 'undefined' && $.fn.modal) {
          // jQuery + Bootstrap
          $('#mensagemModal').modal('show');
        } else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          // Bootstrap 5
          const bsModal = new bootstrap.Modal(modal);
          bsModal.show();
        } else {
          // Fallback manual
          modal.style.display = 'block';
          modal.classList.add('show');
          document.body.classList.add('modal-open');
          
          // Criar backdrop se não existir
          if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop show';
            document.body.appendChild(backdrop);
          }
        }
      } catch (error) {
        console.error('Erro ao mostrar modal:', error);
        alert(mensagem); // Fallback para alert
      }
    } else {
      // Se modal não existir, usar alert
      alert(mensagem);
    }
  }


  form.addEventListener('submit', async (event) => {

    const formData = new FormData(form);

    event.preventDefault();

    console.log('Formulário submetido'); // Debug

    const email = formData.get('email').trim();

    console.log('Email digitado:', email); // Debug

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      console.log('Campo vazio'); // Debug
      mostrarMensagem('Por favor, insira um endereço de email.');
      emailInput.focus();
      return;
    }

    if (!emailRegex.test(email)) {

      console.log('Email inválido'); // Debug

      mostrarMensagem('Por favor, insira um email válido. Exemplo: usuario@exemplo.com');

      emailInput.focus();
      
      return;
    }

    console.log('Email válido, processando...'); // Debug

    try {
      const response = await fetch('/forgotPassword', {
          method: 'POST',
          body: formData
      });

      // É importante pegar a resposta JSON independentemente do status,
      // pois o backend envia a mensagem de erro no corpo da resposta.
      const data = await response.json();
      console.log('📦 Dados recebidos:', data);

      // Se a resposta NÃO for 'ok' (status 400, 500 etc), trata como erro.
      if (!response.ok) {
          // Mostra a mensagem de erro vinda do backend
          mostrarMensagem(data.message || 'Ocorreu um erro no servidor.', 'Erro');
          // Lança o erro para ser pego pelo bloco catch
          throw new Error(data.message || 'Erro na requisição');
      }

      // Se a resposta foi 'ok' (status 200), verificamos o conteúdo.
      if (data.flowToken) {
          // E-mail encontrado, o backend enviou o token.

          // AQUI ESTÁ A CORREÇÃO PRINCIPAL:
          // Guardamos o token no sessionStorage para ser usado na próxima página.
          sessionStorage.setItem('passwordResetToken', data.flowToken);

          form.reset();
          mostrarMensagem('Email enviado com sucesso! Você será redirecionado em breve.', 'sucesso');
          
          setTimeout(() => {
              console.log('Redirecionando para:', data.redirectTo);
              // MUDANÇA: Simplificamos o redirecionamento.
              // A próxima página vai pegar o token do sessionStorage, não da URL.
              window.location.href = data.redirectTo;
          }, 1500);

      } else {
          // E-mail não encontrado, o backend enviou apenas uma mensagem.
          mostrarMensagem(data.message, 'Erro');
      }
  } catch (error) {
      console.error('❌ Erro na requisição:', error);
      // A mensagem de erro já foi exibida acima se o erro veio do backend.
      // Esta mensagem abaixo aparecerá para erros de rede, por exemplo.
      if (!document.querySelector('.alert-danger')) { // Evita mostrar duas mensagens
          mostrarMensagem('Erro ao conectar com o servidor. Tente novamente.', 'Erro');
      }
  }
  });

});