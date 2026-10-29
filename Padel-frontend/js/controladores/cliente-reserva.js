(function() {
    console.log("Controlador Nueva Reserva Cliente conectado a API MySQL");

    const obtenerHoyIso = () => {
        if (window.obtenerFechaHoyLocal) return window.obtenerFechaHoyLocal();
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    let estado = {
        fechaIso: obtenerHoyIso(),
        fechaStr: "Hoy",
        duracion: 90,
        tipo: "Cancha 1 (Techada)",
        hora: null,
        precioTotal: 0,
        sena: 2500,
        canchaId: 1
    };

    let canchasDisponibles = [];
    let turnosDelDia = [];

    const inputCalendario = document.getElementById('cliente-input-fecha');
    const fechasContainer = document.getElementById('fechas-container');
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    async function inicializarParametrosYCanchas() {
        if (window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
            const param = window.Almacenamiento.obtenerParametros();
            if (param && param.senaFija) estado.sena = parseFloat(param.senaFija);
        }

        try {
            const res = await fetch('../api/canchas.php');
            if (res.ok) canchasDisponibles = await res.json();
        } catch (e) {
            console.warn("No se pudieron cargar tarifas de canchas:", e);
        }

        // Actualizar botones de cancha según catálogo real
        const botonesTipo = document.querySelectorAll('.btn-tipo');
        botonesTipo.forEach((btn, index) => {
            const c = canchasDisponibles[index];
            if (c) {
                const num = index + 1;
                const enMant = parseInt(c.activa) === 0;
                btn.dataset.cancha = c.id;
                btn.dataset.val = `Cancha ${num} (${c.tipo})`;
                btn.innerHTML = `Cancha ${num} ${enMant ? '<span class="block text-[9px] text-error">Mant.</span>' : `<span class="block text-[10px] opacity-80">$${parseFloat(c.costo_base).toLocaleString('es-AR')}/h</span>`}`;
                if (enMant) {
                    btn.disabled = true;
                    btn.className = 'btn-tipo py-2 px-2 rounded-xl font-bold text-xs bg-surface-container text-on-surface-variant/40 border border-outline-variant/15 cursor-not-allowed';
                }
            }
        });
    }

    function formatearFechaCorta(isoStr) {
        const hoyIso = obtenerHoyIso();
        const partes = isoStr.split('-');
        const f = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        const diaNombre = (isoStr === hoyIso) ? 'Hoy' : diasSemana[f.getDay()];
        return `${diaNombre} ${f.getDate()}/${partes[1]}`;
    }

    function generarFechas() {
        if (!fechasContainer) return;
        fechasContainer.innerHTML = '';
        const hoyIso = obtenerHoyIso();
        const partesHoy = hoyIso.split('-');
        const baseDate = new Date(parseInt(partesHoy[0]), parseInt(partesHoy[1]) - 1, parseInt(partesHoy[2]));

        if (inputCalendario) {
            inputCalendario.min = hoyIso;
            inputCalendario.value = estado.fechaIso;
        }

        for (let i = 0; i < 7; i++) {
            const fechaIter = new Date(baseDate);
            fechaIter.setDate(baseDate.getDate() + i);

            const y = fechaIter.getFullYear();
            const m = String(fechaIter.getMonth() + 1).padStart(2, '0');
            const d = String(fechaIter.getDate()).padStart(2, '0');
            const fechaIso = `${y}-${m}-${d}`;
            const diaNombre = i === 0 ? 'Hoy' : diasSemana[fechaIter.getDay()];
            const diaNumero = fechaIter.getDate();
            const fechaTxt = `${diaNombre} ${diaNumero}/${m}`;

            const esActiva = (estado.fechaIso === fechaIso);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = esActiva
                ? 'flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-primary text-on-primary shadow-sm transition-all btn-fecha cursor-pointer'
                : 'flex flex-col items-center justify-center py-3 px-2 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/15 transition-all btn-fecha cursor-pointer';

            btn.innerHTML = `
                <span class="text-[11px] font-bold uppercase ${esActiva ? 'text-on-primary/90' : 'text-on-surface-variant'}">${diaNombre}</span>
                <span class="text-lg font-extrabold font-headline mt-0.5">${diaNumero}</span>
            `;

            btn.dataset.iso = fechaIso;
            btn.dataset.txt = fechaTxt;

            btn.addEventListener('click', async () => {
                await seleccionarFecha(fechaIso, fechaTxt);
            });

            fechasContainer.appendChild(btn);

            if (esActiva) {
                estado.fechaStr = fechaTxt;
                const elTxt = document.getElementById('txt-fecha-seleccionada');
                if (elTxt) elTxt.textContent = estado.fechaStr;
            }
        }
    }

    async function seleccionarFecha(nuevaIso, nuevaTxt) {
        const hoyIso = obtenerHoyIso();
        if (nuevaIso < hoyIso) {
            if (window.mostrarNotificacion) {
                window.mostrarNotificacion("No se pueden elegir fechas anteriores al día de hoy.", "error");
            }
            nuevaIso = hoyIso;
        }

        estado.fechaIso = nuevaIso;
        estado.fechaStr = nuevaTxt || formatearFechaCorta(nuevaIso);
        estado.hora = null;

        if (inputCalendario) inputCalendario.value = estado.fechaIso;
        const elTxt = document.getElementById('txt-fecha-seleccionada');
        if (elTxt) elTxt.textContent = estado.fechaStr;

        generarFechas();
        await actualizarDisponibilidadFecha();
        actualizarResumen();
    }

    if (inputCalendario) {
        inputCalendario.min = obtenerHoyIso();
        inputCalendario.addEventListener('change', async () => {
            const hoyIso = obtenerHoyIso();
            if (!inputCalendario.value) return;
            if (inputCalendario.value < hoyIso) {
                inputCalendario.value = hoyIso;
                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion("No se permiten fechas anteriores al día de hoy.", "error");
                }
            }
            await seleccionarFecha(inputCalendario.value, formatearFechaCorta(inputCalendario.value));
        });
    }

    async function actualizarDisponibilidadFecha() {
        if (!estado.fechaIso) return;
        try {
            const res = await fetch(`../api/turnos.php?fecha=${estado.fechaIso}`);
            if (res.ok) {
                turnosDelDia = await res.json();
            } else {
                turnosDelDia = [];
            }
        } catch (e) {
            turnosDelDia = [];
        }
        renderizarTodosLosHorarios();
    }

    // --- MANEJO DE BOTONES (Duración y Cancha) ---
    document.querySelectorAll('.btn-duracion').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-duracion').forEach(b => {
                b.className = 'btn-duracion py-2.5 px-3 rounded-xl font-bold text-xs bg-surface-container-low border border-outline-variant/20 text-on-surface hover:bg-surface-container transition-all cursor-pointer';
            });
            const cur = e.currentTarget;
            cur.className = 'btn-duracion py-2.5 px-3 rounded-xl font-bold text-xs bg-primary text-on-primary shadow-sm transition-all cursor-pointer';
            estado.duracion = parseInt(cur.dataset.val);
            actualizarResumen();
        });
    });

    document.querySelectorAll('.btn-tipo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.currentTarget.disabled) return;
            document.querySelectorAll('.btn-tipo:not([disabled])').forEach(b => {
                b.className = 'btn-tipo py-2.5 px-2 rounded-xl font-bold text-xs bg-surface-container-low border border-outline-variant/20 text-on-surface hover:bg-surface-container transition-all cursor-pointer';
            });
            const cur = e.currentTarget;
            cur.className = 'btn-tipo py-2.5 px-2 rounded-xl font-bold text-xs bg-primary text-on-primary shadow-sm transition-all cursor-pointer';
            estado.canchaId = parseInt(cur.dataset.cancha || 1);
            estado.tipo = cur.dataset.val || `Cancha ${estado.canchaId}`;
            estado.hora = null;
            renderizarTodosLosHorarios();
            actualizarResumen();
        });
    });

    const horariosManana = ['08:00', '09:30', '11:00', '12:30'];
    const horariosTarde = ['14:00', '15:30', '17:00', '18:30'];
    const horariosNoche = ['20:00', '21:30', '23:00'];

    function renderizarHorarios(contenedorId, listaHoras) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;
        contenedor.innerHTML = '';

        listaHoras.forEach(hora => {
            const estaOcupado = turnosDelDia.some(t => {
                const mismaCancha = (parseInt(t.cancha_id) === estado.canchaId);
                const turnoActivo = (t.estado !== 'CANCELADO' && t.estado !== 'FINALIZADO');
                const tHora = (t.hora_inicio || '').substring(0, 5);
                return mismaCancha && turnoActivo && tHora === hora;
            });

            const btn = document.createElement('button');
            btn.type = 'button';

            if (estaOcupado) {
                btn.className = 'btn-hora py-2.5 px-3 bg-surface-container text-on-surface-variant/40 rounded-xl text-xs font-bold cursor-not-allowed border border-outline-variant/10 line-through';
                btn.textContent = `${hora} (Reservado)`;
                btn.disabled = true;
            } else {
                const esSeleccionado = (estado.hora === hora);
                btn.className = esSeleccionado
                    ? 'btn-hora py-2.5 px-3 bg-primary text-on-primary rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer'
                    : 'btn-hora py-2.5 px-3 bg-surface-container-low text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container transition-colors border border-outline-variant/15 cursor-pointer';
                btn.textContent = `${hora} hs`;

                btn.addEventListener('click', () => {
                    document.querySelectorAll('.btn-hora:not([disabled])').forEach(b => {
                        b.className = 'btn-hora py-2.5 px-3 bg-surface-container-low text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container transition-colors border border-outline-variant/15 cursor-pointer';
                    });
                    btn.className = 'btn-hora py-2.5 px-3 bg-primary text-on-primary rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer';
                    estado.hora = hora;
                    actualizarResumen();
                });
            }

            contenedor.appendChild(btn);
        });
    }

    function renderizarTodosLosHorarios() {
        renderizarHorarios('horarios-manana', horariosManana);
        renderizarHorarios('horarios-tarde', horariosTarde);
        renderizarHorarios('horarios-noche', horariosNoche);
    }

    function actualizarResumen() {
        const elFecha = document.getElementById('resumen-fecha');
        if (!elFecha) return;

        elFecha.textContent = estado.fechaStr || '--';
        document.getElementById('resumen-hora').textContent = estado.hora ? `${estado.hora} hs` : 'Seleccione hora';
        document.getElementById('resumen-duracion').textContent = `${estado.duracion} min`;
        document.getElementById('resumen-cancha').textContent = `Cancha ${estado.canchaId}`;
        document.getElementById('resumen-tipo').textContent = estado.tipo;

        let costoHora = 8500;
        const cancha = canchasDisponibles.find(c => parseInt(c.id) === parseInt(estado.canchaId));
        if (cancha && cancha.costo_base) costoHora = parseFloat(cancha.costo_base);

        estado.precioTotal = Math.round((estado.duracion / 60) * costoHora);
        const saldoRestante = Math.max(0, estado.precioTotal - estado.sena);

        document.getElementById('resumen-total').textContent = `$${estado.precioTotal.toLocaleString('es-AR')}`;
        document.getElementById('resumen-sena').textContent = `$${estado.sena.toLocaleString('es-AR')}`;
        const elRestante = document.getElementById('resumen-restante');
        if (elRestante) elRestante.textContent = `$${saldoRestante.toLocaleString('es-AR')}`;

        const btnPagar = document.getElementById('btn-pagar-sena');
        if (btnPagar) {
            btnPagar.disabled = !(estado.fechaIso && estado.hora);
        }
    }

    const btnPagar = document.getElementById('btn-pagar-sena');
    if (btnPagar) {
        btnPagar.addEventListener('click', async () => {
            if (!estado.hora) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Por favor, selecciona un horario disponible.", "error");
                return;
            }

            const hoyIso = obtenerHoyIso();
            if (estado.fechaIso < hoyIso) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("No puedes reservar en una fecha anterior a hoy.", "error");
                return;
            }

            let usuario = null;
            if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                usuario = window.Almacenamiento.obtenerUsuarioLogueado();
            }

            const nombreCliente = usuario ? usuario.nombre : 'Cliente Web';
            const usuarioId = usuario ? usuario.id : 3;

            btnPagar.disabled = true;
            btnPagar.textContent = "Procesando reserva...";

            try {
                const resTurno = await fetch('../api/turnos.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cancha_id: estado.canchaId,
                        cliente_id: usuarioId,
                        cliente_nombre: nombreCliente,
                        fecha: estado.fechaIso,
                        hora_inicio: estado.hora,
                        duracion: estado.duracion,
                        estado: 'CONFIRMADO',
                        estado_pago: 'SENA',
                        monto_total: estado.precioTotal
                    })
                });

                if (!resTurno.ok) {
                    const err = await resTurno.json();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(err.error || "No se pudo reservar el turno.", "error");
                    btnPagar.disabled = false;
                    btnPagar.innerHTML = `<span>Confirmar y Abonar Seña</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>`;
                    return;
                }

                try {
                    await fetch('../api/caja.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            usuario_id: usuarioId,
                            tipo: 'INGRESO_MP',
                            concepto: `Seña Web MP - ${nombreCliente} (Cancha ${estado.canchaId}, ${estado.fechaStr} ${estado.hora}hs)`,
                            monto: estado.sena
                        })
                    });
                } catch (errCaja) {
                    console.warn("No se pudo registrar la seña en caja:", errCaja);
                }

                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion(`¡Reserva confirmada! Seña abonada: $${estado.sena.toLocaleString('es-AR')}.`);
                }

                window.location.hash = '#/cliente/mis-reservas';

            } catch (error) {
                console.error("Error al procesar reserva:", error);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al confirmar la reserva.", "error");
                btnPagar.disabled = false;
                btnPagar.innerHTML = `<span>Confirmar y Abonar Seña</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span>`;
            }
        });
    }

    (async () => {
        await inicializarParametrosYCanchas();
        generarFechas();
        await actualizarDisponibilidadFecha();
        actualizarResumen();
    })();
})();
