const DB_KEY = 'padel_db_v1';

const inicializarDatos = () => {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify({
            usuarios: [
                { id: 1, correo: 'admin@paddle.com', contrasena: '123456', nombre: 'Administrador', rol: 'ADMIN', estado: 'ACTIVO' },
                { id: 2, correo: 'empleado@paddle.com', contrasena: '123456', nombre: 'Juan Empleado', rol: 'EMPLEADO', estado: 'ACTIVO' },
                { id: 3, correo: 'cliente@paddle.com', contrasena: '123456', nombre: 'Carlos Cliente', rol: 'CLIENTE', estado: 'ACTIVO' }
            ],
            canchas: [
                { id: 1, nombre: 'Cancha 1', tipo: 'Techada / Blindex', costoBase: 8500, activa: true },
                { id: 2, nombre: 'Cancha 2', tipo: 'Descubierta / Muro', costoBase: 7000, activa: true },
                { id: 3, nombre: 'Cancha 3', tipo: 'Premium / Panorámica', costoBase: 10000, activa: false }
            ],
            productos: [
                { id: 1, codigo: 'PEL-01', nombre: 'Tubo Pelotas Head', categoria: 'Equipamiento', stockActual: 15, precioVenta: 9500 },
                { id: 2, codigo: 'PAL-01', nombre: 'Alquiler Pala Nox', categoria: 'Alquileres', stockActual: 10, precioVenta: 4000 },
                { id: 3, codigo: 'BEB-01', nombre: 'Agua Mineral 500ml', categoria: 'Bebidas', stockActual: 50, precioVenta: 1500 },
                { id: 4, codigo: 'BEB-02', nombre: 'Gatorade', categoria: 'Bebidas', stockActual: 20, precioVenta: 2200 }
            ],
            turnos: [],
            movimientosCaja: [],
            proveedores: [],
            parametros: { senaFija: 2500, tiempoCancelacion: 24, horaNoche: "18:00" }
        }));
    }
};

const leerDB = () => { inicializarDatos(); return JSON.parse(localStorage.getItem(DB_KEY)); };
const escribirDB = (datos) => { localStorage.setItem(DB_KEY, JSON.stringify(datos)); };

const Almacenamiento = {
    // --- AUTH ---
    validarCredenciales: (correo, contrasena) => {
        const db = leerDB();
        const u = db.usuarios.find(u => u.correo === correo && u.contrasena === contrasena && u.estado === 'ACTIVO');
        if (u) {
            localStorage.setItem('jwt_token', btoa(JSON.stringify({ id: u.id, correo: u.correo, nombre: u.nombre, rol: u.rol })));
            return true;
        }
        return false;
    },
    obtenerUsuarioLogueado: () => {
        const token = localStorage.getItem('jwt_token');
        return token ? JSON.parse(atob(token)) : null;
    },
    cerrarSesion: () => { localStorage.removeItem('jwt_token'); window.location.reload(); },

    // --- USUARIOS ---
    obtenerUsuarios: () => leerDB().usuarios,
    actualizarUsuario: (id, datos) => {
        const db = leerDB();
        const index = db.usuarios.findIndex(u => u.id == id);
        if (index !== -1) { db.usuarios[index] = { ...db.usuarios[index], ...datos }; escribirDB(db); return true; }
    },
    guardarUsuarioLocal: (id, datos) => {
        const db = leerDB();
        if (id) {
            const i = db.usuarios.findIndex(u => u.id == id);
            if (i !== -1) db.usuarios[i] = { ...db.usuarios[i], ...datos };
        } else {
            const nuevoId = db.usuarios.length ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1;
            db.usuarios.push({ id: nuevoId, contrasena: '123456', estado: 'ACTIVO', ...datos });
        }
        escribirDB(db);
    },

    // --- CANCHAS Y PARAMETROS ---
    obtenerCanchas: () => leerDB().canchas,
    actualizarCanchaCompleta: (id, datos) => {
        const db = leerDB();
        const i = db.canchas.findIndex(c => c.id == id);
        if (i !== -1) { db.canchas[i] = { ...db.canchas[i], ...datos }; escribirDB(db); }
    },
    obtenerParametros: () => leerDB().parametros || { senaFija: 2500 },
    guardarParametros: (p) => { const db = leerDB(); db.parametros = p; escribirDB(db); },

    // --- PRODUCTOS Y STOCK ---
    obtenerProductos: () => leerDB().productos,
    descontarStockLocal: (id, cantidad = 1) => {
        const db = leerDB();
        const i = db.productos.findIndex(p => p.id == id);
        if (i !== -1) {
            let stock = parseInt(db.productos[i].stockActual || db.productos[i].stock_actual || 0);
            if (stock >= cantidad) {
                db.productos[i].stockActual = stock - cantidad;
                db.productos[i].stock_actual = stock - cantidad;
                escribirDB(db); return true;
            }
        }
        return false;
    },

    // --- TURNOS ---
    obtenerTurnos: () => leerDB().turnos,
    registrarTurno: (t) => {
        const db = leerDB();
        t.id = db.turnos.length ? Math.max(...db.turnos.map(x => x.id)) + 1 : 1;
        db.turnos.push(t);
        escribirDB(db);
    },
    actualizarTurnoLocal: (t) => {
        const db = leerDB();
        const i = db.turnos.findIndex(x => x.id == t.id);
        if (i !== -1) { db.turnos[i] = t; escribirDB(db); }
    },
    eliminarTurnoLocal: (id) => {
        const db = leerDB();
        db.turnos = db.turnos.filter(t => t.id != id);
        escribirDB(db);
    },

    // --- CAJA Y PROVEEDORES ---
    obtenerMovimientosCaja: () => leerDB().movimientosCaja,
    registrarMovimientoCaja: (m) => {
        const db = leerDB();
        m.id = db.movimientosCaja.length ? Math.max(...db.movimientosCaja.map(x => x.id)) + 1 : 1;
        m.fechaHora = new Date().toISOString();
        db.movimientosCaja.push(m);
        escribirDB(db);
    },
    limpiarMovimientosCaja: () => { const db = leerDB(); db.movimientosCaja = []; escribirDB(db); },
    obtenerProveedores: () => leerDB().proveedores || [],
    guardarProveedorLocal: (id, datos) => {
        const db = leerDB();
        if(!db.proveedores) db.proveedores = [];
        if(id) { const i = db.proveedores.findIndex(p=>p.id==id); if(i!==-1) db.proveedores[i]={...db.proveedores[i],...datos}; }
        else { db.proveedores.push({id: Date.now(), ...datos}); }
        escribirDB(db);
    }
};

inicializarDatos();
window.Almacenamiento = Almacenamiento;