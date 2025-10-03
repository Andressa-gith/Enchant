export function iniciarTutorial(session) {

    const tour = new Shepherd.Tour({
        useModalOverlay: true, // Escurece o resto da tela
        defaultStepOptions: {
            classes: 'shepherd-custom',
            scrollTo: { behavior: 'smooth', block: 'center' }
        }
    });

    // PASSO 1: Boas-vindas no Dashboard
    tour.addStep({
        id: 'boas-vindas',
        title: 'Bem-vindo ao Enchant!',
        text: 'Vamos fazer um rápido tour pelas principais funcionalidades da sua nova ferramenta de gestão. Clique em "Próximo" para começar.',
        buttons: [{ text: 'Pular', action: tour.cancel, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    // PASSO 2: Explicando a Sidebar
    tour.addStep({
        id: 'sidebar',
        title: 'Navegação Principal',
        text: 'Aqui na barra lateral você encontra todas as seções do seu painel. Em telas de computador, passe o mouse sobre ela para expandir.',
        attachTo: { element: '#sidebar', on: 'right' }, // Aponta para a sua sidebar

        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'dashboard',
        title: 'Seu Dashboard',
        text: 'Esta é a sua tela principal. Aqui você tem uma visão geral de suas doações, estoque e atividades recentes.',
        attachTo: { element: 'a[href="/dashboard"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'mapa',
        title: 'Mapa Interativo',
        text: 'Explore o mapa para visualizar dados de risco e vulnerabilidade de desastres naturais em todo o Brasil.',
        attachTo: { element: 'a[href="/mapa"]', on: 'right' },

        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    // PASSO 3: Perfil da ONG
    tour.addStep({
        id: 'perfil',
        title: 'Seu Perfil',
        text: 'O primeiro passo é completar o seu perfil. Clique aqui para adicionar sua logo, foto e verificar suas informações.',
        attachTo: { element: 'a[href="/perfil"]', on: 'right' }, // Aponta para o link de Perfil no header

        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    // PASSO 4: Gestão de Doações
    tour.addStep({
        id: 'doacoes',
        title: 'Gestão de Doações',
        text: 'Nesta seção, você pode registrar todas as doações que sua ONG recebe e também as distribuições que realiza, mantendo um controle de estoque preciso.',
        attachTo: { element: 'a[href="/doacao"]', on: 'right' }, // Aponta para o link de Doação na sidebar

        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'historico',
        title: 'Histórico de Doações',
        text: 'Consulte e gere o extrato completo de todas as entradas e saídas de doações registradas na plataforma.',
        attachTo: { element: 'a[href="/historico-doacoes"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'relatorios',
        title: 'Relatórios',
        text: 'Aqui você pode gerar e baixar relatórios para prestar contas aos seus doadores.',
        attachTo: { element: 'a[href="/transparencia/relatorios"]', on: 'right' }, // Usando '*=' para flexibilidade
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'contratos',
        title: 'Contratos',
        text: 'Gerencie os contratos com seus parceiros e fornecedores, mantendo tudo organizado em um só lugar.',
        attachTo: { element: 'a[href="/transparencia/contratos"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'auditoria',
        title: 'Notas de Auditoria',
        text: 'Anexe e gerencie os pareceres e notas de auditorias internas ou externas.',
        attachTo: { element: 'a[href="/transparencia/notas-auditoria"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'documentos',
        title: 'Documentos Comprobatórios',
        text: 'Faça o upload de outros documentos importantes, como notas fiscais e recibos.',
        attachTo: { element: 'a[href="/transparencia/documentos-comprobatorios"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'financeiro',
        title: 'Gestão Financeira',
        text: 'Controle as entradas e saídas financeiras da sua organização.',
        attachTo: { element: 'a[href="/transparencia/gestao-financeira"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    tour.addStep({
        id: 'parcerias',
        title: 'Gestão de Parcerias',
        text: 'Cadastre e acompanhe o status de todas as parcerias da sua ONG.',
        attachTo: { element: 'a[href="/transparencia/parcerias"]', on: 'right' },
        canClickTarget: false,

        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 20] } }]
        },

        buttons: [{ text: 'Voltar', action: tour.back, classes: 'btn-secundario' }, { text: 'Próximo', action: tour.next, classes: 'btn-principal' }]
    });

    // PASSO FINAL
    tour.addStep({
        id: 'final',
        title: 'Tudo Pronto!',
        text: 'Você concluiu o tour. Agora, explore a plataforma e comece a transformar a gestão da sua organização!',
        buttons: [{ text: 'Concluir', action: tour.next, classes: 'btn-principal' }]
    });

    // Evento que é disparado quando o tour termina ou é cancelado
    tour.on('complete', marcarTutorialComoVisto);
    tour.on('cancel', marcarTutorialComoVisto);

    async function marcarTutorialComoVisto() {
        console.log("Tutorial finalizado. Marcando como visto no backend.");
        try {
            const token = session.access_token;
            await fetch('/api/user/tutorial-concluido', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Não foi possível marcar o tutorial como concluído:", error);
        }
    }

    // Inicia o tour
    tour.start();
}