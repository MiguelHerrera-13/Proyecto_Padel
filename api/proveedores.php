<?php
// api/proveedores.php

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
            $stmt = $pdo->query("SELECT id, empresa, rubro, telefono, email, estado_pago, saldo_pendiente, ultimo_pedido, fecha_ultimo_pedido, fecha_creacion FROM proveedores ORDER BY id DESC");
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
            $email = !empty($datos_entrada['email']) ? trim($datos_entrada['email']) : null;
            $saldo = isset($datos_entrada['saldo_pendiente']) ? max(0, floatval($datos_entrada['saldo_pendiente'])) : 0.00;
            $estado_pago = ($saldo > 0) ? 'PAGO_PENDIENTE' : (!empty($datos_entrada['estado_pago']) ? $datos_entrada['estado_pago'] : 'AL_DIA');
            $ultimo_pedido = !empty($datos_entrada['ultimo_pedido']) ? trim($datos_entrada['ultimo_pedido']) : null;
            $fecha_pedido = $ultimo_pedido ? date('Y-m-d H:i:s') : null;

            try {
                $stmt = $pdo->prepare("INSERT INTO proveedores (empresa, rubro, telefono, email, estado_pago, saldo_pendiente, ultimo_pedido, fecha_ultimo_pedido) 
                                       VALUES (:empresa, :rubro, :telefono, :email, :estado_pago, :saldo_pendiente, :ultimo_pedido, :fecha_ultimo_pedido)");
                $stmt->execute([
                    'empresa' => $empresa,
                    'rubro' => $rubro,
                    'telefono' => $telefono,
                    'email' => $email,
                    'estado_pago' => $estado_pago,
                    'saldo_pendiente' => $saldo,
                    'ultimo_pedido' => $ultimo_pedido,
                    'fecha_ultimo_pedido' => $fecha_pedido
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

    case 'PUT':
        if (!empty($datos_entrada['id'])) {
            $id = intval($datos_entrada['id']);
            $stmtCheck = $pdo->prepare("SELECT * FROM proveedores WHERE id = :id");
            $stmtCheck->execute(['id' => $id]);
            $provActual = $stmtCheck->fetch();

            if (!$provActual) {
                http_response_code(404);
                echo json_encode(["error" => "Proveedor no encontrado."]);
                break;
            }

            $accion = $datos_entrada['accion'] ?? 'editar';
            $usuario_id = !empty($datos_entrada['usuario_id']) ? intval($datos_entrada['usuario_id']) : 1;

            try {
                if ($accion === 'pedido') {
                    // Registrar un nuevo pedido al proveedor
                    $detalle = trim($datos_entrada['detalle_pedido'] ?? 'Pedido de reposición');
                    $monto = max(0, floatval($datos_entrada['monto_pedido'] ?? 0));
                    $pagarAhora = !empty($datos_entrada['pagado_en_acto']);

                    $saldoActual = floatval($provActual['saldo_pendiente'] ?? 0);
                    $nuevoSaldo = $pagarAhora ? $saldoActual : ($saldoActual + $monto);
                    $nuevoEstado = ($nuevoSaldo > 0) ? 'PAGO_PENDIENTE' : 'AL_DIA';

                    $stmtUpd = $pdo->prepare("UPDATE proveedores SET ultimo_pedido = :pedido, fecha_ultimo_pedido = NOW(), saldo_pendiente = :saldo, estado_pago = :estado WHERE id = :id");
                    $stmtUpd->execute([
                        'pedido' => $detalle,
                        'saldo' => $nuevoSaldo,
                        'estado' => $nuevoEstado,
                        'id' => $id
                    ]);

                    // Si se abona en el acto, registrar el EGRESO en Caja
                    if ($pagarAhora && $monto > 0) {
                        $stmtCaja = $pdo->prepare("INSERT INTO caja_movimientos (usuario_id, tipo, concepto, monto) VALUES (:usuario_id, 'EGRESO', :concepto, :monto)");
                        $stmtCaja->execute([
                            'usuario_id' => $usuario_id,
                            'concepto' => "Pago pedido proveedor {$provActual['empresa']}: $detalle",
                            'monto' => $monto
                        ]);
                    }

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Pedido registrado correctamente.", "nuevo_saldo" => $nuevoSaldo]);

                } elseif ($accion === 'pagar') {
                    // Registrar pago de deuda a proveedor
                    $montoPago = max(0, floatval($datos_entrada['monto_pago'] ?? 0));
                    $saldoActual = floatval($provActual['saldo_pendiente'] ?? 0);
                    $nuevoSaldo = max(0, $saldoActual - $montoPago);
                    $nuevoEstado = ($nuevoSaldo > 0) ? 'PAGO_PENDIENTE' : 'AL_DIA';
                    $notaPago = !empty($datos_entrada['concepto']) ? trim($datos_entrada['concepto']) : "Cancelación de saldo";

                    $stmtUpd = $pdo->prepare("UPDATE proveedores SET saldo_pendiente = :saldo, estado_pago = :estado WHERE id = :id");
                    $stmtUpd->execute([
                        'saldo' => $nuevoSaldo,
                        'estado' => $nuevoEstado,
                        'id' => $id
                    ]);

                    if ($montoPago > 0) {
                        $stmtCaja = $pdo->prepare("INSERT INTO caja_movimientos (usuario_id, tipo, concepto, monto) VALUES (:usuario_id, 'EGRESO', :concepto, :monto)");
                        $stmtCaja->execute([
                            'usuario_id' => $usuario_id,
                            'concepto' => "Pago a proveedor {$provActual['empresa']} ($notaPago)",
                            'monto' => $montoPago
                        ]);
                    }

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Pago a proveedor registrado en Caja.", "nuevo_saldo" => $nuevoSaldo]);

                } else {
                    // Edición general del proveedor
                    $empresa = isset($datos_entrada['empresa']) ? trim($datos_entrada['empresa']) : $provActual['empresa'];
                    $rubro = isset($datos_entrada['rubro']) ? trim($datos_entrada['rubro']) : $provActual['rubro'];
                    $telefono = isset($datos_entrada['telefono']) ? trim($datos_entrada['telefono']) : $provActual['telefono'];
                    $email = isset($datos_entrada['email']) ? trim($datos_entrada['email']) : $provActual['email'];
                    $saldo = isset($datos_entrada['saldo_pendiente']) ? max(0, floatval($datos_entrada['saldo_pendiente'])) : floatval($provActual['saldo_pendiente']);
                    $estado_pago = ($saldo > 0) ? 'PAGO_PENDIENTE' : ($datos_entrada['estado_pago'] ?? 'AL_DIA');
                    if (isset($datos_entrada['estado_pago']) && $datos_entrada['estado_pago'] === 'AL_DIA' && !isset($datos_entrada['saldo_pendiente'])) {
                        $saldo = 0;
                    }

                    $stmtUpd = $pdo->prepare("UPDATE proveedores SET empresa = :empresa, rubro = :rubro, telefono = :telefono, email = :email, saldo_pendiente = :saldo, estado_pago = :estado WHERE id = :id");
                    $stmtUpd->execute([
                        'empresa' => $empresa,
                        'rubro' => $rubro,
                        'telefono' => $telefono,
                        'email' => $email,
                        'saldo' => $saldo,
                        'estado' => $estado_pago,
                        'id' => $id
                    ]);

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Proveedor actualizado correctamente."]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["error" => "Error al actualizar proveedor.", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "El campo 'id' es obligatorio."]);
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
