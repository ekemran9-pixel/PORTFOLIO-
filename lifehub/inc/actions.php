<?php
// Data-changing actions shared by the AI assistant, Telegram bot, webhook API and recipes.

/**
 * Applies one action array (see ai_system_prompt for the shapes).
 * @return array{ok:bool,message:string,id?:int}
 */
function apply_action(array $a): array
{
    $s = fn(string $k, int $max = 1000) => mb_substr(trim((string) (is_scalar($a[$k] ?? null) ? $a[$k] : '')), 0, $max);

    switch ($a['action'] ?? '') {
        case 'add_entry':
            $title = $s('title', 190);
            if ($title === '') {
                return ['ok' => false, 'message' => t('title_required')];
            }
            $type = in_array($s('type'), ['income', 'expense', 'task', 'note'], true) ? $s('type') : 'note';
            $ts = $s('date') !== '' ? strtotime($s('date')) : false;
            $date = $ts ? date('Y-m-d', $ts) : date('Y-m-d');
            $amount = (float) preg_replace('/[^\d.\-]/', '', (string) ($a['amount'] ?? '0'));
            $status = $s('status') === 'done' ? 'done' : 'open';
            $customerId = null;
            if ($s('customer') !== '') {
                $customerId = find_or_create_customer($s('customer', 190));
            }
            q('INSERT INTO entries (customer_id, type, title, amount, entry_date, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$customerId, $type, $title, $amount, $date, $status, $s('notes', 5000), now(), now()]);
            $id = (int) db()->lastInsertId();
            log_activity('entry_added', $title);
            fire_event('entry_added', entry_event_data($id));
            return ['ok' => true, 'id' => $id, 'message' => t($type) . ': ' . $title . ($amount ? ' — ' . money($amount) : '') . ' (' . $date . ')'];

        case 'add_customer':
            $name = $s('name', 190);
            if ($name === '') {
                return ['ok' => false, 'message' => t('name_required')];
            }
            q('INSERT INTO customers (name, phone, email, company, address, tags, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$name, $s('phone', 64), $s('email', 190), $s('company', 190), $s('address'), $s('tags', 255), $s('notes', 5000), now(), now()]);
            $id = (int) db()->lastInsertId();
            log_activity('customer_added', $name);
            fire_event('customer_added', customer_event_data($id));
            return ['ok' => true, 'id' => $id, 'message' => t('customer') . ': ' . $name];

        case 'add_note':
            $content = $s('content', 20000);
            if ($content === '') {
                return ['ok' => false, 'message' => t('empty')];
            }
            q("INSERT INTO media (kind, title, content, created_at) VALUES ('text', ?, ?, ?)", [$s('title', 190), $content, now()]);
            $id = (int) db()->lastInsertId();
            log_activity('note_added', $s('title', 190) ?: mb_substr($content, 0, 40));
            fire_event('note_added', ['id' => $id, 'title' => $s('title', 190), 'content' => $content]);
            return ['ok' => true, 'id' => $id, 'message' => t('note') . ': ' . ($s('title', 190) ?: mb_strimwidth($content, 0, 60, '…'))];

        case 'complete_task':
            $row = q("SELECT id, title FROM entries WHERE type = 'task' AND status = 'open' AND title = ? ORDER BY id LIMIT 1", [$s('title', 190)])->fetch()
                ?: q("SELECT id, title FROM entries WHERE type = 'task' AND status = 'open' AND title LIKE ? ORDER BY id LIMIT 1", ['%' . $s('title', 190) . '%'])->fetch();
            if (!$row) {
                return ['ok' => false, 'message' => t('not_found') . ': ' . $s('title', 190)];
            }
            q("UPDATE entries SET status = 'done', updated_at = ? WHERE id = ?", [now(), $row['id']]);
            log_activity('entry_updated', $row['title']);
            fire_event('task_done', entry_event_data((int) $row['id']));
            return ['ok' => true, 'id' => (int) $row['id'], 'message' => '✓ ' . $row['title']];
    }
    return ['ok' => false, 'message' => 'Unknown action'];
}

function find_or_create_customer(string $name): int
{
    $id = q('SELECT id FROM customers WHERE name = ?', [$name])->fetchColumn();
    if ($id) {
        return (int) $id;
    }
    q('INSERT INTO customers (name, created_at, updated_at) VALUES (?, ?, ?)', [$name, now(), now()]);
    return (int) db()->lastInsertId();
}

function entry_event_data(int $id): array
{
    return q('SELECT e.id, e.type, e.title, e.amount, e.entry_date AS date, e.status, e.notes, c.name AS customer
              FROM entries e LEFT JOIN customers c ON c.id = e.customer_id WHERE e.id = ?', [$id])->fetch() ?: [];
}

function customer_event_data(int $id): array
{
    return q('SELECT id, name, phone, email, company, address, tags, notes FROM customers WHERE id = ?', [$id])->fetch() ?: [];
}
