(function() {
    console.log("Controlador de Canchas conectado a API MySQL Iniciado");

    // Elementos del panel de parámetros
    const inputSena = document.getElementById('param-sena');
    const inputTiempo = document.getElementById('param-tiempo-cancelacion');
    const inputHora = document.getElementById('param-hora-noche');
    const btnGuardarParametros = document.getElementById('btn-guardar-parametros');

    // 1. Lógica de Parámetros Globales (Almacenados en configuración)
    function cargarParametros() {
        if (window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
            const params = window.Almacenamiento.obtenerParametros();
            if (inputSena && params.senaFija) inputSena.value = params.senaFija;
            if (inputTiempo && params.tiempoCancelacion) inputTiempo.value = params.tiempoCancelacion;
            if (inputHora && params.horaNoche) inputHora.value = params.horaNoche;
        }
    }

    if (btnGuardarParametros) {
        btnGuardarParametros.addEventListener('click', () => {
            const nuevosParams = {
                senaFija: parseFloat(inputSena.value) || 2500,
                tiempoCancelacion: parseInt(inputTiempo.value) || 24,
                horaNoche: inputHora.value || "18:00"
            };
            
            if (window.Almacenamiento && window.Almacenamiento.guardarParametros) {
                window.Almacenamiento.guardarParametros(nuevosParams);
                
                const textoOriginal = btnGuardarParametros.textContent;
                btnGuardarParametros.textContent = "¡Guardado con Éxito!";
                btnGuardarParametros.classList.add('bg-primary-container', 'text-on-primary-container');
                
                setTimeout(() => {
                    btnGuardarParametros.textContent = textoOriginal;
                    btnGuardarParametros.classList.remove('bg-primary-container', 'text-on-primary-container');
                }, 2000);
            }
        });
    }

    // 2. Lógica de Canchas con API MySQL
    async function cargarCanchasDesdeAPI() {
        try {
            const res = await fetch('../api/canchas.php');
            if (!res.ok) throw new Error("Error al obtener canchas");
            const canchas = await res.json();

            canchas.forEach(cancha => {
                const toggle = document.getElementById(`toggle${cancha.id}`);
                if (!toggle) return;

                const article = toggle.closest('article');
                if (!article) return;

                const costoNumerico = parseFloat(cancha.costo_base || cancha.costoBase || 0);
                const spanCosto = article.querySelector('.text-on-surface.font-headline.font-bold span:nth-child(2)');
                if (spanCosto) spanCosto.textContent = costoNumerico.toLocaleString('es-AR');

                // Recargos calculados dinámicamente proporcionalmente
                const spanRecargo90 = article.querySelector('.space-y-4 > div:nth-child(2) span:nth-child(2)');
                if (spanRecargo90) spanRecargo90.textContent = Math.round(costoNumerico * 0.5).toLocaleString('es-AR');

                const spanRecargo120 = article.querySelector('.space-y-4 > div:nth-child(3) span:nth-child(2)');
                if (spanRecargo120) spanRecargo120.textContent = Math.round(costoNumerico * 0.85).toLocaleString('es-AR');

                const estaActiva = (cancha.activa == 1 || cancha.activa === true);
                toggle.checked = estaActiva;
                actualizarVisualToggle(toggle, estaActiva);

                // Evento cambio de estado (Activa / Mantenimiento)
                toggle.onchange = async (e) => {
                    const nuevaActiva = e.target.checked ? 1 : 0;
                    actualizarVisualToggle(toggle, nuevaActiva === 1);

                    try {
                        const putRes = await fetch('../api/canchas.php', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: cancha.id, activa: nuevaActiva })
                        });
                        if (!putRes.ok) throw new Error("No se pudo actualizar el estado de la cancha.");
                    } catch (err) {
                        console.error("Error al actualizar estado de cancha:", err);
                        alert("Error de conexión al actualizar cancha.");
                        toggle.checked = !e.target.checked;
                        actualizarVisualToggle(toggle, toggle.checked);
                    }
                };

                // Botón Actualizar Tarifas
                const botonActualizar = article.querySelector('button');
                if (botonActualizar) {
                    botonActualizar.onclick = async () => {
                        const nuevoCostoStr = prompt(`Nuevo costo base por hora para ${cancha.nombre}:`, costoNumerico);
                        if (nuevoCostoStr !== null && nuevoCostoStr.trim() !== '') {
                            const nuevoCosto = parseFloat(nuevoCostoStr);
                            if (isNaN(nuevoCosto) || nuevoCosto <= 0) {
                                alert("Por favor ingresá un monto numérico válido mayor a 0.");
                                return;
                            }

                            try {
                                const putRes = await fetch('../api/canchas.php', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: cancha.id, costo_base: nuevoCosto })
                                });
                                if (putRes.ok) {
                                    if (spanCosto) spanCosto.textContent = nuevoCosto.toLocaleString('es-AR');
                                    if (spanRecargo90) spanRecargo90.textContent = Math.round(nuevoCosto * 0.5).toLocaleString('es-AR');
                                    if (spanRecargo120) spanRecargo120.textContent = Math.round(nuevoCosto * 0.85).toLocaleString('es-AR');
                                } else {
                                    alert("Error al actualizar tarifa.");
                                }
                            } catch (err) {
                                console.error("Error:", err);
                                alert("Error de conexión al actualizar tarifa.");
                            }
                        }
                    };
                }
            });
        } catch (error) {
            console.error("Error al cargar canchas desde MySQL:", error);
        }
    }

    function actualizarVisualToggle(toggle, activa) {
        const article = toggle.closest('article');
        if (!article) return;
        const contenido = article.querySelector('.space-y-4');
        const boton = article.querySelector('button');
        
        if (activa) {
            if (contenido) contenido.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
            if (boton) {
                boton.textContent = 'Actualizar Tarifas';
                boton.classList.remove('text-secondary');
                boton.classList.add('text-primary');
            }
        } else {
            if (contenido) contenido.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
            if (boton) {
                boton.textContent = 'En Mantenimiento';
                boton.classList.remove('text-primary');
                boton.classList.add('text-secondary');
            }
        }
    }

    // Inicializar
    cargarParametros();
    cargarCanchasDesdeAPI();
})();