<?php
// Telegram bot API helpers.

function telegram_token(): string
{
    return (string) setting('api_telegram', '');
}

/** @return array{ok:bool,result?:mixed,error?:string} */
function telegram_api(string $method, array $params = [], bool $multipart = false): array
{
    if (telegram_token() === '') {
        return ['ok' => false, 'error' => t('tg_not_ready')];
    }
    $url = endpoint('telegram') . '/bot' . telegram_token() . '/' . $method;
    [$code, $json, $raw] = $multipart
        ? http_request('POST', $url, [], $params, 60)
        : http_request('POST', $url, ['Content-Type: application/json'], $params, 60);
    if (!is_array($json) || empty($json['ok'])) {
        return ['ok' => false, 'error' => $code === 0 ? 'Network: ' . $raw : api_error_message($code, $json, $raw)];
    }
    return ['ok' => true, 'result' => $json['result']];
}

/** Sends a message (split to Telegram's 4096-char limit). */
function telegram_send(string $chatId, string $text): array
{
    $res = ['ok' => false, 'error' => 'empty'];
    $text = str_replace('**', '', $text);
    foreach (mb_str_split($text, 4000) ?: [''] as $chunk) {
        $res = telegram_api('sendMessage', ['chat_id' => $chatId, 'text' => $chunk, 'disable_web_page_preview' => true]);
        if (!$res['ok']) {
            break;
        }
    }
    return $res;
}

/** Message to the paired owner chat. */
function telegram_notify(string $text): array
{
    $chat = (string) setting('telegram_chat_id', '');
    if ($chat === '') {
        return ['ok' => false, 'error' => t('tg_not_ready')];
    }
    return telegram_send($chat, $text);
}

/** Downloads a file sent to the bot into a temp path. */
function telegram_download(string $fileId): ?string
{
    $info = telegram_api('getFile', ['file_id' => $fileId]);
    if (!$info['ok'] || empty($info['result']['file_path'])) {
        return null;
    }
    [$code, , $raw] = http_request('GET', endpoint('telegram') . '/file/bot' . telegram_token() . '/' . $info['result']['file_path'], [], null, 120);
    if ($code !== 200) {
        return null;
    }
    $tmp = tempnam(sys_get_temp_dir(), 'tg');
    file_put_contents($tmp, $raw);
    return $tmp;
}
