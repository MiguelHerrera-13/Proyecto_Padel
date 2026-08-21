<?php
// api/canchas.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
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
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $sql = "SELECT id, nombre, tipo, costo_base, activa FROM canchas WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $id]);
            $cancha = $stmt->fetch();

            if ($cancha) {
                http_response_code(200);
                echo json_encode($cancha);
            } else {
                http_response_code(404);
                echo json_encode(["mensaje" => "Cancha no encontrada."]);
            }
        } else {
            $sql = "SELECT id, nombre, tipo, costo_base, activa FROM canchas ORDER BY id ASC";
            $stmt = $pdo->query($sql);
            $canchas = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode($canchas);
        }
        break;

    case 'PUT':
        if (!empty($datos_entrada['id'])) {
            $id = intval($datos_entrada['id']);
            
            $stmt_check = $pdo->prepare("SELECT id FROM canchas WHERE id = :id");
            $stmt_check->execute(['id' => $id]);
            if (!$stmt_check->fetch()) {
                http_response_code(404);
                echo json_encode(["error" => "Cancha no encontrada."]);
                break;
            }

            $campos = [];
            $parametros = ['id' => $id];

            if (isset($datos_entrada['nombre'])) {
                $campos[] = "nombre = :nombre";
                $parametros['nombre'] = $datos_entrada['nombre'];
            }
            if (isset($datos_entrada['tipo'])) {
                $campos[] = "tipo = :tipo";
                $parametros['tipo'] = $datos_entrada['tipo'];
            }
            if (isset($datos_entrada['costo_base'])) {
                $campos[] = "costo_base = :costo_base";
                $parametros['costo_base'] = floatval($datos_entrada['costo_base']);
            }
            if (isset($datos_entrada['activa'])) {
                $campos[] = "activa = :activa";
                $parametros['activa'] = intval($datos_entrada['activa']);
            }

            if (count($campos) > 0) {
                try {
                    $sql = "UPDATE canchas SET " . implode(", ", $campos) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($parametros);

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Cancha actualizada correctamente."]);
                } catch (PDOException $e) {
                    http_response_code(400);
                    echo json_encode(["error" => "Error al actualizar la cancha.", "detalle" => $e->getMessage()]);
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

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método no permitido."]);
        break;
}
