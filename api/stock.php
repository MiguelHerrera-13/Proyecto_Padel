<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
// api/stock.php

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
        if (isset($_GET['id'])) {
            // Traer un solo producto
            $id = intval($_GET['id']);
            $sql = "SELECT id, codigo, nombre, categoria, stock_actual, precio_venta, fecha_actualizacion FROM productos WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $id]);
            $producto = $stmt->fetch();

            if ($producto) {
                http_response_code(200);
                echo json_encode($producto);
            } else {
                http_response_code(404);
                echo json_encode(["mensaje" => "Producto no encontrado."]);
            }
        } else {
            // Listar todos los productos
            $sql = "SELECT id, codigo, nombre, categoria, stock_actual, precio_venta, fecha_actualizacion FROM productos ORDER BY nombre ASC";
            $stmt = $pdo->query($sql);
            $productos = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode($productos);
        }
        break;

    case 'POST':
        // Alta de nuevo producto
        if (!empty($datos_entrada['codigo']) && !empty($datos_entrada['nombre']) && !empty($datos_entrada['categoria']) && isset($datos_entrada['precio_venta'])) {
            $codigo = $datos_entrada['codigo'];
            $nombre = $datos_entrada['nombre'];
            $categoria = $datos_entrada['categoria'];
            $stock_actual = isset($datos_entrada['stock_actual']) ? intval($datos_entrada['stock_actual']) : 0;
            $precio_venta = floatval($datos_entrada['precio_venta']);

            try {
                $sql = "INSERT INTO productos (codigo, nombre, categoria, stock_actual, precio_venta) VALUES (:codigo, :nombre, :categoria, :stock_actual, :precio_venta)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    'codigo' => $codigo,
                    'nombre' => $nombre,
                    'categoria' => $categoria,
                    'stock_actual' => $stock_actual,
                    'precio_venta' => $precio_venta
                ]);

                http_response_code(201);
                echo json_encode(["mensaje" => "Producto creado exitosamente.", "id" => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(["error" => "Error al crear producto. ¿Quizás el código ya existe?", "detalle" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "Faltan campos obligatorios: codigo, nombre, categoria o precio_venta."]);
        }
        break;

    case 'PUT':
        // Modificación de producto existente
        if (!empty($datos_entrada['id'])) {
            $id = intval($datos_entrada['id']);
            
            $stmt_check = $pdo->prepare("SELECT id FROM productos WHERE id = :id");
            $stmt_check->execute(['id' => $id]);
            if (!$stmt_check->fetch()) {
                http_response_code(404);
                echo json_encode(["error" => "Producto no encontrado."]);
                break;
            }

            $campos = [];
            $parametros = ['id' => $id];

            if (isset($datos_entrada['codigo'])) {
                $campos[] = "codigo = :codigo";
                $parametros['codigo'] = $datos_entrada['codigo'];
            }
            if (isset($datos_entrada['nombre'])) {
                $campos[] = "nombre = :nombre";
                $parametros['nombre'] = $datos_entrada['nombre'];
            }
            if (isset($datos_entrada['categoria'])) {
                $campos[] = "categoria = :categoria";
                $parametros['categoria'] = $datos_entrada['categoria'];
            }
            if (isset($datos_entrada['stock_actual'])) {
                $campos[] = "stock_actual = :stock_actual";
                $parametros['stock_actual'] = intval($datos_entrada['stock_actual']);
            }
            if (isset($datos_entrada['precio_venta'])) {
                $campos[] = "precio_venta = :precio_venta";
                $parametros['precio_venta'] = floatval($datos_entrada['precio_venta']);
            }

            if (count($campos) > 0) {
                try {
                    $sql = "UPDATE productos SET " . implode(", ", $campos) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($parametros);

                    http_response_code(200);
                    echo json_encode(["mensaje" => "Producto actualizado correctamente."]);
                } catch (PDOException $e) {
                    http_response_code(400);
                    echo json_encode(["error" => "Error al actualizar producto.", "detalle" => $e->getMessage()]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["error" => "No se enviaron campos para actualizar."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["error" => "El campo 'id' es obligatorio para la modificación."]);
        }
        break;

    case 'DELETE':
        // Baja de producto
        $id_borrar = null;
        if (isset($_GET['id'])) {
            $id_borrar = intval($_GET['id']);
        } elseif (isset($datos_entrada['id'])) {
            $id_borrar = intval($datos_entrada['id']);
        }

        if ($id_borrar) {
            try {
                $sql = "DELETE FROM productos WHERE id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['id' => $id_borrar]);

                if ($stmt->rowCount() > 0) {
                    http_response_code(200);
                    echo json_encode(["mensaje" => "Producto eliminado correctamente."]);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Producto no encontrado."]);
                }
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(["error" => "No se pudo eliminar el producto.", "detalle" => $e->getMessage()]);
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
