(function() {
    console.log("Controlador de Canchas (MVP Memoria) Iniciado");

    // Elementos del panel de parámetros
    const inputSena = document.getElementById('param-sena');
    const inputTiempo = document.getElementById('param-tiempo-cancelacion');
    const inputHora = document.getElementById('param-hora-noche');
    const btnGuardarParametros = document.getElementById('btn-guardar-parametros');

    // 1. Lógica de Parámetros Globales
    function cargarParametrosLocal() {
        if (window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
            const params = window.Almacenamiento.obtenerParametros();
            if (inputSena) inputSena.value = params.senaFija;
            if (inputTiempo) inputTiempo.value = params.tiempoCancelacion;
            if (inputHora) inputHora.value = params.horaNoche;
        }
    }

    if (btnGuardarParametros) {
        btnGuardarParametros.addEventListener('click', () => {
            const nuevosParams = {
                senaFija: parseFloat(inputSena.value),
                tiempoCancelacion: parseInt(inputTiempo.value),
                horaNoche: inputHora.value
            };
            
            if (window.Almacenamiento && window.Almacenamiento.guardarParametros) {
                window.Almacenamiento.guardarParametros(nuevosParams);
                // Feedback visual rápido
                const textoOriginal = btnGuardarParametros.textContent;
                btnGuardarParametros.textContent = "¡Guardado!";
                btnGuardarParametros.classList.add('bg-on-primary-container');
                
                setTimeout(() => {
                    btnGuardarParametros.textContent = textoOriginal;
                    btnGuardarParametros.classList.remove('bg-on-primary-container');
                }, 2000);
            }
        });
    }

    // 2. Lógica de Canchas y Toggles
    function cargarCanchasLocal() {
        const canchas = window.Almacenamiento.obtenerCanchas();
        
        canchas.forEach(cancha => {
            const toggle = document.getElementById(`toggle${cancha.id}`);
            if (toggle) {
                const article = toggle.closest('article');
                if (!article) return;
                
                const spanCosto = article.querySelector('.text-on-surface.font-headline.font-bold span:nth-child(2)');
                if (spanCosto) spanCosto.textContent = cancha.costoBase || cancha.costo_base;
                
                toggle.checked = cancha.activa;
                actualizarVisualToggle(toggle, cancha.activa);

                toggle.onchange = (e) => {
                    const nuevaActiva = e.target.checked;
                    actualizarVisualToggle(toggle, nuevaActiva);
                    window.Almacenamiento.actualizarCanchaCompleta(cancha.id, { activa: nuevaActiva });
                };

                const botonActualizar = article.querySelector('button.bg-transparent');
                if (botonActualizar) {
                    botonActualizar.onclick = () => {
                        const costoActual = cancha.costoBase || cancha.costo_base;
                        const nuevoCosto = prompt(`Nuevo costo base para ${cancha.nombre}:`, costoActual);
                        if (nuevoCosto && !isNaN(nuevoCosto)) {
                            const costoFloat = parseFloat(nuevoCosto);
                            window.Almacenamiento.actualizarCanchaCompleta(cancha.id, { costo_base: costoFloat });
                            if (spanCosto) spanCosto.textContent = costoFloat;
                        }
                    };
                }
            }
        });
    }

    function actualizarVisualToggle(toggle, activa) {
        const article = toggle.closest('article');
        const contenido = article.querySelector('.space-y-4');
        const boton = article.querySelector('button.bg-transparent');
        
        if (activa) {
            contenido.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
            if (boton) {
                boton.textContent = 'Actualizar Tarifas';
                boton.classList.remove('text-secondary');
                boton.classList.add('text-primary');
            }
        } else {
            contenido.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
            if (boton) {
                boton.textContent = 'En Mantenimiento';
                boton.classList.remove('text-primary');
                boton.classList.add('text-secondary');
            }
        }
    }

    // Iniciar ambos módulos
    cargarParametrosLocal();
    cargarCanchasLocal();
})();