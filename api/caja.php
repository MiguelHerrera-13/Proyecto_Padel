<?php
// api/caja.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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
        // Listar todos los movimientos de caja, ordenados descendentemente por fecha
        $sql = "SELECT m.id, m.usuario_id, u.nombre as usuario_nombre, m.tipo, m.concepto, m.monto, m.fecha_hora 
                FROM caja_movimientos m 
                LEFT JOIN usuarios u ON m.usuario_id = u.id 
                ORDER BY m.fecha_hora DESC";
        $stmt = $pdo->query($sql);
        $movimientos = $stmt->fetchAll();

        http_response_code(200);
        echo json_encode($movimientos);
        break;

    case 'POST':
        // Registrar un nuevo ingreso o egreso (venta de productos, cobro de turno, etc)
        if (!empty($datos_entrada['usuario_id']) && !empty($datos_entrada['tipo']) && !empty($datos_entrada['concepto']) && isset($datos_entrada['monto'])) {
            $usuario_id = intval($datos_entrada['usuario_id']);
            $tipo = $datos_entrada['tipo'];
            $concepto = $datos_entrada['concepto'];
            $monto = floatval($datos_entrada['monto']);

            try {
                $sql = "INSERT INTO caja_movimientos (usuario_id, tipo, concepto, monto) VALUES (:usuario_id, :tipo, :concepto, :monto)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    'usuario_id' => $usuario_id,
                    'tipo' => $tipo,
                    'concepto' => $concepto,
                    'monto' => $monto
                ]);

                http_response_code(201);
                echo json_encode(["mensaje" => "Movimiento de caja registrado exitosamente.", "id" => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(["error" => "Error al registrar movimiento.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos obligatorios: usuario_id, tipo, concepto o monto."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método no permitido."]);
        break;
}
