<?php
// Runs scheduled recipes. Set a cPanel Cron Job every 5 minutes:
//   php /home/USER/public_html/cron.php
// or, if CLI is not available: wget -q -O- "https://your-site/cron.php?key=CRON_KEY"
require __DIR__ . '/inc/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    $key = (string) ($_GET['key'] ?? '');
    if (!hash_equals(secret('cron_key'), $key)) {
        http_response_code(403);
        exit('Forbidden');
    }
    session_write_close();
    header('Content-Type: text/plain; charset=utf-8');
}
set_time_limit(280);

$lock = APP_ROOT . '/data/cron.lock';
$fp = fopen($lock, 'c');
if (!$fp || !flock($fp, LOCK_EX | LOCK_NB)) {
    exit("busy\n");
}
$ran = run_due_recipes();
flock($fp, LOCK_UN);
echo $ran ? implode("\n", $ran) . "\n" : "nothing due\n";
