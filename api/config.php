<?php
$host = '127.0.0.1';
$db   = 'indoor_paddle'; 
$user = 'root';          
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$passwords = ['Acormaxi1325$%', ''];
$pdo = null;
$ultimoError = '';

foreach ($passwords as $pass) {
    try {
        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $pdo = new PDO($dsn, $user, $pass, $options);
        break;
    } catch (\PDOException $e) {
        $ultimoError = $e->getMessage();
    }
}

if (!$pdo) {
    header('Content-Type: application/json', true, 500);
    echo json_encode(["error" => "Error de conexión a la base de datos: " . $ultimoError]);
    exit;
}