<?php
// Telegram bot webhook. Only the paired owner chat is served.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/media.php';

$sent = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '';
if ($sent === '' || !hash_equals(secret('tg_secret'), $sent)) {
    http_response_code(403);
    exit;
}
session_write_close();
$update = json_decode((string) file_get_contents('php://input'), true);
$msg = $update['message'] ?? null;

// Answer Telegram at once so it does not retry; keep working afterwards.
http_response_code(200);
header('Content-Type: application/json');
echo '{}';
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    @ob_end_flush();
    flush();
}
if (!$msg || empty($msg['chat']['id'])) {
    exit;
}
set_time_limit(240);
ignore_user_abort(true);

$chatId = (string) $msg['chat']['id'];
$text = trim((string) ($msg['text'] ?? $msg['caption'] ?? ''));
$owner = (string) setting('telegram_chat_id', '');
$reply = fn(string $s) => telegram_send($chatId, $s);

/* ---------- Pairing ---------- */
if ($owner === '') {
    $code = (string) setting('tg_pair_code', '');
    if ($code !== '' && preg_match('/^(?:\/start\s+)?' . preg_quote($code, '/') . '$/', $text)) {
        set_setting('telegram_chat_id', $chatId);
        set_setting('tg_pair_code', '');
        log_activity('tg_paired', (string) ($msg['from']['first_name'] ?? $chatId));
        $reply(t('tg_welcome'));
    } else {
        $reply(t('tg_need_pair'));
    }
    exit;
}
if ($chatId !== $owner) {
    exit; // private bot: ignore strangers
}

/* ---------- Files: voice, audio, photo, documents ---------- */
$voice = $msg['voice'] ?? $msg['audio'] ?? null;
if ($voice) {
    $tmp = telegram_download($voice['file_id']);
    if (!$tmp) {
        $reply('⚠ ' . t('upload_error'));
        exit;
    }
    $mime = $voice['mime_type'] ?? 'audio/ogg';
    $res = stt_transcribe($tmp, $mime, 'voice.' . (str_contains($mime, 'mpeg') ? 'mp3' : 'ogg'));
    @unlink($tmp);
    if (!$res['ok']) {
        $reply('⚠ ' . $res['error']);
        exit;
    }
    $reply('🎤 ' . $res['text']);
    $text = $res['text'];
}

$image = null;
$mediaId = null;
if (!empty($msg['photo']) || !empty($msg['document'])) {
    $isPhoto = !empty($msg['photo']);
    $file = $isPhoto ? end($msg['photo']) : $msg['document'];
    $name = $isPhoto ? 'telegram-' . date('Ymd-His') . '.jpg' : (string) ($file['file_name'] ?? 'file');
    $tmp = telegram_download($file['file_id']);
    $res = $tmp ? store_local_file($tmp, $name, $text !== '' ? mb_substr($text, 0, 190) : 'Telegram', 'telegram') : t('upload_error');
    if (!is_int($res)) {
        $reply('⚠ ' . $res);
        @unlink((string) $tmp);
        exit;
    }
    $mediaId = $res;
    if ($isPhoto && filesize($tmp) <= 15 * 1024 * 1024) {
        $image = ['mime' => 'image/jpeg', 'data' => base64_encode((string) file_get_contents($tmp))];
    }
    @unlink($tmp);
    if (!$image || !ai_provider()) {
        $reply('📁 ' . t('tg_saved_file'));
        exit;
    }
    if ($text === '') {
        $text = t('ai_describe_photo');
    }
}

if ($text === '') {
    exit;
}

/* ---------- Commands ---------- */
if ($text[0] === '/') {
    [$cmd, $arg] = array_pad(preg_split('/\s+/', $text, 2), 2, '');
    $cmd = strtolower(preg_replace('/@.*$/', '', $cmd));
    $money = function (string $arg): array {
        return preg_match('/^([\d,.]+)\s*(.*)$/u', trim($arg), $m) ? [(float) str_replace(',', '', $m[1]), trim($m[2])] : [0.0, trim($arg)];
    };
    switch ($cmd) {
        case '/start':
        case '/help':
            $reply(t('tg_help'));
            exit;
        case '/today':
        case '/week':
        case '/month':
        case '/year':
            [$from, $to, $label] = period_range(['/today' => 'today', '/week' => 'week', '/month' => 'month', '/year' => 'year'][$cmd]);
            $reply(report_text(build_report($from, $to), $label));
            exit;
        case '/tasks':
            $tasks = q("SELECT title, entry_date FROM entries WHERE type = 'task' AND status = 'open' ORDER BY entry_date LIMIT 30")->fetchAll();
            $reply($tasks ? "📋 " . t('open_tasks') . ":\n" . implode("\n", array_map(fn($t) => '☐ ' . $t['title'] . ' (' . $t['entry_date'] . ')', $tasks)) : '✅ ' . t('no_data'));
            exit;
        case '/income':
        case '/expense':
            [$amount, $title] = $money($arg);
            $res = apply_action(['action' => 'add_entry', 'type' => substr($cmd, 1), 'amount' => $amount, 'title' => $title ?: t(substr($cmd, 1))]);
            $reply(($res['ok'] ? '✅ ' : '⚠ ') . $res['message']);
            exit;
        case '/task':
        case '/note':
            $res = $cmd === '/task'
                ? apply_action(['action' => 'add_entry', 'type' => 'task', 'title' => $arg])
                : apply_action(['action' => 'add_note', 'content' => $arg]);
            $reply(($res['ok'] ? '✅ ' : '⚠ ') . $res['message']);
            exit;
        case '/done':
            $res = apply_action(['action' => 'complete_task', 'title' => $arg]);
            $reply(($res['ok'] ? '✅ ' : '⚠ ') . $res['message']);
            exit;
        case '/customer':
            if (preg_match('/^(.*?)\s*(\+?[\d\- ]{6,})?$/u', $arg, $m) && trim($m[1]) !== '') {
                $res = apply_action(['action' => 'add_customer', 'name' => trim($m[1]), 'phone' => trim($m[2] ?? '')]);
                $reply(($res['ok'] ? '✅ ' : '⚠ ') . $res['message']);
            } else {
                $found = q('SELECT name, phone, company FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 10', ["%$arg%", "%$arg%"])->fetchAll();
                $reply($found ? implode("\n", array_map(fn($c) => '👤 ' . $c['name'] . ($c['phone'] ? ' · ' . $c['phone'] : '') . ($c['company'] ? ' · ' . $c['company'] : ''), $found)) : t('not_found'));
            }
            exit;
        case '/find':
            $found = q('SELECT name, phone, company FROM customers WHERE name LIKE ? OR phone LIKE ? OR company LIKE ? LIMIT 10', ["%$arg%", "%$arg%", "%$arg%"])->fetchAll();
            $reply($found ? implode("\n", array_map(fn($c) => '👤 ' . $c['name'] . ($c['phone'] ? ' · ' . $c['phone'] : '') . ($c['company'] ? ' · ' . $c['company'] : ''), $found)) : t('not_found'));
            exit;
        case '/recipes':
            $rs = q('SELECT id, name, enabled FROM recipes ORDER BY id')->fetchAll();
            $reply($rs ? implode("\n", array_map(fn($r) => ($r['enabled'] ? '🟢' : '⚪') . ' #' . $r['id'] . ' ' . $r['name'], $rs)) . "\n\n/run ID" : t('no_data'));
            exit;
        case '/run':
            $r = q('SELECT * FROM recipes WHERE id = ?', [(int) ltrim($arg, '#')])->fetch();
            if (!$r) {
                $reply(t('not_found'));
                exit;
            }
            $res = run_recipe($r);
            if (!in_array($r['action_type'], ['telegram', 'report', 'ai'], true) || !$res['ok']) {
                $reply(($res['ok'] ? '✅ ' : '⚠ ') . $r['name'] . ': ' . $res['output']);
            }
            exit;
    }
}

/* ---------- Free text → AI assistant ---------- */
if (!ai_provider()) {
    $reply(t('ai_no_key') . "\n\n" . t('tg_help'));
    exit;
}
telegram_api('sendChatAction', ['chat_id' => $chatId, 'action' => 'typing']);
$res = assistant_say($text, 'telegram', $image, $mediaId);
$reply(trim(str_replace('**', '', $res['reply']) . ($res['applied'] ? "\n\n" . implode("\n", $res['applied']) : '')));
