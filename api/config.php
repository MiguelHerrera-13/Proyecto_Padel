<?php
// api/config.php
$host = '127.0.0.1';
$db   = 'indoor_paddle'; 
$user = 'root';          
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_TIMEOUT            => 2,
];

// Configuraciones de conexión:
// 1. Prioridad: Puerto 3306 (MySQL 8.0 / DBeaver) con clave 12345
// 2. Fallbacks automáticos si cambiara el entorno
$configs = [
    ['port' => 3306, 'user' => 'root', 'pass' => '12345'],
    ['port' => 3307, 'user' => 'root', 'pass' => ''],
    ['port' => 3306, 'user' => 'root', 'pass' => ''],
];

$pdo = null;
$ultimoError = '';
$puertoConectado = null;

foreach ($configs as $cfg) {
    try {
        $dsn = "mysql:host=$host;port={$cfg['port']};dbname=$db;charset=$charset";
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
        $puertoConectado = $cfg['port'];
        break;
    } catch (\PDOException $e) {
        $ultimoError = $e->getMessage();
    }
}

if (!$pdo) {
    header('Content-Type: application/json', true, 500);
    echo json_encode([
        "error" => "Error de conexión a la base de datos: " . $ultimoError,
        "ayuda" => "Verifica que el servicio MySQL esté corriendo en el puerto 3306 o 3307 con la base de datos '$db'."
    ]);
    exit;
}
