(function() {
    // 1. Contenedor de Toast flotantes para notificaciones emergentes
    let toastContainer = document.getElementById('toast-container-global');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container-global';
        toastContainer.className = 'fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 pointer-events-none max-w-sm w-full';
        document.body.appendChild(toastContainer);
    }

    // Función global para mostrar Toasts elegantes en reemplazo de alert()
    window.mostrarNotificacion = function(mensaje, tipo = 'exito') {
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold transition-all duration-300 transform translate-y-4 opacity-0 border backdrop-blur-md ${
            tipo === 'exito' ? 'bg-[#e8f5e9]/95 text-[#1b5e20] border-[#4caf50]/40' : 
            (tipo === 'error' ? 'bg-error-container/95 text-on-error-container border-error/40' : 
            'bg-surface-container-highest/95 text-on-surface border-outline-variant/40')
        }`;
        
        const icono = tipo === 'exito' ? 'check_circle' : (tipo === 'error' ? 'error' : 'info');
        toast.innerHTML = `
            <span class="material-symbols-outlined text-[22px] flex-shrink-0" style="font-variation-settings: 'FILL' 1;">${icono}</span>
            <span class="flex-1">${mensaje}</span>
            <button class="text-xs opacity-60 hover:opacity-100 cursor-pointer p-1"><span class="material-symbols-outlined text-[16px]">close</span></button>
        `;

        toast.querySelector('button').addEventListener('click', () => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 250);
        });

        toastContainer.appendChild(toast);

        // Animación de entrada
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        // Auto eliminación a los 4 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('translate-y-4', 'opacity-0');
                setTimeout(() => toast.remove(), 250);
            }
        }, 4000);
    };

    // 2. Control de la campanita y Dropdown
    const btnNotificaciones = document.getElementById('btn-notificaciones');
    const badgeNotificaciones = document.getElementById('badge-notificaciones');
    const dropdownPanel = document.getElementById('panel-notificaciones-dropdown');

    let notificacionesLeidas = JSON.parse(localStorage.getItem('padel_notif_leidas') || '[]');

    async function consultarNotificaciones() {
        if (!dropdownPanel) return;

        let usuario = null;
        if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
            usuario = window.Almacenamiento.obtenerUsuarioLogueado();
        }
        if (!usuario) return;

        try {
            let items = [];

            if (usuario.rol === 'ADMIN' || usuario.rol === 'EMPLEADO') {
                const [resTurnos, resCaja, resStock] = await Promise.all([
                    fetch('../api/turnos.php'),
                    fetch('../api/caja.php'),
                    fetch('../api/stock.php')
                ]);

                const turnos = resTurnos.ok ? await resTurnos.json() : [];
                const caja = resCaja.ok ? await resCaja.json() : [];
                const stock = resStock.ok ? await resStock.json() : [];

                // 1. Alertas de Stock crítico (solo admin)
                if (usuario.rol === 'ADMIN' && Array.isArray(stock)) {
                    stock.filter(p => parseInt(p.stock_actual) <= 5).slice(0, 2).forEach(p => {
                        items.push({
                            id: `stock-${p.id}`,
                            tipo: 'alerta',
                            icono: 'warning',
                            color: 'text-error bg-error/10',
                            titulo: `Bajo Stock: ${p.nombre}`,
                            detalle: `Quedan solo ${p.stock_actual} unidades en inventario.`
                        });
                    });
                }

                // 2. Últimos turnos agendados
                if (Array.isArray(turnos)) {
                    turnos.slice(0, 3).forEach(t => {
                        items.push({
                            id: `turno-${t.id}`,
                            tipo: 'turno',
                            icono: 'event_available',
                            color: 'text-primary bg-primary/10',
                            titulo: `Reserva: ${t.cliente_nombre}`,
                            detalle: `Cancha ${t.cancha_id} • ${t.fecha} ${t.hora_inicio.substring(0,5)}hs (${t.estado_pago})`
                        });
                    });
                }

                // 3. Últimos ingresos de caja
                if (Array.isArray(caja)) {
                    caja.filter(c => c.tipo.includes('INGRESO')).slice(0, 2).forEach(m => {
                        items.push({
                            id: `caja-${m.id}`,
                            tipo: 'pago',
                            icono: 'payments',
                            color: 'text-[#2e7d32] bg-[#e8f5e9]',
                            titulo: `Cobro Registrado`,
                            detalle: `$${parseFloat(m.monto).toLocaleString('es-AR')} - ${m.concepto}`
                        });
                    });
                }

            } else {
                // Notificaciones para CLIENTE
                const resTurnos = await fetch(`../api/turnos.php?cliente_id=${usuario.id}`);
                const turnos = resTurnos.ok ? await resTurnos.json() : [];

                if (Array.isArray(turnos)) {
                    turnos.filter(t => t.estado === 'CONFIRMADO').slice(0, 4).forEach(t => {
                        items.push({
                            id: `cliente-turno-${t.id}`,
                            tipo: 'turno',
                            icono: 'sports_tennis',
                            color: 'text-primary bg-primary/10',
                            titulo: `¡Partido Confirmado!`,
                            detalle: `Cancha ${t.cancha_id} el ${t.fecha} a las ${t.hora_inicio.substring(0,5)}hs.`
                        });
                    });
                }
            }

            // Verificar si hay novedades no leídas
            const novedadesNoLeidas = items.filter(it => !notificacionesLeidas.includes(it.id));
            if (badgeNotificaciones) {
                if (novedadesNoLeidas.length > 0) {
                    badgeNotificaciones.classList.remove('hidden');
                } else {
                    badgeNotificaciones.classList.add('hidden');
                }
            }

            // Renderizar contenido del panel
            let listaHTML = '';
            if (items.length === 0) {
                listaHTML = `
                    <div class="py-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl text-outline-variant">notifications_off</span>
                        <p class="text-xs font-medium">No tenés notificaciones pendientes.</p>
                    </div>`;
            } else {
                items.forEach(it => {
                    const noLeida = !notificacionesLeidas.includes(it.id);
                    listaHTML += `
                    <div class="p-3 rounded-xl transition-all flex items-start gap-3 hover:bg-surface-container cursor-pointer border-b border-outline-variant/10 ${noLeida ? 'bg-surface-container-low/80' : ''}">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${it.color}">
                            <span class="material-symbols-outlined text-[18px]">${it.icono}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-bold text-on-surface flex items-center justify-between">
                                <span class="truncate">${it.titulo}</span>
                                ${noLeida ? '<span class="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>' : ''}
                            </p>
                            <p class="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">${it.detalle}</p>
                        </div>
                    </div>`;
                });
            }

            dropdownPanel.innerHTML = `
                <div class="p-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <h3 class="font-headline font-bold text-on-surface text-sm">Notificaciones</h3>
                        <span class="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">En Vivo</span>
                    </div>
                    <button id="btn-marcar-leidas" class="text-[11px] text-primary hover:underline font-bold cursor-pointer">
                        Marcar leídas
                    </button>
                </div>
                <div class="max-h-80 overflow-y-auto p-2 space-y-1">
                    ${listaHTML}
                </div>
            `;

            const btnMarcar = document.getElementById('btn-marcar-leidas');
            if (btnMarcar) {
                btnMarcar.addEventListener('click', () => {
                    items.forEach(it => {
                        if (!notificacionesLeidas.includes(it.id)) notificacionesLeidas.push(it.id);
                    });
                    localStorage.setItem('padel_notif_leidas', JSON.stringify(notificacionesLeidas));
                    if (badgeNotificaciones) badgeNotificaciones.classList.add('hidden');
                    consultarNotificaciones();
                });
            }

        } catch (e) {
            console.warn("Fallo al consultar centro de notificaciones:", e);
            dropdownPanel.innerHTML = `
                <div class="p-4 border-b border-outline-variant/20 bg-surface-container-low">
                    <h3 class="font-headline font-bold text-on-surface text-sm">Notificaciones</h3>
                </div>
                <p class="p-6 text-center text-xs text-error font-medium">Error al cargar alertas en tiempo real.</p>
            `;
        }
    }

    // Toggle al hacer clic en la campanita
    if (btnNotificaciones && dropdownPanel) {
        btnNotificaciones.addEventListener('click', (e) => {
            e.stopPropagation();
            const estaOculto = dropdownPanel.classList.contains('hidden');
            if (estaOculto) {
                consultarNotificaciones();
                dropdownPanel.classList.remove('hidden');
                dropdownPanel.classList.add('flex');
            } else {
                dropdownPanel.classList.add('hidden');
                dropdownPanel.classList.remove('flex');
            }
        });

        // Cerrar dropdown al hacer clic fuera o presionar escape
        document.addEventListener('click', (e) => {
            if (!dropdownPanel.contains(e.target) && !btnNotificaciones.contains(e.target)) {
                dropdownPanel.classList.add('hidden');
                dropdownPanel.classList.remove('flex');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdownPanel.classList.add('hidden');
                dropdownPanel.classList.remove('flex');
            }
        });
    }

    // Chequeo inicial de alertas al cargar la app
    setTimeout(consultarNotificaciones, 1000);
})();