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
            { titulo: 'Nueva Reserva', icono: 'add_circle', href: '#/cliente/reserva' },
            { titulo: 'Mis Reservas', icono: 'calendar_month', href: '#/cliente/mis-reservas' }
        ]
    },

    inicializar: function(usuarioLogueado) {
        const loginContainer = document.getElementById('login-container');
        const appShell = document.getElementById('app-shell');
        
        // Forzar siempre Modo Claro
        document.documentElement.classList.remove('dark');

        if (!usuarioLogueado) {
            loginContainer.classList.remove('hidden');
            appShell.classList.add('hidden');
            document.body.className = "bg-surface text-on-surface font-body antialiased min-h-screen flex items-center justify-center p-4";
        } else {
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
                    sidebar.classList.add('md:flex');
                }
            });
            this._eventsBound = true;
        }
    },

    renderizarMenu: function(usuarioLogueado) {
        const menuContainer = document.getElementById('sidebar-menu');
        const items = this.menus[usuarioLogueado.rol] || [];
        const btnToggle = document.getElementById('btn-toggle-menu');

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
                <a class="flex items-center gap-3.5 px-5 py-3.5 text-on-primary-container bg-primary-container/25 border border-primary/20 rounded-xl font-bold text-sm transition-all shadow-sm" href="${item.href}">
                    <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">${item.icono}</span>
                    <span class="tracking-tight">${item.titulo}</span>
                </a>`;
            } else {
                html += `
                <a class="flex items-center gap-3.5 px-5 py-3.5 text-secondary hover:text-primary hover:bg-surface-container-low rounded-xl font-semibold text-sm transition-all duration-200" href="${item.href}">
                    <span class="material-symbols-outlined text-[20px]">${item.icono}</span>
                    <span class="tracking-tight">${item.titulo}</span>
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
        const titulo = document.getElementById('topbar-title');
        if (!titulo) return;
        
        if (hash.includes('dashboard')) titulo.textContent = 'Panel de Resumen';
        else if (hash.includes('canchas')) titulo.textContent = 'Configuración de Canchas y Tarifas';
        else if (hash.includes('stock')) titulo.textContent = 'Control de Inventario y Tienda';
        else if (hash.includes('clientes')) titulo.textContent = 'Gestión de Usuarios y Socios';
        else if (hash.includes('proveedores')) titulo.textContent = 'Gestión de Proveedores y Pedidos';
        else if (hash.includes('agenda')) titulo.textContent = 'Agenda de Turnos y Mostrador';
        else if (hash.includes('caja')) titulo.textContent = 'Control de Ventas y Caja';
        else if (hash.includes('mis-reservas')) titulo.textContent = 'Mis Reservas';
        else if (hash.includes('reserva')) titulo.textContent = 'Nueva Reserva de Cancha';
    }
};
