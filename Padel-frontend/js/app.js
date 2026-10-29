window.obtenerFechaHoyLocal = function() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

window.aplicarRestriccionFechas = function(root = document) {
    const hoyIso = window.obtenerFechaHoyLocal();
    root.querySelectorAll('input[type="date"]').forEach(input => {
        input.min = hoyIso;
        if (input.value && input.value < hoyIso) {
            input.value = hoyIso;
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogueado = window.Almacenamiento ? window.Almacenamiento.obtenerUsuarioLogueado() : null;
    
    if (window.LayoutManager) {
        window.LayoutManager.inicializar(usuarioLogueado);
    }
    
    if (!usuarioLogueado) {
        if (window.location.hash) {
            window.location.hash = '';
        }
        return; 
    }

    const rutasPorDefecto = {
        'ADMIN': '#/admin/dashboard',
        'EMPLEADO': '#/empleado/agenda',
        'CLIENTE': '#/cliente/reserva'
    };

    window.addEventListener('hashchange', () => {
        procesarRutaActual(usuarioLogueado);
    });

    if (!window.location.hash || window.location.hash === '#/') {
        window.location.hash = rutasPorDefecto[usuarioLogueado.rol] || '#/admin/dashboard';
    } else {
        procesarRutaActual(usuarioLogueado);
    }

    document.body.addEventListener('click', (evento) => {
        const botonCerrarSesion = evento.target.closest('#btn-cerrar-sesion, .btn-cerrar-sesion, #btn-logout, .btn-logout');
        const textoElemento = evento.target.textContent || '';
        const textoBoton = evento.target.closest('button') ? evento.target.closest('button').textContent : '';
        const esTextoCerrarSesion = textoElemento.toLowerCase().includes('cerrar sesión') || 
                                    textoBoton.toLowerCase().includes('cerrar sesión');
        
        if (botonCerrarSesion || esTextoCerrarSesion) {
            evento.preventDefault();
            if (window.Almacenamiento) {
                window.Almacenamiento.cerrarSesion();
            } else {
                localStorage.removeItem('jwt_token');
                window.location.reload();
            }
        }
    });
});

function procesarRutaActual(usuarioLogueado) {
    const hash = window.location.hash; 
    if (!hash || hash === '#/') return;

    if (hash.startsWith('#/admin') && usuarioLogueado.rol !== 'ADMIN') {
        console.warn('Acceso denegado. Se requiere rol ADMIN.');
        window.location.hash = '#/empleado/agenda';
        return;
    }
    if (hash.startsWith('#/empleado') && usuarioLogueado.rol === 'CLIENTE') {
        console.warn('Acceso denegado. Se requiere rol EMPLEADO o ADMIN.');
        window.location.hash = '#/cliente/reserva';
        return;
    }

    if (window.LayoutManager) {
        window.LayoutManager.renderizarMenu(usuarioLogueado);
        window.LayoutManager.actualizarTopBar(hash);
    }

    const rutaArchivo = `vistas${hash.replace('#', '')}.html`;
    cargarVista(rutaArchivo);
}

async function cargarVista(url) {
    try {
        const respuesta = await fetch(url);
        
        if (!respuesta.ok) {
            throw new Error(`Error al cargar la vista: ${respuesta.status}`);
        }
        
        const html = await respuesta.text();
        
        const analizador = new DOMParser();
        const documento = analizador.parseFromString(html, 'text/html');
        
        const contenedor = document.getElementById('contenido-dinamico');
        if (!contenedor) {
            console.error("No se encontró el #contenido-dinamico");
            return;
        }

        contenedor.classList.remove('fade-in');
        void contenedor.offsetWidth;
        
        contenedor.innerHTML = documento.body.innerHTML;
        contenedor.classList.add('fade-in');
        
        // Aplicar restricción de fecha mínima (Hoy) a todos los calendarios de la vista
        if (window.aplicarRestriccionFechas) {
            window.aplicarRestriccionFechas(contenedor);
        }

        // Re-ejecutar scripts
        const scripts = contenedor.querySelectorAll('script');
        scripts.forEach(scriptAntiguo => {
            const scriptNuevo = document.createElement('script');
            Array.from(scriptAntiguo.attributes).forEach(attr => scriptNuevo.setAttribute(attr.name, attr.value));
            if (scriptAntiguo.src) {
                const urlObj = new URL(scriptAntiguo.src, window.location.href);
                urlObj.searchParams.set('v', new Date().getTime());
                scriptNuevo.src = urlObj.href;
            } else {
                scriptNuevo.textContent = scriptAntiguo.textContent;
            }
            scriptAntiguo.parentNode.replaceChild(scriptNuevo, scriptAntiguo);
        });

    } catch (error) {
        console.error('Error inyectando la vista:', error);
    }
}
