const map = L.map('mapa').setView([-12.5, -41.7], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://adaptabrasil.mcti.gov.br/" target="_blank">AdaptaBrasil MCTI</a>'
}).addTo(map);

// isso aq vai guardar os dados de risco
const dadosDosMunicipios = new Map();
const dadosVulnerabilidade = new Map();
const dadosExposicao = new Map();
const dadosAmeaca = new Map();


let geojsonFeatureCollection;
let geojsonLayer;

// FUNÇÃO DE COR CORRIGIDA
function getColor(risco) {
  if (risco === undefined || isNaN(risco)) return '#CCCCCC';
  if (risco >= 0.8) return '#61350C'; // Muito Alto
  if (risco >= 0.6) return '#8B4513'; // Alto
  if (risco >= 0.4) return '#A0522D'; // Médio
  if (risco >= 0.2) return '#CD853F'; // Baixo  (> 0.2 até 0.4)
  return '#E2CCAE';                 // Muito Baixo (0 até 0.2)
}

// carrega os municipios .csv e os formatos dos municipios .geojson
Promise.all([
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_risco_para_inundacoes_enxurradas_e_alagamentos_BR_municipio_2015_geojson.geojson').then(response => response.json()),
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_risco_para_inundacoes_enxurradas_e_alagamentos_BR_municipio_2015_csv.CSV').then(response => response.text()),
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_risco_para_inundacoes_enxurradas_e_alagamentos_BR_municipio_2030_csv.CSV').then(response => response.text()),
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_risco_para_inundacoes_enxurradas_e_alagamentos_BR_municipio_2050_csv.CSV').then(response => response.text()),
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_vulnerabilidade_BR_municipio_2015_csv.CSV').then(response => response.text()),
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_exposicao_BR_municipio_2015_csv.CSV').then(response => response.text()),
  fetch('/scripts/comprador/AdaptaBrasil_adaptabrasil_desastres_geo-hidrologicos_indice_de_ameaca_de_inundacoes_enxurradas_e_alagamentos_BR_municipio_2015_csv.CSV').then(response => response.text())
]).then(([geojson, csvData2015, csvData2030, csvData2050, csvVulnerabilidade, csvExposicao, csvAmeaca]) => {
  geojsonFeatureCollection = geojson;

  Papa.parse(csvData2015, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      results.data.forEach(row => {
        if (row.geocod_ibge) {
          dadosDosMunicipios.set(row.geocod_ibge, row);
        }
      });

      const dadosVulnerab = Papa.parse(csvVulnerabilidade, { header: true, skipEmptyLines: true }).data;
      dadosVulnerab.forEach(row => {
        if (row.geocod_ibge) {
          dadosVulnerabilidade.set(row.geocod_ibge, row);
        }
      });

      const dadosExpo = Papa.parse(csvExposicao, { header: true, skipEmptyLines: true }).data;
      dadosExpo.forEach(row => {
        if (row.geocod_ibge) {
          dadosExposicao.set(row.geocod_ibge, row);
        }
      });

      const dadosAme = Papa.parse(csvAmeaca, { header: true, skipEmptyLines: true }).data;
      dadosAme.forEach(row => {
        if (row.geocod_ibge) {
          dadosAmeaca.set(row.geocod_ibge, row);
        }
      });

      const dados2030 = Papa.parse(csvData2030, { header: true, skipEmptyLines: true }).data;
      const dados2050 = Papa.parse(csvData2050, { header: true, skipEmptyLines: true }).data;

      //chamar as funcoes
      desenharMapaGeoJSON(geojsonFeatureCollection);
      configurarFiltros();
      criarGraficoDeRisco(results.data);
      criarGraficoDeRiscoEmpilhado(results.data, dados2030, dados2050);

      configurarConsultaDetalhada(geojsonFeatureCollection, dadosDosMunicipios, dadosVulnerabilidade, dadosAmeaca, dadosExposicao, dados2030, dados2050);

      setTimeout(() => {
        window.SiteLoader?.hide();
      }, 500);
      setTimeout(() => { map.invalidateSize(); }, 100);
    }
  });
}).catch(error => {
  console.error("Erro ao carregar os arquivos de dados do mapa:", error);
  alert("Não foi possível carregar os dados do mapa. Verifique o console.");
  setTimeout(() => {
        window.SiteLoader?.hide();
  }, 500);
});

function configurarConsultaDetalhada(geojson, dadosRisco, dadosVuln, dadosAmeaca, dadosExposicao, dados2030, dados2050) {
  const inputConsulta = document.getElementById('input-consulta');
  const botaoConsulta = document.getElementById('botao-consulta');
  const resultadoContainer = document.getElementById('resultado-consulta');

  function buscarMunicipio() {
    const nomeCidade = inputConsulta.value.trim().toLowerCase();
    if (nomeCidade === '') {
      resultadoContainer.innerHTML = ''; // Limpa se a busca for vazia
      return;
    }

    // Usa a mesma lógica de busca do mapa
    const municipiosEncontrados = geojson.features.filter(feature =>
      feature.properties.name.split('/')[0].trim().toLowerCase() === nomeCidade
    );

    if (municipiosEncontrados.length === 0) {
      resultadoContainer.innerHTML = `<div class="card-resultado"><p>Município não encontrado.</p></div>`;
      return;
    }
    else if (municipiosEncontrados.length === 1) {
      zoomParaMunicipio(municipiosEncontrados[0]);
    } else {
      alert('Múltiplos municípios encontrados com este nome. Exibindo o primeiro resultado.');
      zoomParaMunicipio(municipiosEncontrados[0]);
    }

    function zoomParaMunicipio(municipioFeature) {
      const camadaMunicipio = L.geoJson(municipioFeature);
      map.fitBounds(camadaMunicipio.getBounds());
      inputConsulta.value = municipioFeature.properties.name;
    }

    const municipio = municipiosEncontrados[0];
    const codMun = municipio.properties.geocod_ibge;

    const riscoPresente = dadosRisco.get(codMun);
    const vulnerabilidade = dadosVuln.get(codMun);
    const ameaca = dadosAmeaca.get(codMun);
    const exposicao = dadosExposicao.get(codMun);
    const risco2030 = dados2030.find(row => row.geocod_ibge === codMun);
    const risco2050 = dados2050.find(row => row.geocod_ibge === codMun);

    zoomParaMunicipio(municipiosEncontrados[0]);

    resultadoContainer.innerHTML = `
            <div class="card-resultado">
                <h4>${municipio.properties.name}</h4>
                <div class="resultado-grid">
                    <div class="resultado-item">
                        <span class="label">Risco (Presente)</span>
                        <span class="value">${riscoPresente ? parseFloat(riscoPresente.valor).toFixed(2).replace('.', ',') : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Classe Risco (Presente)</span>
                        <span class="value">${riscoPresente ? riscoPresente.classe : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Risco (2030 Otimista)</span>
                        <span class="value">${risco2030 ? parseFloat(risco2030.valor).toFixed(2).replace('.', ',') : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Classe Risco (2030 Otimista)</span>
                        <span class="value">${risco2030 ? risco2030.classe : 'N/A'}</span>
                    </div>
                     <div class="resultado-item">
                        <span class="label">Risco (2050 Otimista)</span>
                        <span class="value">${risco2050 ? parseFloat(risco2050.valor).toFixed(2).replace('.', ',') : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Classe Risco (2050 Otimista)</span>
                        <span class="value">${risco2050 ? risco2050.classe : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Vulnerabilidade (Presente)</span>
                        <span class="value">${vulnerabilidade ? parseFloat(vulnerabilidade.valor).toFixed(2).replace('.', ',') : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Ameaça (Presente)</span>
                        <span class="value">${ameaca ? parseFloat(ameaca.valor).toFixed(2).replace('.', ',') : 'N/A'}</span>
                    </div>
                    <div class="resultado-item">
                        <span class="label">Exposição (Presente)</span>
                        <span class="value">${exposicao ? parseFloat(exposicao.valor).toFixed(2).replace('.', ',') : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
  }

  botaoConsulta.addEventListener('click', buscarMunicipio);
  inputConsulta.addEventListener('keypress', e => {
    if (e.key === 'Enter') buscarMunicipio();
  });
}



function desenharMapaGeoJSON(geojson) {
  if (geojsonLayer) map.removeLayer(geojsonLayer);
  geojsonLayer = L.geoJson(geojson, {
    style: styleFunction,
    onEachFeature: onEachFeature
  }).addTo(map);

  // Adiciona controles se ainda não existirem
  if (!map.infoControl) map.infoControl = info.addTo(map);
  if (!map.legendControl) map.legendControl = legend.addTo(map);
}

// FUNÇÃO DE ESTILO CORRIGIDA
function styleFunction(feature) {
  const codMun = feature.properties.geocod_ibge;
  const dados = dadosDosMunicipios.get(codMun);

  const regiaoSelecionada = document.getElementById('filter-region').value;
  const estadoSelecionado = document.getElementById('filter-state').value;
  const riscosSelecionados = Array.from(document.querySelectorAll('.filter-panel input[type="checkbox"]:checked')).map(cb => cb.value);

  let deveExibir = true;

  if (!dados) {
    deveExibir = false;
  } else {
    const siglaEstado = dados.nome.split('/')[1];
    if (estadoSelecionado !== "TODOS" && siglaEstado !== estadoSelecionado) {
      deveExibir = false;
    }
    if (deveExibir && estadoSelecionado === "TODOS" && regiaoSelecionada !== "TODAS") {
      const optionEstado = document.querySelector(`#filter-state option[value="${siglaEstado}"]`);
      if (optionEstado && optionEstado.dataset.region !== regiaoSelecionada) {
        deveExibir = false;
      }
    }

    // CORREÇÃO: Esconde se a lista de filtros estiver vazia
    if (deveExibir && (riscosSelecionados.length === 0 || !riscosSelecionados.includes(dados.classe))) {
      deveExibir = false;
    }
  }

  if (deveExibir) {
    const risco = parseFloat(dados.valor);
    return { fillColor: getColor(risco), weight: 1, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 1 };
  } else {
    return { fillOpacity: 0, opacity: 0 };
  }
}

function configurarFiltros() {
  const filtroRegiao = document.getElementById('filter-region');
  const filtroEstado = document.getElementById('filter-state');
  const checkboxesRisco = document.querySelectorAll('.filter-panel input[type="checkbox"]');

  function atualizarMapa() {
    if (geojsonLayer) {
      geojsonLayer.setStyle(styleFunction);
    }
  }

  filtroRegiao.addEventListener('change', () => {
    const regiaoSelecionada = filtroRegiao.value;
    document.querySelectorAll('#filter-state option').forEach(option => {
      option.style.display = (regiaoSelecionada === 'TODAS' || option.dataset.region === regiaoSelecionada) ? 'block' : 'none';
    });
    filtroEstado.value = 'TODOS';
    atualizarMapa();
  });

  filtroEstado.addEventListener('change', atualizarMapa);
  checkboxesRisco.forEach(checkbox => checkbox.addEventListener('change', atualizarMapa));
}

const info = L.control();
info.onAdd = function (map) { this._div = L.DomUtil.create('div', 'info'); this.update(); return this._div; };
info.update = function (props) {
  const codMun = props ? props.geocod_ibge : undefined;
  const dados = codMun ? dadosDosMunicipios.get(codMun) : undefined;
  const risco = dados ? parseFloat(dados.valor) : undefined;
  const riscoFormatado = (risco !== undefined && !isNaN(risco)) ? risco.toFixed(2) : 'Sem dados';

  const dadosVulnerab = codMun ? dadosVulnerabilidade.get(codMun) : undefined;
  const vulnerabilidade = dadosVulnerab ? parseFloat(dadosVulnerab.valor) : undefined;
  const vulnerabilidadeFormatado = (vulnerabilidade !== undefined && !isNaN(vulnerabilidade)) ? vulnerabilidade.toFixed(2).replace('.', ',') : 'Sem dados';

  const dadosExpo = codMun ? dadosExposicao.get(codMun) : undefined;
  const exposicao = dadosExpo ? parseFloat(dadosExpo.valor) : undefined;
  const exposicaoFormatado = (exposicao !== undefined && !isNaN(exposicao)) ? exposicao.toFixed(2).replace('.', ',') : 'Sem dados';

  const dadosAme = codMun ? dadosAmeaca.get(codMun) : undefined;
  const ameaca = dadosAme ? parseFloat(dadosAme.valor) : undefined;
  const ameacaFormatado = (exposicao !== undefined && !isNaN(ameaca)) ? ameaca.toFixed(2).replace('.', ',') : 'Sem dados';

  this._div.innerHTML = '<h4>Risco de Inundação no Brasil</h4>' + (props ? '<b>' + props.name + '</b><br />Índice de Risco: <b>' + riscoFormatado + '</b><br />' +
    'Índice de Vulnerabilidade: <b>' + vulnerabilidadeFormatado + '</b><br />' +
    'Índice de Exposição: <b>' + exposicaoFormatado + '</b><br />' +
    'Índice de Ameaça: <b>' + ameacaFormatado + '</b>'
    : 'Passe o mouse sobre um município');
};

function isFeatureVisible(feature) {
  const codMun = feature.properties.geocod_ibge;
  const dados = dadosDosMunicipios.get(codMun);

  const regiaoSelecionada = document.getElementById('filter-region').value;
  const estadoSelecionado = document.getElementById('filter-state').value;
  const riscosSelecionados = Array.from(document.querySelectorAll('.filter-panel input[type="checkbox"]:checked')).map(cb => cb.value);

  if (!dados) {
    return false;
  }

  const siglaEstado = dados.nome.split('/')[1];
  if (estadoSelecionado !== "TODOS" && siglaEstado !== estadoSelecionado) {
    return false;
  }

  if (estadoSelecionado === "TODOS" && regiaoSelecionada !== "TODAS") {
    const optionEstado = document.querySelector(`#filter-state option[value="${siglaEstado}"]`);
    if (!optionEstado || optionEstado.dataset.region !== regiaoSelecionada) {
      return false;
    }
  }

  if (riscosSelecionados.length > 0 && !riscosSelecionados.includes(dados.classe)) {
    return false;
  }

  return true;
}

function highlightFeature(e) {

  const feature = e.target.feature;
  if (!isFeatureVisible(feature)) {
    return;
  }
  e.target.setStyle({ weight: 3, color: '#666', dashArray: '' }); info.update(e.target.feature.properties);

}
function resetHighlight(e) { geojsonLayer.resetStyle(e.target); info.update(); }
function onEachFeature(feature, layer) { layer.on({ mouseover: highlightFeature, mouseout: resetHighlight }); }

const legend = L.control({ position: 'bottomright' });
legend.onAdd = function (map) {
  const div = L.DomUtil.create('div', 'info legend'), grades = [0, 0.2, 0.4, 0.6, 0.8];
  div.innerHTML += '<b>Índice de Risco</b><br>';
  for (let i = 0; i < grades.length; i++) {
    div.innerHTML += '<i style="background:' + getColor(grades[i] + 0.1) + '"></i> ' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
  }
  div.innerHTML += '<br><i style="background:#CCCCCC"></i> Sem dados';
  return div;
};



function criarGraficoDeRisco(dadosCsv) {

  const contagemPorClasse = {
    'Muito baixo': 0,
    'Baixo': 0,
    'Médio': 0,
    'Alto': 0,
    'Muito alto': 0,
    'Dado indisponível': 0
  };

  dadosCsv.forEach(row => {
    const classe = row.classe;
    if (classe in contagemPorClasse) {
      contagemPorClasse[classe]++;
    } else {
      contagemPorClasse['Dado indisponível']++;
    }
  });

  const labels = Object.keys(contagemPorClasse); //classe
  const data = Object.values(contagemPorClasse); //quantostem

  const backgroundColors = [
    '#E2CCAE',
    '#CD853F',
    '#A0522D',
    '#8B4513',
    '#61350C',
    '#6C757D'
  ];

  // criar grafico
  const ctx = document.getElementById('graficoRisco').getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nº de Municípios',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Número de Municípios'
          }
        },
        x: {
          ticks: {
            maxRotation: 0,
            minRotation: 0,

            font: {
              size: 11
            }
          }
        }
      }
    }
  });
}

function criarGraficoDeRiscoEmpilhado(dadosPresente, dados2030, dados2050) {

  // Função auxiliar para contar as classes em um conjunto de dados
  const contarClasses = (dados) => {
    const contagem = { 'Muito baixo': 0, 'Baixo': 0, 'Médio': 0, 'Alto': 0, 'Muito alto': 0 };
    dados.forEach(row => {
      if (row.classe && row.classe in contagem) {
        contagem[row.classe]++;
      }
    });
    return contagem;
  };

  const contagemPresente = contarClasses(dadosPresente);
  const contagem2030 = contarClasses(dados2030);
  const contagem2050 = contarClasses(dados2050);

  // No gráfico empilhado, cada CLASSE de risco é um "dataset"
  const labels = ['Presente (2015)', 'Otimista (2030)', 'Otimista (2050)'];
  const classesDeRisco = ['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'];
  const colors = {
    'Muito baixo': '#E2CCAE',
    'Baixo': '#CD853F',
    'Médio': '#A0522D',
    'Alto': '#8B4513',
    'Muito alto': '#61350C'
  };

  const datasets = classesDeRisco.map(classe => {
    return {
      label: classe,
      data: [
        contagemPresente[classe],
        contagem2030[classe],
        contagem2050[classe]
      ],
      backgroundColor: colors[classe]
    }
  });

  //criar o grafico
  const ctx = document.getElementById('graficoRisco2').getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom' // Mostra a legenda de cores embaixo
        }
      },
      scales: {
        x: {
          stacked: true, // A MÁGICA: Empilha as barras no eixo X
        },
        y: {
          stacked: true, // A MÁGICA: Empilha as barras no eixo Y
          beginAtZero: true,
          title: {
            display: true,
            text: 'Número de Municípios'
          }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // Função para controlar o dropdown do perfil
  setupProfileDropdown();

  // Configurar evento para detectar o fechamento do menu colapsável
  const navbarCollapse = document.getElementById('navbarNav');

  // Se estivermos usando Bootstrap 5
  if (window.bootstrap && navbarCollapse) {
    const collapseInstance = new bootstrap.Collapse(navbarCollapse, {
      toggle: false // Não alternar ao criar a instância
    });

    // Adicionar listener para quando o colapso for escondido
    navbarCollapse.addEventListener('hidden.bs.collapse', function () {
      // Garantir que o botão possa ser clicado novamente
      const toggleButton = document.getElementById('icone');
      if (toggleButton) {
        toggleButton.classList.remove('collapsed');
        toggleButton.setAttribute('aria-expanded', 'false');
      }
    });
  }
  // Para Bootstrap 4 (que parece estar sendo usado no seu código)
  else if ($ && navbarCollapse) {
    $(navbarCollapse).on('hidden.bs.collapse', function () {
      const toggleButton = document.getElementById('icone');
      if (toggleButton) {
        toggleButton.classList.remove('collapsed');
        toggleButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Restante do código existente...
  const instagramBtn = document.getElementById("botao");
  const instagramCaixa = document.getElementById("caixa-principal");
  const instagramSairBtn = document.getElementById("botao-sair");
  const instagramInput = document.getElementById("instagram");
  const instagramLinkContainer = document.getElementById("linkContainer");
  const instagramEditarBtn = document.getElementById("editarLink");
  const instagramConfirmarBtn = document.getElementById("botaocaixa");
  const modalOverlay = createModalOverlay();


  // Configurar botão do Facebook
  const facebookBtn = document.getElementById("facebook");
  const facebookCaixa = document.getElementById("caixa-principal2");
  const facebookSairBtn = document.getElementById("botao-sair2");

  if (facebookBtn && facebookCaixa && facebookSairBtn) {
    facebookBtn.addEventListener("click", () => {
      facebookCaixa.style.display = "flex";
      modalOverlay.style.display = "block";
      document.body.style.overflow = "hidden";
    });

    facebookSairBtn.addEventListener("click", () => {
      facebookCaixa.style.display = "none";
      modalOverlay.style.display = "none";
      document.body.style.overflow = "auto";
    });
  }


  if (instagramBtn) {
    instagramBtn.addEventListener("click", () => {
      instagramCaixa.style.display = "flex";
      modalOverlay.style.display = "block";
      document.body.style.overflow = "hidden";
    });
  }


  if (instagramSairBtn) {
    instagramSairBtn.addEventListener("click", () => {
      instagramCaixa.style.display = "none";
      modalOverlay.style.display = "none";
      document.body.style.overflow = "auto";
    });
  }


  // Adicionar evento de clique manual ao botão de três pontos
  const toggleButton = document.getElementById('icone');
  if (toggleButton) {
    toggleButton.addEventListener('click', function () {
      // Se Bootstrap 5
      if (window.bootstrap && navbarCollapse) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) {
          if (navbarCollapse.classList.contains('show')) {
            bsCollapse.hide();
          } else {
            bsCollapse.show();
          }
        } else {
          // Alternar manualmente se não houver instância
          navbarCollapse.classList.toggle('show');
        }
      }
      // Para Bootstrap 4
      else if ($) {
        $(navbarCollapse).collapse('toggle');
      }
      // Alternar manualmente como fallback
      else if (navbarCollapse) {
        if (navbarCollapse.classList.contains('show')) {
          navbarCollapse.classList.remove('show');
          toggleButton.setAttribute('aria-expanded', 'false');
        } else {
          navbarCollapse.classList.add('show');
          toggleButton.setAttribute('aria-expanded', 'true');
        }
      }
    });
  }


  // Chamadas para outras funções existentes
  handleHeaderAnimation();
  handleSidebarHover();
});


// Nova função para configurar o dropdown do perfil
function setupProfileDropdown() {
  const usuarioBtn = document.getElementById("usuario");
  const dropdownMenu = document.getElementById("dropzinho");

  if (!usuarioBtn || !dropdownMenu) return;

  // Verifica se estamos em dispositivo móvel
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // No mobile, o dropdown aparece com clique
    usuarioBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation(); // Impede propagação do evento
      if (dropdownMenu.style.display === "block") {
        dropdownMenu.style.display = "none";
      } else {
        dropdownMenu.style.display = "block";
      }
    });

    // Fecha ao clicar fora
    document.addEventListener("click", function (e) {
      if (!usuarioBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = "none";
      }
    });
  } else {
    // Em desktop, mostra ao passar o mouse
    usuarioBtn.addEventListener("mouseenter", function () {
      dropdownMenu.style.display = "block";
    });

    // Container do dropdown para evitar que feche quando mover para os itens
    const profileDropdown = document.querySelector(".profile-dropdown");
    if (profileDropdown) {
      profileDropdown.addEventListener("mouseleave", function () {
        dropdownMenu.style.display = "none";
      });
    }

    // Também adicionar clique para melhorar acessibilidade
    usuarioBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation(); // Impede propagação do evento
      if (dropdownMenu.style.display === "block") {
        dropdownMenu.style.display = "none";
      } else {
        dropdownMenu.style.display = "block";
      }
    });
  }

  // Adicionar evento de clique nos itens do dropdown para fechar após clicar
  const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', function () {
      dropdownMenu.style.display = "none";
    });
  });
}


// Re-configurar em caso de redimensionamento da janela
window.addEventListener("resize", function () {
  setupProfileDropdown();
  handleHeaderAnimation();
  handleSidebarHover();
  ensureSidebarHeight();
});


// Funções existentes...
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const body = document.body;


  sidebar.classList.toggle("open");
  body.classList.toggle("sidebar-open"); // Adiciona classe ao body para controlar overflow


  let overlay = document.getElementById("sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sidebar-overlay";
    overlay.style.display = "none";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.zIndex = "650";
    document.body.appendChild(overlay);


    overlay.addEventListener("click", function () {
      toggleSidebar();
    });
  }


  if (sidebar.classList.contains("open")) {
    overlay.style.display = "block";
    document.body.style.overflow = "hidden";


    // Garante que o botão de upload permaneça visível
    const imgHeader = document.getElementById("imgheader");
    if (imgHeader) {
      imgHeader.style.visibility = "visible";
      imgHeader.style.opacity = "1";
    }
  } else {
    overlay.style.display = "none";
    document.body.style.overflow = "auto";
  }
}


function createModalOverlay() {
  let modalOverlay = document.getElementById("modal-overlay");
  if (!modalOverlay) {
    modalOverlay = document.createElement("div");
    modalOverlay.id = "modal-overlay";
    modalOverlay.style.display = "none";
    modalOverlay.style.position = "fixed";
    modalOverlay.style.top = "0";
    modalOverlay.style.left = "0";
    modalOverlay.style.right = "0";
    modalOverlay.style.bottom = "0";
    modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    modalOverlay.style.zIndex = "1000";
    document.body.appendChild(modalOverlay);
  }
  return modalOverlay;
}


function handleHeaderAnimation() {
  const header = document.getElementById("header");


  if (header) {
    if (window.innerWidth <= 768) {
      header.style.transition = "none";
    } else {
      header.style.transition = "all 0.3s ease-in-out";
    }
  }
}


function handleSidebarHover() {
  const sidebar = document.getElementById("sidebar");
  const body = document.body;
  const imgHeader = document.getElementById("imgheader");


  if (sidebar) {
    // Remover quaisquer listeners existentes para evitar duplicações
    const oldMouseEnter = sidebar._mouseenterListener;
    const oldMouseLeave = sidebar._mouseleaveListener;

    if (oldMouseEnter) {
      sidebar.removeEventListener("mouseenter", oldMouseEnter);
    }

    if (oldMouseLeave) {
      sidebar.removeEventListener("mouseleave", oldMouseLeave);
    }

    // É um tablet? (Entre 768px e 992px)
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 992;

    // Se for desktop (acima de 992px) ou não for tablet, mantém o comportamento original
    if (!isTablet && window.innerWidth > 768) {
      const mouseenterListener = function () {
        body.classList.add("sidebar-expanded");

        // Garante que o botão de upload permaneça visível
        if (imgHeader) {
          imgHeader.style.visibility = "visible";
          imgHeader.style.opacity = "1";
        }
      };

      const mouseleaveListener = function () {
        body.classList.remove("sidebar-expanded");
      };

      sidebar.addEventListener("mouseenter", mouseenterListener);
      sidebar.addEventListener("mouseleave", mouseleaveListener);

      // Armazenar referências para possibilitar remoção posterior
      sidebar._mouseenterListener = mouseenterListener;
      sidebar._mouseleaveListener = mouseleaveListener;
    }
    // Para tablets, desabilitar o efeito de hover
    else if (isTablet) {
      // Não adiciona novos listeners para mouseenter/mouseleave
      // Isso impede que o botão de upload se mova em tablets quando
      // o mouse passa sobre a sidebar

      // Garante que o botão de upload permaneça sempre visível em tablets
      if (imgHeader) {
        imgHeader.style.visibility = "visible";
        imgHeader.style.opacity = "1";
      }
    }
  }
}


// Adicione essa função para garantir que a sidebar tenha altura máxima em celulares
function ensureSidebarHeight() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar && window.innerWidth <= 768) {
    // Define a altura para o viewport height ou para o height da página, o que for maior
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );


    sidebar.style.height = Math.max(docHeight, window.innerHeight) + "px";
  }
}


// Função para gerar link do Instagram
function gerarLinkInstagram() {
  const instagram = document.getElementById("instagram").value.trim();
  const instagramLinkContainer = document.getElementById("linkContainer");
  const instagramEditarBtn = document.getElementById("editarLink");
  const instagramConfirmarBtn = document.getElementById("botaocaixa");
  const instagramInput = document.getElementById("instagram");
  const instagramBtn = document.getElementById("botao");

  const regexInstagram = /^[a-zA-Z0-9._]+$/;


  if (instagram && regexInstagram.test(instagram.replace(/^@/, ""))) {
    const padrao = instagram.startsWith("@") ? instagram.slice(1) : instagram;
    const link = `https://www.instagram.com/${padrao}`;


    instagramLinkContainer.innerHTML = `
      <div style="text-align: center;">
        <a href="${link}" target="_blank" style="color:#EC9E07; font-size:16px; word-wrap:break-word;">
          ${link}
        </a>
      </div>
    `;
    instagramBtn.setAttribute("href", link);
    instagramBtn.innerHTML = "Instagram";


    instagramInput.style.display = "none";
    instagramConfirmarBtn.style.display = "none";
    instagramEditarBtn.style.display = "inline-block";
    instagramInput.value = "";
    document.getElementById("texto-caixa3").textContent = "Aqui você pode editar o Instagram da sua empresa!";
  } else {
    alert("Por favor, insira um Instagram válido (somente letras, números, pontos e underlines).");
    instagramLinkContainer.innerHTML = "";
  }
}


// Função para gerar link do Facebook
function gerarLinkFacebook() {
  const facebook = document.getElementById("facebook2").value.trim();
  const facebookLinkContainer = document.getElementById("linkContainer2");
  const facebookEditarBtn = document.getElementById("editarLink2");
  const facebookConfirmarBtn = document.getElementById("botaocaixa2");
  const facebookInput = document.getElementById("facebook2");
  const facebookBtn = document.getElementById("facebook");

  const regexFacebook = /^[a-zA-Z0-9._]+$/;


  if (facebook && regexFacebook.test(facebook.replace(/^@/, ""))) {
    const padrao = facebook.startsWith("@") ? facebook.slice(1) : facebook;
    const link = `https://www.facebook.com/${padrao}`;


    facebookLinkContainer.innerHTML = `
      <div style="text-align: center;">
        <a href="${link}" target="_blank" style="color:#EC9E07; font-size:16px; word-wrap:break-word;">
          ${link}
        </a>
      </div>
    `;
    facebookBtn.setAttribute("href", link);
    facebookBtn.innerHTML = "Facebook";


    facebookInput.style.display = "none";
    facebookConfirmarBtn.style.display = "none";
    facebookEditarBtn.style.display = "inline-block";
    facebookInput.value = "";
    document.getElementById("texto-caixa4").textContent = "Aqui você pode editar o Facebook da sua empresa!";
  } else {
    alert("Por favor, insira um Facebook válido (somente letras, números, pontos e underlines).");
    facebookLinkContainer.innerHTML = "";
  }
}


// Adicionar função para editar links
document.addEventListener("DOMContentLoaded", function () {
  const editarInstagramBtn = document.getElementById("editarLink");
  if (editarInstagramBtn) {
    editarInstagramBtn.addEventListener("click", function () {
      const instagramInput = document.getElementById("instagram");
      const instagramLinkContainer = document.getElementById("linkContainer");
      const instagramConfirmarBtn = document.getElementById("botaocaixa");

      instagramInput.style.display = "block";
      instagramConfirmarBtn.style.display = "block";
      instagramLinkContainer.innerHTML = "";
      editarInstagramBtn.style.display = "none";
    });
  }

  const editarFacebookBtn = document.getElementById("editarLink2");
  if (editarFacebookBtn) {
    editarFacebookBtn.addEventListener("click", function () {
      const facebookInput = document.getElementById("facebook2");
      const facebookLinkContainer = document.getElementById("linkContainer2");
      const facebookConfirmarBtn = document.getElementById("botaocaixa2");

      facebookInput.style.display = "block";
      facebookConfirmarBtn.style.display = "block";
      facebookLinkContainer.innerHTML = "";
      editarFacebookBtn.style.display = "none";
    });
  }
});
