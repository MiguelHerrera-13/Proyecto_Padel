(function() {
    console.log("Controlador de Agenda conectado a API MySQL Iniciado");

    const obtenerHoyIso = () => {
        if (window.obtenerFechaHoyLocal) return window.obtenerFechaHoyLocal();
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    let ticketCarrito = [];
    let numeroTicket = Math.floor(Math.random() * 900) + 100;
    let fechaActiva = obtenerHoyIso();
    let canchaFiltro = 0; // 0 = Todas, 1 = Cancha 1, 2 = Cancha 2, 3 = Cancha 3
    let catalogoCanchas = [
        { id: 1, nombre: 'Cancha 1', tipo: 'Techada (Blindex)', costo_base: 8500, activa: 1 },
        { id: 2, nombre: 'Cancha 2', tipo: 'Descubierta (Muro)', costo_base: 7000, activa: 1 },
        { id: 3, nombre: 'Cancha 3', tipo: 'Techada (Premium)', costo_base: 9500, activa: 1 }
    ];
    let senaPorDefecto = 2500;

    if (window.Almacenamiento && window.Almacenamiento.obtenerParametros) {
        const param = window.Almacenamiento.obtenerParametros();
        if (param && param.senaFija) senaPorDefecto = parseFloat(param.senaFija);
    }

    const inputFecha = document.getElementById('input-agenda-fecha');
    const labelFechaTexto = document.getElementById('fecha-hoy-txt');
    const btnFechaAnt = document.getElementById('btn-agenda-dia-ant');
    const btnFechaSig = document.getElementById('btn-agenda-dia-sig');
    const btnFechaHoy = document.getElementById('btn-agenda-hoy');

    const contenedorTicket = document.getElementById('ticket-items');
    const labelTotal = document.getElementById('ticket-total');
    const btnCobrar = document.getElementById('btn-cobrar-ticket');

    if (document.getElementById('ticket-id')) {
        document.getElementById('ticket-id').textContent = `Ticket #${numeroTicket}`;
    }

    function obtenerCostoHoraCancha(canchaId) {
        const c = catalogoCanchas.find(x => parseInt(x.id) === parseInt(canchaId));
        return c && c.costo_base ? parseFloat(c.costo_base) : 8500;
    }

    async function cargarCatalogoCanchas() {
        try {
            const res = await fetch('../api/canchas.php');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    catalogoCanchas = data.slice(0, 3);
                }
            }
        } catch (e) {
            console.warn("Usando catálogo de canchas por defecto:", e);
        }
        actualizarCabeceraColumnas();
        actualizarSelectCanchasModal();
    }

    function actualizarSelectCanchasModal() {
        const sel = document.getElementById('agenda-cancha-id');
        if (!sel) return;
        const valActual = sel.value || '1';
        sel.innerHTML = '';
        catalogoCanchas.forEach((c, idx) => {
            const num = idx + 1;
            const enMant = parseInt(c.activa) === 0;
            sel.innerHTML += `<option value="${c.id}" ${enMant ? 'disabled' : ''}>Cancha ${num} - $${parseFloat(c.costo_base).toLocaleString('es-AR')}/h ${enMant ? '(Mantenimiento)' : ''}</option>`;
        });
        sel.value = valActual;
    }

    // --- RESTRICCIÓN DE CALENDARIO (NUNCA ANTES DE HOY) ---
    function formatearFechaLegible(fechaStr) {
        const partes = fechaStr.split('-');
        const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        const hoyIso = obtenerHoyIso();
        const prefijo = (fechaStr === hoyIso) ? "Hoy, " : "";
        return prefijo + d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    function sincronizarControlesFecha() {
        const hoyIso = obtenerHoyIso();
        if (fechaActiva < hoyIso) {
            fechaActiva = hoyIso;
        }
        if (inputFecha) {
            inputFecha.min = hoyIso;
            inputFecha.value = fechaActiva;
        }
        const agendaFechaModal = document.getElementById('agenda-fecha');
        if (agendaFechaModal) {
            agendaFechaModal.min = hoyIso;
        }
        if (labelFechaTexto) {
            labelFechaTexto.textContent = formatearFechaLegible(fechaActiva);
        }
        if (btnFechaAnt) {
            btnFechaAnt.disabled = (fechaActiva <= hoyIso);
        }
    }

    function cambiarFecha(deltaDias) {
        const hoyIso = obtenerHoyIso();
        const partes = fechaActiva.split('-');
        const d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        d.setDate(d.getDate() + deltaDias);
        const año = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        const nuevaFecha = `${año}-${mes}-${dia}`;

        if (nuevaFecha < hoyIso) {
            if (window.mostrarNotificacion) {
                window.mostrarNotificacion("No se pueden elegir fechas anteriores al día de hoy.", "error");
            }
            return;
        }

        fechaActiva = nuevaFecha;
        sincronizarControlesFecha();
        cargarTurnosGrilla();
    }

    if (inputFecha) {
        inputFecha.min = obtenerHoyIso();
        inputFecha.value = fechaActiva;
        inputFecha.addEventListener('change', () => {
            const hoyIso = obtenerHoyIso();
            if (inputFecha.value) {
                if (inputFecha.value < hoyIso) {
                    inputFecha.value = hoyIso;
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion("No se permiten fechas anteriores al día de hoy.", "error");
                    }
                }
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
            fechaActiva = obtenerHoyIso();
            sincronizarControlesFecha();
            cargarTurnosGrilla();
        });
    }

    sincronizarControlesFecha();

    // --- BOTONES FUNCIONALES DE CANCHA 1, 2 Y 3 ---
    function actualizarCabeceraColumnas() {
        const cab = document.getElementById('cabecera-columnas-canchas');
        if (!cab) return;
        cab.innerHTML = '';

        const canchasAVisualizar = canchaFiltro === 0
            ? [1, 2, 3]
            : [canchaFiltro];

        canchasAVisualizar.forEach(num => {
            const cObj = catalogoCanchas[num - 1] || { id: num, nombre: `Cancha ${num}`, costo_base: 8500, activa: 1 };
            const enMant = parseInt(cObj.activa) === 0;
            const div = document.createElement('div');
            div.className = 'flex-1 text-center flex flex-col items-center justify-center';
            div.innerHTML = `
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-extrabold uppercase tracking-wider text-on-surface">Cancha ${num}</span>
                    ${enMant
                        ? `<span class="text-[10px] font-bold bg-[#fff3e0] text-[#e65100] px-1.5 py-0.5 rounded">Mantenimiento</span>`
                        : `<span class="text-[11px] font-bold text-primary">$${parseFloat(cObj.costo_base).toLocaleString('es-AR')}/h</span>`
                    }
                </div>
            `;
            cab.appendChild(div);
        });
    }

    function aplicarFiltroCancha(nuevaCancha) {
        // Si toca el mismo botón de cancha individual, vuelve a mostrar todas
        if (canchaFiltro === nuevaCancha && nuevaCancha !== 0) {
            canchaFiltro = 0;
        } else {
            canchaFiltro = nuevaCancha;
        }

        document.querySelectorAll('.btn-filtro-cancha').forEach(btn => {
            const c = parseInt(btn.dataset.cancha || 0);
            if (c === canchaFiltro) {
                btn.className = 'btn-filtro-cancha px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer';
            } else {
                btn.className = 'btn-filtro-cancha px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg text-xs font-bold transition-all cursor-pointer';
            }
        });

        actualizarCabeceraColumnas();
        renderizarGrillaBase();
        cargarTurnosGrilla();
    }

    document.querySelectorAll('.btn-filtro-cancha').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.cancha || 0);
            aplicarFiltroCancha(num);
        });
    });

    // --- 1. MANEJO DEL TICKET / CARRITO ---
    function renderizarTicket() {
        if (!contenedorTicket) return;
        contenedorTicket.innerHTML = '';
        let total = 0;

        if (ticketCarrito.length === 0) {
            contenedorTicket.innerHTML = '<p class="text-center text-on-surface-variant text-xs mt-10">El ticket está vacío. Selecciona productos o envía un turno para cobrar.</p>';
            if (labelTotal) labelTotal.textContent = '$0';
            return;
        }

        ticketCarrito.forEach((item, index) => {
            total += parseFloat(item.precio);
            contenedorTicket.innerHTML += `
            <div class="flex justify-between items-center bg-surface-container-low p-3 rounded-xl group relative border border-outline-variant/15">
                <div class="pr-3">
                    <p class="font-bold text-xs text-on-surface">${item.nombre}</p>
                    <span class="text-[10px] text-on-surface-variant font-semibold uppercase">${item.subtitulo || item.tipo}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-headline font-extrabold text-sm text-on-surface">$${parseFloat(item.precio).toLocaleString('es-AR')}</span>
                    <button class="text-on-surface-variant hover:text-error p-1 rounded-lg hover:bg-error-container/20 transition-colors btn-borrar-item cursor-pointer" data-index="${index}" title="Quitar del ticket">
                        <span class="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
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
                btn.className = `flex flex-col items-center justify-center p-2.5 rounded-xl transition-all gap-1 relative border border-outline-variant/15 ${
                    agotado 
                    ? 'bg-surface-container/50 opacity-50 cursor-not-allowed' 
                    : 'bg-surface-container-low hover:bg-surface-container active:scale-95 cursor-pointer hover:shadow-sm'
                }`;
                btn.dataset.id = p.id;
                btn.dataset.nombre = p.nombre;
                btn.dataset.precio = p.precio_venta;

                btn.innerHTML = `
                    <span class="material-symbols-outlined text-primary text-xl">${icono}</span>
                    <span class="text-[11px] font-bold text-on-surface line-clamp-1 text-center">${p.nombre}</span>
                    <span class="text-[11px] font-extrabold text-primary font-headline">$${parseFloat(p.precio_venta).toLocaleString('es-AR')}</span>
                    ${agotado ? '<span class="text-[8px] bg-error/20 text-error px-1 rounded absolute top-1 right-1 font-bold">Sin Stock</span>' : ''}
                `;

                if (!agotado) {
                    btn.addEventListener('click', () => {
                        ticketCarrito.push({
                            id: p.id,
                            nombre: p.nombre,
                            precio: parseFloat(p.precio_venta),
                            tipo: 'PRODUCTO',
                            subtitulo: 'Mostrador'
                        });
                        renderizarTicket();
                    });
                }
                contenedor.appendChild(btn);
            });

        } catch (err) {
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
            btn.className = "flex flex-col items-center justify-center p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all gap-1 cursor-pointer border border-outline-variant/15";
            btn.innerHTML = `
                <span class="material-symbols-outlined text-primary text-xl">${f.icono}</span>
                <span class="text-[11px] font-bold text-on-surface">${f.nombre}</span>
                <span class="text-[11px] font-extrabold text-primary font-headline">$${f.precio.toLocaleString('es-AR')}</span>
            `;
            btn.addEventListener('click', () => {
                ticketCarrito.push({
                    id: f.id,
                    nombre: f.nombre,
                    precio: f.precio,
                    tipo: 'PRODUCTO',
                    subtitulo: 'Mostrador'
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
                if (window.mostrarNotificacion) window.mostrarNotificacion("El ticket está vacío.", "error");
                return;
            }

            btnCobrar.disabled = true;
            btnCobrar.textContent = "Procesando cobro...";

            let totalCobrado = 0;
            const conceptosItems = [];

            try {
                for (const item of ticketCarrito) {
                    totalCobrado += item.precio;
                    conceptosItems.push(item.nombre);

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
                            console.warn("No se pudo descontar stock:", errStock);
                        }
                    }

                    if (item.tipo === 'TURNO' && item.turnoId) {
                        try {
                            await fetch('../api/turnos.php', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: item.turnoId, estado_pago: item.nuevoEstadoPago || 'PAGADO' })
                            });
                        } catch (errTurno) {
                            console.warn("No se pudo actualizar estado de pago del turno:", errTurno);
                        }
                    }
                }

                let usuarioId = 1;
                if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                    const u = window.Almacenamiento.obtenerUsuarioLogueado();
                    if (u && u.id) usuarioId = u.id;
                }

                await fetch('../api/caja.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuarioId,
                        tipo: 'INGRESO',
                        concepto: `Cobro Ticket #${numeroTicket} (${conceptosItems.slice(0, 3).join(', ')})`,
                        monto: totalCobrado
                    })
                });

                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion(`Ticket #${numeroTicket} cobrado exitosamente ($${totalCobrado.toLocaleString('es-AR')}).`);
                }

                ticketCarrito = [];
                numeroTicket++;
                if (document.getElementById('ticket-id')) {
                    document.getElementById('ticket-id').textContent = `Ticket #${numeroTicket}`;
                }
                renderizarTicket();
                await cargarTurnosGrilla();
                await cargarProductosVentaRapida();

            } catch (error) {
                console.error("Error al cobrar ticket:", error);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error al procesar el cobro.", "error");
            } finally {
                btnCobrar.disabled = false;
                btnCobrar.innerHTML = `<span class="material-symbols-outlined text-[20px]">point_of_sale</span> Cobrar Total e Impactar en Caja`;
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
            hDiv.className = 'h-20 text-[11px] font-bold text-on-surface-variant/70 text-right pr-3 pt-1.5';
            hDiv.textContent = `${i.toString().padStart(2, '0')}:00`;
            columnaHoras.appendChild(hDiv);

            const linea = document.createElement('div');
            linea.className = 'absolute w-full h-[80px] border-t border-outline-variant/15';
            linea.style.top = `${(i - horaInicio) * pxPorHora}px`;
            grillaCanchas.appendChild(linea);
        }

        colContainer.innerHTML = '';
        const canchasAVisualizar = canchaFiltro === 0 ? [1, 2, 3] : [canchaFiltro];

        canchasAVisualizar.forEach(c => {
            const col = document.createElement('div');
            col.className = `flex-1 relative border-r border-outline-variant/15 columna-cancha cursor-pointer hover:bg-primary/[0.02] transition-colors`;
            col.dataset.cancha = c;
            
            col.addEventListener('click', (e) => {
                if (e.target === col) {
                    const y = e.clientY - col.getBoundingClientRect().top;
                    const horaClic = Math.min(horaFin, Math.max(horaInicio, horaInicio + Math.floor(y / pxPorHora)));
                    abrirModalAgenda(c, `${horaClic.toString().padStart(2, '0')}:00`);
                }
            });
            colContainer.appendChild(col);
        });
    }

    // Cargar turnos desde MySQL
    async function cargarTurnosGrilla() {
        try {
            const res = await fetch(`../api/turnos.php?fecha=${fechaActiva}`);
            if (!res.ok) throw new Error("Error al obtener turnos");
            const todosLosTurnos = await res.json();

            const turnosVisibles = todosLosTurnos.filter(t => t.estado !== 'FINALIZADO' && t.estado !== 'CANCELADO');
            const columnas = document.querySelectorAll('.columna-cancha');
            columnas.forEach(col => col.innerHTML = '');

            turnosVisibles.forEach(t => {
                const canchaId = parseInt(t.cancha_id || t.canchaId || 1);
                if (canchaFiltro !== 0 && canchaId !== canchaFiltro) return;

                const col = Array.from(columnas).find(colEl => parseInt(colEl.dataset.cancha) === canchaId);
                if (!col) return;

                const horaStr = t.hora_inicio || t.horaInicio || '18:00';
                const [h, m] = horaStr.split(':').map(Number);
                const duracionMin = parseInt(t.duracion || 60);
                const topPx = (((h - horaInicio) * 60 + m) / 60) * pxPorHora;
                const altoPx = (duracionMin / 60) * pxPorHora;

                const costoHora = parseFloat(t.cancha_costo_base || obtenerCostoHoraCancha(canchaId));
                const montoTotal = parseFloat(t.monto_total || 0) > 0 ? parseFloat(t.monto_total) : (duracionMin / 60) * costoHora;
                const montoSena = Math.min(senaPorDefecto, montoTotal);
                const saldoRestante = Math.max(0, montoTotal - montoSena);

                const estadoPago = t.estado_pago || t.estadoPago || 'PENDIENTE';
                let badgeHTML, bgClass, borderClass, textClass, leftBarClass;

                if (estadoPago === 'PAGADO') {
                    bgClass = 'bg-[#e8f5e9] hover:bg-[#c8e6c9]';
                    borderClass = 'border-[#4caf50]/40';
                    textClass = 'text-[#2e7d32]';
                    leftBarClass = 'bg-[#4caf50]';
                    badgeHTML = `<span class="inline-block mt-1 ml-2 px-2 py-0.5 bg-[#4caf50]/20 text-[#2e7d32] text-[10px] font-extrabold rounded-md uppercase">PAGADO ($${montoTotal.toLocaleString('es-AR')})</span>`;
                } else if (estadoPago === 'SENA') {
                    bgClass = 'bg-[#e3f2fd] hover:bg-[#bbdefb]';
                    borderClass = 'border-[#2196f3]/40';
                    textClass = 'text-[#1565c0]';
                    leftBarClass = 'bg-[#2196f3]';
                    badgeHTML = `<span class="inline-block mt-1 ml-2 px-2 py-0.5 bg-[#2196f3]/20 text-[#1565c0] text-[10px] font-extrabold rounded-md uppercase">SEÑA $${montoSena.toLocaleString('es-AR')} • FALTA $${saldoRestante.toLocaleString('es-AR')}</span>`;
                } else {
                    bgClass = 'bg-[#fff3e0] hover:bg-[#ffe0b2]';
                    borderClass = 'border-[#ffb74d]/40';
                    textClass = 'text-[#e65100]';
                    leftBarClass = 'bg-[#ff9800]';
                    badgeHTML = `<span class="inline-block mt-1 ml-2 px-2 py-0.5 bg-[#ffb74d]/20 text-[#e65100] text-[10px] font-extrabold rounded-md uppercase">A PAGAR: $${montoTotal.toLocaleString('es-AR')}</span>`;
                }

                const clienteNombre = t.cliente_nombre || t.clienteNombre || 'Socio';
                const horaCorta = horaStr.substring(0, 5);

                const block = document.createElement('div');
                block.className = `absolute w-[95%] left-[2.5%] ${bgClass} rounded-xl p-2.5 transition-all cursor-pointer border ${borderClass} shadow-sm z-20 overflow-hidden hover:shadow-md`;
                block.style.top = `${topPx}px`;
                block.style.height = `${altoPx}px`;

                block.innerHTML = `
                    <div class="w-1.5 h-full absolute left-0 top-0 ${leftBarClass} rounded-l-xl"></div>
                    <div class="flex justify-between items-start ml-2">
                        <h4 class="font-headline font-bold text-xs sm:text-sm ${textClass} truncate">${clienteNombre}</h4>
                        <span class="text-[10px] font-bold text-on-surface-variant ml-1">C${canchaId}</span>
                    </div>
                    <p class="text-[11px] text-on-surface-variant font-medium ml-2">${horaCorta} hs (${duracionMin} min)</p>
                    ${badgeHTML}
                `;

                block.addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirModalOpcionesTurno(t, montoTotal, montoSena);
                });

                col.appendChild(block);
            });
        } catch (error) {
            console.error("Error al cargar turnos en la grilla:", error);
        }
    }

    // --- 3. MODAL DE GESTIÓN DEL TURNO CLICKEADO ---
    const modalOpciones = document.getElementById('modal-opciones-turno');

    function abrirModalOpcionesTurno(t, montoTotal, montoSena) {
        turnoActivoParaOpciones = t;
        if (!modalOpciones) return;

        const canchaId = t.cancha_id || 1;
        const dur = parseInt(t.duracion || 60);
        const horaCorta = (t.hora_inicio || '').substring(0, 5);
        const estadoPago = t.estado_pago || 'PENDIENTE';

        const tit = document.getElementById('opciones-turno-titulo');
        const sub = document.getElementById('opciones-turno-subtitulo');
        if (tit) tit.textContent = `${t.cliente_nombre || 'Socio'} • Cancha ${canchaId}`;
        if (sub) sub.textContent = `Horario: ${horaCorta} hs (${dur} min) • Fecha: ${t.fecha.split('-').reverse().join('/')}`;

        const elTotal = document.getElementById('op-turno-total');
        const elSena = document.getElementById('op-turno-sena');
        const elSaldo = document.getElementById('op-turno-saldo');
        const elLabelSaldo = document.getElementById('op-label-a-pagar');
        const btnSenaTxt = document.getElementById('btn-sena-monto-txt');
        const txtBtnEnviar = document.getElementById('txt-btn-enviar-cancha');

        if (elTotal) elTotal.textContent = `$${montoTotal.toLocaleString('es-AR')}`;
        if (elSena) elSena.textContent = `$${montoSena.toLocaleString('es-AR')}`;
        if (btnSenaTxt) btnSenaTxt.textContent = `$${montoSena.toLocaleString('es-AR')}`;

        if (estadoPago === 'PAGADO') {
            if (elLabelSaldo) elLabelSaldo.textContent = 'Estado de Cuenta:';
            if (elSaldo) {
                elSaldo.textContent = 'TOTAL ABONADO ($0)';
                elSaldo.className = 'font-headline font-extrabold text-sm text-[#2e7d32]';
            }
            if (txtBtnEnviar) txtBtnEnviar.textContent = `Cancha ya abonada ($${montoTotal.toLocaleString('es-AR')})`;
        } else if (estadoPago === 'SENA') {
            const resto = Math.max(0, montoTotal - montoSena);
            if (elLabelSaldo) elLabelSaldo.textContent = 'Resta Pagar (Total - Seña):';
            if (elSaldo) {
                elSaldo.textContent = `$${resto.toLocaleString('es-AR')}`;
                elSaldo.className = 'font-headline font-extrabold text-base text-[#1565c0]';
            }
            if (txtBtnEnviar) txtBtnEnviar.textContent = `Enviar Saldo Restante al Ticket ($${resto.toLocaleString('es-AR')})`;
        } else {
            if (elLabelSaldo) elLabelSaldo.textContent = 'Total a Pagar (Sin Seña):';
            if (elSaldo) {
                elSaldo.textContent = `$${montoTotal.toLocaleString('es-AR')}`;
                elSaldo.className = 'font-headline font-extrabold text-base text-[#e65100]';
            }
            if (txtBtnEnviar) txtBtnEnviar.textContent = `Enviar Total Cancha al Ticket ($${montoTotal.toLocaleString('es-AR')})`;
        }

        modalOpciones.showModal();
    }

    if (modalOpciones) {
        const btnCerrarOp = document.getElementById('btn-cerrar-opciones');
        if (btnCerrarOp) btnCerrarOp.onclick = () => modalOpciones.close();

        const btnEliminarTurno = document.getElementById('btn-eliminar-turno-modal');
        if (btnEliminarTurno) {
            btnEliminarTurno.onclick = async () => {
                if (!turnoActivoParaOpciones) return;
                if (confirm(`¿Seguro que deseas cancelar y borrar este turno de ${turnoActivoParaOpciones.cliente_nombre || 'este socio'}?`)) {
                    try {
                        const res = await fetch(`../api/turnos.php?id=${turnoActivoParaOpciones.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            modalOpciones.close();
                            if (window.mostrarNotificacion) window.mostrarNotificacion("Turno cancelado y liberado.");
                            await cargarTurnosGrilla();
                        }
                    } catch (e) {
                        if (window.mostrarNotificacion) window.mostrarNotificacion("Error al eliminar turno.", "error");
                    }
                }
            };
        }

        const btnFinalizar = document.getElementById('btn-finalizar-turno-modal');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', async () => {
                if (!turnoActivoParaOpciones) return;
                if (confirm("¿Los jugadores ya finalizaron el partido? La cancha quedará liberada.")) {
                    try {
                        await fetch('../api/turnos.php', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: turnoActivoParaOpciones.id, estado: 'FINALIZADO' })
                        });
                        modalOpciones.close();
                        if (window.mostrarNotificacion) window.mostrarNotificacion("Partido finalizado correctamente.");
                        await cargarTurnosGrilla();
                    } catch (e) {
                        if (window.mostrarNotificacion) window.mostrarNotificacion("Error al finalizar turno.", "error");
                    }
                }
            });
        }

        // Cambiar Estado de Pago en MySQL (PENDIENTE, SENA, PAGADO)
        document.querySelectorAll('.btn-cambiar-estado-turno').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!turnoActivoParaOpciones) return;
                const nuevoEstadoPago = e.currentTarget.dataset.estado;
                const dur = parseInt(turnoActivoParaOpciones.duracion || 60);
                const canchaId = turnoActivoParaOpciones.cancha_id || 1;
                const costoHora = parseFloat(turnoActivoParaOpciones.cancha_costo_base || obtenerCostoHoraCancha(canchaId));
                const montoTotal = parseFloat(turnoActivoParaOpciones.monto_total || 0) > 0
                    ? parseFloat(turnoActivoParaOpciones.monto_total)
                    : (dur / 60) * costoHora;
                const montoSena = Math.min(senaPorDefecto, montoTotal);

                try {
                    await fetch('../api/turnos.php', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: turnoActivoParaOpciones.id, estado_pago: nuevoEstadoPago })
                    });

                    // Si eligen SEÑA, mostrar el precio de la seña y agregarla al ticket si aún no estaba señado
                    if (nuevoEstadoPago === 'SENA') {
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(`Seña seleccionada: Debe abonar $${montoSena.toLocaleString('es-AR')} (Restan $${(montoTotal - montoSena).toLocaleString('es-AR')}).`);
                        }
                    } else if (nuevoEstadoPago === 'PAGADO') {
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(`Turno marcado como Total Pagado ($${montoTotal.toLocaleString('es-AR')}).`);
                        }
                    } else {
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(`Turno marcado como Pendiente de Pago ($${montoTotal.toLocaleString('es-AR')}).`);
                        }
                    }

                    turnoActivoParaOpciones.estado_pago = nuevoEstadoPago;
                    abrirModalOpcionesTurno(turnoActivoParaOpciones, montoTotal, montoSena);
                    await cargarTurnosGrilla();
                } catch (e) {
                    if (window.mostrarNotificacion) window.mostrarNotificacion("Error al cambiar estado de pago.", "error");
                }
            });
        });

        // Enviar Cancha o Ítems al Ticket desde el turno
        document.querySelectorAll('.btn-opcion-rapida-turno').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!turnoActivoParaOpciones) return;
                const cur = e.currentTarget;
                const dur = parseInt(turnoActivoParaOpciones.duracion || 60);
                const canchaId = turnoActivoParaOpciones.cancha_id || 1;
                const costoBase = parseFloat(turnoActivoParaOpciones.cancha_costo_base || obtenerCostoHoraCancha(canchaId));
                const precioTotalCancha = parseFloat(turnoActivoParaOpciones.monto_total || 0) > 0
                    ? parseFloat(turnoActivoParaOpciones.monto_total)
                    : (dur / 60) * costoBase;

                if (cur.dataset.tipo === 'cancha') {
                    const estadoPago = turnoActivoParaOpciones.estado_pago || 'PENDIENTE';
                    const montoSena = Math.min(senaPorDefecto, precioTotalCancha);
                    const precioACobrar = estadoPago === 'SENA'
                        ? Math.max(0, precioTotalCancha - montoSena)
                        : precioTotalCancha;

                    const etiqueta = estadoPago === 'SENA'
                        ? `Saldo Cancha ${canchaId} (${dur}m - Seña descontada)`
                        : `Alquiler Cancha ${canchaId} (${dur}m)`;

                    ticketCarrito.push({
                        id: `cancha-${canchaId}`,
                        turnoId: turnoActivoParaOpciones.id,
                        nombre: etiqueta,
                        precio: precioACobrar,
                        tipo: 'TURNO',
                        nuevoEstadoPago: 'PAGADO',
                        subtitulo: `Socio: ${turnoActivoParaOpciones.cliente_nombre || 'Club'}`
                    });
                    modalOpciones.close();
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(`Agregado al ticket: $${precioACobrar.toLocaleString('es-AR')}`);
                    }
                } else {
                    ticketCarrito.push({
                        id: cur.dataset.id,
                        nombre: cur.dataset.nombre,
                        precio: parseFloat(cur.dataset.precio),
                        tipo: 'PRODUCTO',
                        subtitulo: `Consumo Cancha ${canchaId}`
                    });
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(`${cur.dataset.nombre} agregado al ticket.`);
                    }
                }
                
                renderizarTicket();
            });
        });
    }

    // --- 4. MODAL CREAR NUEVO TURNO Y CÁLCULO DE SEÑA EN VIVO ---
    const modalAgenda = document.getElementById('modal-agenda');
    const formAgenda = document.getElementById('form-agenda');
    const btnAbrirModalTop = document.getElementById('btn-abrir-modal-turno');

    const selAgendaCancha = document.getElementById('agenda-cancha-id');
    const selAgendaDuracion = document.getElementById('agenda-duracion');
    const selAgendaPago = document.getElementById('agenda-pago');
    const inputAgendaMontoSena = document.getElementById('agenda-monto-sena');

    function actualizarResumenPrecioNuevoTurno() {
        const canchaId = selAgendaCancha ? parseInt(selAgendaCancha.value || 1) : 1;
        const duracion = selAgendaDuracion ? parseInt(selAgendaDuracion.value || 90) : 90;
        const estadoPago = selAgendaPago ? selAgendaPago.value : 'PENDIENTE';

        const costoHora = obtenerCostoHoraCancha(canchaId);
        const precioTotal = Math.round((duracion / 60) * costoHora);
        const senaIngresada = inputAgendaMontoSena ? parseFloat(inputAgendaMontoSena.value || senaPorDefecto) : senaPorDefecto;
        const montoSenaEfectivo = Math.min(Math.max(0, senaIngresada), precioTotal);
        const saldoRestante = Math.max(0, precioTotal - montoSenaEfectivo);

        const elPrecioTotal = document.getElementById('agenda-precio-total-txt');
        const bloqueSena = document.getElementById('bloque-detalle-sena-agenda');
        const bloqueGeneral = document.getElementById('bloque-detalle-general-agenda');
        const elSaldoRestante = document.getElementById('agenda-saldo-restante-txt');
        const elLabelCobroAhora = document.getElementById('agenda-label-cobro-ahora');
        const elMontoAhora = document.getElementById('agenda-monto-ahora-txt');

        if (elPrecioTotal) elPrecioTotal.textContent = `$${precioTotal.toLocaleString('es-AR')}`;

        if (estadoPago === 'SENA') {
            if (bloqueSena) bloqueSena.classList.remove('hidden');
            if (bloqueGeneral) bloqueGeneral.classList.add('hidden');
            if (elSaldoRestante) elSaldoRestante.textContent = `$${saldoRestante.toLocaleString('es-AR')}`;
        } else if (estadoPago === 'PAGADO') {
            if (bloqueSena) bloqueSena.classList.add('hidden');
            if (bloqueGeneral) bloqueGeneral.classList.remove('hidden');
            if (elLabelCobroAhora) elLabelCobroAhora.textContent = 'Total a Cobrar Ahora:';
            if (elMontoAhora) {
                elMontoAhora.textContent = `$${precioTotal.toLocaleString('es-AR')}`;
                elMontoAhora.className = 'font-headline font-extrabold text-base text-[#2e7d32]';
            }
        } else {
            if (bloqueSena) bloqueSena.classList.add('hidden');
            if (bloqueGeneral) bloqueGeneral.classList.remove('hidden');
            if (elLabelCobroAhora) elLabelCobroAhora.textContent = 'Queda Pendiente de Pago:';
            if (elMontoAhora) {
                elMontoAhora.textContent = `$${precioTotal.toLocaleString('es-AR')}`;
                elMontoAhora.className = 'font-headline font-extrabold text-base text-[#e65100]';
            }
        }
    }

    if (selAgendaCancha) selAgendaCancha.addEventListener('change', actualizarResumenPrecioNuevoTurno);
    if (selAgendaDuracion) selAgendaDuracion.addEventListener('change', actualizarResumenPrecioNuevoTurno);
    if (selAgendaPago) selAgendaPago.addEventListener('change', actualizarResumenPrecioNuevoTurno);
    if (inputAgendaMontoSena) inputAgendaMontoSena.addEventListener('input', actualizarResumenPrecioNuevoTurno);

    if (btnAbrirModalTop) {
        btnAbrirModalTop.addEventListener('click', () => {
            const canchaInicial = canchaFiltro !== 0 ? canchaFiltro : 1;
            abrirModalAgenda(canchaInicial, "18:00");
        });
    }

    async function abrirModalAgenda(canchaId, horaStr) {
        if (!modalAgenda) return;
        const hoyIso = obtenerHoyIso();
        if (fechaActiva < hoyIso) fechaActiva = hoyIso;

        if (selAgendaCancha) selAgendaCancha.value = canchaId;
        document.getElementById('agenda-hora').value = horaStr;
        const inputFechaModal = document.getElementById('agenda-fecha');
        if (inputFechaModal) {
            inputFechaModal.min = hoyIso;
            inputFechaModal.value = fechaActiva;
        }
        document.getElementById('agenda-cliente').value = '';
        if (inputAgendaMontoSena) inputAgendaMontoSena.value = senaPorDefecto;

        actualizarResumenPrecioNuevoTurno();
        
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
                console.warn("No se pudieron cargar usuarios:", e);
            }
        }
        modalAgenda.showModal();
    }

    const cerrarModalAgenda = () => { if (modalAgenda) modalAgenda.close(); };
    if (document.getElementById('btn-cancelar-agenda')) document.getElementById('btn-cancelar-agenda').onclick = cerrarModalAgenda;
    if (document.getElementById('btn-cerrar-agenda-x')) document.getElementById('btn-cerrar-agenda-x').onclick = cerrarModalAgenda;

    if (formAgenda) {
        formAgenda.addEventListener('submit', async (e) => {
            e.preventDefault();
            const hoyIso = obtenerHoyIso();
            const clienteNombre = document.getElementById('agenda-cliente').value.trim();
            const horaForm = document.getElementById('agenda-hora').value;
            const canchaId = parseInt(document.getElementById('agenda-cancha-id').value);
            const fechaForm = document.getElementById('agenda-fecha').value;
            const duracionForm = parseInt(document.getElementById('agenda-duracion').value);
            const pagoForm = document.getElementById('agenda-pago').value;
            
            if (!clienteNombre) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Ingresa el nombre del socio o cliente.", "error");
                return;
            }

            if (fechaForm < hoyIso) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("No puedes agendar turnos en fechas pasadas.", "error");
                return;
            }

            let clienteId = null;
            const datalist = document.getElementById('lista-clientes-agenda');
            if (datalist) {
                const opt = Array.from(datalist.options).find(o => o.value.toLowerCase() === clienteNombre.toLowerCase());
                if (opt && opt.dataset.id) clienteId = parseInt(opt.dataset.id);
            }

            const costoHora = obtenerCostoHoraCancha(canchaId);
            const montoTotal = Math.round((duracionForm / 60) * costoHora);
            const montoSena = inputAgendaMontoSena ? parseFloat(inputAgendaMontoSena.value || senaPorDefecto) : senaPorDefecto;

            const payload = {
                cancha_id: canchaId,
                fecha: fechaForm,
                hora_inicio: horaForm,
                duracion: duracionForm,
                cliente_nombre: clienteNombre,
                cliente_id: clienteId,
                estado_pago: pagoForm,
                estado: 'CONFIRMADO',
                monto_total: montoTotal
            };

            const btnSubmit = formAgenda.querySelector('button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = "Guardando...";
            }

            try {
                const res = await fetch('../api/turnos.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const dataRes = await res.json();
                    // Si eligió SEÑA o PAGADO, registrar ingreso en Caja o agregar al ticket
                    if (pagoForm === 'SENA') {
                        await fetch('../api/caja.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                usuario_id: 1,
                                tipo: 'INGRESO',
                                concepto: `Seña Turno Cancha ${canchaId} - ${clienteNombre} (${horaForm}hs)`,
                                monto: montoSena
                            })
                        });
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(`Turno agendado con Seña de $${montoSena.toLocaleString('es-AR')} (Resta pagar $${(montoTotal - montoSena).toLocaleString('es-AR')}).`);
                        }
                    } else if (pagoForm === 'PAGADO') {
                        await fetch('../api/caja.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                usuario_id: 1,
                                tipo: 'INGRESO',
                                concepto: `Pago Total Turno Cancha ${canchaId} - ${clienteNombre} (${horaForm}hs)`,
                                monto: montoTotal
                            })
                        });
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(`Turno agendado y abonado en su totalidad ($${montoTotal.toLocaleString('es-AR')}).`);
                        }
                    } else {
                        if (window.mostrarNotificacion) {
                            window.mostrarNotificacion(`Turno agendado. Total a cobrar: $${montoTotal.toLocaleString('es-AR')}.`);
                        }
                    }

                    formAgenda.reset();
                    modalAgenda.close();
                    fechaActiva = fechaForm;
                    sincronizarControlesFecha();
                    await cargarTurnosGrilla();
                } else {
                    const err = await res.json();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(err.error || "No se pudo registrar el turno.", "error");
                }
            } catch (e) {
                console.error("Error al registrar turno:", e);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al guardar turno.", "error");
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = "Confirmar Turno";
                }
            }
        });
    }

    function scrollAHoraActual() {
        const scrollContainer = document.getElementById('calendario-scroll');
        if (!scrollContainer) return;
        const horaActual = new Date().getHours();
        const topPx = Math.max(0, (horaActual - horaInicio - 1) * pxPorHora);
        scrollContainer.scrollTo({ top: topPx, behavior: 'smooth' });
    }

    // Inicializar
    (async () => {
        await cargarCatalogoCanchas();
        renderizarGrillaBase();
        await cargarTurnosGrilla();
        renderizarTicket();
        await cargarProductosVentaRapida();
        setTimeout(scrollAHoraActual, 150);
    })();
})();
