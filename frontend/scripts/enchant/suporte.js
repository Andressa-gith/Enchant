document.addEventListener("DOMContentLoaded", () => {
  const uploadBox = document.getElementById("uploadBox");
  const fileInput = document.getElementById("anexos");
  const uploadText = document.getElementById("uploadText");
  const form = document.getElementById("form-suporte");

  // --- INICIALIZAÇÃO DOS MODAIS ---
  const erroModalEl = document.getElementById('erroModal');
  const erroModal = new bootstrap.Modal(erroModalEl);
  const erroModalBody = document.getElementById('erroModalBody');

  // Variáveis para o modal de sucesso
  let sucessoModal;
  let sucessoModalEl;

  // --- FUNÇÕES DO FORMULÁRIO ---

  function mostrarArquivos(arquivos) {
    const nomes = Array.from(arquivos).map(f => f.name).join(', ');
    uploadText.textContent = nomes ? `Arquivos selecionados: ${nomes}` : "Escolha um arquivo ou arraste e solte aqui";
  }

  function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  function textoValido(texto) {
    const regex = /^[a-zA-ZÀ-ÿ0-9\s.,?!()\-]*$/;
    return regex.test(texto);
  }

  function contemTextoInadequado(texto) {
    const palavrasBloqueadas = [
      "teste", "lixo", "idiota", "palavrão", "xxx", "merda", "droga", "bosta", "zoeira", "123", "asd", "asdf", "qqq", "foda", "putaria"
    ];
    const textoLower = texto.toLowerCase();
    return palavrasBloqueadas.some(palavra => textoLower.includes(palavra));
  }

  function validarArquivos(arquivos) {
    const tamanhoMax = 10 * 1024 * 1024; // 10MB
    for (const file of arquivos) {
      if (file.size > tamanhoMax) {
        return `O arquivo "${file.name}" excede o tamanho máximo de 10MB.`;
      }
    }
    return null;
  }

  // --- FUNÇÕES DE MODAL CORRIGIDAS ---

  function mostrarModal(mensagem) {
    if (erroModalBody) {
      erroModalBody.innerHTML = mensagem;
      erroModal.show();
    }
  }

  function mostrarModalSucesso(mensagem) {
    // Cria o modal de sucesso na primeira vez que for necessário
    if (!sucessoModalEl) {
      sucessoModalEl = document.createElement('div');
      sucessoModalEl.className = 'modal fade';
      sucessoModalEl.id = 'sucessoModal';
      sucessoModalEl.tabIndex = -1;
      sucessoModalEl.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Sucesso</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" id="sucessoEntendiBtn">Entendi</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(sucessoModalEl);
      sucessoModal = new bootstrap.Modal(sucessoModalEl);

      // **CORREÇÃO:** Adiciona um evento de clique direto ao botão "Entendi"
      document.getElementById('sucessoEntendiBtn').addEventListener('click', () => {
        sucessoModal.hide();
      });
    }

    // Atualiza a mensagem e mostra o modal
    sucessoModalEl.querySelector('.modal-body').innerHTML = mensagem;
    sucessoModal.show();
  }

  function limparErros() {
    const erros = document.querySelectorAll('.erro');
    erros.forEach(erro => erro.remove());
  }

  // --- EVENT LISTENER DO FORMULÁRIO ---

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    limparErros();

    const assuntoEl = document.getElementById("assunto");
    const emailEl = document.getElementById("email");
    const descricaoEl = document.getElementById("descricao");
    const arquivos = fileInput.files;
    const erros = [];

    const assunto = assuntoEl.value.trim();
    const email = emailEl.value.trim();
    const descricao = descricaoEl.value.trim();

    // Validações...
    if (assunto === "") {
      erros.push({ mensagem: "O campo de assunto está vazio." });
    } else if (assunto.length < 3) {
      erros.push({ mensagem: "O campo de assunto deve conter pelo menos 3 caracteres." });
    } else if (!textoValido(assunto) || contemTextoInadequado(assunto)) {
      erros.push({ mensagem: "O campo de assunto contém palavras ou caracteres inválidos." });
    }

    if (email === "") {
      erros.push({ mensagem: "O campo de e-mail está vazio." });
    } else if (!validarEmail(email)) {
      erros.push({ mensagem: "O campo de e-mail está com formato inválido." });
    }

    if (descricao === "") {
      erros.push({ mensagem: "O campo de descrição está vazio." });
    } else if (descricao.length < 10) {
      erros.push({ mensagem: "A descrição deve conter pelo menos 10 caracteres." });
    } else if (!textoValido(descricao) || contemTextoInadequado(descricao)) {
      erros.push({ mensagem: "A descrição contém palavras ou caracteres inválidos." });
    }
    
    if (arquivos.length > 0) {
      const erroArquivo = validarArquivos(arquivos);
      if (erroArquivo) {
        erros.push({ mensagem: erroArquivo });
      }
    }

    if (erros.length > 0) {
      let mensagemErro = '<ul>' + erros.map(erro => `<li>${erro.mensagem}</li>`).join('') + '</ul>';
      mostrarModal(mensagemErro);
      return;
    }

    mostrarModalSucesso("Formulário enviado com sucesso!");
    form.reset();
    uploadText.textContent = "Escolha um arquivo ou arraste e solte aqui";
  });

  // --- EVENT LISTENERS DA ÁREA DE UPLOAD ---

  uploadBox.addEventListener("click", () => {
    fileInput.click();
  });

  uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.classList.add("dragover");
  });

  uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("dragover");
  });

  uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.classList.remove("dragover");
    fileInput.files = e.dataTransfer.files;
    mostrarArquivos(fileInput.files);
  });

  fileInput.addEventListener("change", () => {
    mostrarArquivos(fileInput.files);
  });
});