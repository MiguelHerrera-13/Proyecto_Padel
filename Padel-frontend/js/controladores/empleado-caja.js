(function() {
    console.log("Controlador de Caja Iniciado");

    // Elementos de la interfaz
    const kpiEfectivo = document.getElementById('kpi-efectivo');
    const kpiDigitales = document.getElementById('kpi-digitales');
    const kpiTotal = document.getElementById('kpi-total');

    const selectTipo = document.getElementById('caja-tipo');
    const contenedorProducto = document.getElementById('contenedor-producto');
    const selectProducto = document.getElementById('caja-producto-select');
    const contenedorProveedor = document.getElementById('contenedor-proveedor');
    const selectProveedor = document.getElementById('caja-proveedor-select');
    const inputMonto = document.getElementById('caja-monto');
    const inputConcepto = document.getElementById('caja-concepto');
    const btnRegistrar = document.getElementById('btn-registrar-caja');
    const contenedorHistorial = document.getElementById('caja-historial');

    // Elementos del Modal de Cierre
    const modalCierre = document.getElementById('modal-cierre-caja');
    const btnAbrirCierre = document.getElementById('btn-cerrar-caja');
    const btnCancelarCierre = document.getElementById('btn-cancelar-cierre');
    const btnConfirmarCierre = document.getElementById('btn-confirmar-cierre');

    const txtCierreIngresos = document.getElementById('cierre-ingresos');
    const txtCierreDigitales = document.getElementById('cierre-digitales');
    const txtCierreEgresos = document.getElementById('cierre-egresos');
    const txtCierreBalance = document.getElementById('cierre-balance');

    let catalogoProductos = [];
    let movimientosActuales = [];

    // 1. Cargar catálogo de productos para venta rápida opcional
    async function cargarCatalogoProductos() {
        if (!selectProducto) return;
        try {
            const res = await fetch('../api/stock.php');
            if (res.ok) {
                catalogoProductos = await res.json();
                selectProducto.innerHTML = '<option value="">-- Venta manual o sin producto --</option>';
                catalogoProductos.forEach(p => {
                    const stockNum = parseInt(p.stock_actual ?? p.stockActual ?? 0);
                    selectProducto.innerHTML += `
                        <option value="${p.id}" data-precio="${p.precio_venta}" data-nombre="${p.nombre}" data-stock="${stockNum}">
                            ${p.nombre} ($${parseFloat(p.precio_venta).toLocaleString('es-AR')}) - Stock: ${stockNum}
                        </option>
                    `;
                });
            }
        } catch (e) {
            console.warn("No se pudo cargar catálogo de productos en caja:", e);
        }
    }

    // 2. Alternar campos según el tipo de movimiento seleccionado
    if (selectTipo) {
        selectTipo.addEventListener('change', () => {
            const tipo = selectTipo.value;
            if (tipo === 'INGRESO' || tipo === 'INGRESO_MP') {
                if (contenedorProducto) contenedorProducto.classList.remove('hidden');
                if (contenedorProveedor) contenedorProveedor.classList.add('hidden');
            } else if (tipo === 'EGRESO') {
                if (contenedorProducto) contenedorProducto.classList.add('hidden');
                if (contenedorProveedor) contenedorProveedor.classList.remove('hidden');
            } else {
                if (contenedorProducto) contenedorProducto.classList.add('hidden');
                if (contenedorProveedor) contenedorProveedor.classList.add('hidden');
            }
        });
    }

    // 3. Al seleccionar un producto, autocompletar monto y concepto
    if (selectProducto) {
        selectProducto.addEventListener('change', () => {
            const selectedOption = selectProducto.options[selectProducto.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const precio = selectedOption.dataset.precio;
                const nombre = selectedOption.dataset.nombre;
                if (inputMonto) inputMonto.value = precio;
                if (inputConcepto) inputConcepto.value = `Venta mostrador: ${nombre}`;
            }
        });
    }

    // 4. Cargar y renderizar movimientos de caja desde MySQL
    async function cargarMovimientos() {
        try {
            const res = await fetch('../api/caja.php');
            if (!res.ok) throw new Error("Error al obtener movimientos de caja");
            movimientosActuales = await res.json();
            renderizarHistorialYTotales(movimientosActuales);
        } catch (e) {
            console.error("Error al cargar movimientos:", e);
            if (contenedorHistorial) {
                contenedorHistorial.innerHTML = `<p class="text-sm text-error text-center py-4">Error de conexión al cargar movimientos de caja.</p>`;
            }
        }
    }

    function renderizarHistorialYTotales(movimientos) {
        let totalEfectivoIngresos = 0;
        let totalDigitales = 0;
        let totalEgresosYRetiros = 0;

        if (contenedorHistorial) contenedorHistorial.innerHTML = '';

        if (!movimientos || movimientos.length === 0) {
            if (contenedorHistorial) {
                contenedorHistorial.innerHTML = `
                    <div class="text-center py-10 text-on-surface-variant/60">
                        <span class="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                        <p class="text-sm font-medium">No hay movimientos registrados hoy.</p>
                    </div>`;
            }
            if (kpiEfectivo) kpiEfectivo.textContent = '$ 0';
            if (kpiDigitales) kpiDigitales.textContent = '$ 0';
            if (kpiTotal) kpiTotal.textContent = '$ 0';
            return;
        }

        movimientos.forEach(m => {
            const montoFloat = parseFloat(m.monto || 0);
            const esIngresoEfectivo = (m.tipo === 'INGRESO');
            const esIngresoDigital = (m.tipo === 'INGRESO_MP');
            const esEgreso = (m.tipo === 'EGRESO' || m.tipo === 'RETIRO');

            if (esIngresoEfectivo) totalEfectivoIngresos += montoFloat;
            if (esIngresoDigital) totalDigitales += montoFloat;
            if (esEgreso) totalEgresosYRetiros += montoFloat;

            let badgeHTML = '';
            let colorMonto = 'text-primary';
            let signo = '+$';

            if (esIngresoEfectivo) {
                badgeHTML = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32]">EFECTIVO</span>`;
                colorMonto = 'text-[#2e7d32]';
                signo = '+$';
            } else if (esIngresoDigital) {
                badgeHTML = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#e3f2fd] text-[#1565c0]">DIGITAL</span>`;
                colorMonto = 'text-[#1565c0]';
                signo = '+$';
            } else if (m.tipo === 'RETIRO') {
                badgeHTML = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ffebee] text-[#c62828]">RETIRO</span>`;
                colorMonto = 'text-[#c62828]';
                signo = '-$';
            } else {
                badgeHTML = `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-[#fff3e0] text-[#e65100]">EGRESO</span>`;
                colorMonto = 'text-[#e65100]';
                signo = '-$';
            }

            let fechaStr = "Hoy";
            if (m.fecha_hora) {
                const d = new Date(m.fecha_hora.replace(' ', 'T'));
                fechaStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' hs';
            }

            if (contenedorHistorial) {
                contenedorHistorial.innerHTML += `
                <div class="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-none">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-on-surface">
                            ${(m.usuario_nombre || 'E').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-sm text-on-surface leading-tight">${m.concepto}</p>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-xs text-on-surface-variant">${fechaStr}</span>
                                <span>•</span>
                                <span class="text-xs text-on-surface-variant font-medium">${m.usuario_nombre || 'Empleado'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                        <span class="font-headline font-bold text-base ${colorMonto}">${signo}${montoFloat.toLocaleString('es-AR')}</span>
                        ${badgeHTML}
                    </div>
                </div>`;
            }
        });

        // Balance de efectivo real en caja
        const efectivoEnCaja = Math.max(0, totalEfectivoIngresos - totalEgresosYRetiros);
        const totalRecaudado = totalEfectivoIngresos + totalDigitales;

        if (kpiEfectivo) kpiEfectivo.textContent = `$ ${efectivoEnCaja.toLocaleString('es-AR')}`;
        if (kpiDigitales) kpiDigitales.textContent = `$ ${totalDigitales.toLocaleString('es-AR')}`;
        if (kpiTotal) kpiTotal.textContent = `$ ${totalRecaudado.toLocaleString('es-AR')}`;
    }

    // 5. Registrar movimiento en la API
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', async () => {
            const tipo = selectTipo ? selectTipo.value : 'INGRESO';
            const monto = parseFloat(inputMonto.value);
            const concepto = inputConcepto.value.trim();

            if (isNaN(monto) || monto <= 0) {
                alert("Por favor, ingresá un monto válido mayor a 0.");
                return;
            }
            if (!concepto) {
                alert("Por favor, ingresá un concepto o descripción para el movimiento.");
                return;
            }

            // Obtener ID del usuario logueado
            let usuarioId = 1;
            if (window.Almacenamiento && window.Almacenamiento.obtenerUsuarioLogueado) {
                const u = window.Almacenamiento.obtenerUsuarioLogueado();
                if (u && u.id) usuarioId = u.id;
            }

            btnRegistrar.disabled = true;
            btnRegistrar.textContent = "Registrando...";

            try {
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
                    const prodId = selectProducto ? selectProducto.value : null;
                    if (prodId) {
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

                    // Limpiar formulario
                    inputMonto.value = '';
                    inputConcepto.value = '';
                    if (selectProducto) selectProducto.value = '';

                    // Recargar datos
                    await cargarMovimientos();
                    await cargarCatalogoProductos();
                } else {
                    const err = await res.json();
                    alert(err.error || "Error al registrar movimiento.");
                }
            } catch (e) {
                console.error("Error al registrar en caja:", e);
                alert("Error de conexión al registrar movimiento en caja.");
            } finally {
                btnRegistrar.disabled = false;
                btnRegistrar.textContent = "Registrar en Caja";
            }
        });
    }

    // 6. Modal de Cierre de Caja
    if (btnAbrirCierre && modalCierre) {
        btnAbrirCierre.addEventListener('click', () => {
            let totalEfectivoIngresos = 0;
            let totalDigitales = 0;
            let totalEgresosYRetiros = 0;

            movimientosActuales.forEach(m => {
                const montoFloat = parseFloat(m.monto || 0);
                if (m.tipo === 'INGRESO') totalEfectivoIngresos += montoFloat;
                else if (m.tipo === 'INGRESO_MP') totalDigitales += montoFloat;
                else totalEgresosYRetiros += montoFloat;
            });

            const balance = Math.max(0, totalEfectivoIngresos - totalEgresosYRetiros);

            if (txtCierreIngresos) txtCierreIngresos.textContent = `$${totalEfectivoIngresos.toLocaleString('es-AR')}`;
            if (txtCierreDigitales) txtCierreDigitales.textContent = `$${totalDigitales.toLocaleString('es-AR')}`;
            if (txtCierreEgresos) txtCierreEgresos.textContent = `$${totalEgresosYRetiros.toLocaleString('es-AR')}`;
            if (txtCierreBalance) txtCierreBalance.textContent = `$${balance.toLocaleString('es-AR')}`;

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

            try {
                await fetch('../api/caja.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuarioId,
                        tipo: 'RETIRO',
                        concepto: 'Cierre de Jornada y Retiro de Efectivo',
                        monto: parseFloat(txtCierreBalance.textContent.replace('$', '').replace(/\./g, '')) || 0
                    })
                });
            } catch (e) {
                console.warn("Error registrando retiro de cierre:", e);
            }

            modalCierre.close();
            alert("✅ Jornada finalizada con éxito. Arqueo de caja completado.");
            await cargarMovimientos();
        });
    }

    // Inicializar
    cargarCatalogoProductos();
    cargarMovimientos();
})();