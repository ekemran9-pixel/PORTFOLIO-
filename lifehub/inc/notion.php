<?php
// Notion integration: create LifeHub databases, two-way sync of customers and entries, overview pages.

const NOTION_VERSION = '2022-06-28';

function notion_token(): string
{
    return (string) setting('api_notion', '');
}

/** @return array{0:int,1:mixed} */
function notion_api(string $method, string $path, ?array $body = null): array
{
    [$code, $json, $raw] = http_request($method, endpoint('notion') . $path, [
        'Authorization: Bearer ' . notion_token(),
        'Notion-Version: ' . NOTION_VERSION,
        'Content-Type: application/json',
    ], $body, 60);
    if ($code < 200 || $code >= 300) {
        throw new RuntimeException('Notion ' . api_error_message($code, $json, $raw));
    }
    usleep(340000); // Notion allows ~3 requests per second
    return [$code, $json];
}

/** Accepts a Notion page URL or ID and returns the 32-char ID. */
function notion_parse_id(string $input): string
{
    $clean = str_replace('-', '', trim(explode('?', $input)[0]));
    return preg_match('/([0-9a-f]{32})$/i', $clean, $m) ? strtolower($m[1]) : '';
}

function nt_text(?string $s): array
{
    $s = (string) $s;
    return $s === '' ? [] : [['type' => 'text', 'text' => ['content' => mb_substr($s, 0, 1990)]]];
}

/** Plain value of a Notion property. */
function nt_value(?array $prop): string
{
    if (!$prop) {
        return '';
    }
    switch ($prop['type']) {
        case 'title':
        case 'rich_text':
            return trim(implode('', array_map(fn($t) => $t['plain_text'] ?? '', $prop[$prop['type']])));
        case 'number':
            return $prop['number'] === null ? '' : (string) $prop['number'];
        case 'select':
            return $prop['select']['name'] ?? '';
        case 'multi_select':
            return implode(', ', array_map(fn($o) => $o['name'], $prop['multi_select']));
        case 'date':
            return $prop['date']['start'] ?? '';
        case 'phone_number':
        case 'email':
        case 'url':
            return (string) ($prop[$prop['type']] ?? '');
        case 'checkbox':
            return $prop['checkbox'] ? '1' : '';
    }
    return '';
}

/** Creates the two LifeHub databases under a parent page the integration can access. */
function notion_setup(string $parentId): void
{
    $select = fn(array $names) => ['select' => ['options' => array_map(fn($n) => ['name' => $n], $names)]];
    [, $c] = notion_api('POST', '/databases', [
        'parent' => ['type' => 'page_id', 'page_id' => $parentId],
        'title' => nt_text('LifeHub — Customers'),
        'properties' => [
            'Name' => ['title' => new stdClass()],
            'Phone' => ['phone_number' => new stdClass()],
            'Email' => ['email' => new stdClass()],
            'Company' => ['rich_text' => new stdClass()],
            'Address' => ['rich_text' => new stdClass()],
            'Tags' => ['multi_select' => new stdClass()],
            'Notes' => ['rich_text' => new stdClass()],
            'LifeHub ID' => ['number' => new stdClass()],
        ],
    ]);
    [, $e] = notion_api('POST', '/databases', [
        'parent' => ['type' => 'page_id', 'page_id' => $parentId],
        'title' => nt_text('LifeHub — Entries'),
        'properties' => [
            'Title' => ['title' => new stdClass()],
            'Type' => $select(['income', 'expense', 'task', 'note']),
            'Amount' => ['number' => ['format' => 'number_with_commas']],
            'Date' => ['date' => new stdClass()],
            'Status' => $select(['open', 'done']),
            'Customer' => ['rich_text' => new stdClass()],
            'Notes' => ['rich_text' => new stdClass()],
            'LifeHub ID' => ['number' => new stdClass()],
        ],
    ]);
    set_setting('notion_parent', $parentId);
    set_setting('notion_db_customers', $c['id']);
    set_setting('notion_db_entries', $e['id']);
    q('UPDATE customers SET notion_id = NULL');
    q('UPDATE entries SET notion_id = NULL');
    set_setting('notion_last_sync', '');
}

function notion_customer_props(array $c): array
{
    $tags = array_values(array_filter(array_map(fn($t) => mb_substr(str_replace(',', ' ', trim($t)), 0, 100), explode(',', (string) $c['tags']))));
    return [
        'Name' => ['title' => nt_text($c['name'])],
        'Phone' => ['phone_number' => $c['phone'] ?: null],
        'Email' => ['email' => filter_var($c['email'], FILTER_VALIDATE_EMAIL) ? $c['email'] : null],
        'Company' => ['rich_text' => nt_text($c['company'])],
        'Address' => ['rich_text' => nt_text($c['address'])],
        'Tags' => ['multi_select' => array_map(fn($t) => ['name' => $t], array_unique($tags))],
        'Notes' => ['rich_text' => nt_text($c['notes'])],
        'LifeHub ID' => ['number' => (int) $c['id']],
    ];
}

function notion_entry_props(array $e): array
{
    return [
        'Title' => ['title' => nt_text($e['title'])],
        'Type' => ['select' => ['name' => $e['type']]],
        'Amount' => ['number' => (float) $e['amount']],
        'Date' => ['date' => ['start' => $e['entry_date']]],
        'Status' => ['select' => ['name' => $e['status']]],
        'Customer' => ['rich_text' => nt_text($e['customer_name'] ?? '')],
        'Notes' => ['rich_text' => nt_text($e['notes'])],
        'LifeHub ID' => ['number' => (int) $e['id']],
    ];
}

/**
 * Pushes new and changed rows to Notion, then pulls rows added in Notion.
 * Works in batches so a shared-hosting request never runs too long.
 * @return array{pushed:int,updated:int,pulled:int,remaining:int}
 */
function notion_sync(int $limit = 60): array
{
    $dbC = setting('notion_db_customers');
    $dbE = setting('notion_db_entries');
    if (!notion_token() || !$dbC || !$dbE) {
        throw new RuntimeException(t('notion_not_ready'));
    }
    $since = setting('notion_last_sync') ?: '1970-01-01 00:00:00';
    $started = now();
    $stats = ['pushed' => 0, 'updated' => 0, 'pulled' => 0, 'remaining' => 0];
    $budget = $limit;

    $customers = q('SELECT * FROM customers WHERE notion_id IS NULL OR updated_at > ? ORDER BY id', [$since])->fetchAll();
    $entries = q('SELECT e.*, c.name AS customer_name FROM entries e LEFT JOIN customers c ON c.id = e.customer_id
                  WHERE e.notion_id IS NULL OR COALESCE(e.updated_at, e.created_at) > ? ORDER BY e.id', [$since])->fetchAll();

    foreach ([['customers', $customers, $dbC, 'notion_customer_props'], ['entries', $entries, $dbE, 'notion_entry_props']] as [$table, $rows, $db, $props]) {
        foreach ($rows as $row) {
            if ($budget-- <= 0) {
                $stats['remaining']++;
                continue;
            }
            if ($row['notion_id']) {
                notion_api('PATCH', '/pages/' . $row['notion_id'], ['properties' => $props($row)]);
                $stats['updated']++;
            } else {
                [, $page] = notion_api('POST', '/pages', ['parent' => ['database_id' => $db], 'properties' => $props($row)]);
                q("UPDATE $table SET notion_id = ? WHERE id = ?", [$page['id'], $row['id']]);
                $stats['pushed']++;
            }
        }
    }

    // Pull: pages created in Notion (no LifeHub ID yet) become LifeHub rows.
    if ($budget > 0) {
        $stats['pulled'] += notion_pull($dbC, 'customers', $budget);
        $stats['pulled'] += notion_pull($dbE, 'entries', $budget);
    }

    if ($stats['remaining'] === 0) {
        set_setting('notion_last_sync', $started);
    }
    set_setting('notion_last_result', json_encode($stats + ['at' => now()]));
    log_activity('notion_synced', "+{$stats['pushed']} ~{$stats['updated']} ↓{$stats['pulled']}");
    return $stats;
}

function notion_pull(string $db, string $table, int &$budget): int
{
    [, $res] = notion_api('POST', '/databases/' . $db . '/query', [
        'filter' => ['property' => 'LifeHub ID', 'number' => ['is_empty' => true]],
        'page_size' => 50,
    ]);
    $n = 0;
    foreach ($res['results'] ?? [] as $page) {
        if ($budget-- <= 0) {
            break;
        }
        $p = $page['properties'];
        if ($table === 'customers') {
            $name = nt_value($p['Name'] ?? null);
            if ($name === '') {
                continue;
            }
            q('INSERT INTO customers (name, phone, email, company, address, tags, notes, notion_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$name, nt_value($p['Phone'] ?? null), nt_value($p['Email'] ?? null), nt_value($p['Company'] ?? null), nt_value($p['Address'] ?? null),
                 nt_value($p['Tags'] ?? null), nt_value($p['Notes'] ?? null), $page['id'], now(), now()]);
        } else {
            $title = nt_value($p['Title'] ?? null);
            if ($title === '') {
                continue;
            }
            $type = in_array(nt_value($p['Type'] ?? null), ['income', 'expense', 'task', 'note'], true) ? nt_value($p['Type']) : 'note';
            $date = substr(nt_value($p['Date'] ?? null), 0, 10) ?: date('Y-m-d');
            $cname = nt_value($p['Customer'] ?? null);
            q('INSERT INTO entries (customer_id, type, title, amount, entry_date, status, notes, notion_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$cname !== '' ? find_or_create_customer($cname) : null, $type, $title, (float) nt_value($p['Amount'] ?? null), $date,
                 nt_value($p['Status'] ?? null) === 'done' ? 'done' : 'open', nt_value($p['Notes'] ?? null), $page['id'], now(), now()]);
        }
        $id = (int) db()->lastInsertId();
        notion_api('PATCH', '/pages/' . $page['id'], ['properties' => ['LifeHub ID' => ['number' => $id]]]);
        // Keep the pulled row from being pushed straight back as "changed".
        q("UPDATE $table SET updated_at = ? WHERE id = ?", ['1970-01-01 00:00:00', $id]);
        $n++;
    }
    return $n;
}

/** Archives the Notion copy of a deleted row; failures are ignored. */
function notion_archive(?string $pageId): void
{
    if (!$pageId || !notion_token()) {
        return;
    }
    try {
        notion_api('PATCH', '/pages/' . $pageId, ['archived' => true]);
    } catch (Throwable $e) {
    }
}

/** Creates a Notion page with a report and returns its URL. */
function notion_overview_page(string $title, array $report, string $insight = ''): string
{
    $parent = setting('notion_parent');
    if (!notion_token() || !$parent) {
        throw new RuntimeException(t('notion_not_ready'));
    }
    $para = fn(string $s) => ['object' => 'block', 'type' => 'paragraph', 'paragraph' => ['rich_text' => nt_text($s)]];
    $h2 = fn(string $s) => ['object' => 'block', 'type' => 'heading_2', 'heading_2' => ['rich_text' => nt_text($s)]];
    $li = fn(string $s) => ['object' => 'block', 'type' => 'bulleted_list_item', 'bulleted_list_item' => ['rich_text' => nt_text($s)]];

    $blocks = [
        ['object' => 'block', 'type' => 'callout', 'callout' => ['icon' => ['emoji' => '📊'], 'rich_text' => nt_text(sprintf(
            '%s: %s · %s: %s · %s: %s', t('income'), money($report['income']), t('expense'), money($report['expense']), t('balance'), money($report['income'] - $report['expense'])))]],
    ];
    if (!empty($report['top_customers'])) {
        $blocks[] = $h2(t('top_customers'));
        foreach ($report['top_customers'] as $c) {
            $blocks[] = $li($c['name'] . ' — ' . money((float) $c['total']));
        }
    }
    if (!empty($report['top_expenses'])) {
        $blocks[] = $h2(t('top_expenses'));
        foreach ($report['top_expenses'] as $x) {
            $blocks[] = $li($x['title'] . ' — ' . money((float) $x['total']));
        }
    }
    if (!empty($report['open_tasks'])) {
        $blocks[] = $h2(t('open_tasks'));
        foreach ($report['open_tasks'] as $tk) {
            $blocks[] = ['object' => 'block', 'type' => 'to_do', 'to_do' => ['rich_text' => nt_text($tk['title']), 'checked' => false]];
        }
    }
    if ($insight !== '') {
        $blocks[] = $h2('✦ AI');
        foreach (array_filter(array_map('trim', explode("\n", $insight))) as $line) {
            $blocks[] = preg_match('/^[-*•]\s+(.*)/u', $line, $m) ? $li(str_replace('**', '', $m[1])) : $para(str_replace(['**', '#'], '', $line));
        }
    }
    [, $page] = notion_api('POST', '/pages', [
        'parent' => ['page_id' => $parent],
        'icon' => ['emoji' => '📊'],
        'properties' => ['title' => ['title' => nt_text($title)]],
        'children' => array_slice($blocks, 0, 100),
    ]);
    log_activity('notion_page', $title);
    return $page['url'] ?? '';
}
