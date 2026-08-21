(function() {
    // 1. Creamos el panel flotante y lo ocultamos en el body
    const panel = document.createElement('div');
    panel.id = 'panel-notificaciones-global';
    panel.className = 'fixed top-20 right-4 md:right-8 w-80 bg-surface-container-lowest rounded-2xl shadow-[0px_20px_40px_-10px_rgba(0,0,0,0.3)] border border-outline-variant/20 z-[9999] hidden flex-col overflow-hidden transition-all';
    document.body.appendChild(panel);

    // 2. Función que lee la base de datos y arma las alertas según quién esté logueado
    function actualizarPanel() {
        const usuario = window.Almacenamiento.obtenerUsuarioLogueado();
        if (!usuario) return;

        let html = `
            <div class="p-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center">
                <h3 class="font-headline font-bold text-on-surface">Notificaciones</h3>
                <span class="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">Nuevas</span>
            </div>
            <div class="max-h-80 overflow-y-auto p-2 space-y-1">
        `;

        if (usuario.rol === 'ADMIN' || usuario.rol === 'EMPLEADO') {
            // Notificaciones para Staff: Últimos turnos y pagos
            const turnos = window.Almacenamiento.obtenerTurnos().reverse().slice(0, 3);
            turnos.forEach(t => {
                html += `
                    <div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/10 cursor-pointer">
                        <p class="text-sm font-bold text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-[16px] text-[#4d7c0f]">event_available</span> Nuevo Turno: ${t.clienteNombre}</p>
                        <p class="text-xs text-on-surface-variant mt-1 pl-6">Cancha ${t.canchaId} • ${t.fecha} a las ${t.horaInicio}</p>
                    </div>`;
            });
            
            const movs = window.Almacenamiento.obtenerMovimientosCaja().filter(m => m.tipo.includes('INGRESO')).reverse().slice(0, 2);
            movs.forEach(m => {
                html += `
                    <div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/10 cursor-pointer">
                        <p class="text-sm font-bold text-primary flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">payments</span> Pago Recibido</p>
                        <p class="text-xs text-on-surface-variant mt-1 pl-6">$${m.monto} - ${m.concepto}</p>
                    </div>`;
            });
        } else {
            // Notificaciones para Clientes: Sus confirmaciones
            const misTurnos = window.Almacenamiento.obtenerTurnos().filter(t => t.clienteNombre === usuario.nombre).reverse().slice(0, 5);
            
            if (misTurnos.length === 0) {
                html += `<p class="p-6 text-center text-sm font-medium text-on-surface-variant">No tenés notificaciones recientes.</p>`;
            } else {
                misTurnos.forEach(t => {
                    html += `
                        <div class="p-3 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant/10 cursor-pointer">
                            <p class="text-sm font-bold text-[#4d7c0f] flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">check_circle</span> ¡Turno Confirmado!</p>
                            <p class="text-xs text-on-surface-variant mt-1 pl-6">Cancha ${t.canchaId} el ${t.fecha} a las ${t.horaInicio}. ¡Te esperamos!</p>
                        </div>`;
                });
            }
        }

        html += `</div>`;
        panel.innerHTML = html;
    }

    // 3. Interceptamos cualquier clic en la pantalla
    document.addEventListener('click', (e) => {
        // Buscamos si lo que se clickeó es la campanita (por su ícono o texto)
        const iconoCampana = e.target.closest('.material-symbols-outlined');
        const esCampanita = iconoCampana && (iconoCampana.textContent.includes('notifications') || iconoCampana.textContent.includes('notifications_active'));

        if (esCampanita) {
            actualizarPanel(); // Recargamos la data real
            panel.classList.toggle('hidden');
            panel.classList.toggle('flex');
        } else if (!e.target.closest('#panel-notificaciones-global')) {
            // Si hace clic en cualquier otro lado, se cierra
            panel.classList.add('hidden');
            panel.classList.remove('flex');
        }
    });
})();