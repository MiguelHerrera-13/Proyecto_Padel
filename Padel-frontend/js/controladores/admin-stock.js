(function () {
    console.log("Controlador de Stock conectado a API MySQL Iniciado");
    const tableBody = document.getElementById('stock-table-body');
    const btnNuevo = document.getElementById('btn-nuevo-producto');
    const modal = document.getElementById('modal-producto');
    const form = document.getElementById('form-producto');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const modalTitulo = document.getElementById('modal-titulo');

    // Filtros de búsqueda
    const inputBusqueda = document.querySelector('input[placeholder*="Buscar producto"]');
    const selectCategoria = document.querySelector('select:has(option:contains("Todas las categorías"))') || document.querySelector('.bg-surface-container-low select');

    let productosActuales = [];
    if (!tableBody) return;

    // 1. Cargar productos desde la API de MySQL
    async function cargarProductos() {
        try {
            const res = await fetch('../api/stock.php');
            if (!res.ok) throw new Error("Error al obtener productos");
            productosActuales = await res.json();
            aplicarFiltros();
        } catch (error) {
            console.error("Error al cargar productos:", error);
            tableBody.innerHTML = `<div class="p-6 text-center text-error font-medium">Error de conexión con la base de datos al cargar el inventario.</div>`;
        }
    }

    // 2. Filtros de búsqueda y categoría
    function aplicarFiltros() {
        const texto = inputBusqueda ? inputBusqueda.value.toLowerCase().trim() : '';
        const cat = selectCategoria ? selectCategoria.value : 'Todas las categorías';

        const filtrados = productosActuales.filter(p => {
            const matchTexto = (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
                               (p.codigo && p.codigo.toLowerCase().includes(texto));
            const matchCat = (cat === 'Todas las categorías' || p.categoria === cat);
            return matchTexto && matchCat;
        });

        renderizarTablaStock(filtrados);
    }

    if (inputBusqueda) inputBusqueda.addEventListener('input', aplicarFiltros);
    if (selectCategoria) selectCategoria.addEventListener('change', aplicarFiltros);

    // 3. Modal nuevo / editar
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

    // 4. Guardar Producto (POST o PUT)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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

            try {
                const res = await fetch('../api/stock.php', {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    cerrarModal();
                    await cargarProductos();
                } else {
                    const data = await res.json();
                    alert(data.error || "Error al guardar el producto.");
                }
            } catch (err) {
                console.error("Error al guardar producto:", err);
                alert("Error de conexión al servidor.");
            }
        });
    }

    // 5. Delegación de eventos para Editar y Eliminar
    tableBody.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

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
                        await cargarProductos();
                    } else {
                        const err = await res.json();
                        alert(err.error || "Error al eliminar el producto.");
                    }
                } catch (err) {
                    console.error("Error al eliminar producto:", err);
                    alert("Error de conexión al servidor.");
                }
            }
        }
    });

    // 6. Renderizar tabla y actualizar KPIs
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
            tableBody.innerHTML = `<div class="p-8 text-center text-on-surface-variant font-medium">No se encontraron productos en el inventario.</div>`;
            return;
        }

        productos.forEach(prod => {
            const stockNum = parseInt(prod.stock_actual ?? prod.stockActual ?? 0);
            const precioNum = parseFloat(prod.precio_venta ?? prod.precioVenta ?? 0);

            let estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container text-on-primary-container"><span class="w-1.5 h-1.5 rounded-full bg-primary"></span> Óptimo </span>`;
            
            if (stockNum === 0 || stockNum <= 5) {
                 estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-error-container text-on-error-container"><span class="w-1.5 h-1.5 rounded-full bg-error"></span> Crítico (${stockNum}) </span>`;
            }

            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-xl hover:bg-surface-container-low transition-colors group cursor-default';
            row.innerHTML = `
                <div class="col-span-1 text-sm font-mono text-on-surface-variant">${prod.codigo}</div>
                <div class="col-span-3 text-sm font-bold text-on-surface">${prod.nombre}</div>
                <div class="col-span-2"><span class="text-xs text-secondary bg-surface px-2 py-1 rounded-md">${prod.categoria}</span></div>
                <div class="col-span-1 text-right text-sm font-bold">${stockNum} u.</div>
                <div class="col-span-1 text-right text-sm text-on-surface-variant">-</div>
                <div class="col-span-1 text-right text-sm font-bold text-on-surface">$${precioNum.toLocaleString('es-AR')}</div>
                <div class="col-span-2 flex justify-center">${estadoHTML}</div>
                <div class="col-span-1 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn-edit text-on-surface-variant hover:text-primary transition-colors" data-id="${prod.id}" title="Editar"><span class="material-symbols-outlined text-[20px]">edit</span></button>
                    <button class="btn-delete text-on-surface-variant hover:text-error transition-colors" data-id="${prod.id}" title="Eliminar"><span class="material-symbols-outlined text-[20px]">delete</span></button>
                </div>`;
            tableBody.appendChild(row);
        });
    }

    cargarProductos();
})();