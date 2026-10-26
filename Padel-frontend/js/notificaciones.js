(function() {
    // 1. Panel flotante de notificaciones
    const panel = document.createElement('div');
    panel.id = 'panel-notificaciones-global';
    panel.className = 'fixed top-20 right-4 md:right-8 w-80 bg-surface-container-lowest rounded-2xl shadow-[0px_20px_40px_-10px_rgba(0,0,0,0.3)] border border-outline-variant/20 z-[9999] hidden flex-col overflow-hidden transition-all';
    document.body.appendChild(panel);

    // Contenedor de Toast flotantes
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container-global';
    toastContainer.className = 'fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(toastContainer);

    // Función global para mostrar Toasts elegantes
    window.mostrarNotificacion = function(mensaje, tipo = 'exito') {
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-sm font-bold transition-all duration-300 transform translate-y-4 opacity-0 border ${
            tipo === 'exito' ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#4caf50]/30' : 
            (tipo === 'error' ? 'bg-error-container text-on-error-container border-error/30' : 
            'bg-surface-container-highest text-on-surface border-outline-variant/30')
        }`;
        
        const icono = tipo === 'exito' ? 'check_circle' : (tipo === 'error' ? 'error' : 'info');
        toast.innerHTML = `<span class="material-symbols-outlined text-[20px]">${icono}</span><span>${mensaje}</span>`;
        toastContainer.appendChild(toast);

        // Animación de entrada
        setTimeout(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        }, 10);

        // Auto eliminación después de 3.5 segundos
        setTimeout(() => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // 2. Cargar notificaciones reales desde MySQL
    async function actualizarPanel() {
        let usuario = null;
        if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
            usuario = window.Almacenamiento.obtenerUsuarioLogueado();
        }
        if (!usuario) return;

        panel.innerHTML = `
            <div class="p-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center">
                <h3 class="font-headline font-bold text-on-surface">Notificaciones</h3>
                <span class="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">En Vivo</span>
            </div>
            <div class="p-6 text-center text-xs text-on-surface-variant font-medium">Cargando alertas...</div>
        `;

        try {
            let itemsHTML = '';

            if (usuario.rol === 'ADMIN' || usuario.rol === 'EMPLEADO') {
                const [resTurnos, resCaja] = await Promise.all([
                    fetch('../api/turnos.php'),
                    fetch('../api/caja.php')
                ]);

                const turnos = resTurnos.ok ? await resTurnos.json() : [];
                const caja = resCaja.ok ? await resCaja.json() : [];

                const ultimosTurnos = turnos.slice(0, 3);
                ultimosTurnos.forEach(t => {
                    itemsHTML += `
                    <div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 cursor-pointer">
                        <p class="text-xs font-bold text-on-surface flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] text-primary">event_available</span> Turno: ${t.cliente_nombre}</p>
                        <p class="text-[11px] text-on-surface-variant mt-0.5 pl-5">Cancha ${t.cancha_id} • ${t.fecha} ${t.hora_inicio.substring(0,5)}hs (${t.estado_pago})</p>
                    </div>`;
                });

                const ultimosPagos = caja.filter(c => c.tipo.includes('INGRESO')).slice(0, 2);
                ultimosPagos.forEach(m => {
                    itemsHTML += `
                    <div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 cursor-pointer">
                        <p class="text-xs font-bold text-[#2e7d32] flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">payments</span> Cobro Registrado</p>
                        <p class="text-[11px] text-on-surface-variant mt-0.5 pl-5">$${parseFloat(m.monto).toLocaleString('es-AR')} - ${m.concepto}</p>
                    </div>`;
                });

            } else {
                const resTurnos = await fetch(`../api/turnos.php?cliente_id=${usuario.id}`);
                const turnos = resTurnos.ok ? await resTurnos.json() : [];
                const confirmados = turnos.filter(t => t.estado === 'CONFIRMADO').slice(0, 4);

                if (confirmados.length === 0) {
                    itemsHTML = `<p class="p-6 text-center text-xs text-on-surface-variant">No tenés partidos pendientes.</p>`;
                } else {
                    confirmados.forEach(t => {
                        itemsHTML += `
                        <div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 cursor-pointer">
                            <p class="text-xs font-bold text-primary flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px]">sports_tennis</span> ¡Partido Confirmado!</p>
                            <p class="text-[11px] text-on-surface-variant mt-0.5 pl-5">Cancha ${t.cancha_id} el ${t.fecha} a las ${t.hora_inicio.substring(0,5)}hs.</p>
                        </div>`;
                    });
                }
            }

            panel.innerHTML = `
                <div class="p-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center">
                    <h3 class="font-headline font-bold text-on-surface text-sm">Notificaciones</h3>
                    <span class="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">MySQL</span>
                </div>
                <div class="max-h-80 overflow-y-auto p-2 space-y-1">
                    ${itemsHTML || '<p class="p-6 text-center text-xs text-on-surface-variant">Sin novedades recientes.</p>'}
                </div>
            `;
        } catch (e) {
            panel.innerHTML = `
                <div class="p-4 border-b border-outline-variant/20 bg-surface-container-low">
                    <h3 class="font-headline font-bold text-on-surface text-sm">Notificaciones</h3>
                </div>
                <p class="p-4 text-center text-xs text-error">Error al conectar con el centro de alertas.</p>
            `;
        }
    }

    // 3. Interceptar clic en la campana
    document.addEventListener('click', (e) => {
        const iconoCampana = e.target.closest('.material-symbols-outlined');
        const esCampanita = iconoCampana && (iconoCampana.textContent.includes('notifications') || iconoCampana.textContent.includes('notifications_active'));

        if (esCampanita) {
            actualizarPanel();
            panel.classList.toggle('hidden');
            panel.classList.toggle('flex');
        } else if (!e.target.closest('#panel-notificaciones-global')) {
            panel.classList.add('hidden');
            panel.classList.remove('flex');
        }
    });
})();