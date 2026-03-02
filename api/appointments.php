<?php
/* ============================================================
 POST /api/appointments.php
 Cria um novo agendamento
 Projetado para consumo por: Site, App Desktop (Electron)
 ============================================================ */
require_once __DIR__ . '/config.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
}

$body = get_json_body();

// ===== Validação dos campos =====
$erros = [];
$clienteNome = sanitize($body['cliente_nome'] ?? '');
$clienteTelefone = preg_replace('/\D/', '', $body['cliente_telefone'] ?? '');
$servicoId = (int)($body['servico_id'] ?? 0);
$profissionalId = isset($body['profissional_id']) && $body['profissional_id'] !== '' ? (int)$body['profissional_id'] : null;
$dataHoraRaw = $body['data_hora'] ?? '';

if (!$clienteNome || strlen($clienteNome) < 2)
    $erros[] = 'Nome do cliente inválido.';
if (strlen($clienteTelefone) < 10)
    $erros[] = 'Telefone inválido (mínimo 10 dígitos).';
if ($servicoId < 1)
    $erros[] = 'Serviço inválido.';

// Validar e parsear data/hora
$dataHora = null;
try {
    $dt = new DateTime($dataHoraRaw);
    $hoje = new DateTime('today');
    if ($dt < $hoje)
        $erros[] = 'Data não pode ser no passado.';
    $dataHora = $dt->format('Y-m-d H:i:s');
}
catch (Exception $e) {
    $erros[] = 'Data/hora inválida. Use o formato ISO: YYYY-MM-DDTHH:MM:SS';
}

if ($erros) {
    json_response(['success' => false, 'message' => implode(' ', $erros)], 422);
}

$db = getDB();

// ===== Verificar se o serviço existe =====
$stmt = $db->prepare('SELECT id, nome, duracao_min FROM servicos WHERE id = ? AND ativo = 1');
$stmt->execute([$servicoId]);
$servico = $stmt->fetch();
if (!$servico) {
    json_response(['success' => false, 'message' => 'Serviço não encontrado.'], 404);
}

// ===== Calcular data/hora de fim =====
$dtFim = new DateTime($dataHoraRaw);
$dtFim->modify("+{$servico['duracao_min']} minutes");
$dataHoraFim = $dtFim->format('Y-m-d H:i:s');

// ===== Verificar conflito de horário =====
$sqlConflito = '
    SELECT COUNT(*) FROM agendamentos
    WHERE status NOT IN (\'cancelado\',\'faltou\')
    AND (:profissional_id IS NULL OR profissional_id = :profissional_id)
    AND (
        (data_hora >= :data_hora     AND data_hora < :data_hora_fim) OR
        (data_hora_fim > :data_hora2 AND data_hora_fim <= :data_hora_fim2) OR
        (data_hora <= :data_hora3   AND data_hora_fim >= :data_hora_fim3)
    )
';
$stmtConflito = $db->prepare($sqlConflito);
$stmtConflito->execute([
    ':profissional_id' => $profissionalId,
    ':data_hora' => $dataHora,
    ':data_hora_fim' => $dataHoraFim,
    ':data_hora2' => $dataHora,
    ':data_hora_fim2' => $dataHoraFim,
    ':data_hora3' => $dataHora,
    ':data_hora_fim3' => $dataHoraFim,
]);

if ((int)$stmtConflito->fetchColumn() > 0) {
    json_response(['success' => false, 'message' => 'Este horário já está ocupado. Por favor, escolha outro.'], 409);
}

// ===== Upsert do cliente (busca por telefone) =====
$stmtCliente = $db->prepare('SELECT id FROM clientes WHERE telefone = ?');
$stmtCliente->execute([$clienteTelefone]);
$cliente = $stmtCliente->fetch();

if ($cliente) {
    $clienteId = $cliente['id'];
    // Atualiza o nome caso tenha mudado
    $db->prepare('UPDATE clientes SET nome = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$clienteNome, $clienteId]);
}
else {
    $db->prepare('INSERT INTO clientes (nome, telefone, created_at) VALUES (?, ?, NOW())')
        ->execute([$clienteNome, $clienteTelefone]);
    $clienteId = $db->lastInsertId();
}

// ===== Gerar link WhatsApp =====
$dataFormatada = (new DateTime($dataHoraRaw))->format('d/m/Y');
$horaFormatada = (new DateTime($dataHoraRaw))->format('H:i');
$wppLink = gerarLinkWhatsApp($clienteTelefone, $clienteNome, $servico['nome'], $dataFormatada, $horaFormatada);

// ===== Inserir Agendamento =====
$stmtInsert = $db->prepare('
    INSERT INTO agendamentos
        (cliente_id, servico_id, profissional_id, data_hora, data_hora_fim, status, origem, whatsapp_link, created_at)
    VALUES
        (:cliente_id, :servico_id, :profissional_id, :data_hora, :data_hora_fim, \'pendente\', \'site\', :whatsapp_link, NOW())
');
$stmtInsert->execute([
    ':cliente_id' => $clienteId,
    ':servico_id' => $servicoId,
    ':profissional_id' => $profissionalId,
    ':data_hora' => $dataHora,
    ':data_hora_fim' => $dataHoraFim,
    ':whatsapp_link' => $wppLink,
]);
$agendamentoId = $db->lastInsertId();

// ===== Registrar notificação para o sistema Desktop =====
$db->prepare('INSERT INTO notificacoes_desktop (agendamento_id, tipo) VALUES (?, \'novo\')')
    ->execute([$agendamentoId]);

// ===== Resposta de Sucesso =====
json_response([
    'success' => true,
    'agendamento_id' => (int)$agendamentoId,
    'status' => 'pendente',
    'whatsapp_link' => $wppLink,
    'resumo' => [
        'cliente' => $clienteNome,
        'servico' => $servico['nome'],
        'data_hora' => $dataFormatada . ' às ' . $horaFormatada,
    ],
    'message' => 'Agendamento criado com sucesso! Confirme pelo WhatsApp.',
]);
