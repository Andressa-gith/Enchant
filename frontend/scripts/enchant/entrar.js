document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');

    form.addEventListener('submit', async (e) => {

        e.preventDefault()
        const formData = new FormData(form);

        try{

            const response = await fetch('/login', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Erro na requisição');

            const data = await response.json();
            console.log('📦 Dados recebidos:', data);
            form.reset();

            setTimeout(() => {
                console.log('Redirecionando');
                if (data.redirectTo) {
                window.location.href = data.redirectTo;
                }
            }, 100);

        }catch(error){
            console.error('❌ Erro na requisição:', error);
        }

    })
});