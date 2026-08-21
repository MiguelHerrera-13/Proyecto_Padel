(function () {
    console.log("Controlador de Stock (MVP Memoria) Iniciado");
    const tableBody = document.getElementById('stock-table-body');
    const btnNuevo = document.getElementById('btn-nuevo-producto');
    const modal = document.getElementById('modal-producto');
    const form = document.getElementById('form-producto');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const modalTitulo = document.getElementById('modal-titulo');

    let productosActuales = [];
    if (!tableBody) return;

    if (btnNuevo && modal) {
        btnNuevo.addEventListener('click', () => {
            modalTitulo.textContent = 'Nuevo Producto';
            form.reset();
            document.getElementById('producto-id').value = '';
            modal.showModal();
        });
    }

    const cerrarModal = () => { if (modal) modal.close(); };
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('producto-id').value;
            
            const payload = {
                codigo: document.getElementById('producto-codigo').value,
                nombre: document.getElementById('producto-nombre').value,
                categoria: document.getElementById('producto-categoria').value,
                stockActual: parseInt(document.getElementById('producto-stock').value),
                precioVenta: parseFloat(document.getElementById('producto-precio').value)
            };

            window.Almacenamiento.guardarProductoLocal(id, payload);
            cerrarModal();
            cargarProductosLocal();
        });
    }

    tableBody.addEventListener('click', (e) => {
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
                document.getElementById('producto-stock').value = prod.stockActual || prod.stock_actual;
                document.getElementById('producto-precio').value = prod.precioVenta || prod.precio_venta;
                modal.showModal();
            }
        }

        if (btnDelete) {
            const id = btnDelete.dataset.id;
            if (confirm(`¿Estás seguro de eliminar este producto?`)) {
                window.Almacenamiento.eliminarProductoLocal(id);
                cargarProductosLocal();
            }
        }
    });

    function cargarProductosLocal() {
        productosActuales = window.Almacenamiento.obtenerProductos();
        renderizarTablaStock(productosActuales);
    }

    function renderizarTablaStock(productos) {
        tableBody.innerHTML = '';
        
        const totalProductos = productos.length;
        const bajoStock = productos.filter(p => parseInt(p.stockActual || p.stock_actual) <= 5).length;
        const valorInventario = productos.reduce((acc, p) => acc + (parseInt(p.stockActual || p.stock_actual) * parseFloat(p.precioVenta || p.precio_venta)), 0);

        document.getElementById('kpi-total-productos').textContent = totalProductos;
        document.getElementById('kpi-bajo-stock').textContent = bajoStock;
        document.getElementById('kpi-valor-inventario').textContent = '$' + valorInventario.toLocaleString('es-AR');
        document.getElementById('txt-mostrando-productos').textContent = `Mostrando ${totalProductos} productos`;
        
        productos.forEach(prod => {
            let stockNum = parseInt(prod.stockActual || prod.stock_actual);
            let estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container text-on-primary-container"><span class="w-1.5 h-1.5 rounded-full bg-primary"></span> Óptimo </span>`;
            
            if (stockNum === 0 || stockNum <= 5) {
                 estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-error-container text-on-error-container"><span class="w-1.5 h-1.5 rounded-full bg-error"></span> Crítico </span>`;
            }

            const row = document.createElement('div');
            row.className = 'grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-xl hover:bg-surface-container-low transition-colors group cursor-default';
            row.innerHTML = `
                <div class="col-span-1 text-sm font-mono text-on-surface-variant">${prod.codigo}</div>
                <div class="col-span-3 text-sm font-bold text-on-surface">${prod.nombre}</div>
                <div class="col-span-2"><span class="text-xs text-secondary bg-surface px-2 py-1 rounded-md">${prod.categoria}</span></div>
                <div class="col-span-1 text-right text-sm font-bold">${stockNum}</div>
                <div class="col-span-1 text-right text-sm text-on-surface-variant">-</div>
                <div class="col-span-1 text-right text-sm">$${parseFloat(prod.precioVenta || prod.precio_venta).toLocaleString('es-AR')}</div>
                <div class="col-span-2 flex justify-center">${estadoHTML}</div>
                <div class="col-span-1 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="btn-edit text-on-surface-variant hover:text-primary" data-id="${prod.id}"><span class="material-symbols-outlined text-[20px]">edit</span></button>
                    <button class="btn-delete text-on-surface-variant hover:text-error" data-id="${prod.id}"><span class="material-symbols-outlined text-[20px]">delete</span></button>
                </div>`;
            tableBody.appendChild(row);
        });
    }

    cargarProductosLocal();
})();