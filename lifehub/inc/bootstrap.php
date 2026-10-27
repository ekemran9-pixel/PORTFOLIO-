<?php
// LifeHub core: config, database, session, auth, CSRF, language and small helpers.

declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
define('APP_VERSION', '1.0.0');

$configFile = APP_ROOT . '/config.php';
if (!is_file($configFile)) {
    header('Location: install.php');
    exit;
}
$CONFIG = require $configFile;

date_default_timezone_set($CONFIG['timezone'] ?? 'Asia/Dhaka');
ini_set('display_errors', !empty($CONFIG['debug']) ? '1' : '0');

session_name('lifehub_sid');
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
]);
session_start();

header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

/* ---------- Database ---------- */

function db(): PDO
{
    static $pdo = null;
    global $CONFIG;
    if ($pdo) {
        return $pdo;
    }
    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    if (($CONFIG['db_driver'] ?? 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . APP_ROOT . '/data/lifehub.sqlite', null, null, $opts);
        $pdo->exec('PRAGMA foreign_keys = ON');
    } else {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $CONFIG['db_host'], $CONFIG['db_name']);
        $pdo = new PDO($dsn, $CONFIG['db_user'], $CONFIG['db_pass'], $opts);
    }
    return $pdo;
}

function db_driver(): string
{
    global $CONFIG;
    return ($CONFIG['db_driver'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function setting(string $key, ?string $default = null): ?string
{
    $v = q('SELECT v FROM settings WHERE k = ?', [$key])->fetchColumn();
    return $v === false ? $default : $v;
}

function set_setting(string $key, string $value): void
{
    q('DELETE FROM settings WHERE k = ?', [$key]);
    q('INSERT INTO settings (k, v) VALUES (?, ?)', [$key, $value]);
}

function log_activity(string $action, string $detail = ''): void
{
    q('INSERT INTO activity (action, detail, created_at) VALUES (?, ?, ?)', [$action, mb_substr($detail, 0, 250), now()]);
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

/* ---------- Schema upgrades ---------- */

require_once __DIR__ . '/migrate.php';
if ((int) setting('schema_version', '1') < SCHEMA_VERSION) {
    run_migrations(db(), db_driver());
}

/* ---------- Language ---------- */

if (isset($_GET['lang']) && in_array($_GET['lang'], ['bn', 'en'], true)) {
    $_SESSION['lang'] = $_GET['lang'];
}
$LANG_CODE = $_SESSION['lang'] ?? ($CONFIG['default_lang'] ?? 'bn');
$LANG = require APP_ROOT . '/lang/' . $LANG_CODE . '.php';

function t(string $key): string
{
    global $LANG;
    return $LANG[$key] ?? $key;
}

function lang(): string
{
    global $LANG_CODE;
    return $LANG_CODE;
}

/* ---------- Auth ---------- */

function current_user(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }
    static $user = null;
    return $user ??= (q('SELECT id, username FROM users WHERE id = ?', [$_SESSION['uid']])->fetch() ?: null);
}

function require_login(): void
{
    if (!current_user()) {
        header('Location: login.php');
        exit;
    }
}

/* ---------- CSRF ---------- */

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . csrf_token() . '">';
}

function check_csrf(): void
{
    $sent = $_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(400);
        exit('Invalid request (CSRF). Please reload the page.');
    }
}

/* ---------- Helpers ---------- */

function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function flash(?string $msg = null, string $type = 'ok'): ?array
{
    if ($msg !== null) {
        $_SESSION['flash'] = ['msg' => $msg, 'type' => $type];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function money(float $n): string
{
    return '৳ ' . number_format($n, 2);
}

function human_size(int $bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    $n = (float) $bytes;
    while ($n >= 1024 && $i < 3) {
        $n /= 1024;
        $i++;
    }
    return round($n, 1) . ' ' . $units[$i];
}

function post(string $key, string $default = ''): string
{
    $v = $_POST[$key] ?? $default;
    return is_string($v) ? trim($v) : $default;
}

/** Public base URL of the site, e.g. https://example.com/hub/ (used for webhooks). */
function base_url(): string
{
    $saved = setting('site_url');
    if ($saved) {
        return rtrim($saved, '/') . '/';
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir . '/';
}

/** Long random token stored in settings, created on first use. */
function secret(string $key): string
{
    $v = setting($key);
    if (!$v) {
        $v = bin2hex(random_bytes(20));
        set_setting($key, $v);
    }
    return $v;
}

function json_out(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/ai.php';
require_once __DIR__ . '/actions.php';
require_once __DIR__ . '/automation.php';
