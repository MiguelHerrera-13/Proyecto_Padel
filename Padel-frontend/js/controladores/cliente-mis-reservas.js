(function() {
    console.log("Controlador Mis Reservas conectado a API MySQL Iniciado");

    const contenedor = document.getElementById('lista-mis-reservas');

    async function cargarMisReservas() {
        if (!contenedor) return;

        let usuario = null;
        if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
            usuario = window.Almacenamiento.obtenerUsuarioLogueado();
        }

        if (!usuario) {
            contenedor.innerHTML = `<p class="col-span-full text-center text-on-surface-variant">Iniciá sesión para ver tus reservas.</p>`;
            return;
        }

        contenedor.innerHTML = `<p class="col-span-full text-center text-on-surface-variant py-8">Cargando tus reservas desde el club...</p>`;

        try {
            // Consultar por cliente_id
            const res = await fetch(`../api/turnos.php?cliente_id=${usuario.id}`);
            let misTurnos = [];

            if (res.ok) {
                misTurnos = await res.json();
            }

            // Si por alguna razón vino vacío, intentar filtrar por nombre
            if (misTurnos.length === 0) {
                const resTodos = await fetch('../api/turnos.php');
                if (resTodos.ok) {
                    const todos = await resTodos.json();
                    misTurnos = todos.filter(t => (t.cliente_nombre || '').toLowerCase() === usuario.nombre.toLowerCase());
                }
            }

            contenedor.innerHTML = '';

            if (!misTurnos || misTurnos.length === 0) {
                contenedor.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <span class="material-symbols-outlined text-6xl text-outline-variant/50 mb-4">sports_tennis</span>
                        <h3 class="font-headline text-xl font-bold text-on-surface">No tenés reservas activas</h3>
                        <p class="text-on-surface-variant mt-1 mb-6">Todavía no agendaste ningún partido. ¡Reservá tu cancha ahora!</p>
                        <a href="#/cliente/reserva" class="inline-flex items-center gap-2 bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm">
                            <span class="material-symbols-outlined">add_circle</span> Nueva Reserva
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
                const opacidad = (esFinalizado || esCancelado) ? 'opacity-60 grayscale' : 'opacity-100';

                let badgeTexto = t.estado || 'CONFIRMADO';
                let badgeColor = 'bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/30';

                if (esFinalizado) {
                    badgeColor = 'bg-surface-variant text-on-surface-variant';
                } else if (esCancelado) {
                    badgeColor = 'bg-error-container text-on-error-container border border-error/30';
                }

                let badgePagoColor = 'text-[#e65100]';
                let textoPago = 'Pendiente en mostrador';
                if (t.estado_pago === 'PAGADO') {
                    badgePagoColor = 'text-[#2e7d32]';
                    textoPago = 'Total Abonado';
                } else if (t.estado_pago === 'SENA') {
                    badgePagoColor = 'text-[#1565c0]';
                    textoPago = 'Seña Pagada (MP)';
                }

                const canchaNombre = t.cancha_nombre || `Cancha ${t.cancha_id}`;
                const duracionMin = t.duracion || 60;

                const card = document.createElement('div');
                card.className = `bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 shadow-sm relative overflow-hidden transition-all hover:-translate-y-1 ${opacidad}`;
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-[#84cc16]/20 text-[#4d7c0f] flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined">sports_tennis</span>
                            </div>
                            <div>
                                <h4 class="font-bold text-on-surface">${canchaNombre}</h4>
                                <p class="text-xs font-medium text-on-surface-variant">${duracionMin} minutos • ${t.cancha_tipo || 'Pádel'}</p>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-1 rounded-md tracking-wider uppercase ${badgeColor}">${badgeTexto}</span>
                    </div>

                    <div class="space-y-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px]">calendar_today</span> Fecha
                            </span>
                            <span class="text-sm font-bold text-on-surface">${fechaFormateada}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px]">schedule</span> Horario
                            </span>
                            <span class="text-sm font-bold text-on-surface">${horaStr} hs</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px]">payments</span> Estado de Pago
                            </span>
                            <span class="text-xs font-bold ${badgePagoColor}">${textoPago}</span>
                        </div>
                    </div>

                    ${(!esFinalizado && !esCancelado) ? `
                    <div class="mt-4 flex gap-2">
                        <button class="btn-cancelar-turno flex-1 py-2 rounded-lg bg-error-container/30 text-error text-xs font-bold border border-error/20 hover:bg-error-container transition-colors" data-id="${t.id}">
                            Cancelar Reserva
                        </button>
                    </div>` : ''}
                `;

                // Botón cancelar reserva
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
            contenedor.innerHTML = `<p class="col-span-full text-center text-error">Error al conectar con la base de datos.</p>`;
        }
    }

    cargarMisReservas();
})();