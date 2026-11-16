<?php
// Serves an uploaded file to the logged-in owner only, with HTTP Range support so videos can seek.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/media.php';

if (!current_user()) {
    http_response_code(403);
    exit;
}
$m = q('SELECT * FROM media WHERE id = ?', [(int) ($_GET['id'] ?? 0)])->fetch();
$path = $m && $m['stored_name'] ? uploads_dir() . '/' . $m['stored_name'] : '';
if (!$path || !is_file($path) || str_contains($m['stored_name'], '..')) {
    http_response_code(404);
    exit('Not found');
}
session_write_close();

$size = filesize($path);
$start = 0;
$end = $size - 1;
$inline = in_array($m['kind'], ['image', 'video', 'audio'], true) || $m['mime'] === 'application/pdf';
$disposition = (!empty($_GET['dl']) || !$inline) ? 'attachment' : 'inline';
$name = $m['original_name'] ?: basename($path);

header('Content-Type: ' . $m['mime']);
header('Accept-Ranges: bytes');
header('Cache-Control: private, max-age=86400');
header("Content-Disposition: $disposition; filename=\"" . preg_replace('/[^\w.\- ]/u', '_', $name) . "\"; filename*=UTF-8''" . rawurlencode($name));
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'");

if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $r)) {
    if ($r[1] === '' && $r[2] !== '') {
        $start = max(0, $size - (int) $r[2]);
    } else {
        $start = (int) $r[1];
        if ($r[2] !== '') {
            $end = min((int) $r[2], $size - 1);
        }
    }
    if ($start > $end || $start >= $size) {
        http_response_code(416);
        header("Content-Range: bytes */$size");
        exit;
    }
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$size");
}
header('Content-Length: ' . ($end - $start + 1));

$fp = fopen($path, 'rb');
fseek($fp, $start);
$left = $end - $start + 1;
while ($left > 0 && !feof($fp)) {
    $chunk = fread($fp, (int) min(65536, $left));
    echo $chunk;
    $left -= strlen($chunk);
    flush();
}
fclose($fp);
