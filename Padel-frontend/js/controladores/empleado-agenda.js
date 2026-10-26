(function() {
    console.log("Controlador de Agenda conectado a API MySQL Iniciado");

    let ticketCarrito = [];
    let numeroTicket = Math.floor(Math.random() * 1000) + 1000;
    let fechaActiva = new Date().toISOString().split('T')[0];
    
    const inputFecha = document.getElementById('input-agenda-fecha');
    const labelFechaTexto = document.getElementById('fecha-hoy-txt');
    const btnFechaAnt = document.getElementById('btn-agenda-dia-ant');
    const btnFechaSig = document.getElementById('btn-agenda-dia-sig');
    const btnFechaHoy = document.getElementById('btn-agenda-hoy');

    const contenedorTicket = document.getElementById('ticket-items');
    const labelTotal = document.getElementById('ticket-total');
    const btnCobrar = document.getElementById('btn-cobrar-ticket');
    
    if (document.getElementById('ticket-id')) document.getElementById('ticket-id').textContent = `Ticket #${numeroTicket}`;

    function formatearFechaLegible(fechaStr) {
        const partes = fechaStr.split('-');
        const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        const hoyIso = new Date().toISOString().split('T')[0];
        const prefijo = (fechaStr === hoyIso) ? "Hoy, " : "";
        return prefijo + d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    function sincronizarControlesFecha() {
        if (inputFecha) inputFecha.value = fechaActiva;
        if (labelFechaTexto) labelFechaTexto.textContent = formatearFechaLegible(fechaActiva);
    }

    function cambiarFecha(deltaDias) {
        const partes = fechaActiva.split('-');
        const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        d.setDate(d.getDate() + deltaDias);
        const año = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        fechaActiva = `${año}-${mes}-${dia}`;
        sincronizarControlesFecha();
        cargarTurnosGrilla();
    }

    if (inputFecha) {
        inputFecha.value = fechaActiva;
        inputFecha.addEventListener('change', () => {
            if (inputFecha.value) {
                fechaActiva = inputFecha.value;
                sincronizarControlesFecha();
                cargarTurnosGrilla();
            }
        });
    }

    if (btnFechaAnt) btnFechaAnt.addEventListener('click', () => cambiarFecha(-1));
    if (btnFechaSig) btnFechaSig.addEventListener('click', () => cambiarFecha(1));
    if (btnFechaHoy) {
        btnFechaHoy.addEventListener('click', () => {
            fechaActiva = new Date().toISOString().split('T')[0];
            sincronizarControlesFecha();
            cargarTurnosGrilla();
        });
    }

    sincronizarControlesFecha();

    // --- 1. MANEJO DEL TICKET / CARRITO ---
    function renderizarTicket() {
        if (!contenedorTicket) return;
        contenedorTicket.innerHTML = '';
        let total = 0;

        if (ticketCarrito.length === 0) {
            contenedorTicket.innerHTML = '<p class="text-center text-on-surface-variant text-sm mt-10">El ticket está vacío.</p>';
            if (labelTotal) labelTotal.textContent = '$0';
            return;
        }

        ticketCarrito.forEach((item, index) => {
            total += parseFloat(item.precio);
            contenedorTicket.innerHTML += `
            <div class="flex justify-between items-center bg-surface-container-low p-3 rounded-xl group relative shadow-sm border border-outline-variant/10">
                <div>
                    <p class="font-semibold text-sm text-on-surface">${item.nombre}</p>
                    <span class="text-[10px] text-secondary font-medium uppercase">${item.tipo}</span>
                </div>
                <span class="font-bold text-sm text-on-surface">$${parseFloat(item.precio).toLocaleString('es-AR')}</span>
                <button class="absolute -right-2 -top-2 bg-error text-on-error w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm btn-borrar-item" data-index="${index}">
                    <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
            </div>`;
        });

        if (labelTotal) labelTotal.textContent = '$' + total.toLocaleString('es-AR');

        document.querySelectorAll('.btn-borrar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                ticketCarrito.splice(e.currentTarget.dataset.index, 1);
                renderizarTicket();
            });
        });
    }

    // Carga dinámica de productos para venta rápida desde MySQL
    async function cargarProductosVentaRapida() {
        const contenedor = document.getElementById('contenedor-venta-rapida');
        if (!contenedor) return;

        try {
            const res = await fetch('../api/stock.php');
            if (!res.ok) throw new Error("Error HTTP al obtener productos");
            const productos = await res.json();

            if (!Array.isArray(productos) || productos.length === 0) {
                renderizarVentaRapidaFallback(contenedor);
                return;
            }

            const prodsMostrador = productos.slice(0, 8);
            contenedor.innerHTML = '';

            prodsMostrador.forEach(p => {
                let icono = 'inventory_2';
                const nomLower = (p.nombre || '').toLowerCase();
                const catLower = (p.categoria || '').toLowerCase();
                
                if (catLower.includes('bebida') || nomLower.includes('agua') || nomLower.includes('gatorade') || nomLower.includes('coca')) {
                    icono = nomLower.includes('agua') ? 'water_drop' : 'local_drink';
                } else if (nomLower.includes('pelota') || nomLower.includes('tubo')) {
                    icono = 'sports_tennis';
                } else if (nomLower.includes('paleta') || nomLower.includes('pala')) {
                    icono = 'sports_kabaddi';
                } else if (catLower.includes('indumentaria') || nomLower.includes('grip') || nomLower.includes('remera')) {
                    icono = 'checkroom';
                }

                const agotado = parseInt(p.stock_actual) <= 0;
                const btn = document.createElement('button');
                btn.className = `flex flex-col items-center justify-center p-2.5 rounded-xl transition-all gap-1.5 relative border border-outline-variant/10 shadow-sm ${
                    agotado 
                    ? 'bg-surface-container/50 opacity-50 cursor-not-allowed' 
                    : 'bg-surface-container-low hover:bg-surface-container active:scale-95 cursor-pointer hover:shadow-md'
                }`;
                btn.dataset.id = p.id;
                btn.dataset.nombre = p.nombre;
                btn.dataset.precio = p.precio_venta;

                btn.innerHTML = `
                    <span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings: 'FILL' 1;">${icono}</span>
                    <span class="text-[11px] font-bold text-on-surface line-clamp-1 text-center">${p.nombre}</span>
                    <span class="text-[10px] font-semibold text-primary font-headline">$${parseFloat(p.precio_venta).toLocaleString('es-AR')}</span>
                    ${agotado ? '<span class="text-[8px] bg-error/20 text-error px-1 rounded absolute top-1 right-1 font-bold">Sin Stock</span>' : ''}
                `;

                if (!agotado) {
                    btn.addEventListener('click', () => {
                        ticketCarrito.push({
                            id: p.id,
                            nombre: p.nombre,
                            precio: parseFloat(p.precio_venta),
                            tipo: 'PRODUCTO'
                        });
                        renderizarTicket();
                    });
                }
                contenedor.appendChild(btn);
            });

        } catch (err) {
            console.warn("Fallo al cargar productos dinámicos, usando fallback:", err);
            renderizarVentaRapidaFallback(contenedor);
        }
    }

    function renderizarVentaRapidaFallback(contenedor) {
        const fallbacks = [
            { id: 3, nombre: "Agua Mineral", precio: 1500, icono: "water_drop" },
            { id: 4, nombre: "Gatorade", precio: 2200, icono: "local_drink" },
            { id: 1, nombre: "Tubo Pelotas", precio: 9500, icono: "sports_tennis" },
            { id: 2, nombre: "Alquiler Pala", precio: 4000, icono: "sports_kabaddi" }
        ];
        contenedor.innerHTML = '';
        fallbacks.forEach(f => {
            const btn = document.createElement('button');
            btn.className = "flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all gap-1.5 cursor-pointer shadow-sm border border-outline-variant/10";
            btn.innerHTML = `
                <span class="material-symbols-outlined text-primary text-2xl" style="font-variation-settings: 'FILL' 1;">${f.icono}</span>
                <span class="text-xs font-semibold text-on-surface-variant">${f.nombre}</span>
                <span class="text-[10px] font-bold text-primary font-headline">$${f.precio}</span>
            `;
            btn.addEventListener('click', () => {
                ticketCarrito.push({
                    id: f.id,
                    nombre: f.nombre,
                    precio: f.precio,
                    tipo: 'PRODUCTO'
                });
                renderizarTicket();
            });
            contenedor.appendChild(btn);
        });
    }

    // Cobrar Ticket: Descuenta stock en MySQL, registra en Caja y actualiza turnos
    if (btnCobrar) {
        btnCobrar.addEventListener('click', async () => {
            if (ticketCarrito.length === 0) {
                alert("El ticket está vacío.");
                return;
            }

            btnCobrar.disabled = true;
            btnCobrar.textContent = "Procesando...";

            let totalCobrado = 0;
            const conceptosItems = [];

            try {
                // 1. Procesar cada item
                for (const item of ticketCarrito) {
                    totalCobrado += item.precio;
                    conceptosItems.push(item.nombre);

                    // Si es producto, descontar stock en MySQL
                    if (item.tipo === 'PRODUCTO' && item.id) {
                        try {
                            const resProd = await fetch(`../api/stock.php?id=${item.id}`);
                            if (resProd.ok) {
                                const prodData = await resProd.json();
                                const stockActual = parseInt(prodData.stock_actual || 0);
                                const nuevoStock = Math.max(0, stockActual - 1);
                                await fetch('../api/stock.php', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: item.id, stock_actual: nuevoStock })
                                });
                            }
                        } catch (errStock) {
                            console.warn("No se pudo descontar stock de producto:", errStock);
                        }
                    }

                    // Si es turno, marcarlo como PAGADO en MySQL
                    if (item.tipo === 'TURNO' && item.turnoId) {
                        try {
                            await fetch('../api/turnos.php', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: item.turnoId, estado_pago: 'PAGADO' })
                            });
                        } catch (errTurno) {
                            console.warn("No se pudo actualizar estado de pago del turno:", errTurno);
                        }
                    }
                }

                // 2. Registrar el ingreso en la Caja de MySQL
                let usuarioId = 1;
                let usuarioNombre = 'Empleado';
                if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                    const u = window.Almacenamiento.obtenerUsuarioLogueado();
                    if (u) {
                        usuarioId = u.id || 1;
                        usuarioNombre = u.nombre || 'Empleado';
                    }
                }

                await fetch('../api/caja.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuarioId,
                        tipo: 'INGRESO',
                        concepto: `Cobro Ticket #${numeroTicket} (${ticketCarrito.length} items: ${conceptosItems.slice(0, 3).join(', ')})`,
                        monto: totalCobrado
                    })
                });

                alert(`✅ Ticket #${numeroTicket} cobrado con éxito.\nTotal ingresado a Caja: $${totalCobrado.toLocaleString('es-AR')}`);

                ticketCarrito = [];
                numeroTicket++;
                if (document.getElementById('ticket-id')) {
                    document.getElementById('ticket-id').textContent = `Ticket #${numeroTicket}`;
                }
                renderizarTicket();
                await cargarTurnosGrilla();

            } catch (error) {
                console.error("Error al cobrar ticket:", error);
                alert("Error al procesar el cobro en el servidor.");
            } finally {
                btnCobrar.disabled = false;
                btnCobrar.textContent = "Cobrar e Imprimir Ticket";
            }
        });
    }

    // --- 2. CALENDARIO Y GRILLA HORARIA ---
    const horaInicio = 8;
    const horaFin = 23;
    const pxPorHora = 80;
    let turnoActivoParaOpciones = null;

    function renderizarGrillaBase() {
        const columnaHoras = document.getElementById('columna-horas');
        const grillaCanchas = document.getElementById('grilla-canchas');
        const colContainer = document.getElementById('columnas-canchas');
        if (!columnaHoras || !grillaCanchas || !colContainer) return;
        
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
                if (e.target === col) {
                    const y = e.clientY - col.getBoundingClientRect().top;
                    const horaClic = horaInicio + Math.floor(y / pxPorHora);
                    abrirModalAgenda(c, `${horaClic.toString().padStart(2, '0')}:00`);
                }
            });
            colContainer.appendChild(col);
        }
    }

    // Cargar turnos desde MySQL
    async function cargarTurnosGrilla() {
        try {
            const res = await fetch(`../api/turnos.php?fecha=${fechaActiva}`);
            if (!res.ok) throw new Error("Error al obtener turnos");
            const todosLosTurnos = await res.json();

            // Filtrar los que no están cancelados ni finalizados
            const turnosVisibles = todosLosTurnos.filter(t => t.estado !== 'FINALIZADO' && t.estado !== 'CANCELADO');
            const columnas = document.querySelectorAll('.columna-cancha');
            columnas.forEach(col => col.innerHTML = '');

            turnosVisibles.forEach(t => {
                const horaStr = t.hora_inicio || t.horaInicio || '18:00';
                const [h, m] = horaStr.split(':').map(Number);
                const duracionMin = parseInt(t.duracion || 60);
                const topPx = (((h - horaInicio) * 60 + m) / 60) * pxPorHora;
                const altoPx = (duracionMin / 60) * pxPorHora;

                const canchaId = parseInt(t.cancha_id || t.canchaId || 1);
                const col = columnas[canchaId - 1];
                if (!col) return;

                const estadoPago = t.estado_pago || t.estadoPago || 'NO_PAGO';
                let badgeHTML, bgClass, borderClass, textClass, leftBarClass;

                if (estadoPago === 'PAGADO') {
                    bgClass = 'bg-[#e8f5e9]/95 hover:bg-[#c8e6c9]';
                    borderClass = 'border-[#4caf50]/40';
                    textClass = 'text-[#2e7d32]';
                    leftBarClass = 'bg-[#4caf50]';
                    badgeHTML = `<span class="inline-block mt-1 ml-2 px-1.5 py-0.5 bg-[#4caf50]/20 text-[#2e7d32] text-[9px] font-bold rounded uppercase">TOTAL PAGADO</span>`;
                } else if (estadoPago === 'SENA') {
                    bgClass = 'bg-[#e3f2fd]/95 hover:bg-[#bbdefb]';
                    borderClass = 'border-[#2196f3]/40';
                    textClass = 'text-[#1565c0]';
                    leftBarClass = 'bg-[#2196f3]';
                    badgeHTML = `<span class="inline-block mt-1 ml-2 px-1.5 py-0.5 bg-[#2196f3]/20 text-[#1565c0] text-[9px] font-bold rounded uppercase">SEÑA PAGADA</span>`;
                } else {
                    bgClass = 'bg-[#fff3e0]/95 hover:bg-[#ffe0b2]';
                    borderClass = 'border-[#ffb74d]/40';
                    textClass = 'text-[#e65100]';
                    leftBarClass = 'bg-[#ff9800]';
                    badgeHTML = `<span class="inline-block mt-1 ml-2 px-1.5 py-0.5 bg-[#ffb74d]/20 text-[#e65100] text-[9px] font-bold rounded uppercase">PENDIENTE PAGO</span>`;
                }

                const clienteNombre = t.cliente_nombre || t.clienteNombre || 'Socio';
                const horaCorta = horaStr.substring(0, 5);

                const block = document.createElement('div');
                block.className = `absolute w-[95%] left-[2.5%] ${bgClass} rounded-xl p-2 transition-all cursor-pointer border ${borderClass} shadow-sm z-20 overflow-hidden hover:scale-[1.02] hover:shadow-md`;
                block.style.top = `${topPx}px`;
                block.style.height = `${altoPx}px`;

                block.innerHTML = `
                    <div class="w-1.5 h-full absolute left-0 top-0 ${leftBarClass} rounded-l-xl"></div>
                    <h4 class="font-headline font-bold text-sm ${textClass} ml-2 truncate">${clienteNombre}</h4>
                    <p class="text-[10px] text-on-surface-variant font-label ml-2">${horaCorta} hs (${duracionMin} min)</p>
                    ${badgeHTML}
                `;

                // Clic para abrir el modal de opciones del turno
                block.addEventListener('click', (e) => {
                    e.stopPropagation();
                    turnoActivoParaOpciones = t;
                    const tit = document.getElementById('opciones-turno-titulo');
                    if (tit) tit.textContent = `Turno: ${clienteNombre} (Cancha ${canchaId})`;
                    if (modalOpciones) modalOpciones.showModal();
                });

                col.appendChild(block);
            });
        } catch (error) {
            console.error("Error al cargar turnos en la grilla:", error);
        }
    }

    // --- 3. MODAL DE GESTIÓN DEL TURNO CLICKEADO ---
    const modalOpciones = document.getElementById('modal-opciones-turno');
    
    if (modalOpciones) {
        const btnCerrarOp = document.getElementById('btn-cerrar-opciones');
        if (btnCerrarOp) btnCerrarOp.onclick = () => modalOpciones.close();

        // Eliminar Turno en MySQL
        const btnEliminarTurno = document.getElementById('btn-eliminar-turno-modal');
        if (btnEliminarTurno) {
            btnEliminarTurno.onclick = async () => {
                if (!turnoActivoParaOpciones) return;
                if (confirm(`¿Seguro que deseas cancelar y borrar este turno de ${turnoActivoParaOpciones.cliente_nombre || turnoActivoParaOpciones.clienteNombre}?`)) {
                    try {
                        const res = await fetch(`../api/turnos.php?id=${turnoActivoParaOpciones.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            modalOpciones.close();
                            await cargarTurnosGrilla();
                        } else {
                            const err = await res.json();
                            alert(err.error || "Error al eliminar turno.");
                        }
                    } catch (e) {
                        alert("Error de conexión al eliminar turno.");
                    }
                }
            };
        }

        // Finalizar Turno
        const btnFinalizar = document.getElementById('btn-finalizar-turno-modal');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', async () => {
                if (!turnoActivoParaOpciones) return;
                if (confirm("¿Los jugadores ya finalizaron? El turno se marcará como COMPLETADO.")) {
                    try {
                        await fetch('../api/turnos.php', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: turnoActivoParaOpciones.id, estado: 'FINALIZADO' })
                        });
                        modalOpciones.close();
                        await cargarTurnosGrilla();
                    } catch (e) {
                        alert("Error de conexión al finalizar turno.");
                    }
                }
            });
        }

        // Cambiar Estado de Pago en MySQL (NO_PAGO, SENA, PAGADO)
        document.querySelectorAll('.btn-cambiar-estado-turno').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!turnoActivoParaOpciones) return;
                const nuevoEstadoPago = e.currentTarget.dataset.estado;

                try {
                    await fetch('../api/turnos.php', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: turnoActivoParaOpciones.id, estado_pago: nuevoEstadoPago })
                    });
                    modalOpciones.close();
                    await cargarTurnosGrilla();
                } catch (e) {
                    alert("Error de conexión al cambiar estado de pago.");
                }
            });
        });

        // Enviar Cancha o Ítems al Ticket desde el turno
        document.querySelectorAll('.btn-opcion-rapida-turno').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!turnoActivoParaOpciones) return;
                const cur = e.currentTarget;
                const dur = parseInt(turnoActivoParaOpciones.duracion || 60);
                const canchaId = turnoActivoParaOpciones.cancha_id || turnoActivoParaOpciones.canchaId || 1;

                if (cur.dataset.tipo === 'cancha') {
                    // Cálculo de tarifa
                    const costoBase = parseFloat(turnoActivoParaOpciones.cancha_costo_base || 8500);
                    const precioCancha = (dur / 60) * costoBase;
                    ticketCarrito.push({
                        id: `cancha-${canchaId}`,
                        turnoId: turnoActivoParaOpciones.id,
                        nombre: `Alquiler Cancha ${canchaId} (${dur}m)`,
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

    // --- 4. MODAL CREAR NUEVO TURNO DESDE LA AGENCIA ---
    const modalAgenda = document.getElementById('modal-agenda');
    const formAgenda = document.getElementById('form-agenda');
    const btnAbrirModalTop = document.getElementById('btn-abrir-modal-turno');

    if (btnAbrirModalTop) {
        btnAbrirModalTop.addEventListener('click', () => abrirModalAgenda(1, "18:00"));
    }

    async function abrirModalAgenda(canchaId, horaStr) {
        if (!modalAgenda) return;
        document.getElementById('agenda-cancha-id').value = canchaId;
        document.getElementById('agenda-hora').value = horaStr;
        document.getElementById('agenda-fecha').value = fechaActiva;
        document.getElementById('agenda-cliente').value = '';
        
        // Cargar socios registrados de la base de datos para el datalist
        const datalist = document.getElementById('lista-clientes-agenda');
        if (datalist) {
            datalist.innerHTML = '';
            try {
                const resU = await fetch('../api/usuarios.php');
                if (resU.ok) {
                    const usuarios = await resU.json();
                    usuarios.filter(u => u.rol === 'CLIENTE').forEach(u => {
                        datalist.innerHTML += `<option value="${u.nombre}" data-id="${u.id}">${u.correo}</option>`;
                    });
                }
            } catch (e) {
                console.warn("No se pudieron cargar usuarios para autocompletar:", e);
            }
        }
        modalAgenda.showModal();
    }

    if (document.getElementById('btn-cancelar-agenda')) {
        document.getElementById('btn-cancelar-agenda').onclick = () => modalAgenda.close();
    }

    if (formAgenda) {
        const btnSubmit = formAgenda.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.type = 'button'; 
            btnSubmit.addEventListener('click', async () => {
                const clienteNombre = document.getElementById('agenda-cliente').value.trim();
                const horaForm = document.getElementById('agenda-hora').value;
                const canchaId = parseInt(document.getElementById('agenda-cancha-id').value);
                const fechaForm = document.getElementById('agenda-fecha').value;
                const duracionForm = parseInt(document.getElementById('agenda-duracion').value);
                const pagoForm = document.getElementById('agenda-pago').value;
                
                if (!clienteNombre) {
                    alert("⚠️ Por favor, ingresá el nombre del cliente o socio en el cuadro de texto.");
                    return;
                }

                // Buscar si coincide con un cliente registrado
                let clienteId = null;
                const datalist = document.getElementById('lista-clientes-agenda');
                if (datalist) {
                    const opt = Array.from(datalist.options).find(o => o.value.toLowerCase() === clienteNombre.toLowerCase());
                    if (opt && opt.dataset.id) clienteId = parseInt(opt.dataset.id);
                }

                const payload = {
                    cancha_id: canchaId,
                    fecha: fechaForm,
                    hora_inicio: horaForm,
                    duracion: duracionForm,
                    cliente_nombre: clienteNombre,
                    cliente_id: clienteId,
                    estado_pago: pagoForm,
                    estado: 'CONFIRMADO',
                    monto_total: (duracionForm / 60) * 8500
                };

                btnSubmit.disabled = true;
                btnSubmit.textContent = "Agendando...";

                try {
                    const res = await fetch('../api/turnos.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        formAgenda.reset();
                        modalAgenda.close();
                        fechaActiva = fechaForm;
                        await cargarTurnosGrilla();
                        
                        const [h, m] = horaForm.split(':').map(Number);
                        const topPx = (((h - horaInicio) * 60 + m) / 60) * pxPorHora;
                        const scrollContainer = document.getElementById('calendario-scroll');
                        if (scrollContainer) scrollContainer.scrollTo({ top: topPx - 100, behavior: 'smooth' });
                    } else {
                        const err = await res.json();
                        alert(err.error || "No se pudo registrar el turno.");
                    }
                } catch (e) {
                    console.error("Error al registrar turno:", e);
                    alert("Error de conexión al guardar turno en el servidor.");
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = "Confirmar Turno";
                }
            });
        }
    }

    // Inicializar
    renderizarGrillaBase();
    cargarTurnosGrilla();
    renderizarTicket();
    cargarProductosVentaRapida();
})();