<?php
// api/proveedores.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$datos_entrada = json_decode(file_get_contents("php://input"), true);

switch ($metodo) {
    case 'GET':
        try {
            $stmt = $pdo->query("SELECT id, empresa, rubro, telefono, fecha_creacion FROM proveedores ORDER BY id DESC");
            $proveedores = $stmt->fetchAll();
            http_response_code(200);
            echo json_encode($proveedores);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error al obtener proveedores.", "detalle" => $e->getMessage()]);
        }
        break;

    case 'POST':
        if (!empty($datos_entrada['empresa']) && !empty($datos_entrada['rubro'])) {
            $empresa = trim($datos_entrada['empresa']);
            $rubro = trim($datos_entrada['rubro']);
            $telefono = !empty($datos_entrada['telefono']) ? trim($datos_entrada['telefono']) : null;

            try {
                $stmt = $pdo->prepare("INSERT INTO proveedores (empresa, rubro, telefono) VALUES (:empresa, :rubro, :telefono)");
                $stmt->execute([
                    'empresa' => $empresa,
                    'rubro' => $rubro,
                    'telefono' => $telefono
                ]);

                http_response_code(201);
                echo json_encode(["mensaje" => "Proveedor registrado exitosamente.", "id" => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error al registrar proveedor.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Los campos 'empresa' y 'rubro' son obligatorios."]);
        }
        break;

    case 'DELETE':
        $id = null;
        if (isset($_GET['id'])) $id = intval($_GET['id']);
        elseif (isset($datos_entrada['id'])) $id = intval($datos_entrada['id']);

        if ($id) {
            try {
                $stmt = $pdo->prepare("DELETE FROM proveedores WHERE id = :id");
                $stmt->execute(['id' => $id]);

                if ($stmt->rowCount() > 0) {
                    http_response_code(200);
                    echo json_encode(["mensaje" => "Proveedor eliminado correctamente."]);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Proveedor no encontrado."]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error al eliminar proveedor.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "El campo 'id' es obligatorio para eliminar."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método no permitido."]);
        break;
}
