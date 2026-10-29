(function () {
    console.log("Controlador de Canchas conectado a API MySQL Iniciado");

    const inputSena = document.getElementById('param-sena');
    const inputTiempo = document.getElementById('param-tiempo-cancelacion');
    const inputHora = document.getElementById('param-hora-noche');
    const btnGuardarParametros = document.getElementById('btn-guardar-parametros');

    // Elementos del Modal de Tarifas
    const modalTarifa = document.getElementById('modal-tarifa-cancha');
    const formTarifa = document.getElementById('form-tarifa-cancha');
    const inputNuevoCosto = document.getElementById('input-nuevo-costo-cancha');
    const btnCerrarModalTarifa = document.getElementById('btn-cerrar-modal-tarifa');
    const btnCancelarModalTarifa = document.getElementById('btn-cancelar-modal-tarifa');

    let canchasEstadoLocal = {};

    // Lógica de Parámetros Globales
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
                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion("Parámetros generales guardados correctamente.");
                }
            }
        });
    }

    // Actualizar vista previa en vivo en el modal de tarifas
    function actualizarPreviaTarifa(valor) {
        const base = Math.max(0, parseFloat(valor) || 0);
        const rec90 = Math.round(base * 0.5);
        const rec120 = Math.round(base * 0.85);

        const el60 = document.getElementById('prev-60');
        const el90 = document.getElementById('prev-90');
        const el120 = document.getElementById('prev-120');

        if (el60) el60.textContent = `$${base.toLocaleString('es-AR')}`;
        if (el90) el90.textContent = `$${(base + rec90).toLocaleString('es-AR')} (+$${rec90.toLocaleString('es-AR')})`;
        if (el120) el120.textContent = `$${(base + rec120).toLocaleString('es-AR')} (+$${rec120.toLocaleString('es-AR')})`;
    }

    if (inputNuevoCosto) {
        inputNuevoCosto.addEventListener('input', (e) => actualizarPreviaTarifa(e.target.value));
    }

    if (btnCerrarModalTarifa && modalTarifa) {
        btnCerrarModalTarifa.addEventListener('click', () => modalTarifa.close());
    }
    if (btnCancelarModalTarifa && modalTarifa) {
        btnCancelarModalTarifa.addEventListener('click', () => modalTarifa.close());
    }

    function abrirModalActualizarTarifa(cancha) {
        // Bloquear cambio de precios si la cancha está en mantenimiento
        const toggle = document.getElementById(`toggle${cancha.id}`);
        if (toggle && !toggle.checked) {
            if (window.mostrarNotificacion) {
                window.mostrarNotificacion(`${cancha.nombre} está en mantenimiento. Habilítala primero para modificar su tarifa.`, "error");
            }
            return;
        }

        if (!modalTarifa) return;
        const costoActual = parseFloat(canchasEstadoLocal[cancha.id]?.costo_base || cancha.costo_base || 8500);

        document.getElementById('tarifa-cancha-id').value = cancha.id;
        document.getElementById('modal-tarifa-titulo').textContent = `Actualizar Tarifa - ${cancha.nombre}`;
        document.getElementById('modal-tarifa-subtitulo').textContent = cancha.tipo || 'Pista oficial';
        inputNuevoCosto.value = costoActual;
        actualizarPreviaTarifa(costoActual);

        modalTarifa.showModal();
    }

    if (formTarifa) {
        formTarifa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('tarifa-cancha-id').value);
            const nuevoCosto = parseFloat(inputNuevoCosto.value);
            const toggle = document.getElementById(`toggle${id}`);

            // Doble validación de seguridad: impedir guardar si está en mantenimiento
            if (toggle && !toggle.checked) {
                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion("No se puede cambiar el precio de una cancha en mantenimiento.", "error");
                }
                modalTarifa.close();
                return;
            }

            if (isNaN(nuevoCosto) || nuevoCosto <= 0) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Ingresá un monto válido mayor a 0.", "error");
                return;
            }

            const btnSubmit = document.getElementById('btn-guardar-tarifa-modal');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = "Guardando...";
            }

            try {
                const putRes = await fetch('../api/canchas.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, costo_base: nuevoCosto })
                });

                if (putRes.ok) {
                    modalTarifa.close();
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(`Tarifa de Cancha ${id} actualizada a $${nuevoCosto.toLocaleString('es-AR')}.`);
                    }
                    await cargarCanchasDesdeAPI();
                } else {
                    if (window.mostrarNotificacion) window.mostrarNotificacion("Error al actualizar tarifa.", "error");
                }
            } catch (err) {
                console.error("Error:", err);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al actualizar tarifa.", "error");
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<span class="material-symbols-outlined text-[18px]">check</span> Confirmar Tarifa`;
                }
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
                canchasEstadoLocal[cancha.id] = cancha;
                const toggle = document.getElementById(`toggle${cancha.id}`);
                if (!toggle) return;

                const article = toggle.closest('article');
                if (!article) return;

                const costoNumerico = parseFloat(cancha.costo_base || cancha.costoBase || 0);
                const spanCosto = article.querySelector('.val-costo-base');
                if (spanCosto) spanCosto.textContent = costoNumerico.toLocaleString('es-AR');

                const spanRecargo90 = article.querySelector('.val-recargo-90');
                if (spanRecargo90) spanRecargo90.textContent = Math.round(costoNumerico * 0.5).toLocaleString('es-AR');

                const spanRecargo120 = article.querySelector('.val-recargo-120');
                if (spanRecargo120) spanRecargo120.textContent = Math.round(costoNumerico * 0.85).toLocaleString('es-AR');

                const estaActiva = (cancha.activa == 1 || cancha.activa === true);
                toggle.checked = estaActiva;
                actualizarVisualToggle(toggle, estaActiva);

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
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(nuevaActiva === 1 ? `${cancha.nombre} habilitada para reservas.` : `${cancha.nombre} puesta en mantenimiento (Tarifas bloqueadas).`);
                        }
                    } catch (err) {
                        console.error("Error al actualizar estado de cancha:", err);
                        if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al actualizar cancha.", "error");
                        toggle.checked = !e.target.checked;
                        actualizarVisualToggle(toggle, toggle.checked);
                    }
                };

                const botonActualizar = article.querySelector('.btn-actualizar-tarifa');
                if (botonActualizar) {
                    botonActualizar.onclick = () => abrirModalActualizarTarifa(cancha);
                }
            });
        } catch (error) {
            console.error("Error al cargar canchas desde MySQL:", error);
        }
    }

    function actualizarVisualToggle(toggle, activa) {
        const article = toggle.closest('article');
        if (!article) return;
        const contenido = article.querySelector('.contenedor-tarifas-cancha');
        const boton = article.querySelector('.btn-actualizar-tarifa');

        let labelEstado = article.querySelector('.badge-estado-cancha');
        if (!labelEstado) {
            labelEstado = document.createElement('span');
            toggle.closest('label').parentElement.insertBefore(labelEstado, toggle.closest('label'));
        }

        if (activa) {
            labelEstado.textContent = 'Habilitada';
            labelEstado.className = 'badge-estado-cancha text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] px-2.5 py-1 rounded-md mr-2.5 border border-[#4caf50]/20';
            if (contenido) contenido.classList.remove('opacity-45', 'pointer-events-none', 'grayscale');
            if (boton) {
                boton.disabled = false;
                boton.innerHTML = `<span class="material-symbols-outlined text-[18px]">edit_square</span> Actualizar Tarifas`;
                boton.className = 'btn-actualizar-tarifa mt-6 w-full py-3 px-4 rounded-xl font-headline font-bold text-sm bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm';
            }
        } else {
            labelEstado.textContent = 'Mantenimiento';
            labelEstado.className = 'badge-estado-cancha text-[11px] font-bold bg-surface-container-high text-on-surface-variant px-2.5 py-1 rounded-md mr-2.5';
            if (contenido) contenido.classList.add('opacity-45', 'pointer-events-none', 'grayscale');
            if (boton) {
                boton.disabled = true;
                boton.innerHTML = `<span class="material-symbols-outlined text-[18px]">lock</span> En Mantenimiento (Bloqueado)`;
                boton.className = 'btn-actualizar-tarifa mt-6 w-full py-3 px-4 rounded-xl font-headline font-bold text-sm bg-surface-container text-on-surface-variant/60 flex items-center justify-center gap-2 cursor-not-allowed';
            }
        }
    }

    cargarParametros();
    cargarCanchasDesdeAPI();
})();
