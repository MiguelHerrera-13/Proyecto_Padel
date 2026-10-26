# Guía de Demostración y Entrega del Proyecto
**Sistema de Gestión - Club de Pádel (Indoor Padel)**

---

## 1. Credenciales de Acceso para Pruebas

El sistema cuenta con 3 perfiles de usuario preconfigurados con diferentes niveles de acceso:

| Rol | Correo Electrónico | Contraseña | Vistas y Capacidades |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@paddle.com` | `123456` | Dashboard de analíticas, Socios/Usuarios, Precios y Canchas, Stock/Inventario. |
| **Empleado** | `empleado@paddle.com` | `123456` | Agenda visual interactiva, Cobro de tickets/venta rápida, Control de Caja y Arqueo. |
| **Cliente / Socio** | `cliente@paddle.com` | `123456` | Selector de reservas con disponibilidad en vivo, Pago de seña MP, Mis Reservas. |

> **URL de Acceso en Navegador:**  
> `http://localhost/Proyecto_Padel/Padel-frontend/index.html`

---

## 2. Guion de Demostración Paso a Paso (Demo en 5 Minutos)

Este flujo está diseñado para impresionar al evaluador mostrando la **interconexión transaccional en tiempo real** entre los tres roles del sistema.

### **Paso 1: Experiencia del Cliente (Reserva Web y Pago de Seña)**
1. Iniciar sesión con `cliente@paddle.com` / `123456`.
2. El sistema ingresa a **Nueva Reserva**.
3. Seleccionar el día de hoy (o un día próximo) y una duración (ej. 90 minutos).
4. Elegir un horario disponible (ej. `18:00 hs`).
   * *Detalle técnico para mencionar:* Los horarios ya ocupados aparecen tachados y deshabilitados automáticamente consultando la base de datos MySQL en vivo.
5. Hacer clic en **"Pagar Seña con MercadoPago"**.
6. Aparece la alerta de confirmación con el comprobante y el sistema redirige automáticamente a la vista **Mis Reservas**, donde el turno aparece confirmado con el badge `SEÑA PAGADA`.
7. Hacer clic en el botón superior de **Cerrar Sesión**.

### **Paso 2: Operatoria del Empleado (Agenda, Venta Mostrador y Caja)**
1. Iniciar sesión con `empleado@paddle.com` / `123456`.
2. El sistema abre la **Agenda de Turnos**:
   * Observar cómo el turno que recién reservó Carlos Cliente ya aparece dibujado en la grilla horaria de la Cancha 1.
3. Hacer clic sobre el turno en la grilla:
   * Se abre el modal interactivo.
   * Hacer clic en **"Sumar Cancha al Ticket"**.
4. En el panel derecho de **Venta Rápida**:
   * Hacer clic en **"Agua"** o **"Pelotas"** para sumarlas a la cuenta del jugador.
5. Hacer clic en **"Cobrar e Imprimir Ticket"**:
   * *Detalle técnico para mencionar:* En una sola operación atómica se descuenta el stock de las bebidas en MySQL, se marca el turno como `PAGADO` y se ingresa el total recaudado a la Caja.
6. Ir a la pestaña **Caja**:
   * El empleado ve el ingreso recién cobrado reflejado en el **Historial de Jornada** y en el indicador de **Efectivo en Caja**.
7. Hacer clic en **"Finalizar Jornada y Cerrar Caja"**:
   * Se abre el modal de arqueo mostrando el balance consolidado y permitiendo confirmar el cierre.
8. Cerrar sesión.

### **Paso 3: Visión Estratégica del Administrador (Dashboard y Configuración)**
1. Iniciar sesión con `admin@paddle.com` / `123456`.
2. El sistema abre el **Panel de Resumen (Dashboard)**:
   * **Ingresos Totales:** Actualizados con las señas y cobros recién registrados.
   * **Ocupación:** Refleja el porcentaje de horas ocupadas de las canchas.
   * **Alertas de Stock:** Alerta si algún producto bajó de 5 unidades.
   * **Últimas Cajas:** Muestra la auditoría de quién cobró cada concepto con fecha y hora.
3. Navegar a **Stock**:
   * Comprobar que el producto vendido tiene 1 unidad menos en inventario. Probar el buscador en tiempo real o crear un nuevo producto.
4. Navegar a **Config. Precios**:
   * Actualizar el costo base de una cancha o alternar el interruptor para ponerla "En Mantenimiento".
5. Navegar a **Usuarios**:
   * Ver el listado de socios, dar de alta un nuevo cliente o bloquearlo por falta de pago.

---

## 3. Arquitectura Técnica y Buenas Prácticas Aplicadas

* **Frontend:**
  * **Vanilla JavaScript Modular:** Sin dependencias pesadas, estructurado en controladores aislados (`/js/controladores/`).
  * **Arquitectura SPA (Single Page Application):** Enrutador basado en Hash (`#/admin/dashboard`, `#/empleado/agenda`) con transiciones suaves (`fade-in`) y carga dinámica del DOM.
  * **Diseño:** Tailwind CSS moderno con soporte para paleta corporativa y tema oscuro/claro.
* **Backend:**
  * **PHP 8.x RESTful:** Endpoints modulares bajo `/api/` (`login.php`, `usuarios.php`, `canchas.php`, `stock.php`, `caja.php`, `turnos.php`, `dashboard.php`).
  * **Seguridad y Acceso a Datos:** Sentencias preparadas con **PDO** para prevenir inyecciones SQL (Prepared Statements).
  * **Algoritmo de Prevención de Colisiones:** Validación matemática en `api/turnos.php` para asegurar que ninguna cancha pueda reservarse dos veces en horarios solapados (`:hora_inicio < hora_fin AND :hora_fin > hora_inicio`).
* **Base de Datos:**
  * Motor relacional **MySQL / MariaDB** con claves foráneas e integridad referencial (`indoor_paddle`).
