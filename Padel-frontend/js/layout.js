
window.LayoutManager = {
    // Configuración de menús por rol
    menus: {
        ADMIN: [
            { titulo: 'Resumen', icono: 'dashboard', href: '#/admin/dashboard' },
            { titulo: 'Ventas', icono: 'payments', href: '#/empleado/caja' },
            { titulo: 'Usuarios', icono: 'group', href: '#/admin/clientes' },
            { titulo: 'Config. Precios', icono: 'sell', href: '#/admin/canchas' },
            { titulo: 'Stock', icono: 'inventory_2', href: '#/admin/stock' },
            { titulo: 'Proveedores', icono: 'local_shipping', href: '#/admin/proveedores' } 
        ],
        EMPLEADO: [
            { titulo: 'Agenda', icono: 'calendar_today', href: '#/empleado/agenda' },
            { titulo: 'Caja', icono: 'payments', href: '#/empleado/caja' }
        ],
        CLIENTE: [
            // Apunta a vistas/cliente/reserva.html
            { titulo: 'Nueva Reserva', icono: 'add_circle', href: '#/cliente/reserva' }, 
            
            // Apunta a vistas/cliente/mis-reservas.html
            { titulo: 'Mis Reservas', icono: 'calendar_month', href: '#/cliente/mis-reservas' }
        ]
    },

    inicializar: function(usuarioLogueado) {
        const loginContainer = document.getElementById('login-container');
        const appShell = document.getElementById('app-shell');
        
        if (!usuarioLogueado) {
            // Mostrar login
            loginContainer.classList.remove('hidden');
            appShell.classList.add('hidden');
            document.body.className = "bg-surface text-on-surface font-body antialiased min-h-screen flex items-center justify-center p-4";
        } else {
            // Mostrar App Shell
            loginContainer.classList.add('hidden');
            appShell.classList.remove('hidden');
            document.body.className = "flex h-screen overflow-hidden antialiased bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container";
            
            this.renderizarMenu(usuarioLogueado);
            this.actualizarPerfil(usuarioLogueado);
            this.bindEvents();
        }
    },

    bindEvents: function() {
        const toggleBtn = document.getElementById('btn-toggle-menu');
        const sidebar = document.getElementById('sidebar-container');
        if (toggleBtn && sidebar && !this._eventsBound) {
            toggleBtn.addEventListener('click', () => {
                if (sidebar.classList.contains('hidden')) {
                    sidebar.classList.remove('hidden');
                    sidebar.classList.add('flex');
                } else {
                    sidebar.classList.add('hidden');
                    sidebar.classList.remove('flex');
                    sidebar.classList.add('md:flex'); // restaurar comportamiento default en desktop
                }
            });
            this._eventsBound = true;
        }
    },

    renderizarMenu: function(usuarioLogueado) {
        const menuContainer = document.getElementById('sidebar-menu');
        const items = this.menus[usuarioLogueado.rol] || [];
        const btnToggle = document.getElementById('btn-toggle-menu');
        
        // El cliente tiene un layout más simple (Centric), podríamos ocultar el sidebar entero
        if (usuarioLogueado.rol === 'CLIENTE') {
            document.getElementById('sidebar-container').classList.add('hidden');
            document.getElementById('sidebar-container').classList.remove('md:flex');
            document.getElementById('main-wrapper').classList.remove('md:ml-72'); 
            if (btnToggle) btnToggle.classList.add('hidden');
            return;
        }

        // Para ADMIN y EMPLEADO, construimos el menú
        document.getElementById('sidebar-container').classList.remove('hidden');
        document.getElementById('sidebar-container').classList.add('hidden', 'md:flex');
        document.getElementById('main-wrapper').classList.add('md:ml-72');
        if (btnToggle) btnToggle.classList.remove('hidden');

        let html = '';
        const currentHash = window.location.hash || this.menus[usuarioLogueado.rol][0].href;

        items.forEach(item => {
            const isActive = currentHash.startsWith(item.href);
            
            if (isActive) {
                html += `
                <a class="flex items-center gap-4 px-6 py-4 text-on-primary-container bg-primary-container/20 rounded-xl font-bold transition-all" href="${item.href}">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${item.icono}</span>
                    <span>${item.titulo}</span>
                </a>`;
            } else {
                html += `
                <a class="flex items-center gap-4 px-6 py-4 text-secondary hover:text-primary hover:bg-surface-container-high rounded-xl font-medium transition-all duration-300" href="${item.href}">
                    <span class="material-symbols-outlined">${item.icono}</span>
                    <span>${item.titulo}</span>
                </a>`;
            }
        });

        menuContainer.innerHTML = html;
    },

    actualizarPerfil: function(usuario) {
        const profileName = document.getElementById('topbar-profile-name');
        const profileRole = document.getElementById('topbar-profile-role');
        const profileInitials = document.getElementById('topbar-profile-initials');

        if (profileName) profileName.textContent = usuario.nombre;
        if (profileRole) profileRole.textContent = usuario.rol;
        if (profileInitials) {
            const initials = usuario.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            profileInitials.textContent = initials;
        }
    },

    actualizarTopBar: function(hash) {
        // Podríamos actualizar el título dinámicamente 
        const titulo = document.getElementById('topbar-title');
        if (!titulo) return;
        
        if (hash.includes('dashboard')) titulo.textContent = 'Panel de Resumen';
        else if (hash.includes('canchas')) titulo.textContent = 'Gestión de Canchas';
        else if (hash.includes('stock')) titulo.textContent = 'Control de Inventario';
        else if (hash.includes('clientes')) titulo.textContent = 'Socios del Club';
        else if (hash.includes('agenda')) titulo.textContent = 'Agenda de Turnos';
        else if (hash.includes('caja')) titulo.textContent = 'Gestión de Caja';
        else if (hash.includes('reserva')) titulo.textContent = 'Nueva Reserva';
        const htmlBotonOscuro = `
    <button onclick="alternarModoOscuro()" class="p-2 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center">
        <span class="material-symbols-outlined dark:hidden">dark_mode</span>
        <span class="material-symbols-outlined hidden dark:block">light_mode</span>
    </button>
`;
    }
};
