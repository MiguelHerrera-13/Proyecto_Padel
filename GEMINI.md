# Sistema de Gestión - Club de Pádel (Indoor Padel)

## Objetivo
Desarrollar una Single Page Application (SPA) transaccional para la gestión de reservas, inventario y caja de un complejo de pádel. 

## Reglas de Desarrollo (IMPORTANTE)
* **Idioma del Dominio:** Todo el código fuente (variables, identificadores, entidades, clases, métodos y comentarios) debe escribirse estrictamente en **español**. 
* **Excepciones:** Las palabras reservadas de los lenguajes (JavaScript, Java) y las clases de los frameworks (Tailwind CSS) deben mantenerse en su idioma original (inglés).

## Stack Tecnológico
* **Frontend:** Vanilla JavaScript, HTML5, Tailwind CSS. Arquitectura SPA.
* **Backend:** PHP 8.x, PDO para acceso a base de datos (MySQL), arquitectura de servicios RESTful.
* **Seguridad:** Autenticación basada en JWT. Endpoints protegidos mediante middleware de validación de token.

## Roles del Sistema y Vistas Asociadas
1. **ADMIN:** Acceso total a analíticas y configuración.
   * Vistas (`/vistas/admin/`): `dashboard.html`, `clientes.html`, `canchas.html`, `stock.html`.
2. **EMPLEADO:** Gestión operativa de recepción y caja.
   * Vistas (`/vistas/empleado/`): `agenda.html`, `caja.html`.
3. **CLIENTE:** Usuario final para alquileres.
   * Vistas (`/vistas/cliente/`): `reserva.html`.

## Estructura de Datos Principal (Entidades JPA)
* **Usuario:** id, nombre, correo, contrasena, telefono, rol, estado.
* **Cancha:** id, nombre, tipo (Techada/Descubierta), costoBase, activa.
* **Turno:** id, fecha, horaInicio, duracion, estadoPago, montoTotal, usuario_id, cancha_id.
* **Producto:** id, codigo, nombre, categoria, stockActual, precioVenta.
* **MovimientoCaja:** id, tipoMovimiento (INGRESO/EGRESO), monto, concepto, fechaHora, usuario_id.

## Estado Actual del Proyecto
El frontend estático (HTML/Tailwind) está maquetado. La vista principal de inicio de sesión (`index.html`) tiene su lógica aislada en `js/login.js` y la configuración de estilos en `js/tailwind-config.js`.

## Próximo Hito
Construir el enrutador (Router) en Vanilla JS (`js/app.js`) para convertir las vistas estáticas en una verdadera SPA, inyectando el contenido de la carpeta `/vistas/` dinámicamente en el `index.html` basándose en la validación de un JWT simulado.

## Directrices de Implementación - CRUDs
* **Estructura de API:** Crear endpoints bajo una estructura REST (`/api/usuarios.php`, `/api/stock.php`).
* **Acceso a Datos:** Utilizar sentencias preparadas de PDO para prevenir inyecciones SQL.
* **Respuesta del Servidor:** Todas las respuestas de la API deben ser en formato JSON y utilizar códigos de estado HTTP adecuados (200, 201, 400, 401, 404).
* **Naming Convention:** Variables, parámetros de entrada y campos de JSON deben estar en **español** (ej. `nombre_usuario`, `stock_actual`, `precio_venta`).

## Próximos Objetivos de Desarrollo
1. **CRUD Usuarios:** Implementar endpoints para Listar, Crear, Editar y Eliminar usuarios con rol ADMIN.
2. **CRUD Stock:** Implementar endpoints para gestionar el inventario (Alta, Baja, Modificación y Consulta de productos).
3. **Integración:** Actualizar `js/app.js` para consumir los nuevos endpoints mediante `fetch()` e inyectar los datos en las vistas correspondientes (`admin/stock.html` y `admin/clientes.html`).