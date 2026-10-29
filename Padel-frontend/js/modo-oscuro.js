(function() {
    // El sistema opera exclusivamente en Modo Claro formal
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
})();
