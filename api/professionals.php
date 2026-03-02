<?php
/* ============================================================
 GET /api/professionals.php
 Lista profissionais ativos (filtrado por serviço se informado)
 Query params: ?service_id=X (opcional)
 ============================================================ */
require_once __DIR__ . '/config.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
}

$db = getDB();
$servicoId = (int)($_GET['service_id'] ?? 0);

if ($servicoId > 0) {
    $stmt = $db->prepare('
        SELECT p.id, p.nome, p.especialidade, p.foto_url
        FROM profissionais p
        INNER JOIN profissional_servicos ps ON ps.profissional_id = p.id
        WHERE p.ativo = 1 AND ps.servico_id = ?
        ORDER BY p.nome ASC
    ');
    $stmt->execute([$servicoId]);
}
else {
    $stmt = $db->query('
        SELECT id, nome, especialidade, foto_url
        FROM profissionais
        WHERE ativo = 1
        ORDER BY nome ASC
    ');
}

$profissionais = $stmt->fetchAll();

// Adiciona opção "Qualquer disponível" no início
array_unshift($profissionais, [
    'id' => 0,
    'nome' => 'Qualquer disponível',
    'especialidade' => 'Primeiro profissional disponível no horário',
    'foto_url' => null,
]);

json_response([
    'success' => true,
    'data' => array_map(function ($p) {
        return [
        'id' => (int)$p['id'],
        'nome' => $p['nome'],
        'especialidade' => $p['especialidade'],
        'foto_url' => $p['foto_url'],
        ];
    }, $profissionais),
]);
