<?php
// api/turnos.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
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
            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $sql = "SELECT t.*, c.nombre as cancha_nombre, c.tipo as cancha_tipo, c.costo_base as cancha_costo_base
                        FROM turnos t
                        LEFT JOIN canchas c ON t.cancha_id = c.id
                        WHERE t.id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['id' => $id]);
                $turno = $stmt->fetch();

                if ($turno) {
                    http_response_code(200);
                    echo json_encode($turno);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Turno no encontrado."]);
                }
            } else {
                $condiciones = [];
                $parametros = [];

                if (!empty($_GET['fecha'])) {
                    $condiciones[] = "t.fecha = :fecha";
                    $parametros['fecha'] = $_GET['fecha'];
                }

                if (!empty($_GET['cliente_id'])) {
                    $condiciones[] = "t.cliente_id = :cliente_id";
                    $parametros['cliente_id'] = intval($_GET['cliente_id']);
                }

                if (!empty($_GET['cancha_id'])) {
                    $condiciones[] = "t.cancha_id = :cancha_id";
                    $parametros['cancha_id'] = intval($_GET['cancha_id']);
                }

                $whereSQL = count($condiciones) > 0 ? "WHERE " . implode(" AND ", $condiciones) : "";
                $sql = "SELECT t.*, c.nombre as cancha_nombre, c.tipo as cancha_tipo, c.costo_base as cancha_costo_base
                        FROM turnos t
                        LEFT JOIN canchas c ON t.cancha_id = c.id
                        $whereSQL
                        ORDER BY t.fecha DESC, t.hora_inicio ASC";

                $stmt = $pdo->prepare($sql);
                $stmt->execute($parametros);
                $turnos = $stmt->fetchAll();

                http_response_code(200);
                echo json_encode($turnos);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error al obtener turnos.", "detalle" => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Registrar nuevo turno / reserva
        if (!empty($datos_entrada['cancha_id']) && !empty($datos_entrada['fecha']) && !empty($datos_entrada['hora_inicio']) && !empty($datos_entrada['cliente_nombre'])) {
            $cancha_id = intval($datos_entrada['cancha_id']);
            $fecha = $datos_entrada['fecha'];
            $hora_inicio = $datos_entrada['hora_inicio'];
            $duracion = isset($datos_entrada['duracion']) ? intval($datos_entrada['duracion']) : 60;
            $cliente_nombre = trim($datos_entrada['cliente_nombre']);
            $cliente_id = !empty($datos_entrada['cliente_id']) ? intval($datos_entrada['cliente_id']) : null;
            $estado = !empty($datos_entrada['estado']) ? $datos_entrada['estado'] : 'CONFIRMADO';
            $estado_pago = !empty($datos_entrada['estado_pago']) ? $datos_entrada['estado_pago'] : 'NO_PAGO';
            $monto_total = isset($datos_entrada['monto_total']) ? floatval($datos_entrada['monto_total']) : 0.00;

            // Formatear hora_inicio a HH:MM:SS
            if (strlen($hora_inicio) === 5) $hora_inicio .= ":00";

            // Calcular hora_fin sumando los minutos de duración
            $inicioTimestamp = strtotime("$fecha $hora_inicio");
            $finTimestamp = $inicioTimestamp + ($duracion * 60);
            $hora_fin = date("H:i:s", $finTimestamp);

            try {
                // 1. Validar solapamiento de horario en la misma cancha
                $sqlConflicto = "SELECT id, cliente_nombre, hora_inicio, hora_fin 
                                 FROM turnos 
                                 WHERE cancha_id = :cancha_id 
                                   AND fecha = :fecha 
                                   AND estado != 'CANCELADO'
                                   AND :hora_inicio < hora_fin 
                                   AND :hora_fin > hora_inicio 
                                 LIMIT 1";

                $stmtConflicto = $pdo->prepare($sqlConflicto);
                $stmtConflicto->execute([
                    'cancha_id' => $cancha_id,
                    'fecha' => $fecha,
                    'hora_inicio' => $hora_inicio,
                    'hora_fin' => $hora_fin
                ]);

                if ($stmtConflicto->fetch()) {
                    http_response_code(409); // Conflict
                    echo json_encode(["error" => "Horario no disponible. Ya existe una reserva en esa cancha entre $hora_inicio y $hora_fin."]);
                    exit;
                }

                // 2. Insertar el turno
                $sqlInsert = "INSERT INTO turnos (cancha_id, cliente_id, cliente_nombre, fecha, hora_inicio, duracion, hora_fin, estado, estado_pago, monto_total) 
                              VALUES (:cancha_id, :cliente_id, :cliente_nombre, :fecha, :hora_inicio, :duracion, :hora_fin, :estado, :estado_pago, :monto_total)";
                
                $stmtInsert = $pdo->prepare($sqlInsert);
                $stmtInsert->execute([
                    'cancha_id' => $cancha_id,
                    'cliente_id' => $cliente_id,
                    'cliente_nombre' => $cliente_nombre,
                    'fecha' => $fecha,
                    'hora_inicio' => $hora_inicio,
                    'duracion' => $duracion,
                    'hora_fin' => $hora_fin,
                    'estado' => $estado,
                    'estado_pago' => $estado_pago,
                    'monto_total' => $monto_total
                ]);

                $nuevoId = $pdo->lastInsertId();

                http_response_code(201);
                echo json_encode([
                    "mensaje" => "Turno reservado exitosamente.",
                    "id" => $nuevoId,
                    "hora_fin" => $hora_fin
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error al guardar el turno.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos obligatorios: cancha_id, fecha, hora_inicio o cliente_nombre."]);
        }
        break;

    case 'PUT':
        // Actualizar turno existente (estado, estado_pago, monto, etc.)
        if (!empty($datos_entrada['id'])) {
            $id = intval($datos_entrada['id']);

            $stmt_check = $pdo->prepare("SELECT id FROM turnos WHERE id = :id");
            $stmt_check->execute(['id' => $id]);
            if (!$stmt_check->fetch()) {
                http_response_code(404);
                echo json_encode(["error" => "Turno no encontrado."]);
                break;
            }

            $campos = [];
            $parametros = ['id' => $id];

            if (isset($datos_entrada['estado'])) {
                $campos[] = "estado = :estado";
                $parametros['estado'] = $datos_entrada['estado'];
            }
            if (isset($datos_entrada['estado_pago'])) {
                $campos[] = "estado_pago = :estado_pago";
                $parametros['estado_pago'] = $datos_entrada['estado_pago'];
            }
            if (isset($datos_entrada['monto_total'])) {
                $campos[] = "monto_total = :monto_total";
                $parametros['monto_total'] = floatval($datos_entrada['monto_total']);
            }
            if (isset($datos_entrada['cliente_nombre'])) {
                $campos[] = "cliente_nombre = :cliente_nombre";
                $parametros['cliente_nombre'] = $datos_entrada['cliente_nombre'];
            }
            if (isset($datos_entrada['duracion'])) {
                $campos[] = "duracion = :duracion";
                $parametros['duracion'] = intval($datos_entrada['duracion']);
            }

            if (count($campos) > 0) {
                try {
                    $sql = "UPDATE turnos SET " . implode(", ", $campos) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($parametros);

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Turno actualizado correctamente."]);
                } catch (PDOException $e) {
                    http_response_code(400);
                    echo json_encode(["error" => "Error al actualizar turno.", "detalle" => $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["error" => "No se enviaron campos para actualizar."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "El campo 'id' es obligatorio."]);
        }
        break;

    case 'DELETE':
        // Cancelar o eliminar turno
        $id = null;
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
        } elseif (isset($datos_entrada['id'])) {
            $id = intval($datos_entrada['id']);
        }

        if ($id) {
            try {
                $sql = "DELETE FROM turnos WHERE id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['id' => $id]);

                if ($stmt->rowCount() > 0) {
                    http_response_code(200);
                    echo json_encode(["mensaje" => "Turno cancelado y eliminado correctamente."]);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Turno no encontrado."]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error al eliminar turno.", "detalle" => $e->getMessage()]);
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
