document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorPassword = document.getElementById('error-password');
    const btnLogin = document.getElementById('btn-login');
    const spinnerLogin = document.getElementById('spinner-login');
    const alertaError = document.getElementById('alerta-error');
    const togglePasswordBtn = passwordInput.nextElementSibling;

    // Toggle password visibilidad
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = togglePasswordBtn.querySelector('.material-symbols-outlined');
        icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    // Form submission handling
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Reset states
        alertaError.classList.add('hidden');
        errorPassword.classList.add('hidden');

        const email = emailInput.value;
        const password = passwordInput.value;

        // Validation
        if (password.length < 6) {
            errorPassword.classList.remove('hidden');
            return;
        }

        // Loading state
        btnLogin.disabled = true;
        btnLogin.classList.add('opacity-80', 'cursor-not-allowed');
        spinnerLogin.classList.remove('hidden');

        // Simulacion
        setTimeout(() => {
            if (email === 'admin@paddle.com' && password === '123456') {
                console.log('Login exitoso, guardando JWT...');
                // Redirigir o lógica de éxito
            } else {
                alertaError.classList.remove('hidden');
            }

            // Final state reset
            btnLogin.disabled = false;
            btnLogin.classList.remove('opacity-80', 'cursor-not-allowed');
            spinnerLogin.classList.add('hidden');
        }, 2000);
    });
});