<?php
// Allowed upload types: extension => [kind, mime]. Files are served with these MIME types, never the browser-sent ones.

const MEDIA_TYPES = [
    'jpg' => ['image', 'image/jpeg'], 'jpeg' => ['image', 'image/jpeg'], 'png' => ['image', 'image/png'],
    'gif' => ['image', 'image/gif'], 'webp' => ['image', 'image/webp'], 'heic' => ['image', 'image/heic'],
    'mp4' => ['video', 'video/mp4'], 'webm' => ['video', 'video/webm'], 'mov' => ['video', 'video/quicktime'], 'm4v' => ['video', 'video/mp4'],
    'mp3' => ['audio', 'audio/mpeg'], 'wav' => ['audio', 'audio/wav'], 'm4a' => ['audio', 'audio/mp4'], 'ogg' => ['audio', 'audio/ogg'], 'aac' => ['audio', 'audio/aac'],
    'pdf' => ['doc', 'application/pdf'], 'txt' => ['doc', 'text/plain'], 'csv' => ['doc', 'text/csv'],
    'doc' => ['doc', 'application/msword'], 'docx' => ['doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'xls' => ['doc', 'application/vnd.ms-excel'], 'xlsx' => ['doc', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'ppt' => ['doc', 'application/vnd.ms-powerpoint'], 'pptx' => ['doc', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    'zip' => ['doc', 'application/zip'],
];

const MEDIA_KINDS = ['image', 'video', 'audio', 'doc', 'text'];

function uploads_dir(): string
{
    return APP_ROOT . '/uploads';
}

/** Stores one entry of $_FILES; returns the new media id or an error string. */
function store_upload(array $file, string $title, string $tags, ?int $customerId): int|string
{
    global $CONFIG;
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return t('upload_error') . ' (' . (int) $file['error'] . ')';
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!isset(MEDIA_TYPES[$ext])) {
        return t('file_type_not_allowed') . ': .' . $ext;
    }
    $max = (int) ($CONFIG['max_upload_mb'] ?? 200) * 1024 * 1024;
    if ($file['size'] > $max) {
        return t('file_too_large');
    }
    [$kind, $mime] = MEDIA_TYPES[$ext];
    $stored = date('Ym') . '/' . bin2hex(random_bytes(16)) . '.' . $ext;
    $dir = uploads_dir() . '/' . date('Ym');
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        return t('upload_error');
    }
    if (!move_uploaded_file($file['tmp_name'], uploads_dir() . '/' . $stored)) {
        return t('upload_error');
    }
    q('INSERT INTO media (kind, title, original_name, stored_name, mime, size, tags, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$kind, $title, mb_substr($file['name'], 0, 250), $stored, $mime, (int) $file['size'], $tags, $customerId, now()]);
    $id = (int) db()->lastInsertId();
    log_activity('media_uploaded', $file['name']);
    fire_event('media_uploaded', ['id' => $id, 'kind' => $kind, 'name' => $file['name'], 'title' => $title, 'url' => base_url() . 'file.php?id=' . $id]);
    return $id;
}

/** Normalises the multi-file $_FILES structure into a list. */
function files_list(string $field): array
{
    $f = $_FILES[$field] ?? null;
    if (!$f) {
        return [];
    }
    if (!is_array($f['name'])) {
        return [$f];
    }
    $out = [];
    foreach ($f['name'] as $i => $name) {
        $out[] = ['name' => $name, 'type' => $f['type'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
    }
    return $out;
}
