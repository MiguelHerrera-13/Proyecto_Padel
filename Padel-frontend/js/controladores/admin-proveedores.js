(function() {
    console.log("Controlador de Proveedores conectado a API MySQL Iniciado");
    const tbody = document.getElementById('proveedores-table-body');
    const modal = document.getElementById('modal-proveedor');
    const form = document.getElementById('form-proveedor');
    const inputBuscar = document.getElementById('input-buscar-proveedor');
    const selectFiltro = document.getElementById('select-filtro-proveedor');

    const modalPedido = document.getElementById('modal-pedido-proveedor');
    const formPedido = document.getElementById('form-pedido-proveedor');
    const modalPago = document.getElementById('modal-pago-proveedor');
    const formPago = document.getElementById('form-pago-proveedor');

    let listaProveedores = [];

    function actualizarKPIs() {
        const total = listaProveedores.length;
        const pendientes = listaProveedores.filter(p => parseFloat(p.saldo_pendiente || 0) > 0 || p.estado_pago === 'PAGO_PENDIENTE').length;
        const deudaTotal = listaProveedores.reduce((acc, p) => acc + parseFloat(p.saldo_pendiente || 0), 0);

        const elTotal = document.getElementById('prov-kpi-total');
        const elPend = document.getElementById('prov-kpi-pendientes');
        const elDeuda = document.getElementById('prov-kpi-deuda');

        if (elTotal) elTotal.textContent = total;
        if (elPend) elPend.textContent = pendientes;
        if (elDeuda) elDeuda.textContent = '$' + deudaTotal.toLocaleString('es-AR');
    }

    function renderizarTabla() {
        if (!tbody) return;

        const texto = (inputBuscar ? inputBuscar.value : '').toLowerCase().trim();
        const estadoFiltro = selectFiltro ? selectFiltro.value : 'TODOS';

        const filtrados = listaProveedores.filter(p => {
            const coincideTexto = !texto ||
                (p.empresa || '').toLowerCase().includes(texto) ||
                (p.rubro || '').toLowerCase().includes(texto) ||
                (p.telefono || '').toLowerCase().includes(texto) ||
                (p.email || '').toLowerCase().includes(texto);

            const saldo = parseFloat(p.saldo_pendiente || 0);
            const tieneDeuda = saldo > 0 || p.estado_pago === 'PAGO_PENDIENTE';

            if (estadoFiltro === 'PAGO_PENDIENTE' && !tieneDeuda) return false;
            if (estadoFiltro === 'AL_DIA' && tieneDeuda) return false;

            return coincideTexto;
        });

        tbody.innerHTML = '';

        if (filtrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-on-surface-variant font-medium">No se encontraron proveedores con los filtros seleccionados.</td></tr>';
            return;
        }

        filtrados.forEach(p => {
            const saldo = parseFloat(p.saldo_pendiente || 0);
            const tieneDeuda = saldo > 0 || p.estado_pago === 'PAGO_PENDIENTE';

            const badgeEstado = tieneDeuda
                ? `<div class="inline-flex flex-col items-center">
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#fff3e0] text-[#e65100] border border-[#ffb74d]/40">PAGO PENDIENTE</span>
                        <span class="text-xs font-extrabold text-error mt-1">$${saldo.toLocaleString('es-AR')}</span>
                   </div>`
                : `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/30">AL DÍA ($0)</span>`;

            const fechaPedido = p.fecha_ultimo_pedido
                ? p.fecha_ultimo_pedido.split('-').reverse().join('/')
                : null;

            const ultimoPedidoHtml = p.ultimo_pedido
                ? `<div class="max-w-[220px]">
                        <p class="font-semibold text-on-surface text-xs truncate" title="${p.ultimo_pedido}">${p.ultimo_pedido}</p>
                        ${fechaPedido ? `<span class="text-[11px] text-on-surface-variant">Fecha: ${fechaPedido}</span>` : ''}
                   </div>`
                : `<span class="text-xs text-on-surface-variant italic">Sin pedidos recientes</span>`;

            tbody.innerHTML += `
            <tr class="hover:bg-surface-container-low/60 transition-colors">
                <td class="px-6 py-4">
                    <p class="font-bold text-on-surface">${p.empresa}</p>
                    <span class="text-[11px] text-on-surface-variant">ID #${p.id}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="bg-surface-container px-2.5 py-1 rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/15">${p.rubro}</span>
                </td>
                <td class="px-6 py-4">
                    <p class="text-xs font-semibold text-on-surface flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px] text-primary">call</span> ${p.telefono || 'Sin teléfono'}
                    </p>
                    ${p.email ? `<p class="text-[11px] text-on-surface-variant mt-0.5">${p.email}</p>` : ''}
                </td>
                <td class="px-6 py-4">${ultimoPedidoHtml}</td>
                <td class="px-6 py-4 text-center">${badgeEstado}</td>
                <td class="px-6 py-4 text-right">
                    <div class="inline-flex items-center justify-end gap-1.5">
                        <button class="btn-pedido-prov px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer" data-id="${p.id}" title="Realizar Pedido">
                            <span class="material-symbols-outlined text-[16px]">shopping_cart_checkout</span> Pedido
                        </button>
                        ${tieneDeuda ? `
                        <button class="btn-pagar-prov px-2.5 py-1.5 rounded-lg bg-[#e8f5e9] text-[#2e7d32] hover:bg-[#2e7d32] hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer" data-id="${p.id}" title="Registrar Pago">
                            <span class="material-symbols-outlined text-[16px]">payments</span> Pagar
                        </button>` : ''}
                        <button class="btn-editar-prov p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors cursor-pointer" data-id="${p.id}" title="Editar Proveedor">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button class="btn-eliminar-prov p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors cursor-pointer" data-id="${p.id}" data-empresa="${p.empresa}" title="Eliminar Proveedor">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
    }

    async function cargarTabla() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-on-surface-variant">Cargando proveedores...</td></tr>';

        try {
            const res = await fetch('../api/proveedores.php');
            if (!res.ok) throw new Error("Error al obtener proveedores");
            listaProveedores = await res.json();

            // Si viene desde una notificación de deuda de proveedor, aplicar filtro automáticamente
            const filtroNotif = sessionStorage.getItem('notif_filtro_prov');
            if (filtroNotif && selectFiltro) {
                selectFiltro.value = filtroNotif;
                sessionStorage.removeItem('notif_filtro_prov');
            }

            actualizarKPIs();
            renderizarTabla();
        } catch (e) {
            console.error("Error al cargar proveedores:", e);
            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-error font-bold">Error al cargar proveedores desde MySQL.</td></tr>';
        }
    }

    if (inputBuscar) inputBuscar.addEventListener('input', renderizarTabla);
    if (selectFiltro) selectFiltro.addEventListener('change', renderizarTabla);

    // Sincronizar select de estado de cuenta con el input de saldo en el modal
    const selectEstadoModal = document.getElementById('prov-estado-pago');
    const inputSaldoModal = document.getElementById('prov-saldo');
    if (selectEstadoModal && inputSaldoModal) {
        selectEstadoModal.addEventListener('change', () => {
            if (selectEstadoModal.value === 'AL_DIA') {
                inputSaldoModal.value = 0;
            }
        });
        inputSaldoModal.addEventListener('input', () => {
            if (parseFloat(inputSaldoModal.value || 0) > 0) {
                selectEstadoModal.value = 'PAGO_PENDIENTE';
            } else {
                selectEstadoModal.value = 'AL_DIA';
            }
        });
    }

    const btnNuevo = document.getElementById('btn-nuevo-proveedor');
    if (btnNuevo && modal) {
        btnNuevo.onclick = () => {
            form.reset();
            document.getElementById('prov-id').value = '';
            document.getElementById('modal-proveedor-titulo').textContent = 'Nuevo Proveedor';
            modal.showModal();
        };
    }

    const cerrarModalProv = () => { if (modal) modal.close(); };
    if (document.getElementById('btn-cancelar-prov')) document.getElementById('btn-cancelar-prov').onclick = cerrarModalProv;
    if (document.getElementById('btn-cerrar-prov-x')) document.getElementById('btn-cerrar-prov-x').onclick = cerrarModalProv;

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('prov-id').value;
            const empresa = document.getElementById('prov-empresa').value.trim();
            const rubro = document.getElementById('prov-rubro').value.trim();
            const telefono = document.getElementById('prov-telefono').value.trim();
            const email = document.getElementById('prov-email').value.trim();
            const saldo_pendiente = parseFloat(document.getElementById('prov-saldo').value || 0);
            const estado_pago = saldo_pendiente > 0 ? 'PAGO_PENDIENTE' : document.getElementById('prov-estado-pago').value;

            if (!empresa || !rubro) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Completa los campos Empresa y Rubro.", "error");
                return;
            }

            try {
                const metodo = id ? 'PUT' : 'POST';
                const payload = { id: id || undefined, accion: 'editar', empresa, rubro, telefono, email, estado_pago, saldo_pendiente };

                const res = await fetch('../api/proveedores.php', {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    modal.close();
                    form.reset();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(id ? `Proveedor ${empresa} actualizado.` : `Proveedor ${empresa} registrado.`);
                    await cargarTabla();
                } else {
                    const err = await res.json();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(err.error || "Error al guardar proveedor.", "error");
                }
            } catch (err) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al guardar proveedor.", "error");
            }
        };
    }

    // --- MODAL HACER PEDIDO ---
    const cerrarModalPedido = () => { if (modalPedido) modalPedido.close(); };
    if (document.getElementById('btn-cerrar-pedido')) document.getElementById('btn-cerrar-pedido').onclick = cerrarModalPedido;
    if (document.getElementById('btn-cancelar-pedido')) document.getElementById('btn-cancelar-pedido').onclick = cerrarModalPedido;

    if (formPedido) {
        formPedido.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('pedido-prov-id').value;
            const pedido = document.getElementById('pedido-detalle').value.trim();
            const monto = parseFloat(document.getElementById('pedido-monto').value || 0);
            const modalidad = document.getElementById('pedido-modalidad').value;

            if (!pedido || monto <= 0) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Ingresa el detalle y un costo válido.", "error");
                return;
            }

            try {
                // Si se paga en el acto desde caja, primero sumamos el pedido y luego registramos el pago
                const resPedido = await fetch('../api/proveedores.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id,
                        accion: 'pedido',
                        pedido,
                        monto_pedido: modalidad === 'CUENTA_CORRIENTE' ? monto : 0
                    })
                });

                if (modalidad === 'CAJA') {
                    await fetch('../api/caja.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            usuario_id: 1,
                            tipo: 'EGRESO',
                            concepto: `Pago Pedido Proveedor: ${pedido}`,
                            monto: monto
                        })
                    });
                }

                if (resPedido.ok) {
                    modalPedido.close();
                    formPedido.reset();
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(modalidad === 'CAJA'
                            ? `Pedido registrado y abonado desde Caja ($${monto.toLocaleString('es-AR')}).`
                            : `Pedido registrado en cuenta corriente ($${monto.toLocaleString('es-AR')}).`);
                    }
                    await cargarTabla();
                }
            } catch (err) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error al registrar el pedido.", "error");
            }
        };
    }

    // --- MODAL REGISTRAR PAGO ---
    const cerrarModalPago = () => { if (modalPago) modalPago.close(); };
    if (document.getElementById('btn-cerrar-pago')) document.getElementById('btn-cerrar-pago').onclick = cerrarModalPago;
    if (document.getElementById('btn-cancelar-pago')) document.getElementById('btn-cancelar-pago').onclick = cerrarModalPago;

    if (formPago) {
        formPago.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('pago-prov-id').value;
            const monto_pago = parseFloat(document.getElementById('pago-monto').value || 0);

            if (monto_pago <= 0) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Ingresa un monto válido a abonar.", "error");
                return;
            }

            try {
                const res = await fetch('../api/proveedores.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id,
                        accion: 'pagar',
                        monto_pago,
                        usuario_id: 1
                    })
                });

                if (res.ok) {
                    modalPago.close();
                    formPago.reset();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(`Pago de $${monto_pago.toLocaleString('es-AR')} registrado y descontado en Caja.`);
                    await cargarTabla();
                } else {
                    const err = await res.json();
                    if (window.mostrarNotificacion) window.mostrarNotificacion(err.error || "No se pudo registrar el pago.", "error");
                }
            } catch (err) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al registrar pago.", "error");
            }
        };
    }

    // Eventos en la tabla
    if (tbody) {
        tbody.addEventListener('click', async (e) => {
            const btnPedido = e.target.closest('.btn-pedido-prov');
            if (btnPedido) {
                const p = listaProveedores.find(item => item.id == btnPedido.dataset.id);
                if (p && modalPedido) {
                    formPedido.reset();
                    document.getElementById('pedido-prov-id').value = p.id;
                    document.getElementById('pedido-prov-empresa').textContent = `Pedido a ${p.empresa}`;
                    modalPedido.showModal();
                }
                return;
            }

            const btnPagar = e.target.closest('.btn-pagar-prov');
            if (btnPagar) {
                const p = listaProveedores.find(item => item.id == btnPagar.dataset.id);
                if (p && modalPago) {
                    formPago.reset();
                    const deuda = parseFloat(p.saldo_pendiente || 0);
                    document.getElementById('pago-prov-id').value = p.id;
                    document.getElementById('pago-prov-empresa').textContent = `Pagar a ${p.empresa}`;
                    document.getElementById('pago-prov-deuda-actual').textContent = `$${deuda.toLocaleString('es-AR')}`;
                    document.getElementById('pago-monto').value = deuda > 0 ? deuda : '';
                    modalPago.showModal();
                }
                return;
            }

            const btnEdit = e.target.closest('.btn-editar-prov');
            if (btnEdit) {
                const p = listaProveedores.find(item => item.id == btnEdit.dataset.id);
                if (p && modal) {
                    document.getElementById('prov-id').value = p.id;
                    document.getElementById('prov-empresa').value = p.empresa || '';
                    document.getElementById('prov-rubro').value = p.rubro || '';
                    document.getElementById('prov-telefono').value = p.telefono || '';
                    document.getElementById('prov-email').value = p.email || '';
                    document.getElementById('prov-estado-pago').value = p.estado_pago || 'AL_DIA';
                    document.getElementById('prov-saldo').value = parseFloat(p.saldo_pendiente || 0);
                    document.getElementById('modal-proveedor-titulo').textContent = 'Editar Proveedor';
                    modal.showModal();
                }
                return;
            }

            const btnDel = e.target.closest('.btn-eliminar-prov');
            if (btnDel) {
                const id = btnDel.dataset.id;
                const empresa = btnDel.dataset.empresa || 'este proveedor';
                if (confirm(`¿Estás seguro de eliminar a "${empresa}"?`)) {
                    try {
                        const res = await fetch(`../api/proveedores.php?id=${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            if (window.mostrarNotificacion) window.mostrarNotificacion(`Proveedor "${empresa}" eliminado.`);
                            await cargarTabla();
                        } else {
                            if (window.mostrarNotificacion) window.mostrarNotificacion("No se pudo eliminar el proveedor.", "error");
                        }
                    } catch (err) {
                        if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al eliminar.", "error");
                    }
                }
            }
        });
    }

    cargarTabla();
})();
