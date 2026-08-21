(function() {
    console.log("Controlador de Agenda Iniciado");

    let ticketCarrito = [];
    let numeroTicket = Math.floor(Math.random() * 1000) + 1000;
    
    const contenedorTicket = document.getElementById('ticket-items');
    const labelTotal = document.getElementById('ticket-total');
    const btnCobrar = document.getElementById('btn-cobrar-ticket');
    
    if(document.getElementById('ticket-id')) document.getElementById('ticket-id').textContent = `Ticket #${numeroTicket}`;
    if(document.getElementById('fecha-hoy-txt')) document.getElementById('fecha-hoy-txt').textContent = "Hoy, " + new Date().toLocaleDateString('es-AR', {day: 'numeric', month: 'short'});

    function renderizarTicket() {
        if(!contenedorTicket) return;
        contenedorTicket.innerHTML = '';
        let total = 0;

        if (ticketCarrito.length === 0) {
            contenedorTicket.innerHTML = '<p class="text-center text-on-surface-variant text-sm mt-10">El ticket está vacío.</p>';
            if(labelTotal) labelTotal.textContent = '$0';
            return;
        }

        ticketCarrito.forEach((item, index) => {
            total += parseFloat(item.precio);
            contenedorTicket.innerHTML += `
            <div class="flex justify-between items-center bg-surface-container-low p-3 rounded-xl group relative shadow-sm border border-outline-variant/10">
                <p class="font-semibold text-sm text-on-surface">${item.nombre}</p>
                <span class="font-bold text-sm text-on-surface">$${item.precio.toLocaleString('es-AR')}</span>
                <button class="absolute -right-2 -top-2 bg-error text-on-error w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm btn-borrar-item" data-index="${index}">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
            </div>`;
        });

        if(labelTotal) labelTotal.textContent = '$' + total.toLocaleString('es-AR');

        document.querySelectorAll('.btn-borrar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                ticketCarrito.splice(e.currentTarget.dataset.index, 1);
                renderizarTicket();
            });
        });
    }

    document.querySelectorAll('.btn-venta-rapida').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cur = e.currentTarget;
            ticketCarrito.push({ id: cur.dataset.id, nombre: cur.dataset.nombre, precio: parseFloat(cur.dataset.precio), tipo: 'PRODUCTO' });
            renderizarTicket();
        });
    });

    if (btnCobrar) {
        btnCobrar.addEventListener('click', () => {
            if (ticketCarrito.length === 0) { alert("El ticket está vacío."); return; }
            let totalCobrado = 0;
            ticketCarrito.forEach(item => {
                totalCobrado += item.precio;
                if (item.tipo === 'PRODUCTO' && window.Almacenamiento.descontarStockLocal) {
                    window.Almacenamiento.descontarStockLocal(item.id, 1);
                }
            });

            const u = window.Almacenamiento.obtenerUsuarioLogueado();
            window.Almacenamiento.registrarMovimientoCaja({
                usuario_id: u ? u.id : 1,
                usuario_nombre: u ? u.nombre : 'Empleado',
                tipo: 'INGRESO',
                concepto: `Cobro Ticket #${numeroTicket} (${ticketCarrito.length} items)`,
                monto: totalCobrado
            });

            alert(`✅ Ticket cobrado con éxito. Total: $${totalCobrado}`);
            ticketCarrito = [];
            numeroTicket++;
            if(document.getElementById('ticket-id')) document.getElementById('ticket-id').textContent = `Ticket #${numeroTicket}`;
            renderizarTicket();
        });
    }

    const horaInicio = 8; const horaFin = 23; const pxPorHora = 80;
    let turnoActivoParaOpciones = null; 

    function renderizarGrillaBase() {
        const columnaHoras = document.getElementById('columna-horas');
        const grillaCanchas = document.getElementById('grilla-canchas');
        const colContainer = document.getElementById('columnas-canchas');
        if(!columnaHoras || !grillaCanchas || !colContainer) return;
        
        columnaHoras.innerHTML = '';
        Array.from(grillaCanchas.children).forEach(c => { if (c.id !== 'columnas-canchas') c.remove(); });

        for (let i = horaInicio; i <= horaFin; i++) {
            const hDiv = document.createElement('div');
            hDiv.className = 'h-20 text-xs text-on-surface-variant/60 font-label text-right pr-2 pt-2';
            hDiv.textContent = `${i.toString().padStart(2, '0')}:00`;
            columnaHoras.appendChild(hDiv);

            const linea = document.createElement('div');
            linea.className = 'absolute w-full h-[80px] border-t border-outline-variant/15';
            linea.style.top = `${(i - horaInicio) * pxPorHora}px`;
            grillaCanchas.appendChild(linea);
        }

        colContainer.innerHTML = '';
        for (let c = 1; c <= 3; c++) {
            const col = document.createElement('div');
            col.className = `flex-1 relative border-r border-outline-variant/10 columna-cancha cursor-pointer hover:bg-surface-container-lowest/40 transition-colors`;
            col.dataset.cancha = c;
            
            col.addEventListener('click', (e) => {
                if(e.target === col) {
                    const y = e.clientY - col.getBoundingClientRect().top;
                    const horaClic = horaInicio + Math.floor(y / pxPorHora);
                    abrirModalAgenda(c, `${horaClic.toString().padStart(2, '0')}:00`);
                }
            });
            colContainer.appendChild(col);
        }
    }

    function cargarTurnosGrilla() {
        if (!window.Almacenamiento || !window.Almacenamiento.obtenerTurnos) return;
        
        // ¡Magia aquí! Filtramos los turnos para que NO se dibujen los que están finalizados
        const turnosVisibles = window.Almacenamiento.obtenerTurnos().filter(t => t.estado !== 'FINALIZADO');
        const columnas = document.querySelectorAll('.columna-cancha');
        columnas.forEach(col => col.innerHTML = '');

        turnosVisibles.forEach(t => {
            const [h, m] = t.horaInicio.split(':').map(Number);
            const topPx = (((h - horaInicio) * 60 + m) / 60) * pxPorHora;
            const altoPx = (t.duracion / 60) * pxPorHora;

            const col = columnas[t.canchaId - 1];
            if (!col) return;

            let badgeHTML, bgClass, borderClass, textClass, leftBarClass;
            if (t.estadoPago === 'PAGADO') {
                bgClass = 'bg-[#e8f5e9]/90 hover:bg-[#c8e6c9]'; borderClass = 'border-[#4caf50]/40'; textClass = 'text-[#2e7d32]'; leftBarClass = 'bg-[#4caf50]';
                badgeHTML = `<span class="inline-block mt-1 ml-2 px-1.5 py-0.5 bg-[#4caf50]/20 text-[#2e7d32] text-[9px] font-bold rounded uppercase">TOTAL PAGADO</span>`;
            } else if (t.estadoPago === 'SENA') {
                bgClass = 'bg-[#e3f2fd]/90 hover:bg-[#bbdefb]'; borderClass = 'border-[#2196f3]/40'; textClass = 'text-[#1565c0]'; leftBarClass = 'bg-[#2196f3]';
                badgeHTML = `<span class="inline-block mt-1 ml-2 px-1.5 py-0.5 bg-[#2196f3]/20 text-[#1565c0] text-[9px] font-bold rounded uppercase">SEÑA PAGADA</span>`;
            } else {
                bgClass = 'bg-[#fff3e0]/90 hover:bg-[#ffe0b2]'; borderClass = 'border-[#ffb74d]/40'; textClass = 'text-[#e65100]'; leftBarClass = 'bg-[#ff9800]';
                badgeHTML = `<span class="inline-block mt-1 ml-2 px-1.5 py-0.5 bg-[#ffb74d]/20 text-[#e65100] text-[9px] font-bold rounded uppercase">NO PAGO</span>`;
            }

            const block = document.createElement('div');
            block.className = `absolute w-[95%] left-[2.5%] ${bgClass} rounded-xl p-2 transition-all cursor-pointer border ${borderClass} shadow-sm z-20 overflow-hidden hover:scale-[1.02] hover:shadow-md`;
            block.style.top = `${topPx}px`; block.style.height = `${altoPx}px`;

            const fechaStr = t.fecha ? t.fecha.split('-').reverse().join('/') : 'Hoy';
            block.innerHTML = `
                <div class="w-1.5 h-full absolute left-0 top-0 ${leftBarClass} rounded-l-xl"></div>
                <h4 class="font-headline font-bold text-sm ${textClass} ml-2 truncate">${t.clienteNombre}</h4>
                <p class="text-[10px] text-on-surface-variant font-label ml-2">${fechaStr} • ${t.horaInicio} (${t.duracion}m)</p>
                ${badgeHTML}
            `;

            block.addEventListener('click', (e) => {
                e.stopPropagation(); 
                turnoActivoParaOpciones = t; 
                document.getElementById('opciones-turno-titulo').textContent = `Turno de ${t.clienteNombre}`;
                document.getElementById('modal-opciones-turno').showModal();
            });

            col.appendChild(block);
        });
    }

    const modalOpciones = document.getElementById('modal-opciones-turno');
    
    if (modalOpciones) {
        document.getElementById('btn-cerrar-opciones').onclick = () => modalOpciones.close();

        document.getElementById('btn-eliminar-turno-modal').onclick = () => {
            if(confirm("¿Seguro que deseas borrar este turno de forma definitiva?")) {
                window.Almacenamiento.eliminarTurnoLocal(turnoActivoParaOpciones.id);
                modalOpciones.close();
                cargarTurnosGrilla();
            }
        };

        // NUEVO: Finalizar Turno y Quitar de Agenda
        const btnFinalizar = document.getElementById('btn-finalizar-turno-modal');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', () => {
                if(confirm("¿Los jugadores ya terminaron? El turno desaparecerá del calendario.")) {
                    turnoActivoParaOpciones.estado = 'FINALIZADO';
                    window.Almacenamiento.actualizarTurnoLocal(turnoActivoParaOpciones);
                    modalOpciones.close();
                    cargarTurnosGrilla();
                }
            });
        }

        document.querySelectorAll('.btn-cambiar-estado-turno').forEach(btn => {
            btn.addEventListener('click', (e) => {
                turnoActivoParaOpciones.estadoPago = e.currentTarget.dataset.estado;
                window.Almacenamiento.actualizarTurnoLocal(turnoActivoParaOpciones);
                modalOpciones.close();
                cargarTurnosGrilla();
            });
        });

        document.querySelectorAll('.btn-opcion-rapida-turno').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cur = e.currentTarget;
                if(cur.dataset.tipo === 'cancha') {
                    const precioCancha = (turnoActivoParaOpciones.duracion / 60) * 8500;
                    ticketCarrito.push({
                        id: `cancha-${turnoActivoParaOpciones.canchaId}`,
                        nombre: `Cancha ${turnoActivoParaOpciones.canchaId} (${turnoActivoParaOpciones.duracion}m)`,
                        precio: precioCancha,
                        tipo: 'TURNO'
                    });
                } else {
                    ticketCarrito.push({
                        id: cur.dataset.id,
                        nombre: cur.dataset.nombre,
                        precio: parseFloat(cur.dataset.precio),
                        tipo: 'PRODUCTO'
                    });
                }
                renderizarTicket();
            });
        });
    }

    const modalAgenda = document.getElementById('modal-agenda');
    const formAgenda = document.getElementById('form-agenda');
    
    const btnAbrirModalTop = document.getElementById('btn-abrir-modal-turno');
    if(btnAbrirModalTop) btnAbrirModalTop.addEventListener('click', () => abrirModalAgenda(1, "18:00"));

    function abrirModalAgenda(canchaId, horaStr) {
        if(!modalAgenda) return;
        document.getElementById('agenda-cancha-id').value = canchaId;
        document.getElementById('agenda-hora').value = horaStr;
        document.getElementById('agenda-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('agenda-cliente').value = '';
        
        const datalist = document.getElementById('lista-clientes-agenda');
        if(datalist && window.Almacenamiento.obtenerUsuarios) {
            datalist.innerHTML = '';
            window.Almacenamiento.obtenerUsuarios().filter(u => u.rol === 'CLIENTE').forEach(u => {
                datalist.innerHTML += `<option value="${u.nombre}">`;
            });
        }
        modalAgenda.showModal();
    }

    if(document.getElementById('btn-cancelar-agenda')) document.getElementById('btn-cancelar-agenda').onclick = () => modalAgenda.close();

    if(formAgenda) {
        const btnSubmit = formAgenda.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.type = 'button'; 
            btnSubmit.addEventListener('click', () => {
                const clienteNombre = document.getElementById('agenda-cliente').value.trim();
                const horaForm = document.getElementById('agenda-hora').value;
                
                if (!clienteNombre) {
                    alert("⚠️ Por favor, ingresá el nombre del cliente o socio en el cuadro de texto.");
                    return;
                }

                const nuevoTurno = {
                    canchaId: parseInt(document.getElementById('agenda-cancha-id').value),
                    fecha: document.getElementById('agenda-fecha').value,
                    horaInicio: horaForm,
                    duracion: parseInt(document.getElementById('agenda-duracion').value),
                    clienteNombre: clienteNombre,
                    estadoPago: document.getElementById('agenda-pago').value,
                    estado: 'CONFIRMADO'
                };

                if (window.Almacenamiento && window.Almacenamiento.registrarTurno) {
                    window.Almacenamiento.registrarTurno(nuevoTurno);
                    formAgenda.reset();
                    modalAgenda.close();
                    cargarTurnosGrilla();
                    
                    const [h, m] = horaForm.split(':').map(Number);
                    const topPx = (((h - horaInicio) * 60 + m) / 60) * pxPorHora;
                    const scrollContainer = document.getElementById('calendario-scroll');
                    if (scrollContainer) scrollContainer.scrollTo({ top: topPx - 100, behavior: 'smooth' });
                }
            });
        }
    }

    renderizarGrillaBase();
    cargarTurnosGrilla();
    renderizarTicket();
})();