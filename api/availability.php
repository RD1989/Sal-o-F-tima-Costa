<?php
/* ============================================================
 GET /api/availability.php
 Retorna horários disponíveis para uma data e profissional
 Query params: ?date=YYYY-MM-DD&professional_id=X&service_id=Y
 ============================================================ */
require_once __DIR__ . '/config.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
}

$date = $_GET['date'] ?? date('Y-m-d');
$profissionalId = isset($_GET['professional_id']) && $_GET['professional_id'] !== '0'
    ? (int)$_GET['professional_id'] : null;
$servicoId = (int)($_GET['service_id'] ?? 0);

// Validar data
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    json_response(['success' => false, 'message' => 'Data inválida. Use YYYY-MM-DD.'], 422);
}

$diaSemana = (int)(new DateTime($date))->format('N'); // 1=seg ... 7=dom
if ($diaSemana === 7) {
    json_response(['success' => true, 'data' => [], 'message' => 'Fechado aos domingos.']);
}

$db = getDB();

// Busca duração do serviço (para calcular horário de fim)
$duracaoMin = 60; // padrão
if ($servicoId > 0) {
    $stmtServ = $db->prepare('SELECT duracao_min FROM servicos WHERE id = ?');
    $stmtServ->execute([$servicoId]);
    $serv = $stmtServ->fetch();
    if ($serv)
        $duracaoMin = (int)$serv['duracao_min'];
}

// Horários de funcionamento
$abertura = '09:00';
$fechamento = ($diaSemana === 6) ? '17:00' : '19:00'; // sáb fecha às 17h

// Gerar todos os slots possíveis (a cada 30 min)
$slots = [];
$current = new DateTime("{$date} {$abertura}");
$end = new DateTime("{$date} {$fechamento}");
$end->modify("-{$duracaoMin} minutes");

while ($current <= $end) {
    $slots[] = $current->format('H:i');
    $current->modify('+30 minutes');
}

// Buscar agendamentos já existentes
$sqlOcupados = '
    SELECT DATE_FORMAT(data_hora, \'%H:%i\') as hora_inicio,
           DATE_FORMAT(data_hora_fim, \'%H:%i\') as hora_fim
    FROM agendamentos
    WHERE DATE(data_hora) = :data
    AND status NOT IN (\'cancelado\',\'faltou\')
    AND (:prof_id IS NULL OR profissional_id = :prof_id2)
';
$stmtOc = $db->prepare($sqlOcupados);
$stmtOc->execute([':data' => $date, ':prof_id' => $profissionalId, ':prof_id2' => $profissionalId]);
$ocupados = $stmtOc->fetchAll();

// Verificar bloqueios manuais
$sqlBloqueios = '
    SELECT TIME_FORMAT(data_hora_inicio, \'%H:%i\') as inicio,
           TIME_FORMAT(data_hora_fim, \'%H:%i\') as fim
    FROM disponibilidade_bloqueada
    WHERE DATE(data_hora_inicio) = :data
    AND (:prof_id IS NULL OR profissional_id IS NULL OR profissional_id = :prof_id2)
';
$stmtBloq = $db->prepare($sqlBloqueios);
$stmtBloq->execute([':data' => $date, ':prof_id' => $profissionalId, ':prof_id2' => $profissionalId]);
$bloqueios = $stmtBloq->fetchAll();

// Marcar slots ocupados
$slotsResult = [];
foreach ($slots as $slot) {
    $slotFim = (new DateTime("{$date} {$slot}"))->modify("+{$duracaoMin} minutes")->format('H:i');
    $ocupado = false;

    foreach ($ocupados as $oc) {
        if ($slot < $oc['hora_fim'] && $slotFim > $oc['hora_inicio']) {
            $ocupado = true;
            break;
        }
    }

    if (!$ocupado) {
        foreach ($bloqueios as $bl) {
            if ($slot < $bl['fim'] && $slotFim > $bl['inicio']) {
                $ocupado = true;
                break;
            }
        }
    }

    $slotsResult[] = [
        'hora' => $slot,
        'hora_fim' => $slotFim,
        'ocupado' => $ocupado,
    ];
}

json_response(['success' => true, 'data' => $slotsResult, 'date' => $date]);
