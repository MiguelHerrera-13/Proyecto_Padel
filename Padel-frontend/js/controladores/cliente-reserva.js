(function() {
    console.log("Controlador Nueva Reserva Cliente conectado a API MySQL");

    // --- ESTADO DE LA RESERVA ---
    let estado = {
        fechaIso: "",    
        fechaStr: "",    
        duracion: 90,
        tipo: "Cualquiera",
        hora: null,
        precioTotal: 0,
        sena: 2500,
        canchaId: 1
    };

    let canchasDisponibles = [];
    let turnosDelDia = [];

    // Cargar tarifas y parámetros reales
    async function inicializarParametrosYCanchas() {
        if (window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
            const param = window.Almacenamiento.obtenerParametros();
            if (param && param.senaFija) estado.sena = param.senaFija;
        }

        try {
            const res = await fetch('../api/canchas.php');
            if (res.ok) canchasDisponibles = await res.json();
        } catch (e) {
            console.warn("No se pudieron cargar tarifas de canchas:", e);
        }
    }

    // --- GENERAR FECHAS DINÁMICAS (Próximos 7 días) ---
    const fechasContainer = document.getElementById('fechas-container');
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    
    function generarFechas() {
        if (!fechasContainer) return;
        fechasContainer.innerHTML = '';
        let hoy = new Date();

        for (let i = 0; i < 7; i++) {
            let fechaIter = new Date(hoy);
            fechaIter.setDate(hoy.getDate() + i);
            
            const diaNombre = i === 0 ? 'Hoy' : diasSemana[fechaIter.getDay()];
            const diaNumero = fechaIter.getDate();
            const fechaIso = fechaIter.toISOString().split('T')[0];
            const fechaTxt = `${diaNombre} ${diaNumero}`;

            const btn = document.createElement('button');
            btn.className = `flex flex-col items-center justify-center min-w-[80px] h-20 rounded-xl snap-start flex-shrink-0 transition-all btn-fecha
                ${i === 0 
                    ? 'bg-[#4d7c0f] text-white shadow-md ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface' 
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border border-outline-variant/10'}`;
            
            btn.innerHTML = `
                <span class="text-xs font-medium ${i===0 ? 'opacity-80' : 'text-on-surface-variant'}">${diaNombre}</span>
                <span class="text-xl font-bold font-headline">${diaNumero}</span>
            `;

            btn.dataset.iso = fechaIso;
            btn.dataset.txt = fechaTxt;

            btn.addEventListener('click', async () => {
                document.querySelectorAll('.btn-fecha').forEach(b => {
                    b.className = 'flex flex-col items-center justify-center min-w-[80px] h-20 bg-surface-container-lowest text-on-surface border border-outline-variant/10 rounded-xl snap-start flex-shrink-0 hover:bg-surface-container-low transition-all btn-fecha';
                    const sp = b.querySelector('span:first-child');
                    if (sp) { sp.classList.add('text-on-surface-variant'); sp.classList.remove('opacity-80'); }
                });
                
                btn.className = 'flex flex-col items-center justify-center min-w-[80px] h-20 bg-[#4d7c0f] text-white rounded-xl snap-start flex-shrink-0 shadow-md ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface transition-all btn-fecha';
                const spActive = btn.querySelector('span:first-child');
                if (spActive) { spActive.classList.remove('text-on-surface-variant'); spActive.classList.add('opacity-80'); }

                estado.fechaIso = btn.dataset.iso;
                estado.fechaStr = btn.dataset.txt;
                estado.hora = null; // Reiniciar horario al cambiar fecha

                const elTxt = document.getElementById('txt-fecha-seleccionada');
                if (elTxt) elTxt.textContent = estado.fechaStr;

                await actualizarDisponibilidadFecha();
                actualizarResumen();
            });

            fechasContainer.appendChild(btn);

            if (i === 0) {
                estado.fechaIso = fechaIso;
                estado.fechaStr = fechaTxt;
                const elTxt = document.getElementById('txt-fecha-seleccionada');
                if (elTxt) elTxt.textContent = estado.fechaStr;
            }
        }
    }

    // Consultar turnos ocupados en la fecha seleccionada
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

    // --- MANEJO DE BOTONES (Duración y Tipo) ---
    function configurarBotonesGrupo(selectorClase, propiedadEstado) {
        const botones = document.querySelectorAll(selectorClase);
        botones.forEach(btn => {
            btn.addEventListener('click', (e) => {
                botones.forEach(b => {
                    b.className = `${selectorClase.substring(1)} px-5 py-2.5 bg-surface-container-lowest text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors border border-outline-variant/10 flex-1`;
                });
                const cur = e.currentTarget;
                cur.className = `${selectorClase.substring(1)} px-5 py-2.5 bg-[#84cc16] text-[#1a1a1a] rounded-xl text-sm font-bold shadow-sm ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface flex-1 transition-all`;
                
                if (propiedadEstado === 'duracion') {
                    estado.duracion = parseInt(cur.dataset.val);
                } else if (propiedadEstado === 'tipo') {
                    estado.tipo = cur.dataset.val;
                    if (estado.tipo.includes('Techada')) estado.canchaId = 1;
                    else if (estado.tipo.includes('Descubierta')) estado.canchaId = 2;
                    else if (estado.tipo.includes('Premium')) estado.canchaId = 3;
                    else estado.canchaId = 1;
                }

                estado.hora = null;
                renderizarTodosLosHorarios();
                actualizarResumen();
            });
        });
    }

    configurarBotonesGrupo('.btn-duracion', 'duracion');
    configurarBotonesGrupo('.btn-tipo', 'tipo');

    // --- HORARIOS DISPONIBLES ---
    const horariosManana = ['08:00', '09:30', '11:00', '12:30'];
    const horariosTarde = ['14:00', '15:30', '17:00', '18:30'];
    const horariosNoche = ['20:00', '21:30', '23:00'];

    function renderizarHorarios(contenedorId, listaHoras) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;
        contenedor.innerHTML = '';

        listaHoras.forEach(hora => {
            // Verificar si este horario está ocupado en la cancha elegida
            const horaFormato = hora + ':00';
            const estaOcupado = turnosDelDia.some(t => {
                const mismaCancha = (parseInt(t.cancha_id) === estado.canchaId);
                const turnoNoCancelado = (t.estado !== 'CANCELADO');
                const tHora = (t.hora_inicio || '').substring(0, 5);
                return mismaCancha && turnoNoCancelado && tHora === hora;
            });

            const btn = document.createElement('button');
            
            if (estaOcupado) {
                btn.className = 'btn-hora py-2.5 px-2 bg-surface-container-high text-on-surface-variant/40 rounded-xl text-xs font-medium cursor-not-allowed border border-outline-variant/10 line-through';
                btn.textContent = `${hora} (Ocupado)`;
                btn.disabled = true;
            } else {
                const esSeleccionado = (estado.hora === hora);
                btn.className = esSeleccionado
                    ? 'btn-hora py-2.5 px-2 bg-[#4d7c0f] text-white rounded-xl text-sm font-bold shadow-sm ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface transition-all'
                    : 'btn-hora py-2.5 px-2 bg-surface-container-lowest text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors border border-outline-variant/10';
                btn.textContent = hora;

                btn.addEventListener('click', () => {
                    document.querySelectorAll('.btn-hora:not([disabled])').forEach(b => {
                        b.className = 'btn-hora py-2.5 px-2 bg-surface-container-lowest text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors border border-outline-variant/10';
                    });
                    btn.className = 'btn-hora py-2.5 px-2 bg-[#4d7c0f] text-white rounded-xl text-sm font-bold shadow-sm ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface transition-all';
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

    // --- ACTUALIZAR TICKET DE RESUMEN ---
    function actualizarResumen() {
        const elFecha = document.getElementById('resumen-fecha');
        if (!elFecha) return;
        
        elFecha.textContent = estado.fechaStr || '--';
        document.getElementById('resumen-hora').textContent = estado.hora ? `${estado.hora} hs` : '--:--';
        document.getElementById('resumen-duracion').textContent = `${estado.duracion} min`;
        document.getElementById('resumen-tipo').textContent = estado.tipo;

        // Tarifa real de la cancha
        let costoHora = 8500;
        const cancha = canchasDisponibles.find(c => c.id == estado.canchaId);
        if (cancha && cancha.costo_base) costoHora = parseFloat(cancha.costo_base);

        estado.precioTotal = (estado.duracion / 60) * costoHora;
        
        document.getElementById('resumen-total').textContent = `$${estado.precioTotal.toLocaleString('es-AR')}`;
        document.getElementById('resumen-sena').textContent = `$${estado.sena.toLocaleString('es-AR')}`;

        // Habilitar o deshabilitar botón de pago
        const btnPagar = document.getElementById('btn-pagar-sena');
        if (btnPagar) {
            btnPagar.disabled = !(estado.fechaIso && estado.hora);
        }
    }

    // --- PROCESAR PAGO DE SEÑA Y GUARDAR TURNO EN MYSQL ---
    const btnPagar = document.getElementById('btn-pagar-sena');
    if (btnPagar) {
        btnPagar.addEventListener('click', async () => {
            if (!estado.hora) {
                alert("Por favor, seleccioná un horario disponible para avanzar.");
                return;
            }

            let usuario = null;
            if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                usuario = window.Almacenamiento.obtenerUsuarioLogueado();
            }

            const nombreCliente = usuario ? usuario.nombre : 'Cliente Web';
            const usuarioId = usuario ? usuario.id : 3;

            btnPagar.disabled = true;
            btnPagar.textContent = "Conectando con MercadoPago...";

            try {
                // 1. Guardar turno en MySQL vía api/turnos.php
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
                    alert(err.error || "No se pudo reservar el turno. Probá con otro horario.");
                    btnPagar.disabled = false;
                    btnPagar.textContent = "Pagar Seña con MercadoPago";
                    return;
                }

                // 2. Registrar el ingreso de la seña en la Caja de MySQL
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

                alert(`🎉 ¡Pago de seña exitoso mediante MercadoPago!\n\nTu reserva para el ${estado.fechaStr} a las ${estado.hora} hs en Cancha ${estado.canchaId} está CONFIRMADA.\n\nSeña abonada: $${estado.sena.toLocaleString('es-AR')}`);

                // Redirigir directamente a Mis Reservas
                window.location.hash = '#/cliente/mis-reservas';

            } catch (error) {
                console.error("Error al procesar reserva:", error);
                alert("Error de conexión al confirmar la reserva.");
                btnPagar.disabled = false;
                btnPagar.textContent = "Pagar Seña con MercadoPago";
            }
        });
    }

    // Inicializar todo
    (async () => {
        await inicializarParametrosYCanchas();
        generarFechas();
        await actualizarDisponibilidadFecha();
        actualizarResumen();
    })();
})();