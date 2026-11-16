<?php
// Automation recipes: "when X happens → do Y". Triggers are schedules, site events or webhooks.

const RECIPE_TRIGGERS = ['daily', 'weekly', 'monthly', 'event', 'webhook', 'manual'];
const RECIPE_EVENTS = ['entry_added', 'customer_added', 'task_done', 'note_added', 'media_uploaded'];
const RECIPE_ACTIONS = ['telegram', 'ai', 'report', 'notion_overview', 'notion_sync', 'webhook', 'add_entry'];

/** Runs every enabled recipe listening for this event. Events raised by a running recipe are not re-dispatched. */
function fire_event(string $event, array $data = []): void
{
    if (!empty($GLOBALS['LH_RECIPE_RUNNING'])) {
        return;
    }
    try {
        $recipes = q("SELECT * FROM recipes WHERE enabled = 1 AND trigger_type = 'event' AND trigger_value = ?", [$event])->fetchAll();
    } catch (Throwable $e) {
        return;
    }
    foreach ($recipes as $r) {
        if (recipe_filter_passes($r, $data)) {
            run_recipe($r, $data + ['event' => $event]);
        }
    }
}

function recipe_config(array $r): array
{
    return json_decode((string) $r['config'], true) ?: [];
}

/** Optional event filters: entry type and minimum amount. */
function recipe_filter_passes(array $r, array $data): bool
{
    $c = recipe_config($r);
    if (!empty($c['filter_type']) && ($data['type'] ?? '') !== $c['filter_type']) {
        return false;
    }
    if (!empty($c['min_amount']) && (float) ($data['amount'] ?? 0) < (float) $c['min_amount']) {
        return false;
    }
    return true;
}

/** The most recent time a scheduled recipe should have run, or null for non-scheduled triggers. */
function recipe_last_occurrence(array $r, ?int $now = null): ?int
{
    $now ??= time();
    $v = trim((string) $r['trigger_value']);
    $time = preg_match('/(\d{1,2}):(\d{2})$/', $v, $m) ? sprintf('%02d:%02d', $m[1], $m[2]) : '08:00';
    switch ($r['trigger_type']) {
        case 'daily':
            $t = strtotime(date('Y-m-d', $now) . ' ' . $time);
            return $t <= $now ? $t : strtotime('-1 day', $t);
        case 'weekly':
            $dow = max(1, min(7, (int) $v)); // 1 = Monday
            $t = strtotime(date('Y-m-d', $now) . ' ' . $time);
            $t = strtotime('-' . ((((int) date('N', $now)) - $dow + 7) % 7) . ' days', $t);
            return $t <= $now ? $t : strtotime('-7 days', $t);
        case 'monthly':
            $day = max(1, min(31, (int) $v));
            $at = function (int $ref) use ($day, $time) {
                $d = min($day, (int) date('t', $ref));
                return strtotime(date('Y-m-', $ref) . sprintf('%02d', $d) . ' ' . $time);
            };
            $t = $at($now);
            return $t <= $now ? $t : $at(strtotime('first day of last month', $now));
    }
    return null;
}

function recipe_is_due(array $r, ?int $now = null): bool
{
    $occ = recipe_last_occurrence($r, $now);
    if ($occ === null || $occ < strtotime($r['created_at'])) {
        return false;
    }
    return !$r['last_run_at'] || strtotime($r['last_run_at']) < $occ;
}

/** Called from cron.php (and opportunistically after page loads). */
function run_due_recipes(): array
{
    set_setting('cron_last_tick', now());
    $ran = [];
    foreach (q("SELECT * FROM recipes WHERE enabled = 1 AND trigger_type IN ('daily','weekly','monthly')")->fetchAll() as $r) {
        if (recipe_is_due($r)) {
            $res = run_recipe($r);
            $ran[] = $r['name'] . ': ' . ($res['ok'] ? 'ok' : $res['output']);
        }
    }
    // Hourly Notion auto-sync when enabled.
    if (setting('notion_auto') === '1' && setting('notion_db_entries') && strtotime((string) setting('notion_auto_last', '1970-01-01')) < time() - 3600) {
        set_setting('notion_auto_last', now());
        try {
            notion_sync();
            $ran[] = 'notion sync: ok';
        } catch (Throwable $e) {
            $ran[] = 'notion sync: ' . $e->getMessage();
        }
    }
    return $ran;
}

/** Replaces {{placeholders}} with live values and event fields. */
function render_template(string $tpl, array $event = []): string
{
    $vars = [];
    $need = fn(string $k) => str_contains($tpl, '{{' . $k);
    $vars['date'] = date('Y-m-d');
    $vars['time'] = date('H:i');
    $vars['site'] = base_url();
    if ($need('month_') || $need('balance')) {
        $r = build_report(date('Y-m-01'), date('Y-m-t'));
        $vars['month_income'] = money($r['income']);
        $vars['month_expense'] = money($r['expense']);
        $vars['balance'] = money($r['income'] - $r['expense']);
    }
    if ($need('open_tasks') || $need('tasks_list')) {
        $tasks = q("SELECT title, entry_date FROM entries WHERE type = 'task' AND status = 'open' ORDER BY entry_date LIMIT 20")->fetchAll();
        $vars['open_tasks'] = (string) count($tasks);
        $vars['tasks_list'] = $tasks ? implode("\n", array_map(fn($t) => '☐ ' . $t['title'] . ' (' . $t['entry_date'] . ')', $tasks)) : '—';
    }
    if ($need('customers')) {
        $vars['customers'] = (string) q('SELECT COUNT(*) FROM customers')->fetchColumn();
    }
    if ($need('today_summary')) {
        $vars['today_summary'] = report_text(build_report(date('Y-m-d'), date('Y-m-d')), t('period_today'));
    }
    foreach ($event as $k => $v) {
        if (is_scalar($v) || $v === null) {
            $vars['event.' . $k] = $k === 'amount' && $v !== null ? money((float) $v) : (string) $v;
        }
    }
    return preg_replace_callback('/\{\{\s*([\w.]+)\s*\}\}/', fn($m) => $vars[$m[1]] ?? '', $tpl);
}

/**
 * Executes one recipe and records the run.
 * @return array{ok:bool,output:string}
 */
function run_recipe(array $r, array $event = []): array
{
    $GLOBALS['LH_RECIPE_RUNNING'] = true;
    $c = recipe_config($r);
    try {
        switch ($r['action_type']) {
            case 'telegram':
                $msg = render_template((string) ($c['message'] ?? ''), $event);
                $res = telegram_notify($msg);
                $out = $res['ok'] ? $msg : throw new RuntimeException($res['error']);
                break;

            case 'ai':
                $prompt = render_template((string) ($c['prompt'] ?? ''), $event);
                if ($event) {
                    $prompt .= "\n\nEvent data: " . json_encode($event, JSON_UNESCAPED_UNICODE);
                }
                $res = ai_ask($prompt, true);
                if (!$res['ok']) {
                    throw new RuntimeException($res['error']);
                }
                [$out] = ai_extract_actions($res['text']);
                $deliver = (array) ($c['deliver'] ?? ['telegram']);
                if (in_array('note', $deliver, true)) {
                    apply_action(['action' => 'add_note', 'title' => '✦ ' . $r['name'] . ' — ' . date('Y-m-d'), 'content' => $out]);
                }
                if (in_array('telegram', $deliver, true)) {
                    $tg = telegram_notify('✦ ' . $r['name'] . "\n\n" . $out);
                    if (!$tg['ok'] && !in_array('note', $deliver, true)) {
                        throw new RuntimeException($tg['error']);
                    }
                }
                break;

            case 'report':
                [$from, $to, $label] = period_range((string) ($c['period'] ?? 'today'));
                $out = report_text(build_report($from, $to), $label);
                $res = telegram_notify($out);
                if (!$res['ok']) {
                    throw new RuntimeException($res['error']);
                }
                break;

            case 'notion_overview':
                [$from, $to, $label] = period_range((string) ($c['period'] ?? 'month'));
                $report = build_report($from, $to);
                $insight = '';
                if (!empty($c['with_ai']) && ai_provider()) {
                    $ai = ai_ask(t('ai_insight_prompt') . "\n\n" . report_text($report, $label), false);
                    $insight = $ai['ok'] ? ai_extract_actions($ai['text'])[0] : '';
                }
                $out = notion_overview_page('LifeHub — ' . $label, $report, $insight);
                break;

            case 'notion_sync':
                $s = notion_sync();
                $out = sprintf(t('notion_sync_result'), $s['pushed'], $s['updated'], $s['pulled']);
                break;

            case 'webhook':
                $url = (string) ($c['url'] ?? '');
                if (!preg_match('#^https?://#i', $url)) {
                    throw new RuntimeException('Invalid URL');
                }
                $payload = ['recipe' => $r['name'], 'event' => $event['event'] ?? $r['trigger_type'], 'data' => $event, 'sent_at' => now(), 'site' => base_url()];
                if (!empty($c['include_summary'])) {
                    $payload['summary'] = build_report(date('Y-m-01'), date('Y-m-t'));
                }
                [$code, , $raw] = http_request('POST', $url, ['Content-Type: application/json'], $payload, 30);
                if ($code < 200 || $code >= 300) {
                    throw new RuntimeException('HTTP ' . $code . ' ' . mb_substr($raw, 0, 120));
                }
                $out = 'HTTP ' . $code;
                break;

            case 'add_entry':
                $res = apply_action(['action' => 'add_entry', 'type' => $c['type'] ?? 'expense', 'title' => render_template((string) ($c['title'] ?? ''), $event),
                    'amount' => $c['amount'] ?? 0, 'customer' => $c['customer'] ?? '', 'date' => date('Y-m-d')]);
                if (!$res['ok']) {
                    throw new RuntimeException($res['message']);
                }
                $out = $res['message'];
                break;

            default:
                throw new RuntimeException('Unknown action');
        }
        $result = ['ok' => true, 'output' => (string) $out];
    } catch (Throwable $e) {
        $result = ['ok' => false, 'output' => $e->getMessage()];
    } finally {
        $GLOBALS['LH_RECIPE_RUNNING'] = false;
    }
    q('UPDATE recipes SET last_run_at = ?, last_status = ?, run_count = run_count + 1 WHERE id = ?',
        [now(), ($result['ok'] ? '✓ ' : '✗ ') . mb_substr($result['output'], 0, 240), $r['id']]);
    q('INSERT INTO recipe_runs (recipe_id, ok, output, created_at) VALUES (?, ?, ?, ?)', [$r['id'], $result['ok'] ? 1 : 0, mb_substr($result['output'], 0, 4000), now()]);
    if (mt_rand(1, 20) === 1) {
        $keep = q('SELECT id FROM recipe_runs ORDER BY id DESC LIMIT 1 OFFSET 300')->fetchColumn();
        if ($keep) {
            q('DELETE FROM recipe_runs WHERE id <= ?', [$keep]);
        }
    }
    return $result;
}

/**
 * Natural-language command from Telegram or the phone API: the AI answers and its actions are applied directly.
 * The conversation is kept as a chat on the AI page (one per channel).
 */
function assistant_say(string $text, string $channel, ?array $image = null, ?int $mediaId = null): array
{
    $key = 'chat_' . $channel;
    $chatId = (int) setting($key, '0');
    if (!$chatId || !q('SELECT id FROM ai_chats WHERE id = ?', [$chatId])->fetchColumn()) {
        q('INSERT INTO ai_chats (title, created_at, updated_at) VALUES (?, ?, ?)', [ucfirst($channel), now(), now()]);
        $chatId = (int) db()->lastInsertId();
        set_setting($key, (string) $chatId);
    }
    q('INSERT INTO ai_messages (chat_id, role, content, media_id, created_at) VALUES (?, ?, ?, ?, ?)', [$chatId, 'user', $text, $mediaId, now()]);
    $history = array_reverse(q('SELECT role, content FROM ai_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 10', [$chatId])->fetchAll());
    $res = ai_chat($history, ai_system_prompt(true), $image);
    if (!$res['ok']) {
        return ['ok' => false, 'reply' => '⚠ ' . $res['error'], 'applied' => []];
    }
    [$reply, $actions] = ai_extract_actions($res['text']);
    $applied = [];
    foreach ($actions as $i => $a) {
        $r = apply_action($a);
        $actions[$i]['_applied'] = $r['ok'];
        $applied[] = ($r['ok'] ? '✅ ' : '⚠ ') . $r['message'];
    }
    q('INSERT INTO ai_messages (chat_id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?)',
        [$chatId, 'assistant', $reply, $actions ? json_encode($actions, JSON_UNESCAPED_UNICODE) : null, now()]);
    q('UPDATE ai_chats SET updated_at = ? WHERE id = ?', [now(), $chatId]);
    return ['ok' => true, 'reply' => $reply, 'applied' => $applied];
}

/** Human-readable "when" text for a recipe. */
function recipe_trigger_label(array $r): string
{
    $v = (string) $r['trigger_value'];
    $days = (array) ($GLOBALS['LANG']['weekdays'] ?? []);
    return match ($r['trigger_type']) {
        'daily' => sprintf(t('trg_daily_at'), $v),
        'weekly' => sprintf(t('trg_weekly_at'), $days[(int) $v - 1] ?? $v, substr($v, strpos($v, ' ') + 1)),
        'monthly' => sprintf(t('trg_monthly_at'), (int) $v, substr($v, strpos($v, ' ') + 1)),
        'event' => t('trg_event_' . $v),
        'webhook' => t('trg_webhook'),
        default => t('trg_manual'),
    };
}
