(function() {
    console.log("Controlador Mis Reservas conectado a API MySQL Iniciado");

    const contenedor = document.getElementById('lista-mis-reservas');
    let senaFija = 2500;
    if (window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
        const p = window.Almacenamiento.obtenerParametros();
        if (p && p.senaFija) senaFija = parseFloat(p.senaFija);
    }

    async function cargarMisReservas() {
        if (!contenedor) return;

        let usuario = null;
        if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
            usuario = window.Almacenamiento.obtenerUsuarioLogueado();
        }

        if (!usuario) {
            contenedor.innerHTML = `<p class="col-span-full text-center text-on-surface-variant py-8">Inicia sesión para ver tus reservas.</p>`;
            return;
        }

        contenedor.innerHTML = `<p class="col-span-full text-center text-on-surface-variant py-8">Cargando tus reservas desde el club...</p>`;

        try {
            const res = await fetch(`../api/turnos.php?cliente_id=${usuario.id}`);
            let misTurnos = [];

            if (res.ok) {
                misTurnos = await res.json();
            }

            if (misTurnos.length === 0) {
                const resTodos = await fetch('../api/turnos.php');
                if (resTodos.ok) {
                    const todos = await resTodos.json();
                    misTurnos = todos.filter(t => (t.cliente_nombre || '').toLowerCase() === usuario.nombre.toLowerCase());
                }
            }

            // Actualizar KPIs
            const activas = misTurnos.filter(t => t.estado !== 'FINALIZADO' && t.estado !== 'COMPLETADO' && t.estado !== 'CANCELADO').length;
            const finalizadas = misTurnos.filter(t => t.estado === 'FINALIZADO' || t.estado === 'COMPLETADO').length;

            const elActivas = document.getElementById('mis-res-activas');
            const elFin = document.getElementById('mis-res-finalizadas');
            const elTot = document.getElementById('mis-res-total');
            if (elActivas) elActivas.textContent = activas;
            if (elFin) elFin.textContent = finalizadas;
            if (elTot) elTot.textContent = misTurnos.length;

            contenedor.innerHTML = '';

            if (!misTurnos || misTurnos.length === 0) {
                contenedor.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <span class="material-symbols-outlined text-5xl text-outline-variant mb-3">sports_tennis</span>
                        <h3 class="font-headline text-lg font-bold text-on-surface">No tienes reservas activas</h3>
                        <p class="text-on-surface-variant text-sm mt-1 mb-5">Todavía no agendaste ningún partido. ¡Reserva tu cancha ahora!</p>
                        <a href="#/cliente/reserva" class="inline-flex items-center gap-2 bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">add_circle</span> Nueva Reserva
                        </a>
                    </div>`;
                return;
            }

            misTurnos.forEach(t => {
                const fechaPartes = (t.fecha || '').split('-');
                const fechaFormateada = fechaPartes.length === 3 ? `${fechaPartes[2]}/${fechaPartes[1]}/${fechaPartes[0]}` : t.fecha;
                const horaStr = (t.hora_inicio || '').substring(0, 5);

                const esFinalizado = (t.estado === 'FINALIZADO' || t.estado === 'COMPLETADO');
                const esCancelado = (t.estado === 'CANCELADO');
                const opacidad = (esFinalizado || esCancelado) ? 'opacity-65' : 'opacity-100';

                let badgeTexto = t.estado || 'CONFIRMADO';
                let badgeColor = 'bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/30';

                if (esFinalizado) {
                    badgeColor = 'bg-surface-container text-on-surface-variant border border-outline-variant/20';
                } else if (esCancelado) {
                    badgeColor = 'bg-error-container text-on-error-container border border-error/30';
                }

                const duracionMin = parseInt(t.duracion || 60);
                const costoHora = parseFloat(t.cancha_costo_base || 8500);
                const montoTotal = parseFloat(t.monto_total || 0) > 0 ? parseFloat(t.monto_total) : Math.round((duracionMin / 60) * costoHora);

                let badgePagoColor = 'text-[#e65100]';
                let textoPago = `Pendiente ($${montoTotal.toLocaleString('es-AR')})`;
                if (t.estado_pago === 'PAGADO') {
                    badgePagoColor = 'text-[#2e7d32]';
                    textoPago = `Total Abonado ($${montoTotal.toLocaleString('es-AR')})`;
                } else if (t.estado_pago === 'SENA') {
                    const resto = Math.max(0, montoTotal - senaFija);
                    badgePagoColor = 'text-[#1565c0]';
                    textoPago = `Seña $${senaFija.toLocaleString('es-AR')} • Resta $${resto.toLocaleString('es-AR')}`;
                }

                const canchaNombre = t.cancha_nombre || `Cancha ${t.cancha_id}`;

                const card = document.createElement('div');
                card.className = `bg-surface-container-low rounded-2xl p-5 border border-outline-variant/15 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${opacidad}`;
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-4 pb-3 border-b border-outline-variant/15">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                    <span class="material-symbols-outlined text-[20px]">sports_tennis</span>
                                </div>
                                <div>
                                    <h4 class="font-headline font-bold text-base text-on-surface">${canchaNombre}</h4>
                                    <p class="text-xs font-medium text-on-surface-variant">${duracionMin} min • ${t.cancha_tipo || 'Pádel'}</p>
                                </div>
                            </div>
                            <span class="text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase ${badgeColor}">${badgeTexto}</span>
                        </div>

                        <div class="space-y-2.5 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/15 text-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-on-surface-variant font-semibold flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[15px] text-primary">calendar_today</span> Fecha
                                </span>
                                <span class="font-bold text-on-surface">${fechaFormateada}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-on-surface-variant font-semibold flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[15px] text-primary">schedule</span> Horario
                                </span>
                                <span class="font-bold text-on-surface">${horaStr} hs</span>
                            </div>
                            <div class="flex items-center justify-between pt-2 border-t border-outline-variant/10">
                                <span class="text-on-surface-variant font-semibold flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[15px] text-primary">payments</span> Pago
                                </span>
                                <span class="font-extrabold ${badgePagoColor}">${textoPago}</span>
                            </div>
                        </div>
                    </div>

                    ${(!esFinalizado && !esCancelado) ? `
                    <div class="mt-4 pt-3 border-t border-outline-variant/10 flex gap-2">
                        <button class="btn-cancelar-turno w-full py-2.5 rounded-xl bg-error-container/25 text-error text-xs font-bold border border-error/20 hover:bg-error hover:text-on-error transition-colors cursor-pointer" data-id="${t.id}">
                            Cancelar Reserva
                        </button>
                    </div>` : ''}
                `;

                const btnCancelar = card.querySelector('.btn-cancelar-turno');
                if (btnCancelar) {
                    btnCancelar.addEventListener('click', async () => {
                        if (confirm(`¿Estás seguro de cancelar tu reserva para el ${fechaFormateada} a las ${horaStr} hs?`)) {
                            btnCancelar.disabled = true;
                            btnCancelar.textContent = "Cancelando...";
                            try {
                                const delRes = await fetch(`../api/turnos.php?id=${t.id}`, { method: 'DELETE' });
                                if (delRes.ok) {
                                    if (window.mostrarNotificacion) window.mostrarNotificacion("Tu reserva fue cancelada exitosamente.");
                                    await cargarMisReservas();
                                } else {
                                    if (window.mostrarNotificacion) window.mostrarNotificacion("No se pudo cancelar la reserva.", "error");
                                    btnCancelar.disabled = false;
                                    btnCancelar.textContent = "Cancelar Reserva";
                                }
                            } catch (e) {
                                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al cancelar reserva.", "error");
                                btnCancelar.disabled = false;
                                btnCancelar.textContent = "Cancelar Reserva";
                            }
                        }
                    });
                }

                contenedor.appendChild(card);
            });

        } catch (error) {
            console.error("Error al cargar mis reservas:", error);
            contenedor.innerHTML = `<p class="col-span-full text-center text-error font-bold py-6">Error al conectar con la base de datos.</p>`;
        }
    }

    cargarMisReservas();
})();
