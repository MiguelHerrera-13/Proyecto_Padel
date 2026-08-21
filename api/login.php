<?php
// api/login.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$datos_entrada = json_decode(file_get_contents("php://input"), true);

if ($metodo === 'POST') {
    if (!empty($datos_entrada['correo']) && !empty($datos_entrada['contrasena'])) {
        $correo = trim($datos_entrada['correo']);
        $contrasena = $datos_entrada['contrasena'];

        try {
            // Buscamos al usuario por correo
            $sql = "SELECT id, nombre, correo, contrasena, rol, estado FROM usuarios WHERE correo = :correo LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['correo' => $correo]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($usuario) {
                // Verificar estado del usuario
                if ($usuario['estado'] === 'BLOQUEADO') {
                    http_response_code(403);
                    echo json_encode(["error" => "Cuenta bloqueada. Contacte al administrador."]);
                    exit;
                }

                // Verificación de contraseña. 
                // NOTA: Para el administrador por defecto usamos contraseñas planas temporalmente,
                // pero si el sistema empieza a crear usuarios con password_hash, usaremos password_verify.
                $loginValido = false;
                
                // Si la contraseña guardada empieza con $2y$ es un hash de BCRYPT
                if (str_starts_with($usuario['contrasena'], '$2y$')) {
                    $loginValido = password_verify($contrasena, $usuario['contrasena']);
                } else {
                    // Verificación plana (solo para usuarios legacy/creados desde DBeaver manual)
                    $loginValido = ($contrasena === $usuario['contrasena']);
                }

                if ($loginValido) {
                    // Login exitoso
                    unset($usuario['contrasena']); // No devolvemos el password al frontend
                    
                    // Construir un token Base64 válido compatible con almacenamiento.js (JSON.parse(atob(token)))
                    $tokenBase64 = base64_encode(json_encode([
                        "id" => $usuario['id'],
                        "correo" => $usuario['correo'],
                        "nombre" => $usuario['nombre'],
                        "rol" => $usuario['rol']
                    ]));

                    http_response_code(200);
                    echo json_encode([
                        "mensaje" => "Login exitoso",
                        "usuario" => $usuario,
                        "token" => $tokenBase64
                    ]);
                } else {
                    // Contraseña incorrecta
                    http_response_code(401);
                    echo json_encode(["error" => "Credenciales incorrectas."]);
                }
            } else {
                // Usuario no encontrado
                http_response_code(401);
                echo json_encode(["error" => "Credenciales incorrectas."]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error de base de datos.", "detalle" => $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Correo y contraseña son obligatorios."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido."]);
}
