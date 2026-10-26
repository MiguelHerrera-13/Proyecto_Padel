(function() {
    console.log("Controlador de Proveedores conectado a API MySQL Iniciado");
    const tbody = document.getElementById('proveedores-table-body');
    const modal = document.getElementById('modal-proveedor');
    const form = document.getElementById('form-proveedor');
    
    async function cargarTabla() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-on-surface-variant">Cargando proveedores...</td></tr>';

        try {
            const res = await fetch('../api/proveedores.php');
            if (!res.ok) throw new Error("Error al obtener proveedores");
            const provs = await res.json();
            
            tbody.innerHTML = '';
            if (provs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-on-surface-variant">No hay proveedores registrados.</td></tr>';
                return;
            }

            provs.forEach(p => {
                tbody.innerHTML += `
                <tr class="hover:bg-surface-container-low transition-colors">
                    <td class="px-6 py-4 font-bold text-on-surface">${p.empresa}</td>
                    <td class="px-6 py-4"><span class="bg-surface px-2.5 py-1 rounded-md text-xs font-semibold text-secondary border border-outline-variant/15">${p.rubro}</span></td>
                    <td class="px-6 py-4 text-on-surface-variant">${p.telefono || 'Sin teléfono'}</td>
                    <td class="px-6 py-4 text-right">
                        <button class="btn-eliminar text-on-surface-variant hover:text-error p-2 hover:bg-error-container/20 rounded-full transition-colors" data-id="${p.id}" data-empresa="${p.empresa}" title="Eliminar Proveedor">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </td>
                </tr>`;
            });
        } catch (e) {
            console.error("Error al cargar proveedores:", e);
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-error">Error al cargar proveedores desde MySQL.</td></tr>';
        }
    }

    const btnNuevo = document.getElementById('btn-nuevo-proveedor');
    if (btnNuevo && modal) {
        btnNuevo.onclick = () => { form.reset(); modal.showModal(); };
    }

    const btnCancelar = document.getElementById('btn-cancelar-prov');
    if (btnCancelar && modal) {
        btnCancelar.onclick = () => modal.close();
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const empresa = document.getElementById('prov-empresa').value.trim();
            const rubro = document.getElementById('prov-rubro').value.trim();
            const telefono = document.getElementById('prov-telefono').value.trim();

            if (!empresa || !rubro) {
                alert("Por favor completa los campos Empresa y Rubro.");
                return;
            }

            try {
                const res = await fetch('../api/proveedores.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ empresa, rubro, telefono })
                });

                if (res.ok) {
                    modal.close();
                    form.reset();
                    await cargarTabla();
                } else {
                    const err = await res.json();
                    alert(err.error || "Error al registrar proveedor.");
                }
            } catch (err) {
                alert("Error de conexión al guardar proveedor.");
            }
        };
    }

    if (tbody) {
        tbody.addEventListener('click', async (e) => {
            const btnDel = e.target.closest('.btn-eliminar');
            if (btnDel) {
                const id = btnDel.dataset.id;
                const empresa = btnDel.dataset.empresa || 'este proveedor';
                if (confirm(`¿Estás seguro de eliminar a "${empresa}"?`)) {
                    try {
                        const res = await fetch(`../api/proveedores.php?id=${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            await cargarTabla();
                        } else {
                            alert("No se pudo eliminar el proveedor.");
                        }
                    } catch (err) {
                        alert("Error de conexión al eliminar.");
                    }
                }
            }
        });
    }

    cargarTabla();
})();