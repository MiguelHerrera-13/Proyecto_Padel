(function() {
    console.log("Controlador Mis Reservas Iniciado");

    function cargarMisReservas() {
        const contenedor = document.getElementById('lista-mis-reservas');
        if (!contenedor) return;

        const usuario = window.Almacenamiento.obtenerUsuarioLogueado();
        if (!usuario) return;

        // Filtramos los turnos por el nombre del cliente logueado
        const misTurnos = window.Almacenamiento.obtenerTurnos().filter(t => t.clienteNombre === usuario.nombre);
        contenedor.innerHTML = '';

        if (misTurnos.length === 0) {
            contenedor.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-outline-variant/50 mb-4">calendar_cancel</span>
                    <h3 class="font-headline text-xl font-bold text-on-surface">No tenés reservas</h3>
                    <p class="text-on-surface-variant">Todavía no agendaste ningún partido. ¡Andá a Nueva Reserva para empezar!</p>
                </div>`;
            return;
        }

        // Invertimos para mostrar las más recientes primero
        misTurnos.reverse().forEach(t => {
            const [anio, mes, dia] = t.fecha.split('-');
            const fechaFormateada = `${dia}/${mes}/${anio}`;
            
            // Estilo visual según el estado de la reserva
            const esFinalizado = t.estado === 'FINALIZADO';
            const opacidad = esFinalizado ? 'opacity-60 grayscale' : 'opacity-100';
            const badgeTexto = esFinalizado ? 'FINALIZADO' : 'CONFIRMADO';
            const badgeColor = esFinalizado ? 'bg-surface-variant text-on-surface-variant' : 'bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/30';

            contenedor.innerHTML += `
            <div class="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 shadow-sm relative overflow-hidden transition-all hover:-translate-y-1 ${opacidad}">
                
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-[#84cc16]/20 text-[#4d7c0f] flex items-center justify-center">
                            <span class="material-symbols-outlined">sports_tennis</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-on-surface">Cancha ${t.canchaId}</h4>
                            <p class="text-xs font-medium text-on-surface-variant">${t.duracion} minutos</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${badgeColor}">${badgeTexto}</span>
                </div>

                <div class="space-y-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span> Fecha</span>
                        <span class="text-sm font-bold text-on-surface">${fechaFormateada}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span> Hora</span>
                        <span class="text-sm font-bold text-on-surface">${t.horaInicio} hs</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-on-surface-variant font-medium flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">payments</span> Estado Pago</span>
                        <span class="text-sm font-bold text-on-surface">${t.estadoPago}</span>
                    </div>
                </div>

                ${!esFinalizado ? `
                <div class="mt-4 flex gap-2">
                    <button class="flex-1 py-2 rounded-lg bg-surface-container-highest text-on-surface text-xs font-bold hover:bg-surface-variant transition-colors" onclick="alert('Para reprogramar comunicate con el club por WhatsApp.')">Reprogramar</button>
                    <button class="flex-1 py-2 rounded-lg bg-error-container/30 text-error text-xs font-bold border border-error/20 hover:bg-error-container transition-colors" onclick="alert('Cancelación sujeta a políticas del club. Hablá con recepción.')">Cancelar</button>
                </div>` : ''}
            </div>`;
        });
    }

    cargarMisReservas();
})();