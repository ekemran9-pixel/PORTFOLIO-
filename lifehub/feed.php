<?php
// Read-only live data link for Google Sheets (=IMPORTDATA) and Excel (Data → From Web). Protected by a secret key.
require __DIR__ . '/inc/bootstrap.php';

$key = (string) ($_GET['key'] ?? '');
$saved = (string) setting('feed_key', '');
if ($saved === '' || !hash_equals($saved, $key)) {
    http_response_code(403);
    exit('Forbidden');
}
session_write_close();

$table = $_GET['table'] ?? 'entries';
if ($table === 'customers') {
    $rows = q('SELECT id, name, phone, email, company, address, tags, notes, created_at FROM customers ORDER BY name')->fetchAll();
} elseif ($table === 'summary') {
    $rows = [];
    foreach (monthly_totals((int) ($_GET['year'] ?? date('Y'))) as $m => $v) {
        $rows[] = ['month' => $m, 'income' => $v['income'], 'expense' => $v['expense'], 'balance' => $v['income'] - $v['expense']];
    }
} else {
    $rows = q('SELECT e.id, e.entry_date AS date, e.type, e.title, e.amount, e.status, c.name AS customer, e.notes
               FROM entries e LEFT JOIN customers c ON c.id = e.customer_id ORDER BY e.entry_date DESC, e.id DESC')->fetchAll();
}

if (($_GET['format'] ?? 'csv') === 'json') {
    json_out(['rows' => $rows]);
}
header('Content-Type: text/csv; charset=utf-8');
header('Cache-Control: no-store');
$out = fopen('php://output', 'w');
if (!empty($_GET['bom'])) {
    fwrite($out, "\xEF\xBB\xBF");
}
if ($rows) {
    fputcsv($out, array_keys($rows[0]));
}
foreach ($rows as $r) {
    fputcsv($out, array_map(fn($v) => is_string($v) && preg_match('/^[=+\-@]/', $v) && !is_numeric($v) ? "'" . $v : $v, $r));
}
fclose($out);
