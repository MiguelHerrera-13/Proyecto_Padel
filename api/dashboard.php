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
                'ingresosBrutos' => 0,
                'egresosTotales' => 0,
                'ocupacionPromedio' => 0,
                'turnosActivos' => 0,
                'canchasActivas' => 0,
                'nuevosClientes' => 0,
                'alertasStock' => 0,
                'ingresosPorCancha' => [
                    '1' => 0,
                    '2' => 0,
                    '3' => 0
                ],
                'horariosDemandados' => [
                    '08:00' => 0,
                    '12:00' => 0,
                    '18:00' => 0,
                    '21:00' => 0
                ],
                'ultimasCajas' => []
            ];

            // 1. Ingresos y Egresos en vivo (sube con ingresos, baja con egresos y retiros)
            $sqlIngresos = "SELECT COALESCE(SUM(monto), 0) as total FROM caja_movimientos WHERE tipo IN ('INGRESO', 'INGRESO_MP')";
            $ingresosBrutos = floatval($pdo->query($sqlIngresos)->fetch()['total'] ?? 0);

            $sqlEgresos = "SELECT COALESCE(SUM(monto), 0) as total FROM caja_movimientos WHERE tipo IN ('EGRESO', 'RETIRO', 'RETIRO_MP', 'RETIRO_DIGITAL')";
            $egresosTotales = floatval($pdo->query($sqlEgresos)->fetch()['total'] ?? 0);

            $dashboardData['ingresosBrutos'] = $ingresosBrutos;
            $dashboardData['egresosTotales'] = $egresosTotales;
            $dashboardData['ingresosTotales'] = max(0, $ingresosBrutos - $egresosTotales);

            // Ocupación Promedio Real basada en canchas activas y turnos confirmados
            $sqlCanchasActivas = "SELECT COUNT(*) as activas FROM canchas WHERE activa = 1";
            $canchasActivas = max(1, intval($pdo->query($sqlCanchasActivas)->fetch()['activas'] ?? 2));
            $dashboardData['canchasActivas'] = $canchasActivas;

            $sqlTurnos = "SELECT COUNT(*) as total_turnos, COALESCE(SUM(duracion), 0) as total_minutos 
                          FROM turnos 
                          WHERE estado = 'CONFIRMADO'";
            $resTurnos = $pdo->query($sqlTurnos)->fetch();
            $cantTurnos = intval($resTurnos['total_turnos'] ?? 0);
            $totalMinutos = intval($resTurnos['total_minutos'] ?? 0);
            $dashboardData['turnosActivos'] = $cantTurnos;

            // Capacidad de referencia por cancha activa (ej. 6 turnos promedio / 540 min operativos)
            $capacidadMinutos = $canchasActivas * 540;
            $ocupacionCalculada = $capacidadMinutos > 0 ? round(($totalMinutos / $capacidadMinutos) * 100) : 0;
            $dashboardData['ocupacionPromedio'] = min(100, max(0, $ocupacionCalculada));

            //  Clientes Activos (sube al registrar/activar, baja al bloquear/eliminar)
            $sqlClientes = "SELECT COUNT(*) as total_clientes FROM usuarios WHERE rol = 'CLIENTE' AND estado = 'ACTIVO'";
            $resClientes = $pdo->query($sqlClientes)->fetch();
            $dashboardData['nuevosClientes'] = intval($resClientes['total_clientes'] ?? 0);

            //  Alertas Stock (productos con stock <= 5: sube al vender y quedar con poco stock, baja al reabastecer)
            $sqlStock = "SELECT COUNT(*) as bajo_stock FROM productos WHERE stock_actual <= 5";
            $resStock = $pdo->query($sqlStock)->fetch();
            $dashboardData['alertasStock'] = intval($resStock['bajo_stock'] ?? 0);

            //  Ingresos estimados/reales por Cancha según turnos activos/completados
            $sqlPorCancha = "SELECT t.cancha_id, COALESCE(SUM(
                                CASE 
                                    WHEN t.monto_total > 0 THEN t.monto_total 
                                    ELSE (t.duracion / 60.0) * COALESCE(c.costo_base, 8500)
                                END
                             ), 0) as total_cancha
                             FROM turnos t
                             LEFT JOIN canchas c ON t.cancha_id = c.id
                             WHERE t.estado IN ('CONFIRMADO', 'COMPLETADO', 'FINALIZADO')
                             GROUP BY t.cancha_id";
            $stmtCanchas = $pdo->query($sqlPorCancha);
            while ($rowC = $stmtCanchas->fetch()) {
                $cid = strval($rowC['cancha_id']);
                $dashboardData['ingresosPorCancha'][$cid] = floatval($rowC['total_cancha']);
            }

            //  Horarios más demandados según reservas reales
            $sqlHorarios = "SELECT hora_inicio FROM turnos WHERE estado != 'CANCELADO'";
            $stmtHorarios = $pdo->query($sqlHorarios);
            while ($rowH = $stmtHorarios->fetch()) {
                $h = intval(substr($rowH['hora_inicio'], 0, 2));
                if ($h < 12) {
                    $dashboardData['horariosDemandados']['08:00']++;
                } elseif ($h < 16) {
                    $dashboardData['horariosDemandados']['12:00']++;
                } elseif ($h < 20) {
                    $dashboardData['horariosDemandados']['18:00']++;
                } else {
                    $dashboardData['horariosDemandados']['21:00']++;
                }
            }

            // Últimas cajas cerradas / movimientos (Últimos 6)
            $sqlUltimas = "SELECT m.id, m.fecha_hora, u.nombre as empleado_nombre, m.concepto, m.monto, m.tipo
                           FROM caja_movimientos m
                           LEFT JOIN usuarios u ON m.usuario_id = u.id
                           ORDER BY m.fecha_hora DESC LIMIT 6";
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
