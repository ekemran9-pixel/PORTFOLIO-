<?php
// Webhook API for phone apps (iOS Shortcuts, MacroDroid, Tasker), n8n, Zapier, IFTTT and Make.
// Auth: header "Authorization: Bearer API_TOKEN" or ?token=API_TOKEN. Body: JSON or form fields.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/media.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}
session_write_close();

$token = preg_match('/^Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '', $m) ? $m[1] : (string) ($_GET['token'] ?? '');
if ($token === '' || !hash_equals(secret('api_token'), $token)) {
    json_out(['ok' => false, 'error' => 'unauthorized'], 401);
}

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) {
    $in = $_POST + $_GET;
}
unset($in['token']);
$action = (string) ($in['action'] ?? 'say');
set_time_limit(180);

switch ($action) {
    case 'add_entry':
    case 'add_customer':
    case 'add_note':
    case 'complete_task':
        $res = apply_action(['action' => $action] + $in);
        json_out(['ok' => $res['ok'], 'message' => $res['message']] + (isset($res['id']) ? ['id' => $res['id']] : []), $res['ok'] ? 200 : 422);

    case 'say':
    case 'ask':
        $text = trim((string) ($in['text'] ?? $in['message'] ?? ''));
        if ($text === '') {
            json_out(['ok' => false, 'error' => 'text is required'], 422);
        }
        $res = assistant_say($text, 'api');
        $reply = trim($res['reply'] . ($res['applied'] ? "\n" . implode("\n", $res['applied']) : ''));
        json_out(['ok' => $res['ok'], 'reply' => $reply, 'applied' => $res['applied']]);

    case 'report':
        [$from, $to, $label] = period_range((string) ($in['period'] ?? 'today'));
        $r = build_report($from, $to);
        json_out(['ok' => true, 'text' => report_text($r, $label), 'data' => $r]);

    case 'run_recipe':
        $r = q('SELECT * FROM recipes WHERE id = ? AND enabled = 1', [(int) ($in['id'] ?? 0)])->fetch();
        if (!$r) {
            json_out(['ok' => false, 'error' => 'recipe not found or disabled'], 404);
        }
        $data = $in['data'] ?? $in;
        $res = run_recipe($r, is_array($data) ? $data : ['value' => $data]);
        json_out($res, $res['ok'] ? 200 : 500);

    case 'upload':
        $file = files_list('file')[0] ?? null;
        $res = $file ? store_upload($file, (string) ($in['title'] ?? ''), (string) ($in['tags'] ?? 'api'), null) : 'file is required';
        json_out(is_int($res) ? ['ok' => true, 'id' => $res] : ['ok' => false, 'error' => $res], is_int($res) ? 200 : 422);
}
json_out(['ok' => false, 'error' => 'unknown action'], 400);
