
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si el usuario logueado
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

    // 4. Interceptar todos los clics en el documento usando delegación de eventos
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
        
        // Inyectar en el contenedor dinámico en vez de reemplazar el body entero
        const contenedor = document.getElementById('contenido-dinamico');
        if (!contenedor) {
            console.error("No se encontró el #contenido-dinamico");
            return;
        }

        // Agregar animación de entrada (clase global fade-in)
        contenedor.classList.remove('fade-in');
        // trigger reflow
        void contenedor.offsetWidth;
        
        contenedor.innerHTML = documento.body.innerHTML;
        contenedor.classList.add('fade-in');
        
        // Re-ejecutar scripts
        const scripts = contenedor.querySelectorAll('script');
        scripts.forEach(scriptAntiguo => {
            const scriptNuevo = document.createElement('script');
            Array.from(scriptAntiguo.attributes).forEach(attr => scriptNuevo.setAttribute(attr.name, attr.value));
            if (scriptAntiguo.src) {
                // Añadir un timestamp para evitar la caché del navegador en los JS de los controladores
                const url = new URL(scriptAntiguo.src, window.location.href);
                url.searchParams.set('v', new Date().getTime());
                scriptNuevo.src = url.href;
            } else {
                scriptNuevo.textContent = scriptAntiguo.textContent;
            }
            scriptAntiguo.parentNode.replaceChild(scriptNuevo, scriptAntiguo);
        });

    } catch (error) {
        console.error('Error inyectando la vista:', error);
    }
}
