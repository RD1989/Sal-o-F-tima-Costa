<?php
/* ============================================================
   SALÃO FÁTIMA COSTA — Configuração e Conexão com BD
   ============================================================ */

// Ambiente (development | production)
define('APP_ENV', getenv('APP_ENV') ?: 'development');

// Configuração do Banco de Dados
// Em produção, use variáveis de ambiente
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'salao_fatima_costa');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// Número do Salão (WhatsApp)
define('SALAO_WHATSAPP', getenv('SALAO_WHATSAPP') ?: '5522999999999');
define('SALAO_NOME', 'Salão Fátima Costa');

// API Key para autenticação de sistemas externos (Desktop/Electron)
define('API_KEY', getenv('API_KEY') ?: 'sk_fatima_CHANGE_THIS_KEY');

// ============================================================
// Conexão PDO Singleton
// ============================================================
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(503);
        json_response(['success' => false, 'message' => 'Serviço temporariamente indisponível.']);
        exit;
    }
    return $pdo;
}

// ============================================================
// Helpers
// ============================================================
function setCorsHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

function json_response(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function get_json_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function sanitize(string $val): string {
    return trim(htmlspecialchars($val, ENT_QUOTES, 'utf-8'));
}

function validarApiKey(): void {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $key = str_replace('Bearer ', '', $key);
    if ($key !== API_KEY) {
        json_response(['success' => false, 'message' => 'Não autorizado.'], 401);
    }
}

function gerarLinkWhatsApp(string $telefone, string $nome, string $servico, string $data, string $hora): string {
    $msg = "Olá {$nome}! Aqui é do " . SALAO_NOME . ". ✨\n\nConfirmando seu agendamento para *{$servico}* no dia *{$data}* às *{$hora}*.\n\n_Podemos confirmar?_ 💆‍♀️";
    return 'https://wa.me/55' . preg_replace('/\D/', '', $telefone) . '?text=' . rawurlencode($msg);
}
