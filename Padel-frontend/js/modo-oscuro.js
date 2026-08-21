(function() {
    // 1. Verificamos si ya había una preferencia guardada o si el sistema está en oscuro
    const esOscuro = localStorage.getItem('theme') === 'dark' || 
                    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (esOscuro) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // 2. Función para alternar
    window.alternarModoOscuro = () => {
        document.documentElement.classList.toggle('dark');
        const esAhoraOscuro = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', esAhoraOscuro ? 'dark' : 'light');
    };
})();