<?php
// Numbers for a date range, shared by the Reports page, Notion overview pages, Telegram and recipes.

function build_report(string $from, string $to): array
{
    $sum = fn(string $type) => (float) q('SELECT COALESCE(SUM(amount), 0) FROM entries WHERE type = ? AND entry_date BETWEEN ? AND ?', [$type, $from, $to])->fetchColumn();
    return [
        'from' => $from,
        'to' => $to,
        'income' => $sum('income'),
        'expense' => $sum('expense'),
        'entries' => (int) q('SELECT COUNT(*) FROM entries WHERE entry_date BETWEEN ? AND ?', [$from, $to])->fetchColumn(),
        'new_customers' => (int) q('SELECT COUNT(*) FROM customers WHERE created_at BETWEEN ? AND ?', [$from . ' 00:00:00', $to . ' 23:59:59'])->fetchColumn(),
        'tasks_done' => (int) q("SELECT COUNT(*) FROM entries WHERE type = 'task' AND status = 'done' AND entry_date BETWEEN ? AND ?", [$from, $to])->fetchColumn(),
        'tasks_open' => (int) q("SELECT COUNT(*) FROM entries WHERE type = 'task' AND status = 'open'")->fetchColumn(),
        'top_customers' => q("SELECT c.id, c.name, SUM(e.amount) AS total, COUNT(*) AS n FROM entries e JOIN customers c ON c.id = e.customer_id
                              WHERE e.type = 'income' AND e.entry_date BETWEEN ? AND ? GROUP BY c.id, c.name ORDER BY total DESC LIMIT 10", [$from, $to])->fetchAll(),
        'top_expenses' => q("SELECT title, SUM(amount) AS total, COUNT(*) AS n FROM entries
                             WHERE type = 'expense' AND entry_date BETWEEN ? AND ? GROUP BY title ORDER BY total DESC LIMIT 10", [$from, $to])->fetchAll(),
        'open_tasks' => q("SELECT id, title, entry_date FROM entries WHERE type = 'task' AND status = 'open' ORDER BY entry_date LIMIT 15")->fetchAll(),
    ];
}

/** Income/expense per month for a year (aggregated in PHP so it works on MySQL and SQLite). */
function monthly_totals(int $year): array
{
    $months = [];
    for ($m = 1; $m <= 12; $m++) {
        $months[sprintf('%04d-%02d', $year, $m)] = ['income' => 0.0, 'expense' => 0.0];
    }
    $rows = q("SELECT type, amount, entry_date FROM entries WHERE type IN ('income','expense') AND entry_date BETWEEN ? AND ?", ["$year-01-01", "$year-12-31"]);
    foreach ($rows as $r) {
        $k = substr($r['entry_date'], 0, 7);
        if (isset($months[$k])) {
            $months[$k][$r['type']] += (float) $r['amount'];
        }
    }
    return $months;
}

/** Plain-text summary for Telegram messages and AI prompts. */
function report_text(array $r, string $label): string
{
    $lines = ["📊 $label", '',
        '↗ ' . t('income') . ': ' . money($r['income']),
        '↘ ' . t('expense') . ': ' . money($r['expense']),
        '⚖ ' . t('balance') . ': ' . money($r['income'] - $r['expense']),
        '👥 ' . t('new_customers') . ': ' . $r['new_customers'],
        '✅ ' . t('tasks_done') . ': ' . $r['tasks_done'] . ' · ⏳ ' . t('open_tasks') . ': ' . $r['tasks_open'],
    ];
    if ($r['top_customers']) {
        $lines[] = '';
        $lines[] = '🏆 ' . t('top_customers') . ':';
        foreach (array_slice($r['top_customers'], 0, 5) as $c) {
            $lines[] = '• ' . $c['name'] . ' — ' . money((float) $c['total']);
        }
    }
    if ($r['top_expenses']) {
        $lines[] = '';
        $lines[] = '💸 ' . t('top_expenses') . ':';
        foreach (array_slice($r['top_expenses'], 0, 5) as $x) {
            $lines[] = '• ' . $x['title'] . ' — ' . money((float) $x['total']);
        }
    }
    if ($r['open_tasks']) {
        $lines[] = '';
        $lines[] = '📋 ' . t('open_tasks') . ':';
        foreach (array_slice($r['open_tasks'], 0, 8) as $tk) {
            $lines[] = '☐ ' . $tk['title'] . ' (' . $tk['entry_date'] . ')';
        }
    }
    return implode("\n", $lines);
}

/** Named periods used by reports, recipes and the bot. */
function period_range(string $period): array
{
    return match ($period) {
        'today' => [date('Y-m-d'), date('Y-m-d'), t('period_today')],
        'yesterday' => [date('Y-m-d', strtotime('-1 day')), date('Y-m-d', strtotime('-1 day')), t('period_yesterday')],
        'week' => [date('Y-m-d', strtotime('-6 days')), date('Y-m-d'), t('period_week')],
        'last_month' => [date('Y-m-01', strtotime('first day of last month')), date('Y-m-t', strtotime('last day of last month')), date('F Y', strtotime('first day of last month'))],
        'year' => [date('Y-01-01'), date('Y-12-31'), date('Y')],
        default => [date('Y-m-01'), date('Y-m-t'), date('F Y')],
    };
}
