document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorPassword = document.getElementById('error-password');
    const btnLogin = document.getElementById('btn-login');
    const spinnerLogin = document.getElementById('spinner-login');
    const alertaError = document.getElementById('alerta-error');
    const togglePasswordBtn = document.getElementById('btn-toggle-password');

    // Toggle password visibilidad manejado directo en index.html
    // (eliminado listener por conflicto)

    // Manejo del formulario de login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Limpiar estados
        alertaError.classList.add('hidden');
        errorPassword.classList.add('hidden');

        const email = emailInput.value;
        const password = passwordInput.value;

        // Validación
        if (password.length < 6) {
            errorPassword.classList.remove('hidden');
            return;
        }

        // Mostrar estado de carga
        btnLogin.disabled = true;
        btnLogin.classList.add('opacity-80', 'cursor-not-allowed');
        spinnerLogin.classList.remove('hidden');

        // Petición real al Backend PHP
        fetch('../api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo: email, contrasena: password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.usuario && data.token) {
                console.log('Login exitoso:', data.usuario.nombre);
                
                // Si el sistema anterior Almacenamiento existe, lo usamos para guardar la sesión
                if (window.Almacenamiento && window.Almacenamiento.guardarUsuarioLogueado) {
                    window.Almacenamiento.guardarUsuarioLogueado(data.usuario);
                } else {
                    // Fallback
                    localStorage.setItem('usuarioLogueado', JSON.stringify(data.usuario));
                }
                
                localStorage.setItem('jwt_token', data.token);
                window.location.reload();
            } else {
                // Mostrar mensaje de error del backend
                const errorSpan = alertaError.querySelector('span:last-child') || alertaError;
                if(errorSpan && data.error) errorSpan.textContent = data.error;
                alertaError.classList.remove('hidden');
                
                btnLogin.disabled = false;
                btnLogin.classList.remove('opacity-80', 'cursor-not-allowed');
                spinnerLogin.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error('Error de red durante login:', error);
            const errorSpan = alertaError.querySelector('span:last-child') || alertaError;
            if(errorSpan) errorSpan.textContent = "Error de conexión con el servidor.";
            alertaError.classList.remove('hidden');

            btnLogin.disabled = false;
            btnLogin.classList.remove('opacity-80', 'cursor-not-allowed');
            spinnerLogin.classList.add('hidden');
        });
    });
});