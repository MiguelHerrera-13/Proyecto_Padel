(function () {
    console.log("Controlador de Usuarios Iniciado");
    const tableBody = document.getElementById('clientes-table-body');
    const btnNuevo = document.getElementById('btn-nuevo-usuario');
    const modal = document.getElementById('modal-usuario');
    const form = document.getElementById('form-usuario');
    const btnCerrar = document.getElementById('btn-cerrar-modal-usuario');
    const btnCancelar = document.getElementById('btn-cancelar-modal-usuario');
    const modalTitulo = document.getElementById('modal-usuario-titulo');

    const inputBusqueda = document.getElementById('input-buscador-clientes');
    const selectEstado = document.getElementById('select-filtro-estado');
    const txtTotal = document.getElementById('total-clientes-txt');
    const txtMostrando = document.getElementById('txt-mostrando');

    let usuariosActuales = [];

    if (!tableBody) return;

    /**
     * Aplica los filtros de búsqueda y estado sobre la lista global de usuarios.
     */
    function aplicarFiltros() {
        const textoBusqueda = inputBusqueda ? inputBusqueda.value.toLowerCase() : '';
        const estadoSeleccionado = selectEstado ? selectEstado.value : 'TODOS';

        const usuariosFiltrados = usuariosActuales.filter(user => {
            const coincideTexto = user.nombre.toLowerCase().includes(textoBusqueda) || 
                                  user.correo.toLowerCase().includes(textoBusqueda) ||
                                  (user.telefono && user.telefono.toLowerCase().includes(textoBusqueda));
            
            const coincideEstado = estadoSeleccionado === 'TODOS' || user.estado === estadoSeleccionado;
            
            return coincideTexto && coincideEstado;
        });

        renderizarTabla(usuariosFiltrados);
    }

    if (inputBusqueda) inputBusqueda.addEventListener('input', aplicarFiltros);
    if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);

    /**
     * Consulta la API de usuarios.php
     */
    async function cargarUsuarios() {
        try {
            const response = await fetch('../api/usuarios.php');
            if (!response.ok) throw new Error('Error al cargar usuarios');
            
            usuariosActuales = await response.json();
            
            if (txtTotal) txtTotal.textContent = `Total: ${usuariosActuales.length} usuarios registrados`;
            renderizarTabla(usuariosActuales);
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-error">Error de conexión con la base de datos.</td></tr>`;
        }
    }

    /**
     * Abre el modal para Crear o Editar
     * @param {Object|null} usuario - Objeto a editar, nulo si es creación
     */
    function abrirModal(usuario = null) {
        if (usuario) {
            modalTitulo.textContent = 'Editar Usuario';
            document.getElementById('usuario-id').value = usuario.id;
            document.getElementById('usuario-nombre').value = usuario.nombre;
            document.getElementById('usuario-correo').value = usuario.correo;
            document.getElementById('usuario-telefono').value = usuario.telefono || '';
            document.getElementById('usuario-rol').value = usuario.rol;
            document.getElementById('usuario-contrasena').required = false; // Contraseña opcional en edición
        } else {
            modalTitulo.textContent = 'Nuevo Usuario';
            form.reset();
            document.getElementById('usuario-id').value = '';
            document.getElementById('usuario-contrasena').required = true; // Obligatoria en creación
        }
        modal.showModal();
    }

    function cerrarModal() {
        modal.close();
        form.reset();
    }

    if (btnNuevo && modal) {
        btnNuevo.addEventListener('click', () => abrirModal(null));
    }

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);

    // Event Delegation para Editar / Eliminar / Cambiar Estado
    tableBody.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const btnToggleStatus = e.target.closest('.btn-toggle-status');

        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const usuario = usuariosActuales.find(u => u.id == id);
            if (usuario) abrirModal(usuario);
        }

        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const nombre = btnDelete.dataset.nombre;
            if (confirm(`¿Estás seguro de eliminar físicamente al usuario ${nombre}? Esta acción no se puede deshacer.`)) {
                try {
                    const response = await fetch(`../api/usuarios.php?id=${id}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        cargarUsuarios();
                    } else {
                        const data = await response.json();
                        alert(data.error || 'Error al eliminar');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error de conexión.');
                }
            }
        }
        
        if (btnToggleStatus) {
            const id = btnToggleStatus.dataset.id;
            const estadoActual = btnToggleStatus.dataset.estado;
            // Alternar estado simple entre ACTIVO y BLOQUEADO para simplificar (o CON_DEUDA si es necesario)
            const nuevoEstado = estadoActual === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO';
            
            try {
                const response = await fetch('../api/usuarios.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id, estado: nuevoEstado })
                });
                if (response.ok) {
                    cargarUsuarios();
                } else {
                    const data = await response.json();
                    alert(data.error || 'Error al cambiar estado');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión.');
            }
        }
    });

    // Guardar (Crear o Editar)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('usuario-id').value;
        const nombre = document.getElementById('usuario-nombre').value;
        const correo = document.getElementById('usuario-correo').value;
        const telefono = document.getElementById('usuario-telefono').value;
        const rol = document.getElementById('usuario-rol').value;
        const contrasena = document.getElementById('usuario-contrasena').value;

        const metodo = id ? 'PUT' : 'POST';
        const payload = {
            nombre, correo, telefono, rol
        };
        
        if (id) {
            payload.id = id;
            if (contrasena.trim() !== '') {
                payload.contrasena = contrasena; // Solo actualizar si escribió algo
            }
        } else {
            payload.contrasena = contrasena; // Obligatoria en creación
        }

        try {
            const response = await fetch('../api/usuarios.php', {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                cerrarModal();
                cargarUsuarios();
            } else {
                const data = await response.json();
                alert(data.error || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión al servidor');
        }
    });

    /**
     * Dibuja la tabla HTML de usuarios (<tr><td>...</td></tr>)
     */
    function renderizarTabla(usuarios) {
        tableBody.innerHTML = '';
        
        if (txtMostrando) txtMostrando.textContent = `Mostrando ${usuarios.length} resultados`;
        
        if (usuarios.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-on-surface-variant">No se encontraron usuarios.</td></tr>`;
            return;
        }

        usuarios.forEach(user => {
            // Reglas visuales para el Rol
            let rolHTML = user.rol === 'ADMIN' 
                ? `<span class="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold border border-primary/20">ADMIN</span>`
                : (user.rol === 'EMPLEADO' 
                    ? `<span class="bg-secondary/10 text-secondary px-2 py-1 rounded-md text-xs font-bold border border-secondary/20">STAFF</span>`
                    : `<span class="bg-surface-container-highest text-on-surface-variant px-2 py-1 rounded-md text-xs font-medium">CLIENTE</span>`);

            // Reglas visuales para Estado
            let estadoHTML = '';
            if (user.estado === 'ACTIVO') {
                estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]"><span class="w-1.5 h-1.5 rounded-full bg-[#4CAF50]"></span> Activo </span>`;
            } else if (user.estado === 'BLOQUEADO') {
                estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-error-container text-on-error-container"><span class="w-1.5 h-1.5 rounded-full bg-error"></span> Bloqueado </span>`;
            } else {
                estadoHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-tertiary-container text-on-tertiary-container"><span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Con Deuda </span>`;
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-lowest transition-colors group';
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-headline font-bold">
                            ${user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-on-surface">${user.nombre}</p>
                            ${rolHTML}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">mail</span> ${user.correo}</p>
                    ${user.telefono ? `<p class="text-on-surface-variant flex items-center gap-1 mt-1 text-xs"><span class="material-symbols-outlined text-[14px]">call</span> ${user.telefono}</p>` : ''}
                </td>
                <td class="px-6 py-4 text-on-surface-variant">
                    <span class="text-xs">Ult. acceso: Ayer</span><br>
                    <span class="text-xs font-semibold text-primary">3 reservas en el mes</span>
                </td>
                <td class="px-6 py-4">
                    ${estadoHTML}
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn-toggle-status text-on-surface-variant hover:text-secondary transition-colors" data-id="${user.id}" data-estado="${user.estado}" title="Bloquear/Desbloquear">
                            <span class="material-symbols-outlined text-[20px]">${user.estado === 'ACTIVO' ? 'block' : 'check_circle'}</span>
                        </button>
                        <button class="btn-edit text-on-surface-variant hover:text-primary transition-colors" data-id="${user.id}" title="Editar">
                            <span class="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button class="btn-delete text-on-surface-variant hover:text-error transition-colors" data-id="${user.id}" data-nombre="${user.nombre}" title="Eliminar">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Inicializar
    cargarUsuarios();

})();