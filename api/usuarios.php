<?php
// api/usuarios.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Manejo de la solicitud pre-flight (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$datos_entrada = json_decode(file_get_contents("php://input"), true);

switch ($metodo) {
    case 'GET':
        if (isset($_GET['id'])) {
            // Traer un solo usuario
            $id = intval($_GET['id']);
            $sql = "SELECT id, nombre, correo, telefono, rol, estado, fecha_creacion FROM usuarios WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $id]);
            $usuario = $stmt->fetch();

            if ($usuario) {
                http_response_code(200);
                echo json_encode($usuario);
            } else {
                http_response_code(404);
                echo json_encode(["mensaje" => "Usuario no encontrado."]);
            }
        } else {
            // Listar todos los usuarios
            $sql = "SELECT id, nombre, correo, telefono, rol, estado, fecha_creacion FROM usuarios ORDER BY id DESC";
            $stmt = $pdo->query($sql);
            $usuarios = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode($usuarios);
        }
        break;

    case 'POST':
        // Crear un nuevo usuario
        if (!empty($datos_entrada['nombre']) && !empty($datos_entrada['correo']) && !empty($datos_entrada['contrasena'])) {
            $nombre = $datos_entrada['nombre'];
            $correo = $datos_entrada['correo'];
            $contrasena_hash = password_hash($datos_entrada['contrasena'], PASSWORD_DEFAULT);
            $telefono = $datos_entrada['telefono'] ?? null;
            $rol = $datos_entrada['rol'] ?? 'CLIENTE';
            $estado = $datos_entrada['estado'] ?? 'ACTIVO';

            try {
                $sql = "INSERT INTO usuarios (nombre, correo, contrasena, telefono, rol, estado) VALUES (:nombre, :correo, :contrasena, :telefono, :rol, :estado)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    'nombre' => $nombre,
                    'correo' => $correo,
                    'contrasena' => $contrasena_hash,
                    'telefono' => $telefono,
                    'rol' => $rol,
                    'estado' => $estado
                ]);

                http_response_code(201); // 201 Created
                echo json_encode(["mensaje" => "Usuario creado exitosamente.", "id" => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                // Posible error de correo duplicado (UNIQUE)
                http_response_code(400);
                echo json_encode(["error" => "Error al crear el usuario. Es posible que el correo ya esté registrado.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400); // 400
            echo json_encode(["error" => "Los campos 'nombre', 'correo' y 'contrasena' son obligatorios."]);
        }
        break;

    case 'PUT':
        // Actualizar un usuario existente
        if (!empty($datos_entrada['id'])) {
            $id = intval($datos_entrada['id']);
            
            // Primero verificamos que el usuario exista
            $stmt_check = $pdo->prepare("SELECT id FROM usuarios WHERE id = :id");
            $stmt_check->execute(['id' => $id]);
            if (!$stmt_check->fetch()) {
                http_response_code(404);
                echo json_encode(["error" => "Usuario no encontrado."]);
                break;
            }

            // Construir la consulta de forma dinámica según los datos enviados
            $campos = [];
            $parametros = ['id' => $id];

            if (isset($datos_entrada['nombre'])) {
                $campos[] = "nombre = :nombre";
                $parametros['nombre'] = $datos_entrada['nombre'];
            }
            if (isset($datos_entrada['correo'])) {
                $campos[] = "correo = :correo";
                $parametros['correo'] = $datos_entrada['correo'];
            }
            if (isset($datos_entrada['contrasena']) && !empty($datos_entrada['contrasena'])) {
                $campos[] = "contrasena = :contrasena";
                $parametros['contrasena'] = password_hash($datos_entrada['contrasena'], PASSWORD_DEFAULT);
            }
            if (isset($datos_entrada['telefono'])) {
                $campos[] = "telefono = :telefono";
                $parametros['telefono'] = $datos_entrada['telefono'];
            }
            if (isset($datos_entrada['rol'])) {
                $campos[] = "rol = :rol";
                $parametros['rol'] = $datos_entrada['rol'];
            }
            if (isset($datos_entrada['estado'])) {
                $campos[] = "estado = :estado";
                $parametros['estado'] = $datos_entrada['estado'];
            }

            if (count($campos) > 0) {
                try {
                    $sql = "UPDATE usuarios SET " . implode(", ", $campos) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($parametros);

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Usuario actualizado correctamente."]);
                } catch (PDOException $e) {
                    http_response_code(400);
                    echo json_encode(["error" => "Error al actualizar el usuario.", "detalle" => $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["error" => "No se enviaron campos para actualizar."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "El campo 'id' es obligatorio para la actualización."]);
        }
        break;

    case 'DELETE':
        // Eliminar un usuario (o dar de baja)
        // Para este caso eliminación física de la tabla (DELETE)
        
        $id_borrar = null;
        
        // El ID puede venir por URL o en el cuerpo JSON
        if (isset($_GET['id'])) {
            $id_borrar = intval($_GET['id']);
        } elseif (isset($datos_entrada['id'])) {
            $id_borrar = intval($datos_entrada['id']);
        }

        if ($id_borrar) {
            try {
                $sql = "DELETE FROM usuarios WHERE id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['id' => $id_borrar]);

                if ($stmt->rowCount() > 0) {
                    http_response_code(200);
                    echo json_encode(["mensaje" => "Usuario eliminado correctamente."]);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Usuario no encontrado."]);
                }
            } catch (PDOException $e) {
                // Si hay llaves foráneas conectadas (por ejemplo Movimientos de Caja del usuario)
                // el DELETE fallará. En ese caso se aconseja Baja Lógica.
                http_response_code(400);
                echo json_encode(["error" => "No se pudo eliminar el usuario porque tiene registros asociados. Intenta cambiar su estado a BLOQUEADO.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "El campo 'id' es obligatorio para eliminar."]);
        }
        break;

    default:
        http_response_code(405); // Método no permitido
        echo json_encode(["error" => "Método no permitido."]);
        break;
}
