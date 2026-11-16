<?php
// AI providers (Gemini, Groq, OpenAI, Claude) over plain HTTP, speech-to-text, and the data context the assistant sees.

const AI_PROVIDERS = [
    'gemini' => ['label' => 'Google Gemini', 'key' => 'api_gemini', 'model' => 'gemini-2.5-flash', 'vision_model' => null],
    'groq'   => ['label' => 'Groq (Llama)', 'key' => 'api_groq', 'model' => 'llama-3.3-70b-versatile', 'vision_model' => 'meta-llama/llama-4-scout-17b-16e-instruct'],
    'openai' => ['label' => 'OpenAI', 'key' => 'api_openai', 'model' => 'gpt-4o-mini', 'vision_model' => null],
    'claude' => ['label' => 'Anthropic Claude', 'key' => 'api_claude', 'model' => 'claude-opus-5-5', 'vision_model' => null],
];

const AI_ENDPOINTS = [
    'gemini' => 'https://generativelanguage.googleapis.com/v1beta',
    'groq'   => 'https://api.groq.com/openai/v1',
    'openai' => 'https://api.openai.com/v1',
    'claude' => 'https://api.anthropic.com/v1',
    'notion' => 'https://api.notion.com/v1',
    'telegram' => 'https://api.telegram.org',
];

/** API base URL; config.php may override it (used for testing). */
function endpoint(string $service): string
{
    global $CONFIG;
    return rtrim($CONFIG['endpoints'][$service] ?? AI_ENDPOINTS[$service], '/');
}

function ai_key(string $provider): string
{
    return (string) setting(AI_PROVIDERS[$provider]['key'], '');
}

/** The provider to use: the one chosen in settings, else the first with a key. */
function ai_provider(): ?string
{
    $chosen = setting('ai_provider');
    if ($chosen && isset(AI_PROVIDERS[$chosen]) && ai_key($chosen) !== '') {
        return $chosen;
    }
    foreach (array_keys(AI_PROVIDERS) as $p) {
        if (ai_key($p) !== '') {
            return $p;
        }
    }
    return null;
}

function ai_model(string $provider, bool $vision = false): string
{
    $custom = trim((string) setting('ai_model_' . $provider, ''));
    if ($custom !== '') {
        return $custom;
    }
    return ($vision ? AI_PROVIDERS[$provider]['vision_model'] : null) ?? AI_PROVIDERS[$provider]['model'];
}

/* ---------- HTTP ---------- */

/** @return array{0:int,1:mixed,2:string} status code, decoded JSON (or null), raw body */
function http_request(string $method, string $url, array $headers = [], $body = null, int $timeout = 90): array
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER     => $headers,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = is_array($body) && !array_filter($body, fn($v) => $v instanceof CURLFile)
            ? json_encode($body, JSON_UNESCAPED_UNICODE)
            : $body;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return [0, null, $err];
    }
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, json_decode($raw, true), $raw];
}

function api_error_message(int $code, $json, string $raw): string
{
    $msg = $json['error']['message'] ?? $json['message'] ?? $json['description'] ?? $json['error'] ?? null;
    if (is_array($msg)) {
        $msg = json_encode($msg);
    }
    return 'HTTP ' . $code . ': ' . ($msg ?: mb_substr($raw, 0, 300));
}

/* ---------- Chat ---------- */

/**
 * Builds the HTTP request for one chat call.
 * $messages: list of ['role' => 'user'|'assistant', 'content' => string]; $image (optional) is attached to the last user turn.
 * @return array{0:string,1:array,2:array} url, headers, body
 */
function ai_build_request(string $provider, string $model, string $key, string $system, array $messages, ?array $image = null): array
{
    $last = count($messages) - 1;
    switch ($provider) {
        case 'gemini':
            $contents = [];
            foreach ($messages as $i => $m) {
                $parts = [['text' => $m['content']]];
                if ($image && $i === $last) {
                    $parts[] = ['inline_data' => ['mime_type' => $image['mime'], 'data' => $image['data']]];
                }
                $contents[] = ['role' => $m['role'] === 'assistant' ? 'model' : 'user', 'parts' => $parts];
            }
            $body = ['contents' => $contents];
            if ($system !== '') {
                $body['systemInstruction'] = ['parts' => [['text' => $system]]];
            }
            return [endpoint('gemini') . '/models/' . rawurlencode($model) . ':generateContent',
                ['Content-Type: application/json', 'x-goog-api-key: ' . $key], $body];

        case 'claude':
            $msgs = [];
            foreach ($messages as $i => $m) {
                $content = [['type' => 'text', 'text' => $m['content']]];
                if ($image && $i === $last) {
                    array_unshift($content, ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $image['mime'], 'data' => $image['data']]]);
                }
                $msgs[] = ['role' => $m['role'], 'content' => $content];
            }
            $body = ['model' => $model, 'max_tokens' => 16000, 'messages' => $msgs, 'fallbacks' => 'default'];
            if ($system !== '') {
                $body['system'] = $system;
            }
            return [endpoint('claude') . '/messages', [
                'Content-Type: application/json',
                'x-api-key: ' . $key,
                'anthropic-version: 2026-10-21',
                'anthropic-beta: server-side-fallback-2026-07-01',
            ], $body];

        default: // groq, openai — OpenAI-compatible chat completions
            $msgs = $system !== '' ? [['role' => 'system', 'content' => $system]] : [];
            foreach ($messages as $i => $m) {
                if ($image && $i === $last) {
                    $msgs[] = ['role' => 'user', 'content' => [
                        ['type' => 'text', 'text' => $m['content']],
                        ['type' => 'image_url', 'image_url' => ['url' => 'data:' . $image['mime'] . ';base64,' . $image['data']]],
                    ]];
                } else {
                    $msgs[] = ['role' => $m['role'], 'content' => $m['content']];
                }
            }
            return [endpoint($provider) . '/chat/completions',
                ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
                ['model' => $model, 'messages' => $msgs]];
    }
}

/** Extracts the reply text from a provider response, or throws with a readable reason. */
function ai_parse_response(string $provider, array $json): string
{
    switch ($provider) {
        case 'gemini':
            $parts = $json['candidates'][0]['content']['parts'] ?? null;
            if (!$parts) {
                throw new RuntimeException('No answer (' . ($json['candidates'][0]['finishReason'] ?? $json['promptFeedback']['blockReason'] ?? 'empty') . ')');
            }
            return trim(implode('', array_map(fn($p) => $p['text'] ?? '', $parts)));
        case 'claude':
            if (($json['stop_reason'] ?? '') === 'refusal') {
                throw new RuntimeException('The model declined this request.');
            }
            $text = '';
            foreach ($json['content'] ?? [] as $block) {
                if (($block['type'] ?? '') === 'text') {
                    $text .= $block['text'];
                }
            }
            return trim($text);
        default:
            $text = $json['choices'][0]['message']['content'] ?? null;
            if ($text === null) {
                throw new RuntimeException('Empty answer');
            }
            return trim($text);
    }
}

/**
 * Sends a conversation to the configured AI.
 * @return array{ok:bool,text?:string,error?:string,provider?:string}
 */
function ai_chat(array $messages, string $system = '', ?array $image = null): array
{
    $provider = ai_provider();
    if (!$provider) {
        return ['ok' => false, 'error' => t('ai_no_key')];
    }
    $model = ai_model($provider, (bool) $image);
    [$url, $headers, $body] = ai_build_request($provider, $model, ai_key($provider), $system, $messages, $image);
    [$code, $json, $raw] = http_request('POST', $url, $headers, $body, 180);
    if ($code < 200 || $code >= 300 || !is_array($json)) {
        return ['ok' => false, 'error' => $code === 0 ? 'Network: ' . $raw : api_error_message($code, $json, $raw), 'provider' => $provider];
    }
    try {
        return ['ok' => true, 'text' => ai_parse_response($provider, $json), 'provider' => $provider];
    } catch (RuntimeException $e) {
        return ['ok' => false, 'error' => $e->getMessage(), 'provider' => $provider];
    }
}

/** One-shot question with the assistant's standard system prompt. */
function ai_ask(string $prompt, bool $withData = true, ?array $image = null): array
{
    return ai_chat([['role' => 'user', 'content' => $prompt]], ai_system_prompt($withData), $image);
}

/* ---------- Speech to text ---------- */

function stt_available(): bool
{
    return ai_key('groq') !== '' || ai_key('openai') !== '' || ai_key('gemini') !== '';
}

/** Transcribes an audio/video file. Tries Groq Whisper, then OpenAI Whisper, then Gemini. */
function stt_transcribe(string $path, string $mime, string $filename): array
{
    $lang = setting('stt_language', 'auto');
    if (filesize($path) > 25 * 1024 * 1024 && ai_key('gemini') === '') {
        return ['ok' => false, 'error' => t('stt_too_large')];
    }
    $errors = [];
    foreach (['groq' => 'whisper-large-v3-turbo', 'openai' => 'whisper-1'] as $p => $model) {
        if (ai_key($p) === '' || filesize($path) > 25 * 1024 * 1024) {
            continue;
        }
        $fields = ['file' => new CURLFile($path, $mime, $filename), 'model' => $model, 'response_format' => 'json'];
        if ($lang !== 'auto') {
            $fields['language'] = $lang;
        }
        [$code, $json, $raw] = http_request('POST', endpoint($p) . '/audio/transcriptions', ['Authorization: Bearer ' . ai_key($p)], $fields, 300);
        if ($code === 200 && isset($json['text'])) {
            return ['ok' => true, 'text' => trim($json['text'])];
        }
        $errors[] = $p . ': ' . api_error_message($code, $json, $raw);
    }
    if (ai_key('gemini') !== '' && filesize($path) <= 18 * 1024 * 1024) {
        $prompt = 'Transcribe this recording word for word in its original language (Bangla stays in Bangla script). Return only the transcript.';
        [$url, $headers, $body] = ai_build_request('gemini', ai_model('gemini'), ai_key('gemini'), '', [['role' => 'user', 'content' => $prompt]],
            ['mime' => $mime, 'data' => base64_encode((string) file_get_contents($path))]);
        [$code, $json, $raw] = http_request('POST', $url, $headers, $body, 300);
        if ($code === 200 && is_array($json)) {
            try {
                return ['ok' => true, 'text' => ai_parse_response('gemini', $json)];
            } catch (RuntimeException $e) {
                $errors[] = 'gemini: ' . $e->getMessage();
            }
        } else {
            $errors[] = 'gemini: ' . api_error_message($code, $json, $raw);
        }
    }
    return ['ok' => false, 'error' => $errors ? implode(' | ', $errors) : t('stt_no_key')];
}

/* ---------- Context & actions ---------- */

/** A compact snapshot of the user's data that the assistant can reason over. */
function ai_data_context(): string
{
    $monthStart = date('Y-m-01');
    $sum = fn(string $type, string $from) => (float) q('SELECT COALESCE(SUM(amount), 0) FROM entries WHERE type = ? AND entry_date >= ?', [$type, $from])->fetchColumn();
    $lines = [];
    $lines[] = 'Today: ' . date('Y-m-d (l)');
    $lines[] = 'Customers: ' . q('SELECT COUNT(*) FROM customers')->fetchColumn();
    $lines[] = sprintf('This month: income %.2f, expense %.2f (BDT)', $sum('income', $monthStart), $sum('expense', $monthStart));
    $lines[] = sprintf('This year: income %.2f, expense %.2f (BDT)', $sum('income', date('Y-01-01')), $sum('expense', date('Y-01-01')));

    $tasks = q("SELECT title, entry_date FROM entries WHERE type = 'task' AND status = 'open' ORDER BY entry_date LIMIT 25")->fetchAll();
    if ($tasks) {
        $lines[] = "\nOpen tasks:";
        foreach ($tasks as $t) {
            $lines[] = "- {$t['entry_date']}: {$t['title']}";
        }
    }
    $recent = q('SELECT e.entry_date, e.type, e.title, e.amount, e.status, c.name AS customer FROM entries e LEFT JOIN customers c ON c.id = e.customer_id ORDER BY e.entry_date DESC, e.id DESC LIMIT 40')->fetchAll();
    if ($recent) {
        $lines[] = "\nRecent entries (date | type | title | amount | customer | status):";
        foreach ($recent as $r) {
            $lines[] = "- {$r['entry_date']} | {$r['type']} | {$r['title']} | " . (float) $r['amount'] . ' | ' . ($r['customer'] ?: '-') . " | {$r['status']}";
        }
    }
    $customers = q('SELECT c.name, c.phone, c.company, c.tags,
            (SELECT COALESCE(SUM(amount),0) FROM entries e WHERE e.customer_id = c.id AND e.type = \'income\') AS income
        FROM customers c ORDER BY c.id DESC LIMIT 80')->fetchAll();
    if ($customers) {
        $lines[] = "\nCustomers (name | phone | company | tags | total income):";
        foreach ($customers as $c) {
            $lines[] = "- {$c['name']} | " . ($c['phone'] ?: '-') . ' | ' . ($c['company'] ?: '-') . ' | ' . ($c['tags'] ?: '-') . ' | ' . (float) $c['income'];
        }
    }
    $notes = q("SELECT title, content FROM media WHERE kind = 'text' ORDER BY id DESC LIMIT 10")->fetchAll();
    if ($notes) {
        $lines[] = "\nRecent notes:";
        foreach ($notes as $n) {
            $lines[] = '- ' . ($n['title'] ? $n['title'] . ': ' : '') . mb_strimwidth(str_replace("\n", ' ', (string) $n['content']), 0, 200, '…');
        }
    }
    return implode("\n", $lines);
}

function ai_system_prompt(bool $withData): string
{
    $s = "You are LifeHub, the private assistant of the site owner (a business owner in Bangladesh). "
        . "Reply in the language the user writes in (Bangla or English). Be concise and practical; use short lists. Money is in Bangladeshi Taka (৳).\n\n"
        . "When the user asks you to record, add, save or remind something, also output the changes as a JSON array inside a fenced block "
        . "tagged lifehub-actions, after your normal answer. Allowed actions:\n"
        . "{\"action\":\"add_entry\",\"type\":\"income|expense|task|note\",\"title\":\"...\",\"amount\":0,\"date\":\"YYYY-MM-DD\",\"customer\":\"exact customer name or empty\",\"notes\":\"...\"}\n"
        . "{\"action\":\"add_customer\",\"name\":\"...\",\"phone\":\"...\",\"email\":\"...\",\"company\":\"...\",\"address\":\"...\",\"tags\":\"...\",\"notes\":\"...\"}\n"
        . "{\"action\":\"add_note\",\"title\":\"...\",\"content\":\"...\"}\n"
        . "{\"action\":\"complete_task\",\"title\":\"exact open task title\"}\n"
        . "Example:\n```lifehub-actions\n[{\"action\":\"add_entry\",\"type\":\"expense\",\"title\":\"Transport\",\"amount\":500,\"date\":\"" . date('Y-m-d') . "\"}]\n```\n"
        . "Only include the block when something should be saved. Never invent amounts or names the user did not give.";
    if ($withData) {
        $s .= "\n\n--- The owner's current data ---\n" . ai_data_context();
    }
    return $s;
}

/** Splits a reply into display text and the parsed lifehub-actions list. */
function ai_extract_actions(string $reply): array
{
    $actions = [];
    $text = preg_replace_callback('/```lifehub-actions\s*(.*?)```/s', function ($m) use (&$actions) {
        $parsed = json_decode(trim($m[1]), true);
        if (is_array($parsed)) {
            $parsed = isset($parsed['action']) ? [$parsed] : $parsed;
            foreach ($parsed as $a) {
                if (is_array($a) && isset($a['action'])) {
                    $actions[] = $a;
                }
            }
        }
        return '';
    }, $reply);
    return [trim((string) $text), $actions];
}

/** Image media row → ['mime','data'] for vision calls. */
function media_image_payload(int $mediaId): ?array
{
    $m = q("SELECT * FROM media WHERE id = ? AND kind = 'image'", [$mediaId])->fetch();
    if (!$m || !$m['stored_name']) {
        return null;
    }
    $path = APP_ROOT . '/uploads/' . $m['stored_name'];
    if (!is_file($path) || filesize($path) > 15 * 1024 * 1024) {
        return null;
    }
    return ['mime' => $m['mime'], 'data' => base64_encode((string) file_get_contents($path))];
}
