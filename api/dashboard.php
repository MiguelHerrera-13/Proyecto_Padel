<?php
// api/dashboard.php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        try {
            $dashboardData = [
                'ingresosTotales' => 0,
                'ocupacionPromedio' => 0,
                'nuevosClientes' => 0,
                'alertasStock' => 0,
                'ultimasCajas' => []
            ];

            // 1. Ingresos Totales (Suma de montos tipo INGRESO)
            $sqlIngresos = "SELECT SUM(monto) as total FROM caja_movimientos WHERE tipo = 'INGRESO'";
            $stmt = $pdo->query($sqlIngresos);
            $res = $stmt->fetch();
            if ($res && $res['total']) {
                $dashboardData['ingresosTotales'] = floatval($res['total']);
            }

            // 2. Ocupación Promedio (Simulación basada en turnos o harcodeada temporalmente para la demo)
            $sqlTurnos = "SELECT count(*) as total_turnos FROM turnos WHERE estado IN ('CONFIRMADO', 'COMPLETADO')";
            $stmt = $pdo->query($sqlTurnos);
            $resTurnos = $stmt->fetch();
            $cant_turnos = $resTurnos ? intval($resTurnos['total_turnos']) : 0;
            $dashboardData['ocupacionPromedio'] = min(100, 30 + ($cant_turnos * 5)); 

            // 3. Nuevos Clientes (Rol CLIENTE)
            $sqlClientes = "SELECT count(*) as total_clientes FROM usuarios WHERE rol = 'CLIENTE'";
            $stmt = $pdo->query($sqlClientes);
            $resClientes = $stmt->fetch();
            if ($resClientes) {
                $dashboardData['nuevosClientes'] = intval($resClientes['total_clientes']);
            }

            // 4. Alertas Stock (productos con stock <= 5)
            $sqlStock = "SELECT count(*) as bajo_stock FROM productos WHERE stock_actual <= 5";
            $stmt = $pdo->query($sqlStock);
            $resStock = $stmt->fetch();
            if ($resStock) {
                $dashboardData['alertasStock'] = intval($resStock['bajo_stock']);
            }

            // 5. Últimas cajas cerradas (Últimos 5 ingresos/egresos a modo ilustrativo)
            $sqlUltimas = "SELECT m.fecha_hora, u.nombre as empleado_nombre, m.concepto, m.monto, m.tipo
                           FROM caja_movimientos m
                           LEFT JOIN usuarios u ON m.usuario_id = u.id
                           ORDER BY m.fecha_hora DESC LIMIT 5";
            $stmt = $pdo->query($sqlUltimas);
            $dashboardData['ultimasCajas'] = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode($dashboardData);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Error al obtener métricas del dashboard.", "detalle" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método no permitido."]);
        break;
}
