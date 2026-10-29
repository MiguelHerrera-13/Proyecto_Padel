(function() {
    console.log("Controlador de Caja Iniciado");

    const kpiEfectivo = document.getElementById('kpi-efectivo');
    const kpiDigitales = document.getElementById('kpi-digitales');
    const kpiTotal = document.getElementById('kpi-total');
    const txtUltimaAct = document.getElementById('caja-ultima-actualizacion');

    const selectTipo = document.getElementById('caja-tipo');
    const contenedorProducto = document.getElementById('contenedor-producto');
    const labelProducto = document.getElementById('label-caja-producto');
    const badgeModoDigital = document.getElementById('badge-modo-digital');
    const selectProducto = document.getElementById('caja-producto-select');
    const contenedorProveedor = document.getElementById('contenedor-proveedor');
    const selectProveedor = document.getElementById('caja-proveedor-select');
    const inputMonto = document.getElementById('caja-monto');
    const inputConcepto = document.getElementById('caja-concepto');
    const btnRegistrar = document.getElementById('btn-registrar-caja');
    const contenedorHistorial = document.getElementById('caja-historial');

    // Modal Historial Completo ("Ver todo")
    const btnVerTodo = document.getElementById('btn-ver-todo-historial');
    const modalHistorialCompleto = document.getElementById('modal-historial-completo');
    const btnCerrarHistorialCompleto = document.getElementById('btn-cerrar-historial-completo');
    const tbodyHistorialCompleto = document.getElementById('tabla-historial-completo-body');
    const inputBuscarHistorial = document.getElementById('input-buscar-historial');

    // Modal Detalle Individual
    const modalDetalleMov = document.getElementById('modal-detalle-movimiento');
    const btnCerrarDetalleMov = document.getElementById('btn-cerrar-detalle-mov');
    const btnAceptarDetalleMov = document.getElementById('btn-aceptar-detalle-mov');

    // Modal de Cierre
    const modalCierre = document.getElementById('modal-cierre-caja');
    const btnAbrirCierre = document.getElementById('btn-cerrar-caja');
    const btnCancelarCierre = document.getElementById('btn-cancelar-cierre');
    const btnConfirmarCierre = document.getElementById('btn-confirmar-cierre');

    const txtCierreIngresos = document.getElementById('cierre-ingresos');
    const txtCierreDigitales = document.getElementById('cierre-digitales');
    const txtCierreEgresos = document.getElementById('cierre-egresos');
    const txtCierreBalance = document.getElementById('cierre-balance');

    let catalogoProductos = [];
    let catalogoProveedores = [];
    let movimientosActuales = [];
    let filtroHistorialActivo = 'TODOS';

    // 1. Cargar catálogo de productos y proveedores
    async function cargarCatalogoProductos() {
        if (!selectProducto) return;
        try {
            const res = await fetch('../api/stock.php');
            if (res.ok) {
                catalogoProductos = await res.json();
                poblarSelectProductos();
            }
        } catch (e) {
            console.warn("No se pudo cargar catálogo de productos en caja:", e);
        }
    }

    async function cargarCatalogoProveedores() {
        if (!selectProveedor) return;
        try {
            const res = await fetch('../api/proveedores.php');
            if (res.ok) {
                catalogoProveedores = await res.json();
                selectProveedor.innerHTML = '<option value="">-- Gasto operativo general / Otro --</option>';
                catalogoProveedores.forEach(pr => {
                    const saldo = parseFloat(pr.saldo_pendiente || 0);
                    const textoSaldo = saldo > 0 ? ` (Deuda: $${saldo.toLocaleString('es-AR')})` : ' (Al día)';
                    selectProveedor.innerHTML += `<option value="${pr.id}" data-empresa="${pr.empresa}" data-saldo="${saldo}">${pr.empresa} - ${pr.rubro}${textoSaldo}</option>`;
                });
            }
        } catch (e) {
            console.warn("No se pudo cargar proveedores en caja:", e);
        }
    }

    function poblarSelectProductos() {
        if (!selectProducto) return;
        const tipo = selectTipo ? selectTipo.value : 'INGRESO';
        const esDigital = (tipo === 'INGRESO_MP');

        selectProducto.innerHTML = '';

        // Si NO es ingreso digital, permitir la opción de venta manual o sin producto
        if (!esDigital) {
            selectProducto.innerHTML = '<option value="">-- Venta manual o sin producto --</option>';
        }

        catalogoProductos.forEach(p => {
            const stockNum = parseInt(p.stock_actual ?? p.stockActual ?? 0);
            const deshabilitado = stockNum <= 0 ? 'disabled' : '';
            selectProducto.innerHTML += `
                <option value="${p.id}" data-precio="${p.precio_venta}" data-nombre="${p.nombre}" data-stock="${stockNum}" ${deshabilitado}>
                    ${p.nombre} ($${parseFloat(p.precio_venta).toLocaleString('es-AR')}) - Stock: ${stockNum} u.
                </option>
            `;
        });

        if (esDigital) {
            // En Ingreso Digital: ocultar venta manual y cargar directamente el producto y su precio
            if (labelProducto) labelProducto.textContent = 'Producto Vendido';
            if (badgeModoDigital) badgeModoDigital.classList.remove('hidden');

            // Seleccionar automáticamente el primer producto con stock
            const primeraOpcionValida = Array.from(selectProducto.options).find(o => o.value && !o.disabled);
            if (primeraOpcionValida) {
                selectProducto.value = primeraOpcionValida.value;
            }
            aplicarProductoSeleccionado();

            if (inputMonto) {
                inputMonto.readOnly = true;
                inputMonto.classList.add('bg-surface-container-highest/60', 'cursor-not-allowed');
            }
            if (inputConcepto) {
                inputConcepto.readOnly = true;
                inputConcepto.classList.add('bg-surface-container-highest/60', 'cursor-not-allowed');
            }
        } else {
            if (labelProducto) labelProducto.textContent = 'Venta de Inventario (Opcional)';
            if (badgeModoDigital) badgeModoDigital.classList.add('hidden');
            if (inputMonto) {
                inputMonto.readOnly = false;
                inputMonto.classList.remove('bg-surface-container-highest/60', 'cursor-not-allowed');
            }
            if (inputConcepto) {
                inputConcepto.readOnly = false;
                inputConcepto.classList.remove('bg-surface-container-highest/60', 'cursor-not-allowed');
            }
        }
    }

    function aplicarProductoSeleccionado() {
        if (!selectProducto) return;
        const selectedOption = selectProducto.options[selectProducto.selectedIndex];
        const tipo = selectTipo ? selectTipo.value : 'INGRESO';

        if (selectedOption && selectedOption.value) {
            const precio = selectedOption.dataset.precio;
            const nombre = selectedOption.dataset.nombre;
            if (inputMonto) inputMonto.value = precio;
            if (inputConcepto) {
                inputConcepto.value = (tipo === 'INGRESO_MP')
                    ? `Producto vendido (Digital): ${nombre}`
                    : `Venta mostrador: ${nombre}`;
            }
        } else if (tipo !== 'INGRESO_MP') {
            if (inputMonto) inputMonto.value = '';
            if (inputConcepto) inputConcepto.value = '';
        }
    }

    // 2. Alternar campos según el tipo de movimiento seleccionado
    if (selectTipo) {
        selectTipo.addEventListener('change', () => {
            const tipo = selectTipo.value;
            if (tipo === 'INGRESO' || tipo === 'INGRESO_MP') {
                if (contenedorProducto) contenedorProducto.classList.remove('hidden');
                if (contenedorProveedor) contenedorProveedor.classList.add('hidden');
                poblarSelectProductos();
            } else if (tipo === 'EGRESO') {
                if (contenedorProducto) contenedorProducto.classList.add('hidden');
                if (contenedorProveedor) contenedorProveedor.classList.remove('hidden');
                if (inputMonto) {
                    inputMonto.readOnly = false;
                    inputMonto.value = '';
                    inputMonto.classList.remove('bg-surface-container-highest/60', 'cursor-not-allowed');
                }
                if (inputConcepto) {
                    inputConcepto.readOnly = false;
                    inputConcepto.value = '';
                    inputConcepto.classList.remove('bg-surface-container-highest/60', 'cursor-not-allowed');
                }
            } else {
                // RETIRO
                if (contenedorProducto) contenedorProducto.classList.add('hidden');
                if (contenedorProveedor) contenedorProveedor.classList.add('hidden');
                if (inputMonto) {
                    inputMonto.readOnly = false;
                    inputMonto.value = '';
                    inputMonto.classList.remove('bg-surface-container-highest/60', 'cursor-not-allowed');
                }
                if (inputConcepto) {
                    inputConcepto.readOnly = false;
                    inputConcepto.value = 'Retiro parcial de caja';
                    inputConcepto.classList.remove('bg-surface-container-highest/60', 'cursor-not-allowed');
                }
            }
        });
    }

    // 3. Al seleccionar un producto o proveedor, autocompletar monto y concepto
    if (selectProducto) {
        selectProducto.addEventListener('change', aplicarProductoSeleccionado);
    }

    if (selectProveedor) {
        selectProveedor.addEventListener('change', () => {
            const opt = selectProveedor.options[selectProveedor.selectedIndex];
            if (opt && opt.value) {
                const empresa = opt.dataset.empresa;
                const saldo = parseFloat(opt.dataset.saldo || 0);
                if (inputConcepto) inputConcepto.value = `Pago a proveedor: ${empresa}`;
                if (inputMonto && saldo > 0) inputMonto.value = saldo;
            }
        });
    }

    // Helper para clasificar categoría y detalles de un movimiento
    function analizarDetalleMovimiento(m) {
        const conceptoLower = (m.concepto || '').toLowerCase();
        let categoria = 'Operación General';
        let medioFlujo = 'Efectivo en Caja';
        let tipoNombre = 'Ingreso Efectivo';
        let badgeHTML = '';
        let colorMonto = 'text-[#2e7d32]';
        let signo = '+$';

        if (m.tipo === 'INGRESO') {
            tipoNombre = 'Ingreso en Efectivo';
            medioFlujo = 'Efectivo en Mostrador';
            badgeHTML = `<span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/20">EFECTIVO</span>`;
            colorMonto = 'text-[#2e7d32]';
            signo = '+$';
            if (conceptoLower.includes('ticket') || conceptoLower.includes('mostrador') || conceptoLower.includes('venta')) {
                categoria = 'Venta de Mostrador / Kiosco';
            } else if (conceptoLower.includes('cancha') || conceptoLower.includes('turno')) {
                categoria = 'Alquiler de Cancha';
            }
        } else if (m.tipo === 'INGRESO_MP') {
            tipoNombre = 'Ingreso Digital (MercadoPago)';
            medioFlujo = 'Acreditación Digital / Transferencia';
            badgeHTML = `<span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#e3f2fd] text-[#1565c0] border border-[#2196f3]/20">DIGITAL MP</span>`;
            colorMonto = 'text-[#1565c0]';
            signo = '+$';
            if (conceptoLower.includes('seña') || conceptoLower.includes('cancha') || conceptoLower.includes('reserva')) {
                categoria = 'Seña / Reserva Web';
            } else {
                categoria = 'Venta Digital de Producto';
            }
        } else if (m.tipo === 'RETIRO') {
            tipoNombre = 'Retiro / Cierre de Efectivo';
            medioFlujo = 'Rendición de Efectivo en Mano';
            categoria = 'Arqueo y Cierre Operativo';
            badgeHTML = `<span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#ffebee] text-[#c62828] border border-[#ef5350]/20">RETIRO EFECTIVO</span>`;
            colorMonto = 'text-[#c62828]';
            signo = '-$';
        } else if (m.tipo === 'RETIRO_MP' || m.tipo === 'RETIRO_DIGITAL') {
            tipoNombre = 'Liquidación / Cierre Plata Virtual';
            medioFlujo = 'Rendición Digital (MercadoPago)';
            categoria = 'Arqueo y Cierre Operativo';
            badgeHTML = `<span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#ede7f6] text-[#5e35b1] border border-[#5e35b1]/20">RETIRO MP</span>`;
            colorMonto = 'text-[#5e35b1]';
            signo = '-$';
        } else {
            tipoNombre = 'Egreso de Caja';
            medioFlujo = 'Salida de Efectivo';
            categoria = conceptoLower.includes('proveedor') ? 'Pago a Proveedor' : 'Gasto Operativo / Mantenimiento';
            badgeHTML = `<span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#fff3e0] text-[#e65100] border border-[#ffb74d]/30">EGRESO</span>`;
            colorMonto = 'text-[#e65100]';
            signo = '-$';
        }

        let fechaCompleta = 'Hoy';
        let horaCorta = '--:--';
        if (m.fecha_hora) {
            const d = new Date(m.fecha_hora.replace(' ', 'T'));
            horaCorta = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
            fechaCompleta = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + horaCorta;
        }

        return {
            categoria,
            medioFlujo,
            tipoNombre,
            badgeHTML,
            colorMonto,
            signo,
            fechaCompleta,
            horaCorta
        };
    }

    // Mostrar modal con ficha detallada de un movimiento
    function abrirDetalleMovimiento(m) {
        if (!modalDetalleMov || !m) return;
        const info = analizarDetalleMovimiento(m);
        const montoFloat = parseFloat(m.monto || 0);

        document.getElementById('det-mov-id').textContent = `Operación #MOV-${String(m.id).padStart(4, '0')}`;
        document.getElementById('det-mov-fecha').textContent = info.fechaCompleta;
        document.getElementById('det-mov-tipo').textContent = info.tipoNombre;
        document.getElementById('det-mov-categoria').textContent = info.categoria;
        document.getElementById('det-mov-medio').textContent = info.medioFlujo;
        document.getElementById('det-mov-usuario').textContent = m.usuario_nombre || 'Operador de Turno';
        document.getElementById('det-mov-concepto').textContent = m.concepto || 'Sin detalle adicional';

        const elMonto = document.getElementById('det-mov-monto');
        if (elMonto) {
            elMonto.textContent = `${info.signo}${montoFloat.toLocaleString('es-AR')}`;
            elMonto.className = `font-headline font-extrabold text-2xl ${info.colorMonto}`;
        }

        modalDetalleMov.showModal();
    }

    if (btnCerrarDetalleMov && modalDetalleMov) {
        btnCerrarDetalleMov.addEventListener('click', () => modalDetalleMov.close());
    }
    if (btnAceptarDetalleMov && modalDetalleMov) {
        btnAceptarDetalleMov.addEventListener('click', () => modalDetalleMov.close());
    }

    // 4. Cargar y renderizar movimientos de caja desde MySQL
    async function cargarMovimientos() {
        try {
            const res = await fetch('../api/caja.php');
            if (!res.ok) throw new Error("Error al obtener movimientos de caja");
            movimientosActuales = await res.json();
            renderizarHistorialYTotales(movimientosActuales);
            if (txtUltimaAct) {
                const ahora = new Date();
                txtUltimaAct.textContent = `Hoy, ${ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs`;
            }
        } catch (e) {
            console.error("Error al cargar movimientos:", e);
            if (contenedorHistorial) {
                contenedorHistorial.innerHTML = `<p class="text-sm text-error text-center py-6 font-medium">Error de conexión al cargar movimientos de caja.</p>`;
            }
        }
    }

    function renderizarHistorialYTotales(movimientos) {
        let totalEfectivoIngresos = 0;
        let totalDigitalesIngresos = 0;
        let totalEgresos = 0;
        let totalRetirosEfectivo = 0;
        let totalRetirosDigitales = 0;

        if (contenedorHistorial) contenedorHistorial.innerHTML = '';

        if (!movimientos || movimientos.length === 0) {
            if (contenedorHistorial) {
                contenedorHistorial.innerHTML = `
                    <div class="text-center py-12 text-on-surface-variant/60">
                        <span class="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                        <p class="text-sm font-medium">No hay movimientos registrados hoy.</p>
                    </div>`;
            }
            if (kpiEfectivo) kpiEfectivo.textContent = '$ 0';
            if (kpiDigitales) kpiDigitales.textContent = '$ 0';
            if (kpiTotal) kpiTotal.textContent = '$ 0';
            return;
        }

        movimientos.forEach((m, index) => {
            const montoFloat = parseFloat(m.monto || 0);
            const esIngresoEfectivo = (m.tipo === 'INGRESO');
            const esIngresoDigital = (m.tipo === 'INGRESO_MP');
            const esRetiroEfectivo = (m.tipo === 'RETIRO');
            const esRetiroDigital = (m.tipo === 'RETIRO_MP' || m.tipo === 'RETIRO_DIGITAL');
            const esEgreso = (m.tipo === 'EGRESO');

            if (esIngresoEfectivo) totalEfectivoIngresos += montoFloat;
            if (esIngresoDigital) totalDigitalesIngresos += montoFloat;
            if (esRetiroEfectivo) totalRetirosEfectivo += montoFloat;
            if (esRetiroDigital) totalRetirosDigitales += montoFloat;
            if (esEgreso) totalEgresos += montoFloat;

            const info = analizarDetalleMovimiento(m);

            if (contenedorHistorial) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low transition-colors border border-outline-variant/15 cursor-pointer group';
                itemDiv.innerHTML = `
                    <div class="flex items-center gap-3 min-w-0 pr-3">
                        <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center font-bold text-xs text-on-surface flex-shrink-0">
                            ${(m.usuario_nombre || 'OP').substring(0, 2).toUpperCase()}
                        </div>
                        <div class="min-w-0 text-left">
                            <p class="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">${m.concepto}</p>
                            <div class="flex items-center gap-1.5 mt-0.5 text-xs text-on-surface-variant">
                                <span>${info.horaCorta}</span>
                                <span>•</span>
                                <span class="font-medium">${info.categoria}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        <span class="font-headline font-bold text-sm ${info.colorMonto}">${info.signo}${montoFloat.toLocaleString('es-AR')}</span>
                        ${info.badgeHTML}
                    </div>
                `;
                itemDiv.addEventListener('click', () => abrirDetalleMovimiento(m));
                contenedorHistorial.appendChild(itemDiv);
            }
        });

        const efectivoEnCaja = Math.max(0, totalEfectivoIngresos - (totalEgresos + totalRetirosEfectivo));
        const digitalDisponible = Math.max(0, totalDigitalesIngresos - totalRetirosDigitales);
        const totalDisponible = efectivoEnCaja + digitalDisponible;

        if (kpiEfectivo) kpiEfectivo.textContent = `$ ${efectivoEnCaja.toLocaleString('es-AR')}`;
        if (kpiDigitales) kpiDigitales.textContent = `$ ${digitalDisponible.toLocaleString('es-AR')}`;
        if (kpiTotal) kpiTotal.textContent = `$ ${totalDisponible.toLocaleString('es-AR')}`;
    }

    // Renderizar tabla del modal "Ver todo"
    function renderizarModalHistorialCompleto() {
        if (!tbodyHistorialCompleto) return;

        let sumEfectivo = 0;
        let sumDigital = 0;
        let sumEgreso = 0;
        let sumRetiro = 0;

        movimientosActuales.forEach(m => {
            const val = parseFloat(m.monto || 0);
            if (m.tipo === 'INGRESO') sumEfectivo += val;
            else if (m.tipo === 'INGRESO_MP') sumDigital += val;
            else if (m.tipo === 'EGRESO') sumEgreso += val;
            else if (m.tipo === 'RETIRO' || m.tipo === 'RETIRO_MP' || m.tipo === 'RETIRO_DIGITAL') sumRetiro += val;
        });

        const elEf = document.getElementById('modal-hist-efectivo');
        const elDig = document.getElementById('modal-hist-digital');
        const elEg = document.getElementById('modal-hist-egresos');
        const elRet = document.getElementById('modal-hist-retiros');

        if (elEf) elEf.textContent = `$${sumEfectivo.toLocaleString('es-AR')}`;
        if (elDig) elDig.textContent = `$${sumDigital.toLocaleString('es-AR')}`;
        if (elEg) elEg.textContent = `$${sumEgreso.toLocaleString('es-AR')}`;
        if (elRet) elRet.textContent = `$${sumRetiro.toLocaleString('es-AR')}`;

        const textoBusq = inputBuscarHistorial ? inputBuscarHistorial.value.toLowerCase().trim() : '';

        const filtrados = movimientosActuales.filter(m => {
            let coincideTipo = (filtroHistorialActivo === 'TODOS');
            if (filtroHistorialActivo === 'INGRESO') coincideTipo = (m.tipo === 'INGRESO');
            else if (filtroHistorialActivo === 'INGRESO_MP') coincideTipo = (m.tipo === 'INGRESO_MP' || m.tipo === 'RETIRO_MP' || m.tipo === 'RETIRO_DIGITAL');
            else if (filtroHistorialActivo === 'EGRESO') coincideTipo = (m.tipo === 'EGRESO');
            else if (filtroHistorialActivo === 'RETIRO') coincideTipo = (m.tipo === 'RETIRO' || m.tipo === 'RETIRO_MP' || m.tipo === 'RETIRO_DIGITAL');

            const coincideTexto = !textoBusq ||
                (m.concepto && m.concepto.toLowerCase().includes(textoBusq)) ||
                (m.usuario_nombre && m.usuario_nombre.toLowerCase().includes(textoBusq));
            return coincideTipo && coincideTexto;
        });

        tbodyHistorialCompleto.innerHTML = '';

        if (filtrados.length === 0) {
            tbodyHistorialCompleto.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-on-surface-variant font-medium">No se encontraron movimientos con los filtros seleccionados.</td></tr>`;
            return;
        }

        filtrados.forEach(m => {
            const info = analizarDetalleMovimiento(m);
            const montoFloat = parseFloat(m.monto || 0);
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low/70 transition-colors cursor-pointer';
            tr.innerHTML = `
                <td class="px-4 py-3.5 font-mono text-xs font-bold text-secondary align-middle">#MOV-${String(m.id).padStart(4, '0')}</td>
                <td class="px-4 py-3.5 text-on-surface font-medium align-middle whitespace-nowrap">${info.fechaCompleta}</td>
                <td class="px-4 py-3.5 text-on-surface font-semibold align-middle">${m.usuario_nombre || 'Operador'}</td>
                <td class="px-4 py-3.5 text-on-surface-variant font-medium align-middle">${info.categoria}</td>
                <td class="px-4 py-3.5 text-on-surface font-semibold align-middle max-w-[260px] truncate" title="${m.concepto}">${m.concepto}</td>
                <td class="px-4 py-3.5 text-center align-middle">${info.badgeHTML}</td>
                <td class="px-4 py-3.5 text-right font-headline font-bold align-middle ${info.colorMonto}">${info.signo}${montoFloat.toLocaleString('es-AR')}</td>
            `;
            tr.addEventListener('click', () => abrirDetalleMovimiento(m));
            tbodyHistorialCompleto.appendChild(tr);
        });
    }

    if (btnVerTodo && modalHistorialCompleto) {
        btnVerTodo.addEventListener('click', () => {
            renderizarModalHistorialCompleto();
            modalHistorialCompleto.showModal();
        });
    }

    if (btnCerrarHistorialCompleto && modalHistorialCompleto) {
        btnCerrarHistorialCompleto.addEventListener('click', () => modalHistorialCompleto.close());
    }

    document.querySelectorAll('.btn-filtro-hist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-filtro-hist').forEach(b => {
                b.className = 'btn-filtro-hist px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-lowest text-on-surface hover:bg-surface-container cursor-pointer';
            });
            e.currentTarget.className = 'btn-filtro-hist px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary shadow-sm cursor-pointer';
            filtroHistorialActivo = e.currentTarget.dataset.filtro;
            renderizarModalHistorialCompleto();
        });
    });

    if (inputBuscarHistorial) {
        inputBuscarHistorial.addEventListener('input', renderizarModalHistorialCompleto);
    }

    // 5. Registrar movimiento en la API
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', async () => {
            const tipo = selectTipo ? selectTipo.value : 'INGRESO';
            const prodId = selectProducto ? selectProducto.value : '';
            const provId = selectProveedor ? selectProveedor.value : '';

            if (tipo === 'INGRESO_MP' && !prodId) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Para un Ingreso Digital debés seleccionar el producto vendido.", "error");
                return;
            }

            const monto = parseFloat(inputMonto.value);
            const concepto = inputConcepto.value.trim();

            if (isNaN(monto) || monto <= 0) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Por favor, ingresá un monto válido mayor a 0.", "error");
                return;
            }
            if (!concepto) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Por favor, ingresá un concepto o descripción para el movimiento.", "error");
                return;
            }

            let usuarioId = 1;
            if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                const u = window.Almacenamiento.obtenerUsuarioLogueado();
                if (u && u.id) usuarioId = u.id;
            }

            btnRegistrar.disabled = true;
            btnRegistrar.textContent = "Registrando...";

            try {
                // Si es un EGRESO vinculado a un proveedor, usar la acción pagar de proveedores.php (que actualiza saldo y registra en caja)
                if (tipo === 'EGRESO' && provId) {
                    const resProvPago = await fetch('../api/proveedores.php', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: parseInt(provId),
                            accion: 'pagar',
                            monto_pago: monto,
                            concepto: concepto,
                            usuario_id: usuarioId
                        })
                    });

                    if (resProvPago.ok) {
                        inputMonto.value = '';
                        inputConcepto.value = '';
                        selectProveedor.value = '';
                        if (window.mostrarNotificacion) window.mostrarNotificacion("Pago a proveedor registrado y descontado de su saldo.");
                        await cargarMovimientos();
                        await cargarCatalogoProveedores();
                        if (window.actualizarNotificacionesGlobal) window.actualizarNotificacionesGlobal();
                        return;
                    }
                }

                const res = await fetch('../api/caja.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuarioId,
                        tipo: tipo,
                        concepto: concepto,
                        monto: monto
                    })
                });

                if (res.ok) {
                    // Si se vendió un producto del select, descontar stock en MySQL
                    if ((tipo === 'INGRESO' || tipo === 'INGRESO_MP') && prodId) {
                        const prod = catalogoProductos.find(p => p.id == prodId);
                        if (prod) {
                            const stockActual = parseInt(prod.stock_actual ?? prod.stockActual ?? 0);
                            const nuevoStock = Math.max(0, stockActual - 1);
                            await fetch('../api/stock.php', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: prod.id, stock_actual: nuevoStock })
                            });
                        }
                    }

                    // Recargar datos
                    await cargarCatalogoProductos();
                    await cargarMovimientos();
                    if (window.actualizarNotificacionesGlobal) window.actualizarNotificacionesGlobal();

                    if (tipo !== 'INGRESO_MP') {
                        inputMonto.value = '';
                        inputConcepto.value = '';
                        if (selectProducto) selectProducto.value = '';
                    }

                    if (window.mostrarNotificacion) window.mostrarNotificacion("Movimiento registrado en caja exitosamente.");
                } else {
                    const err = await res.json();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(err.error || "Error al registrar movimiento.", "error");
                }
            } catch (e) {
                console.error("Error al registrar en caja:", e);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al registrar movimiento en caja.", "error");
            } finally {
                btnRegistrar.disabled = false;
                btnRegistrar.innerHTML = `<span class="material-symbols-outlined text-[20px]">check_circle</span> Registrar Movimiento en Caja`;
            }
        });
    }

    const txtCierreDigitalesRendir = document.getElementById('cierre-balance-digital');
    const txtCierreTotalRendir = document.getElementById('cierre-total-rendir');

    // 6. Modal de Cierre de Caja
    if (btnAbrirCierre && modalCierre) {
        btnAbrirCierre.addEventListener('click', () => {
            let totalEfectivoIngresos = 0;
            let totalDigitalesIngresos = 0;
            let totalEgresos = 0;
            let totalRetirosEfectivo = 0;
            let totalRetirosDigitales = 0;

            movimientosActuales.forEach(m => {
                const montoFloat = parseFloat(m.monto || 0);
                if (m.tipo === 'INGRESO') totalEfectivoIngresos += montoFloat;
                else if (m.tipo === 'INGRESO_MP') totalDigitalesIngresos += montoFloat;
                else if (m.tipo === 'RETIRO') totalRetirosEfectivo += montoFloat;
                else if (m.tipo === 'RETIRO_MP' || m.tipo === 'RETIRO_DIGITAL') totalRetirosDigitales += montoFloat;
                else if (m.tipo === 'EGRESO') totalEgresos += montoFloat;
            });

            const balanceEfectivo = Math.max(0, totalEfectivoIngresos - (totalEgresos + totalRetirosEfectivo));
            const balanceDigital = Math.max(0, totalDigitalesIngresos - totalRetirosDigitales);
            const totalRendir = balanceEfectivo + balanceDigital;

            if (txtCierreIngresos) txtCierreIngresos.textContent = `$${totalEfectivoIngresos.toLocaleString('es-AR')}`;
            if (txtCierreDigitales) txtCierreDigitales.textContent = `$${totalDigitalesIngresos.toLocaleString('es-AR')}`;
            if (txtCierreEgresos) txtCierreEgresos.textContent = `$${(totalEgresos + totalRetirosEfectivo + totalRetirosDigitales).toLocaleString('es-AR')}`;
            if (txtCierreBalance) txtCierreBalance.textContent = `$${balanceEfectivo.toLocaleString('es-AR')}`;
            if (txtCierreDigitalesRendir) txtCierreDigitalesRendir.textContent = `$${balanceDigital.toLocaleString('es-AR')}`;
            if (txtCierreTotalRendir) txtCierreTotalRendir.textContent = `$${totalRendir.toLocaleString('es-AR')}`;

            modalCierre.showModal();
        });
    }

    if (btnCancelarCierre && modalCierre) {
        btnCancelarCierre.addEventListener('click', () => modalCierre.close());
    }

    if (btnConfirmarCierre && modalCierre) {
        btnConfirmarCierre.addEventListener('click', async () => {
            let usuarioId = 1;
            if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                const u = window.Almacenamiento.obtenerUsuarioLogueado();
                if (u && u.id) usuarioId = u.id;
            }

            const txtBalEf = document.getElementById('cierre-balance');
            const txtBalDig = document.getElementById('cierre-balance-digital');

            const montoRetiroEfectivo = parseFloat((txtBalEf ? txtBalEf.textContent : '0').replace('$', '').replace(/\./g, '').replace(',', '.')) || 0;
            const montoRetiroDigital = parseFloat((txtBalDig ? txtBalDig.textContent : '0').replace('$', '').replace(/\./g, '').replace(',', '.')) || 0;

            if (montoRetiroEfectivo <= 0 && montoRetiroDigital <= 0) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("La caja ya se encuentra en $0 (sin fondos pendientes a rendir).", "warning");
                modalCierre.close();
                return;
            }

            btnConfirmarCierre.disabled = true;
            btnConfirmarCierre.textContent = "Finalizando...";

            try {
                // 1. Retiro de Efectivo si hay saldo disponible
                if (montoRetiroEfectivo > 0) {
                    await fetch('../api/caja.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            usuario_id: usuarioId,
                            tipo: 'RETIRO',
                            concepto: 'Cierre de Jornada: Retiro y Rendición de Efectivo',
                            monto: montoRetiroEfectivo
                        })
                    });
                }

                // 2. Retiro y liquidación de Plata Virtual si hay saldo disponible
                if (montoRetiroDigital > 0) {
                    await fetch('../api/caja.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            usuario_id: usuarioId,
                            tipo: 'RETIRO_MP',
                            concepto: 'Cierre de Jornada: Liquidación de Plata Virtual (MercadoPago)',
                            monto: montoRetiroDigital
                        })
                    });
                }

                modalCierre.close();
                if (window.mostrarNotificacion) {
                    let mensaje = "Jornada finalizada con éxito. ";
                    if (montoRetiroEfectivo > 0 && montoRetiroDigital > 0) {
                        mensaje += `Se restaron $${montoRetiroEfectivo.toLocaleString('es-AR')} de efectivo y $${montoRetiroDigital.toLocaleString('es-AR')} de plata virtual.`;
                    } else if (montoRetiroDigital > 0) {
                        mensaje += `Se restaron $${montoRetiroDigital.toLocaleString('es-AR')} de plata virtual.`;
                    } else {
                        mensaje += `Se restaron $${montoRetiroEfectivo.toLocaleString('es-AR')} de efectivo.`;
                    }
                    window.mostrarNotificacion(mensaje);
                }
                await cargarMovimientos();
            } catch (e) {
                console.error("Error al finalizar jornada:", e);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error al procesar el cierre de jornada.", "error");
            } finally {
                btnConfirmarCierre.disabled = false;
                btnConfirmarCierre.textContent = "Confirmar";
            }
        });
    }

    // Inicializar
    cargarCatalogoProductos();
    cargarCatalogoProveedores();
    cargarMovimientos();
})();
