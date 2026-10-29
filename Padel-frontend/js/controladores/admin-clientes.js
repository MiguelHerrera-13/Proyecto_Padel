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

    const kpiActivos = document.getElementById('kpi-usuarios-activos');
    const kpiDeuda = document.getElementById('kpi-usuarios-deuda');
    const kpiBloqueados = document.getElementById('kpi-usuarios-bloqueados');

    let usuariosActuales = [];

    if (!tableBody) return;

    function actualizarKPIs() {
        const cantActivos = usuariosActuales.filter(u => u.estado === 'ACTIVO').length;
        const cantDeuda = usuariosActuales.filter(u => u.estado === 'CON_DEUDA').length;
        const cantBloqueados = usuariosActuales.filter(u => u.estado === 'BLOQUEADO').length;

        if (kpiActivos) kpiActivos.textContent = cantActivos;
        if (kpiDeuda) kpiDeuda.textContent = cantDeuda;
        if (kpiBloqueados) kpiBloqueados.textContent = cantBloqueados;
    }

    function aplicarFiltros() {
        const textoBusqueda = inputBusqueda ? inputBusqueda.value.toLowerCase().trim() : '';
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

    async function cargarUsuarios() {
        try {
            const response = await fetch('../api/usuarios.php');
            if (!response.ok) throw new Error('Error al cargar usuarios');
            
            usuariosActuales = await response.json();
            
            if (txtTotal) txtTotal.textContent = `Total: ${usuariosActuales.length} usuarios registrados en el padrón del club`;
            actualizarKPIs();
            aplicarFiltros();
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-error font-medium">Error de conexión con la base de datos.</td></tr>`;
        }
    }

    function abrirModal(usuario = null) {
        if (usuario) {
            modalTitulo.textContent = 'Editar Usuario';
            document.getElementById('usuario-id').value = usuario.id;
            document.getElementById('usuario-nombre').value = usuario.nombre;
            document.getElementById('usuario-correo').value = usuario.correo;
            document.getElementById('usuario-telefono').value = usuario.telefono || '';
            document.getElementById('usuario-rol').value = usuario.rol || 'CLIENTE';
            const elEstado = document.getElementById('usuario-estado');
            if (elEstado) elEstado.value = usuario.estado || 'ACTIVO';
            document.getElementById('usuario-contrasena').required = false;
        } else {
            modalTitulo.textContent = 'Nuevo Usuario';
            form.reset();
            document.getElementById('usuario-id').value = '';
            const elEstado = document.getElementById('usuario-estado');
            if (elEstado) elEstado.value = 'ACTIVO';
            document.getElementById('usuario-contrasena').required = true;
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

    // Event Delegation para Editar y Eliminar
    tableBody.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const usuario = usuariosActuales.find(u => u.id == id);
            if (usuario) abrirModal(usuario);
        }

        if (btnDelete) {
            const id = btnDelete.dataset.id;
            const nombre = btnDelete.dataset.nombre || 'este usuario';
            if (confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
                try {
                    const response = await fetch(`../api/usuarios.php?id=${id}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        if (window.mostrarNotificacion) window.mostrarNotificacion(`Usuario ${nombre} eliminado del sistema.`);
                        cargarUsuarios();
                    } else {
                        const data = await response.json();
                        const desactiva = confirm(`⚠️ ${data.error || 'El usuario posee historial.'}\n\nPara conservar la auditoría del club: ¿Deseas cambiar su estado a BLOQUEADO en su lugar?`);
                        if (desactiva) {
                            const resBloqueo = await fetch('../api/usuarios.php', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: id, estado: 'BLOQUEADO' })
                            });
                            if (resBloqueo.ok) {
                                if (window.mostrarNotificacion) window.mostrarNotificacion(`Usuario ${nombre} bloqueado exitosamente.`);
                                cargarUsuarios();
                            } else {
                                if (window.mostrarNotificacion) window.mostrarNotificacion("No se pudo cambiar el estado.", "error");
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error al procesar baja:', error);
                    if (window.mostrarNotificacion) window.mostrarNotificacion('Error de conexión al servidor.', 'error');
                }
            }
        }
    });

    // Event Delegation para cambio directo de Estado en la tabla
    tableBody.addEventListener('change', async (e) => {
        const selectCambioEstado = e.target.closest('.select-estado-rapido');
        if (!selectCambioEstado) return;

        const id = selectCambioEstado.dataset.id;
        const nombre = selectCambioEstado.dataset.nombre || 'Usuario';
        const nuevoEstado = selectCambioEstado.value;

        selectCambioEstado.disabled = true;

        try {
            const response = await fetch('../api/usuarios.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id), estado: nuevoEstado })
            });

            if (response.ok) {
                const etiqueta = nuevoEstado === 'ACTIVO' ? 'Activo / Al Día' : (nuevoEstado === 'CON_DEUDA' ? 'Con Deuda' : 'Bloqueado');
                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion(`Estado de ${nombre} actualizado a "${etiqueta}".`);
                }
                await cargarUsuarios();
            } else {
                const data = await response.json();
                if (window.mostrarNotificacion) window.mostrarNotificacion(data.error || 'Error al cambiar estado.', 'error');
                await cargarUsuarios();
            }
        } catch (error) {
            console.error('Error:', error);
            if (window.mostrarNotificacion) window.mostrarNotificacion('Error de conexión.', 'error');
            await cargarUsuarios();
        } finally {
            selectCambioEstado.disabled = false;
        }
    });

    // Guardar (Crear o Editar desde el modal)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = form.querySelector('button[type="submit"]');
        const id = document.getElementById('usuario-id').value;
        const nombre = document.getElementById('usuario-nombre').value.trim();
        const correo = document.getElementById('usuario-correo').value.trim();
        const telefono = document.getElementById('usuario-telefono').value.trim();
        const rol = document.getElementById('usuario-rol').value;
        const estado = document.getElementById('usuario-estado') ? document.getElementById('usuario-estado').value : 'ACTIVO';
        const contrasena = document.getElementById('usuario-contrasena').value;

        const metodo = id ? 'PUT' : 'POST';
        const payload = {
            nombre, correo, telefono, rol, estado
        };
        
        if (id) {
            payload.id = id;
            if (contrasena.trim() !== '') {
                payload.contrasena = contrasena;
            }
        } else {
            payload.contrasena = contrasena;
        }

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Guardando...";
        }

        try {
            const response = await fetch('../api/usuarios.php', {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                cerrarModal();
                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion(id ? `Usuario ${nombre} actualizado correctamente.` : `Usuario ${nombre} creado con éxito.`);
                }
                cargarUsuarios();
            } else {
                const data = await response.json();
                if (window.mostrarNotificacion) {
                    window.mostrarNotificacion(data.error || 'Error al guardar usuario.', 'error');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (window.mostrarNotificacion) window.mostrarNotificacion('Error de conexión al servidor.', 'error');
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Guardar Usuario";
            }
        }
    });

    function renderizarTabla(usuarios) {
        tableBody.innerHTML = '';
        
        if (txtMostrando) txtMostrando.textContent = `Mostrando ${usuarios.length} de ${usuariosActuales.length} usuarios`;
        
        if (usuarios.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-on-surface-variant font-medium">No se encontraron usuarios con ese criterio.</td></tr>`;
            return;
        }

        usuarios.forEach(user => {
            let rolHTML = user.rol === 'ADMIN' 
                ? `<span class="inline-block mt-0.5 bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px] font-bold border border-primary/20">ADMIN</span>`
                : (user.rol === 'EMPLEADO' 
                    ? `<span class="inline-block mt-0.5 bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[11px] font-bold border border-secondary/20">STAFF</span>`
                    : `<span class="inline-block mt-0.5 bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded text-[11px] font-semibold">CLIENTE</span>`);

            let clasesSelectEstado = '';
            if (user.estado === 'ACTIVO') {
                clasesSelectEstado = 'bg-[#e8f5e9] text-[#2e7d32] border-[#4caf50]/30';
            } else if (user.estado === 'BLOQUEADO') {
                clasesSelectEstado = 'bg-error-container text-on-error-container border-error/30';
            } else {
                clasesSelectEstado = 'bg-[#fff3e0] text-[#e65100] border-[#ffb74d]/40';
            }

            let fechaAlta = 'Registrado';
            if (user.fecha_creacion) {
                const d = new Date(user.fecha_creacion.replace(' ', 'T'));
                if (!isNaN(d.getTime())) {
                    fechaAlta = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container-low/60 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 align-middle">
                    <div class="flex items-center gap-3.5">
                        <div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface font-headline font-bold flex-shrink-0">
                            ${user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div class="text-left">
                            <p class="font-bold text-on-surface leading-tight">${user.nombre}</p>
                            ${rolHTML}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 align-middle text-left">
                    <p class="text-on-surface font-medium flex items-center gap-1.5 text-sm"><span class="material-symbols-outlined text-[16px] text-secondary">mail</span> ${user.correo}</p>
                    <p class="text-on-surface-variant flex items-center gap-1.5 mt-1 text-xs"><span class="material-symbols-outlined text-[15px] text-secondary">call</span> ${user.telefono || 'Sin teléfono'}</p>
                </td>
                <td class="px-6 py-4 align-middle text-left">
                    <span class="text-xs font-semibold text-on-surface block">Alta: ${fechaAlta}</span>
                    <span class="text-[11px] text-on-surface-variant">Socio ID #${user.id}</span>
                </td>
                <td class="px-6 py-4 align-middle text-left">
                    <div class="relative inline-block w-44">
                        <select class="select-estado-rapido w-full bg-none appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 ${clasesSelectEstado}" data-id="${user.id}" data-nombre="${user.nombre}">
                            <option value="ACTIVO" class="bg-white text-slate-900 font-semibold" ${user.estado === 'ACTIVO' ? 'selected' : ''}>● Activo / Al Día</option>
                            <option value="CON_DEUDA" class="bg-white text-slate-900 font-semibold" ${user.estado === 'CON_DEUDA' ? 'selected' : ''}>● Con Deuda</option>
                            <option value="BLOQUEADO" class="bg-white text-slate-900 font-semibold" ${user.estado === 'BLOQUEADO' ? 'selected' : ''}>● Bloqueado</option>
                        </select>
                        <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none opacity-75">expand_more</span>
                    </div>
                </td>
                <td class="px-6 py-4 align-middle text-right">
                    <div class="flex justify-end items-center gap-1.5">
                        <button class="btn-edit p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer" data-id="${user.id}" title="Editar Usuario">
                            <span class="material-symbols-outlined text-[19px]">edit</span>
                        </button>
                        <button class="btn-delete p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer" data-id="${user.id}" data-nombre="${user.nombre}" title="Eliminar Usuario">
                            <span class="material-symbols-outlined text-[19px]">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    cargarUsuarios();
})();
