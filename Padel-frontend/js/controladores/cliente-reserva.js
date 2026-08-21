(function() {
    console.log("Controlador Nueva Reserva Cliente Iniciado");

    // --- ESTADO DE LA RESERVA ---
    let estado = {
        fechaIso: "",    
        fechaStr: "",    
        duracion: 90,
        tipo: "Cualquiera",
        hora: null,
        precioTotal: 0,
        sena: 2500,
        canchaId: 1 // Por defecto asignamos la 1 si elige "Cualquiera"
    };

    // Tomar el valor de la seña desde la configuración del Admin
    if(window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
        const param = window.Almacenamiento.obtenerParametros();
        estado.sena = param.senaFija || 2500;
    }

    // --- GENERAR FECHAS DINÁMICAS (Próximos 7 días) ---
    const fechasContainer = document.getElementById('fechas-container');
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    
    function generarFechas() {
        if(!fechasContainer) return;
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
            
            // Estilo dinámico. Si es el primer elemento (Hoy), lo marcamos activo.
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

            btn.addEventListener('click', () => {
                // Quitar clase activa a todos
                document.querySelectorAll('.btn-fecha').forEach(b => {
                    b.className = 'flex flex-col items-center justify-center min-w-[80px] h-20 bg-surface-container-lowest text-on-surface border border-outline-variant/10 rounded-xl snap-start flex-shrink-0 hover:bg-surface-container-low transition-all btn-fecha';
                    b.querySelector('span:first-child').classList.add('text-on-surface-variant');
                    b.querySelector('span:first-child').classList.remove('opacity-80');
                });
                
                // Aplicar clase activa al clickeado
                btn.className = 'flex flex-col items-center justify-center min-w-[80px] h-20 bg-[#4d7c0f] text-white rounded-xl snap-start flex-shrink-0 shadow-md ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface transition-all btn-fecha';
                btn.querySelector('span:first-child').classList.remove('text-on-surface-variant');
                btn.querySelector('span:first-child').classList.add('opacity-80');

                estado.fechaIso = btn.dataset.iso;
                estado.fechaStr = btn.dataset.txt;
                document.getElementById('txt-fecha-seleccionada').textContent = estado.fechaStr;
                actualizarResumen();
            });

            fechasContainer.appendChild(btn);

            // Inicializar el estado con el día de hoy
            if(i === 0) {
                estado.fechaIso = fechaIso;
                estado.fechaStr = fechaTxt;
                if(document.getElementById('txt-fecha-seleccionada')) {
                    document.getElementById('txt-fecha-seleccionada').textContent = estado.fechaStr;
                }
            }
        }
    }

    // --- MANEJO DE BOTONES (Duración y Tipo) ---
    function configurarBotonesGrupo(selectorClase, propiedadEstado) {
        const botones = document.querySelectorAll(selectorClase);
        botones.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Reiniciar todos
                botones.forEach(b => {
                    b.className = `${selectorClase.substring(1)} px-5 py-2.5 bg-surface-container-lowest text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors border border-outline-variant/10 flex-1`;
                });
                // Activar seleccionado
                const cur = e.currentTarget;
                cur.className = `${selectorClase.substring(1)} px-5 py-2.5 bg-[#84cc16] text-[#1a1a1a] rounded-xl text-sm font-bold shadow-sm ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface flex-1 transition-all`;
                
                estado[propiedadEstado] = propiedadEstado === 'duracion' ? parseInt(cur.dataset.val) : cur.dataset.val;
                actualizarResumen();
            });
        });
    }

    configurarBotonesGrupo('.btn-duracion', 'duracion');
    configurarBotonesGrupo('.btn-tipo', 'tipo');

    // --- GENERAR HORARIOS SIMULADOS ---
    const horariosManana = ['08:00', '09:30', '11:00', '12:30'];
    const horariosTarde = ['14:00', '15:30', '17:00', '18:30'];
    const horariosNoche = ['20:00', '21:30', '23:00'];

    function renderizarHorarios(contenedorId, listaHoras) {
        const contenedor = document.getElementById(contenedorId);
        if(!contenedor) return;
        contenedor.innerHTML = '';
        listaHoras.forEach(hora => {
            const btn = document.createElement('button');
            btn.className = 'btn-hora py-2.5 px-2 bg-surface-container-lowest text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors border border-outline-variant/10';
            btn.textContent = hora;
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-hora').forEach(b => {
                    b.className = 'btn-hora py-2.5 px-2 bg-surface-container-lowest text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors border border-outline-variant/10';
                });
                btn.className = 'btn-hora py-2.5 px-2 bg-[#4d7c0f] text-white rounded-xl text-sm font-bold shadow-sm ring-2 ring-[#84cc16] ring-offset-2 ring-offset-surface transition-all';
                estado.hora = hora;
                actualizarResumen();
            });
            contenedor.appendChild(btn);
        });
    }

    generarFechas();
    renderizarHorarios('horarios-manana', horariosManana);
    renderizarHorarios('horarios-tarde', horariosTarde);
    renderizarHorarios('horarios-noche', horariosNoche);

    // --- ACTUALIZAR TICKET DE RESUMEN ---
    function actualizarResumen() {
        if(!document.getElementById('resumen-fecha')) return;
        
        document.getElementById('resumen-fecha').textContent = estado.fechaStr || '--';
        document.getElementById('resumen-hora').textContent = estado.hora ? `${estado.hora} hs` : '--:--';
        document.getElementById('resumen-duracion').textContent = `${estado.duracion} min`;
        document.getElementById('resumen-tipo').textContent = estado.tipo;

        // Simulamos un precio base de la cancha ($8500 por hora)
        estado.precioTotal = (estado.duracion / 60) * 8500;
        
        document.getElementById('resumen-total').textContent = `$${estado.precioTotal.toLocaleString('es-AR')}`;
        document.getElementById('resumen-sena').textContent = `$${estado.sena.toLocaleString('es-AR')}`;

        // Habilitar o deshabilitar el botón de pago
        const btnPagar = document.getElementById('btn-pagar-sena');
        if (estado.fechaIso && estado.hora) {
            btnPagar.disabled = false;
        } else {
            btnPagar.disabled = true;
        }
    }

    actualizarResumen();

    // --- PROCESAR PAGO DE SEÑA Y GUARDAR TURNO ---
    const btnPagar = document.getElementById('btn-pagar-sena');
    if(btnPagar) {
        btnPagar.addEventListener('click', () => {
            if (!estado.hora) {
                alert("Por favor, seleccioná un horario para poder avanzar al pago.");
                return;
            }

            const usuario = window.Almacenamiento.obtenerUsuarioLogueado();
            const nombreCliente = usuario ? usuario.nombre : 'Cliente Web';

            // 1. Guardar el Turno en la Agenda general
            const nuevoTurno = {
                canchaId: estado.canchaId,
                fecha: estado.fechaIso,
                horaInicio: estado.hora,
                duracion: estado.duracion,
                clienteNombre: nombreCliente,
                estadoPago: 'SENA', // Seña pagada por MP
                estado: 'CONFIRMADO'
            };

            if (window.Almacenamiento && window.Almacenamiento.registrarTurno) {
                window.Almacenamiento.registrarTurno(nuevoTurno);
            }

            // 2. Ingresar la plata de la seña directamente a la caja digital del admin
            if (window.Almacenamiento && window.Almacenamiento.registrarMovimientoCaja) {
                window.Almacenamiento.registrarMovimientoCaja({
                    usuario_id: usuario ? usuario.id : 99,
                    usuario_nombre: nombreCliente,
                    tipo: 'INGRESO_MP',
                    concepto: `Pago Seña (MercadoPago) - Turno Web: ${estado.fechaStr} a las ${estado.hora}`,
                    monto: estado.sena
                });
            }

            alert(`✅ ¡Pago exitoso mediante MercadoPago!\n\nTu turno para el ${estado.fechaStr} a las ${estado.hora} hs ha sido confirmado.\n\nLa seña de $${estado.sena} ya ingresó al sistema del club.`);
            
            // Recargar la vista (esto simula la redirección tras pagar)
            window.location.reload();
        });
    }

})();