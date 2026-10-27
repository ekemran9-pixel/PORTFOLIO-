<?php
// Export customers or entries as CSV (opens in Excel, Bangla-safe) or JSON (turned into .xlsx in the browser).
require __DIR__ . '/inc/bootstrap.php';
require_login();

$table = $_GET['table'] ?? '';
$format = ($_GET['format'] ?? 'csv') === 'json' ? 'json' : 'csv';

if ($table === 'customers') {
    $rows = q('SELECT id, name, phone, email, company, address, tags, notes, created_at FROM customers ORDER BY name')->fetchAll();
} elseif ($table === 'entries') {
    $where = [];
    $params = [];
    foreach (['type' => 'e.type = ?', 'status' => 'e.status = ?', 'from' => 'e.entry_date >= ?', 'to' => 'e.entry_date <= ?'] as $k => $sql) {
        if (!empty($_GET[$k]) && is_string($_GET[$k])) {
            $where[] = $sql;
            $params[] = $_GET[$k];
        }
    }
    if (!empty($_GET['q']) && is_string($_GET['q'])) {
        $where[] = '(e.title LIKE ? OR e.notes LIKE ? OR c.name LIKE ?)';
        array_push($params, ...array_fill(0, 3, '%' . $_GET['q'] . '%'));
    }
    $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $rows = q("SELECT e.id, e.entry_date AS date, e.type, e.title, e.amount, e.status, c.name AS customer, e.notes
               FROM entries e LEFT JOIN customers c ON c.id = e.customer_id $whereSql ORDER BY e.entry_date DESC, e.id DESC", $params)->fetchAll();
} else {
    http_response_code(400);
    exit('Unknown table');
}

log_activity('exported', $table . ' (' . count($rows) . ')');

if ($format === 'json') {
    json_out(['rows' => $rows]);
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $table . '-' . date('Y-m-d') . '.csv"');
$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // BOM so Excel reads Bangla text correctly
if ($rows) {
    fputcsv($out, array_keys($rows[0]));
}
foreach ($rows as $r) {
    // Neutralise spreadsheet formula injection.
    fputcsv($out, array_map(fn($v) => is_string($v) && preg_match('/^[=+\-@]/', $v) && !is_numeric($v) ? "'" . $v : $v, $r));
}
fclose($out);
