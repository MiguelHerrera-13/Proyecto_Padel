(function () {
    console.log("Controlador de Stock conectado a API MySQL Iniciado");
    const tableBody = document.getElementById('stock-table-body');
    const btnNuevo = document.getElementById('btn-nuevo-producto');
    const modal = document.getElementById('modal-producto');
    const form = document.getElementById('form-producto');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const modalTitulo = document.getElementById('modal-titulo');

    // Modal Reabastecimiento Rápido
    const modalReabastecer = document.getElementById('modal-reabastecer');
    const formReabastecer = document.getElementById('form-reabastecer');
    const btnCerrarReabastecer = document.getElementById('btn-cerrar-reabastecer');
    const btnCancelarReabastecer = document.getElementById('btn-cancelar-reabastecer');

    // Filtros de búsqueda
    const inputBusqueda = document.getElementById('input-busqueda-stock');
    const selectCategoria = document.getElementById('select-categoria-stock');
    const selectEstadoStock = document.getElementById('select-estado-stock');

    let productosActuales = [];
    if (!tableBody) return;

    // Verificar si viene redirigido desde una notificación de Bajo Stock
    const filtroDesdeNotif = sessionStorage.getItem('notif_filtro_stock');
    if (filtroDesdeNotif && selectEstadoStock) {
        selectEstadoStock.value = filtroDesdeNotif;
        sessionStorage.removeItem('notif_filtro_stock');
    }

    // Cargar productos desde la API de MySQL
    async function cargarProductos() {
        try {
            const res = await fetch('../api/stock.php');
            if (!res.ok) throw new Error("Error al obtener productos");
            productosActuales = await res.json();
            aplicarFiltros();
        } catch (error) {
            console.error("Error al cargar productos:", error);
            tableBody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-error font-medium">Error de conexión con la base de datos al cargar el inventario.</td></tr>`;
        }
    }

    // Filtros de búsqueda, categoría y segundo filtrador (nivel/orden)
    function aplicarFiltros() {
        const texto = inputBusqueda ? inputBusqueda.value.toLowerCase().trim() : '';
        const cat = selectCategoria ? selectCategoria.value : 'Todas las categorías';
        const filtroNivel = selectEstadoStock ? selectEstadoStock.value : 'TODOS';

        let filtrados = productosActuales.filter(p => {
            const matchTexto = (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
                               (p.codigo && p.codigo.toLowerCase().includes(texto));
            const matchCat = (cat === 'Todas las categorías' || p.categoria === cat);

            const stockNum = parseInt(p.stock_actual ?? p.stockActual ?? 0);
            let matchNivel = true;
            if (filtroNivel === 'CRITICO') matchNivel = (stockNum <= 5);
            else if (filtroNivel === 'OPTIMO') matchNivel = (stockNum > 5);

            return matchTexto && matchCat && matchNivel;
        });

        if (filtroNivel === 'MENOR_STOCK') {
            filtrados.sort((a, b) => parseInt(a.stock_actual || 0) - parseInt(b.stock_actual || 0));
        } else if (filtroNivel === 'MAYOR_PRECIO') {
            filtrados.sort((a, b) => parseFloat(b.precio_venta || 0) - parseFloat(a.precio_venta || 0));
        }

        renderizarTablaStock(filtrados);
    }

    if (inputBusqueda) inputBusqueda.addEventListener('input', aplicarFiltros);
    if (selectCategoria) selectCategoria.addEventListener('change', aplicarFiltros);
    if (selectEstadoStock) selectEstadoStock.addEventListener('change', aplicarFiltros);

    // Modal nuevo / editar
    const cerrarModal = () => { if (modal) modal.close(); };
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);

    if (btnNuevo && modal) {
        btnNuevo.addEventListener('click', () => {
            modalTitulo.textContent = 'Nuevo Producto';
            form.reset();
            document.getElementById('producto-id').value = '';
            modal.showModal();
        });
    }

    // Modal Reabastecer
    if (btnCerrarReabastecer && modalReabastecer) {
        btnCerrarReabastecer.addEventListener('click', () => modalReabastecer.close());
    }
    if (btnCancelarReabastecer && modalReabastecer) {
        btnCancelarReabastecer.addEventListener('click', () => modalReabastecer.close());
    }

    if (formReabastecer) {
        formReabastecer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('reabastecer-id').value);
            const stockActual = parseInt(document.getElementById('reabastecer-stock-actual').value) || 0;
            const sumar = parseInt(document.getElementById('reabastecer-cantidad').value) || 0;
            const nombre = document.getElementById('reabastecer-nombre').textContent;

            if (sumar <= 0) return;
            const nuevoTotal = stockActual + sumar;

            try {
                const res = await fetch('../api/stock.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, stock_actual: nuevoTotal })
                });
                if (res.ok) {
                    modalReabastecer.close();
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(`Stock actualizado: ${nombre} ahora cuenta con ${nuevoTotal} unidades.`);
                    }
                    await cargarProductos();
                    if (window.actualizarNotificacionesGlobal) window.actualizarNotificacionesGlobal();
                } else {
                    if (window.mostrarNotificacion) window.mostrarNotificacion("No se pudo actualizar el stock.", "error");
                }
            } catch (errStock) {
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión con el servidor.", "error");
            }
        });
    }

    // Guardar Producto (POST o PUT)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-guardar-producto');
            const id = document.getElementById('producto-id').value;
            
            const payload = {
                codigo: document.getElementById('producto-codigo').value.trim(),
                nombre: document.getElementById('producto-nombre').value.trim(),
                categoria: document.getElementById('producto-categoria').value,
                stock_actual: parseInt(document.getElementById('producto-stock').value) || 0,
                precio_venta: parseFloat(document.getElementById('producto-precio').value) || 0
            };

            const metodo = id ? 'PUT' : 'POST';
            if (id) payload.id = parseInt(id);

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = "Guardando...";
            }

            try {
                const res = await fetch('../api/stock.php', {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    cerrarModal();
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(id ? `Producto ${payload.nombre} actualizado.` : `Producto ${payload.nombre} agregado al stock.`);
                    }
                    await cargarProductos();
                    if (window.actualizarNotificacionesGlobal) window.actualizarNotificacionesGlobal();
                } else {
                    const data = await res.json();
                    if (window.mostrarNotificacion) {
                        window.mostrarNotificacion(data.error || "Error al guardar el producto.", "error");
                    }
                }
            } catch (err) {
                console.error("Error al guardar producto:", err);
                if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al servidor.", "error");
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = "Guardar Producto";
                }
            }
        });
    }

    // Delegación de eventos para Reabastecimiento Rápido, Editar y Eliminar
    tableBody.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const btnQuickAdd = e.target.closest('.btn-quick-add');

        if (btnQuickAdd && modalReabastecer) {
            const id = btnQuickAdd.dataset.id;
            const nombre = btnQuickAdd.dataset.nombre;
            const stockActual = parseInt(btnQuickAdd.dataset.stock) || 0;

            document.getElementById('reabastecer-id').value = id;
            document.getElementById('reabastecer-stock-actual').value = stockActual;
            document.getElementById('reabastecer-nombre').textContent = nombre;
            document.getElementById('reabastecer-info').textContent = `Stock actual en depósito: ${stockActual} unidades`;
            document.getElementById('reabastecer-cantidad').value = 10;
            modalReabastecer.showModal();
            return;
        }

        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const prod = productosActuales.find(p => p.id == id);
            if (prod) {
                modalTitulo.textContent = 'Editar Producto';
                document.getElementById('producto-id').value = prod.id;
                document.getElementById('producto-codigo').value = prod.codigo;
                document.getElementById('producto-nombre').value = prod.nombre;
                document.getElementById('producto-categoria').value = prod.categoria;
                document.getElementById('producto-stock').value = prod.stock_actual ?? prod.stockActual ?? 0;
                document.getElementById('producto-precio').value = prod.precio_venta ?? prod.precioVenta ?? 0;
                modal.showModal();
            }
        }

        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const prod = productosActuales.find(p => p.id == id);
            const nombreProd = prod ? prod.nombre : 'este producto';
            
            if (confirm(`¿Estás seguro de eliminar "${nombreProd}" del inventario?`)) {
                try {
                    const res = await fetch(`../api/stock.php?id=${id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        if (window.mostrarNotificacion) window.mostrarNotificacion(`Producto "${nombreProd}" eliminado.`);
                        await cargarProductos();
                    } else {
                        const err = await res.json();
                        if (window.mostrarNotificacion) window.mostrarNotificacion(err.error || "Error al eliminar producto.", "error");
                    }
                } catch (err) {
                    console.error("Error al eliminar producto:", err);
                    if (window.mostrarNotificacion) window.mostrarNotificacion("Error de conexión al servidor.", "error");
                }
            }
        }
    });

    // Renderizar tabla y actualizar KPIs
    function renderizarTablaStock(productos) {
        tableBody.innerHTML = '';
        
        const totalProductos = productosActuales.length;
        const bajoStock = productosActuales.filter(p => parseInt(p.stock_actual ?? p.stockActual ?? 0) <= 5).length;
        const valorInventario = productosActuales.reduce((acc, p) => {
            const cant = parseInt(p.stock_actual ?? p.stockActual ?? 0);
            const precio = parseFloat(p.precio_venta ?? p.precioVenta ?? 0);
            return acc + (cant * precio);
        }, 0);

        const elKpiTotal = document.getElementById('kpi-total-productos');
        const elKpiBajo = document.getElementById('kpi-bajo-stock');
        const elKpiValor = document.getElementById('kpi-valor-inventario');
        const elTxtMostrando = document.getElementById('txt-mostrando-productos');

        if (elKpiTotal) elKpiTotal.textContent = totalProductos;
        if (elKpiBajo) elKpiBajo.textContent = bajoStock;
        if (elKpiValor) elKpiValor.textContent = '$' + valorInventario.toLocaleString('es-AR');
        if (elTxtMostrando) elTxtMostrando.textContent = `Mostrando ${productos.length} de ${totalProductos} productos`;
        
        if (productos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-on-surface-variant font-medium">No se encontraron productos con los filtros seleccionados.</td></tr>`;
            return;
        }

        productos.forEach(prod => {
            const stockNum = parseInt(prod.stock_actual ?? prod.stockActual ?? 0);
            const precioNum = parseFloat(prod.precio_venta ?? prod.precioVenta ?? 0);
            const subtotalValor = stockNum * precioNum;

            let estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#4caf50]/20"><span class="w-1.5 h-1.5 rounded-full bg-[#4caf50]"></span> Óptimo </span>`;
            
            if (stockNum <= 5) {
                estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container text-on-error-container border border-error/25"><span class="w-1.5 h-1.5 rounded-full bg-error"></span> Crítico (${stockNum}) </span>`;
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low/60 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 align-middle font-mono text-xs font-bold text-secondary">${prod.codigo}</td>
                <td class="px-6 py-4 align-middle font-bold text-on-surface">${prod.nombre}</td>
                <td class="px-6 py-4 align-middle"><span class="text-xs text-secondary bg-surface-container-low px-2.5 py-1 rounded-md font-semibold border border-outline-variant/15">${prod.categoria}</span></td>
                <td class="px-6 py-4 align-middle text-right font-bold">
                    <div class="inline-flex items-center justify-end gap-2">
                        <span class="${stockNum <= 5 ? 'text-error font-extrabold' : 'text-on-surface'}">${stockNum} u.</span>
                        <button class="btn-quick-add p-1 text-primary hover:bg-primary/15 rounded-lg transition-colors cursor-pointer" data-id="${prod.id}" data-nombre="${prod.nombre}" data-stock="${stockNum}" title="Sumar unidades al stock">
                            <span class="material-symbols-outlined text-[18px]">add_circle</span>
                        </button>
                    </div>
                </td>
                <td class="px-6 py-4 align-middle text-right font-bold text-on-surface">$${precioNum.toLocaleString('es-AR')}</td>
                <td class="px-6 py-4 align-middle text-right font-semibold text-on-surface-variant">$${subtotalValor.toLocaleString('es-AR')}</td>
                <td class="px-6 py-4 align-middle text-center">${estadoHTML}</td>
                <td class="px-6 py-4 align-middle text-right">
                    <div class="flex justify-end items-center gap-1.5">
                        <button class="btn-edit p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer" data-id="${prod.id}" title="Editar Producto">
                            <span class="material-symbols-outlined text-[19px]">edit</span>
                        </button>
                        <button class="btn-delete p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer" data-id="${prod.id}" title="Eliminar Producto">
                            <span class="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                    </div>
                </td>`;
            tableBody.appendChild(tr);
        });
    }

    cargarProductos();
})();
