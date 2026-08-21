(function() {
    const tbody = document.getElementById('proveedores-table-body');
    const modal = document.getElementById('modal-proveedor');
    const form = document.getElementById('form-proveedor');
    
    function cargarTabla() {
        const provs = window.Almacenamiento.obtenerProveedores();
        tbody.innerHTML = '';
        if(provs.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">No hay proveedores</td></tr>';
        
        provs.forEach(p => {
            tbody.innerHTML += `
            <tr class="hover:bg-surface-container-low">
                <td class="px-6 py-4 font-bold text-on-surface">${p.empresa}</td>
                <td class="px-6 py-4"><span class="bg-surface px-2 py-1 rounded text-xs text-secondary">${p.rubro}</span></td>
                <td class="px-6 py-4 text-on-surface-variant">${p.telefono || '-'}</td>
                <td class="px-6 py-4 text-right">
                    <button class="btn-eliminar text-error p-2 hover:bg-error-container rounded-full" data-id="${p.id}"><span class="material-symbols-outlined text-[20px]">delete</span></button>
                </td>
            </tr>`;
        });
    }

    document.getElementById('btn-nuevo-proveedor').onclick = () => { form.reset(); modal.showModal(); };
    document.getElementById('btn-cancelar-prov').onclick = () => modal.close();

    form.onsubmit = (e) => {
        e.preventDefault();
        window.Almacenamiento.guardarProveedorLocal(null, {
            empresa: document.getElementById('prov-empresa').value,
            rubro: document.getElementById('prov-rubro').value,
            telefono: document.getElementById('prov-telefono').value
        });
        modal.close();
        cargarTabla();
    };

    tbody.addEventListener('click', e => {
        const btnDel = e.target.closest('.btn-eliminar');
        if(btnDel && confirm('¿Eliminar proveedor?')) {
            window.Almacenamiento.eliminarProveedorLocal(btnDel.dataset.id);
            cargarTabla();
        }
    });

    cargarTabla();
})();