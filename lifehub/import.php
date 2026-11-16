<?php
// Excel / CSV import. The browser reads the sheet (SheetJS) and posts mapped rows here as JSON in batches.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

const IMPORT_FIELDS = [
    'customers' => ['name', 'phone', 'email', 'company', 'address', 'tags', 'notes'],
    'entries'   => ['date', 'type', 'title', 'amount', 'status', 'customer', 'notes'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $payload = json_decode(post('payload'), true);
    $table = $payload['table'] ?? '';
    $rows = $payload['rows'] ?? null;
    if (!isset(IMPORT_FIELDS[$table]) || !is_array($rows) || count($rows) > 1000) {
        json_out(['error' => 'bad request'], 400);
    }
    $str = fn($r, $k) => isset($r[$k]) && is_scalar($r[$k]) ? trim((string) $r[$k]) : '';
    $done = 0;
    $skipped = 0;
    db()->beginTransaction();
    try {
        foreach ($rows as $r) {
            if (!is_array($r)) { $skipped++; continue; }
            if ($table === 'customers') {
                if ($str($r, 'name') === '') { $skipped++; continue; }
                q('INSERT INTO customers (name, phone, email, company, address, tags, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [$str($r, 'name'), $str($r, 'phone'), $str($r, 'email'), $str($r, 'company'), $str($r, 'address'), $str($r, 'tags'), $str($r, 'notes'), now(), now()]);
            } else {
                $title = $str($r, 'title');
                if ($title === '') { $skipped++; continue; }
                $type = strtolower($str($r, 'type'));
                $type = in_array($type, ['income', 'expense', 'task', 'note'], true) ? $type : (['আয়' => 'income', 'ব্যয়' => 'expense', 'খরচ' => 'expense', 'কাজ' => 'task'][$type] ?? 'note');
                $status = in_array(strtolower($str($r, 'status')), ['done', 'complete', 'completed', 'সম্পন্ন'], true) ? 'done' : 'open';
                $ts = strtotime($str($r, 'date'));
                $date = $ts ? date('Y-m-d', $ts) : date('Y-m-d');
                $amount = (float) preg_replace('/[^\d.\-]/', '', $str($r, 'amount'));
                $customerId = null;
                if (($cname = $str($r, 'customer')) !== '') {
                    $customerId = q('SELECT id FROM customers WHERE name = ?', [$cname])->fetchColumn() ?: null;
                    if (!$customerId) {
                        q('INSERT INTO customers (name, created_at, updated_at) VALUES (?, ?, ?)', [$cname, now(), now()]);
                        $customerId = (int) db()->lastInsertId();
                    }
                }
                q('INSERT INTO entries (customer_id, type, title, amount, entry_date, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [$customerId, $type, $title, $amount, $date, $status, $str($r, 'notes'), now()]);
            }
            $done++;
        }
        db()->commit();
    } catch (Throwable $ex) {
        db()->rollBack();
        json_out(['error' => $ex->getMessage()], 500);
    }
    if (!empty($payload['last'])) {
        log_activity('imported', $table);
    }
    json_out(['imported' => $done, 'skipped' => $skipped]);
}

page_header(t('nav_import'));
?>
<section class="card">
  <div class="card-head"><h3>📥 <?= e(t('import_title')) ?></h3></div>
  <p class="muted"><?= e(t('import_help')) ?></p>
  <div class="form grid-form">
    <label><?= e(t('target_table')) ?>
      <select id="impTable">
        <option value="customers"><?= e(t('nav_customers')) ?></option>
        <option value="entries"><?= e(t('nav_entries')) ?></option>
      </select>
    </label>
    <label><?= e(t('choose_file')) ?> (.xlsx, .xls, .csv)<input type="file" id="impFile" accept=".xlsx,.xls,.csv"></label>
  </div>
</section>

<section class="card" id="impMapCard" hidden>
  <div class="card-head"><h3><?= e(t('column_mapping')) ?></h3><span id="impCount" class="badge"></span></div>
  <div id="impMap" class="map-grid"></div>
  <h4><?= e(t('preview')) ?></h4>
  <div class="table-wrap"><table class="table" id="impPreview"></table></div>
  <div class="progress" id="impProgress" hidden><span></span></div>
  <p id="impResult"></p>
  <button class="btn primary" id="impStart"><?= e(t('start_import')) ?></button>
</section>

<section class="card">
  <div class="card-head"><h3>💡 <?= e(t('sample_format')) ?></h3></div>
  <div class="grid-2">
    <div><strong><?= e(t('nav_customers')) ?></strong><p class="mono small">name, phone, email, company, address, tags, notes</p></div>
    <div><strong><?= e(t('nav_entries')) ?></strong><p class="mono small">date, type (income/expense/task/note), title, amount, status, customer, notes</p></div>
  </div>
</section>
<script>window.IMPORT_FIELDS = <?= json_encode(array_map(fn($fs) => array_combine($fs, array_map('t', $fs)), IMPORT_FIELDS), JSON_UNESCAPED_UNICODE) ?>;</script>
<?php page_footer(['assets/vendor/xlsx.full.min.js']);
