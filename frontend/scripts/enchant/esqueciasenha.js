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
    event.preventDefault();

    console.log('Formulário submetido');
    const email = emailInput.value.trim();
    console.log('Email digitado:', email);

    // --- Sua lógica de validação (que já está ótima) ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        mostrarMensagem('Por favor, insira um endereço de email.');
        return;
    }
    if (!emailRegex.test(email)) {
        mostrarMensagem('Por favor, insira um email válido. Exemplo: usuario@exemplo.com');
        return;
    }
    console.log('Email válido, processando...');

    // Pega o botão para desabilitar durante a requisição
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    try {
        // --- CORREÇÃO AQUI ---
        const response = await fetch('/esqueci-senha', { // 1. Rota correta da API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // 2. Informa que estamos enviando JSON
            },
            body: JSON.stringify({ email: email }) // 3. Converte os dados para uma string JSON
        });

        const data = await response.json();
        console.log('📦 Dados recebidos:', data);

        if (!response.ok) {
            // Joga o erro para ser pego pelo bloco catch, usando a mensagem do servidor
            throw new Error(data.message || 'Ocorreu um erro no servidor.');
        }
        
        // Sucesso! Mostra a mensagem que o back-end enviou
        mostrarMensagem(data.message, 'sucesso');
        form.reset();

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        // Mostra a mensagem de erro (seja do back-end ou de rede)
        mostrarMensagem(error.message, 'erro');
    } finally {
        // Reabilita o botão, independentemente do resultado
        submitButton.disabled = false;
        submitButton.textContent = 'Continuar';
    }
  });
});