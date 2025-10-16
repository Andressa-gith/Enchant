document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ongId = urlParams.get('id');

    if (!ongId) {
        document.querySelector('.transparencia-main').innerHTML = '<p class="error">ID da organização não encontrado na URL.</p>';
        setTimeout(() => {
            window.SiteLoader?.hide();
        }, 500);
        return;
    }

    try {
        const response = await fetch(`/api/public/transparencia?id=${ongId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Não foi possível carregar os dados da organização.');
        }
        const data = await response.json();

        if (!data.ong) {
            throw new Error('Organização não encontrada.');
        }

        renderizarInfoOng(data.ong);
        renderizarDoacoes(data.doacoesEntrada, data.doacoesSaida);
        renderizarGestaoFinanceira(data.gestaoFinanceira);
        renderizarDocumentos(data.documentos);
        renderizarParcerias(data.parcerias);
        renderizarContratos(data.contratos);
        renderizarAuditorias(data.auditorias);
        renderizarRelatorios(data.relatorios);

        setupTabs();

    } catch (error) {
        console.error('Erro ao carregar dados de transparência:', error);
        document.querySelector('.transparencia-main').innerHTML = `<div class="container"><p class="error">${error.message}</p></div>`;
    } finally {
        setTimeout(() => {
            window.SiteLoader?.hide();
        }, 500);
    }

    const btnVoltar = document.getElementById('btn-voltar');
    
    const sectionId = urlParams.get('returnTo');

    const paginaAnterior = document.referrer;

    if (sectionId && paginaAnterior) {
        const backUrl = new URL(paginaAnterior);
        backUrl.hash = sectionId;

        console.log(`Botão 'Voltar' configurado para: ${backUrl.href}`);
        btnVoltar.href = backUrl.href;

    } else {
        console.warn("Não foi possível determinar a seção de retorno. Usando history.back().");
        btnVoltar.addEventListener('click', (e) => {
            e.preventDefault(); // Impede a navegação padrão do <a>
            if (history.length > 1) {
                history.back();
            } else {
                window.location.href = '/'; // Se não tiver histórico, vai para a home
            }
        });
    }
});

function renderizarInfoOng(ong) {
    document.getElementById('ong-logo1').src = ong.caminho_foto_perfil || '/assets/imgs/comprador/avatar-padrao.jpg';
    document.getElementById('ong-nome').textContent = ong.nome;
    document.getElementById('ong-descricao').textContent = ong.sobre || 'Esta organização ainda não forneceu uma descrição.';

    const heroSection = document.querySelector('.transparencia-hero');

    if (ong.caminho_logo) {
        heroSection.classList.add('hero-com-desfoque');
        heroSection.style.setProperty('--bg-image-url', `linear-gradient(135deg, rgba(245, 245, 220, 0.8), rgba(255, 255, 255, 0.7)), url('${ong.caminho_logo}')`);
    } 

    const localizacaoEl = document.getElementById('cidade-estado');
    const telefone = document.getElementById('telefone');
    if (ong.cidade && ong.estado) {
        localizacaoEl.textContent = `${ong.cidade}, ${ong.estado}`;
    } else {
        localizacaoEl.textContent = 'Localização não informada';
    }

    if (ong.telefone) {
        telefone.textContent = `${ong.telefone}`;
    } else {
        telefone.textContent = 'Telefone não informado';
    }
}

function renderizarDoacoes(entradas, saidas) {
    const containerEntradas = document.getElementById('lista-entradas');
    const containerSaidas = document.getElementById('lista-saidas');

    document.getElementById('total-entradas').textContent = entradas.length;
    document.getElementById('total-saidas').textContent = saidas.length;

    if (!entradas || entradas.length === 0) {
        containerEntradas.innerHTML = getEmptyState('Nenhuma doação recebida registrada.');
    } else {
        containerEntradas.innerHTML = entradas.map(d => `
            <div class="data-item">
                 <div class="item-icon entrada"><i class="fas fa-arrow-down"></i></div>
                 <div class="item-info">
                    <h4>${d.quantidade}x ${d.categoria.nome}</h4>
                    <p><strong>De:</strong> ${d.doador_origem_texto || 'Anônimo'} | <strong>Data:</strong> ${new Date(d.data_entrada).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    }

    if (!saidas || saidas.length === 0) {
        containerSaidas.innerHTML = getEmptyState('Nenhuma doação distribuída registrada.');
    } else {
        containerSaidas.innerHTML = saidas.map(d => `
            <div class="data-item">
                <div class="item-icon saida"><i class="fas fa-arrow-up"></i></div>
                <div class="item-info">
                    <h4>${d.quantidade_retirada} unidade(s)</h4>
                    <p><strong>Para:</strong> ${d.destinatario || 'Não informado'} | <strong>Data:</strong> ${new Date(d.data_saida).toLocaleDateString()}</p>
                </div>
            </div>
         `).join('');
    }
}

function renderizarGestaoFinanceira(gestao) {
    const container = document.getElementById('lista-financeiro');
    if (!gestao || gestao.length === 0) {
        container.innerHTML = getEmptyState('Nenhum registro de gestão financeira encontrado.');
        return;
    }
    container.innerHTML = gestao.map(item => {
        const percentual = item.orcamento_previsto > 0 ? (item.valor_executado / item.orcamento_previsto) * 100 : 0;
        return `
            <div class="data-item financeiro-item">
                <div class="item-info">
                    <h4>${item.nome_categoria} (${item.ano})</h4>
                    <p><strong>Orçamento:</strong> R$ ${parseFloat(item.orcamento_previsto).toFixed(2)} | <strong>Executado:</strong> R$ ${parseFloat(item.valor_executado).toFixed(2)}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentual.toFixed(2)}%" title="${percentual.toFixed(2)}% Executado"></div>
                    </div>
                </div>
                <div class="item-status status-${item.status.toLowerCase()}">${item.status}</div>
            </div>
        `;
    }).join('');
}

// NOVA FUNÇÃO: Ajuda a extrair apenas o nome do ficheiro do caminho completo
function getFileNameFromPath(filePath) {
    if (!filePath) return '';
    return filePath.substring(filePath.lastIndexOf('/') + 1);
}

function renderizarDocumentos(documentos) {
    const container = document.getElementById('lista-documentos');
    if (!documentos || documentos.length === 0) {
        container.innerHTML = getEmptyState('Nenhum documento comprobatório encontrado.');
        return;
    }
    container.innerHTML = documentos.map(doc => {
        // CORREÇÃO: Extrai o nome do ficheiro e monta a URL corretamente
        const fileName = getFileNameFromPath(doc.caminho_arquivo);
        return `
        <div class="data-item">
            <div class="item-icon"><i class="fas fa-file-invoice-dollar"></i></div>
            <div class="item-info">
                <h4>${doc.titulo}</h4>
                <p>${doc.tipo_documento} | <strong>Valor:</strong> R$ ${parseFloat(doc.valor).toFixed(2)}</p>
            </div>
            <a href="/download/comprovantes/${doc.instituicao_id}/${fileName}" class="btn-download" download>
                <i class="fas fa-download"></i> Baixar
            </a>
        </div>
    `}).join('');
}

function renderizarParcerias(parcerias) {
    const container = document.getElementById('lista-parcerias');
    if (!parcerias || parcerias.length === 0) {
        container.innerHTML = getEmptyState('Nenhuma parceria encontrada.');
        return;
    }
    container.innerHTML = parcerias.map(p => `
        <div class="data-item">
            <div class="item-icon"><i class="fas fa-handshake"></i></div>
            <div class="item-info">
                <h4>${p.nome}</h4>
                <p><strong>Setor:</strong> ${p.tipo_setor} | <strong>Status:</strong> ${p.status}</p>
            </div>
        </div>
    `).join('');
}

function renderizarContratos(contratos) {
    const container = document.getElementById('lista-contratos');
    if (!contratos || contratos.length === 0) {
        container.innerHTML = getEmptyState('Nenhum contrato encontrado.');
        return;
    }
    container.innerHTML = contratos.map(c => {
        // CORREÇÃO: Extrai o nome do ficheiro e monta a URL corretamente
        const fileName = getFileNameFromPath(c.caminho_arquivo);
        return `
        <div class="data-item">
            <div class="item-icon"><i class="fas fa-file-signature"></i></div>
            <div class="item-info">
                <h4>${c.nome_contrato}</h4>
                <p><strong>Ano de Vigência:</strong> ${c.ano_vigencia}</p>
            </div>
             <a href="/download/contracts/${c.instituicao_id}/${fileName}" class="btn-download" download>
                <i class="fas fa-download"></i> Baixar
            </a>
        </div>
    `}).join('');
}

function renderizarAuditorias(auditorias) {
    const container = document.getElementById('lista-auditorias');
    if (!auditorias || auditorias.length === 0) {
        container.innerHTML = getEmptyState('Nenhuma nota de auditoria encontrada.');
        return;
    }
    container.innerHTML = auditorias.map(a => {
        // CORREÇÃO: Extrai o nome do ficheiro e monta a URL corretamente
        const fileName = getFileNameFromPath(a.caminho_arquivo);
        return `
         <div class="data-item">
            <div class="item-icon"><i class="fas fa-stamp"></i></div>
            <div class="item-info">
                <h4>${a.titulo}</h4>
                <p><strong>Tipo:</strong> ${a.tipo} | <strong>Status:</strong> ${a.status}</p>
            </div>
            <a href="/download/audit/${a.instituicao_id}/${fileName}" class="btn-download" download>
                <i class="fas fa-download"></i> Baixar
            </a>
        </div>
    `}).join('');
}

function renderizarRelatorios(relatorios) {
    const container = document.getElementById('lista-relatorios');
    if (!relatorios || relatorios.length === 0) {
        container.innerHTML = getEmptyState('Nenhum relatório encontrado.');
        return;
    }
    container.innerHTML = relatorios.map(r => {
        // CORREÇÃO: Extrai o nome do ficheiro e monta a URL corretamente
        const fileName = getFileNameFromPath(r.caminho_arquivo);
        return `
        <div class="data-item">
            <div class="item-icon"><i class="fas fa-chart-bar"></i></div>
            <div class="item-info">
                <h4>${r.titulo}</h4>
                <p><strong>Publicado em:</strong> ${new Date(r.data_publicacao).toLocaleDateString()}</p>
            </div>
            <a href="/download/reports/${r.instituicao_id}/${fileName}" class="btn-download" download>
                <i class="fas fa-download"></i> Baixar
            </a>
        </div>
    `}).join('');
}


function getEmptyState(message) {
    return `<div class="empty-state"><i class="fas fa-folder-open"></i><p>${message}</p></div>`;
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');

            const targetContent = document.getElementById('tab-' + tab.dataset.tab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    if (tabs.length > 0) {
        tabs[0].classList.add('active');
        const firstTabContent = document.getElementById('tab-' + tabs[0].dataset.tab);
        if (firstTabContent) {
            firstTabContent.classList.add('active');
        }
    }
}