-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS indoor_paddle;
USE indoor_paddle;

-- Estructura de la tabla `usuarios`
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    rol ENUM('ADMIN', 'EMPLEADO', 'CLIENTE') DEFAULT 'CLIENTE',
    estado ENUM('ACTIVO', 'CON_DEUDA', 'BLOQUEADO') DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura de la tabla `productos` (Stock)
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    precio_venta DECIMAL(10, 2) NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar un usuario Administrador por defecto para poder probar el login
INSERT INTO usuarios (nombre, correo, contrasena, telefono, rol, estado) 
VALUES ('Administrador', 'admin@paddle.com', '123456', '2610000000', 'ADMIN', 'ACTIVO');

-- Insertar productos por defecto para la demo de stock
INSERT IGNORE INTO productos (codigo, nombre, categoria, stock_actual, precio_venta) VALUES 
('BEB-001', 'Agua Mineral 500ml', 'Bebidas', 24, 1500.00),
('BEB-002', 'Gatorade Manzana', 'Bebidas', 12, 2200.00),
('SNA-001', 'Barrita Cereal', 'Snacks', 4, 1200.00),
('EQU-001', 'Tubo Pelotas x3', 'Equipamiento', 2, 9500.00),
('ALQ-001', 'Alquiler Paleta', 'Alquileres', 10, 4000.00);

-- Estructura de la tabla `canchas`
CREATE TABLE IF NOT EXISTS canchas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    costo_base DECIMAL(10, 2) NOT NULL,
    activa BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar canchas por defecto
INSERT IGNORE INTO canchas (nombre, tipo, costo_base, activa) VALUES 
('Cancha 1', 'Techada / Blindex', 8500.00, 1),
('Cancha 2', 'Descubierta / Muro', 7000.00, 1),
('Cancha 3', 'Premium / Panorámica', 10000.00, 0);

-- Estructura de la tabla `caja_movimientos`
CREATE TABLE IF NOT EXISTS caja_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo ENUM('INGRESO', 'EGRESO') NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura de la tabla `turnos` (Para KPIs de ocupación)
CREATE TABLE IF NOT EXISTS turnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cancha_id INT NOT NULL,
    cliente_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado ENUM('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO') DEFAULT 'PENDIENTE',
    FOREIGN KEY (cancha_id) REFERENCES canchas(id),
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;