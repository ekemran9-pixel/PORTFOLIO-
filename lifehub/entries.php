<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

const ENTRY_TYPES = ['income', 'expense', 'task', 'note'];
const ENTRY_STATUSES = ['open', 'done'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int) ($_POST['id'] ?? 0);
    $back = post('back') ?: 'entries.php';
    if (!preg_match('/^[a-z_]+\.php(\?[\w=&%.+-]*)?$/', $back)) {
        $back = 'entries.php';
    }
    if (post('do') === 'delete') {
        $notionId = q('SELECT notion_id FROM entries WHERE id = ?', [$id])->fetchColumn();
        q('DELETE FROM entries WHERE id = ?', [$id]);
        notion_archive($notionId ?: null);
        log_activity('entry_deleted', '#' . $id);
        flash(t('deleted'));
        redirect($back);
    }
    if (post('do') === 'toggle') {
        q("UPDATE entries SET status = CASE WHEN status = 'done' THEN 'open' ELSE 'done' END, updated_at = ? WHERE id = ?", [now(), $id]);
        $row = entry_event_data($id);
        if (($row['status'] ?? '') === 'done' && $row['type'] === 'task') {
            fire_event('task_done', $row);
        }
        redirect($back);
    }
    $type = in_array(post('type'), ENTRY_TYPES, true) ? post('type') : 'note';
    $status = in_array(post('status'), ENTRY_STATUSES, true) ? post('status') : 'open';
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('entry_date')) ? post('entry_date') : date('Y-m-d');
    $customerId = (int) post('customer_id') ?: null;
    $title = post('title');
    if ($title === '') {
        flash(t('title_required'), 'err');
        redirect('entries.php?new=1');
    }
    $vals = [$customerId, $type, $title, (float) str_replace(',', '', post('amount', '0')), $date, $status, post('notes')];
    if ($id) {
        q('UPDATE entries SET customer_id = ?, type = ?, title = ?, amount = ?, entry_date = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?', [...$vals, now(), $id]);
        log_activity('entry_updated', $title);
    } else {
        q('INSERT INTO entries (customer_id, type, title, amount, entry_date, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [...$vals, now(), now()]);
        $newId = (int) db()->lastInsertId();
        log_activity('entry_added', $title);
        fire_event('entry_added', entry_event_data($newId));
    }
    flash(t('saved'));
    redirect($customerId && post('from_customer') ? 'customer.php?id=' . $customerId : 'entries.php');
}

$editing = isset($_GET['edit']) ? (q('SELECT * FROM entries WHERE id = ?', [(int) $_GET['edit']])->fetch() ?: null) : null;
$showForm = $editing || isset($_GET['new']);
$presetCustomer = (int) ($_GET['customer_id'] ?? 0);
$customers = q('SELECT id, name FROM customers ORDER BY name')->fetchAll();

// Filters
$where = [];
$params = [];
$fType = $_GET['type'] ?? '';
$fStatus = $_GET['status'] ?? '';
$fFrom = $_GET['from'] ?? '';
$fTo = $_GET['to'] ?? '';
$search = trim((string) ($_GET['q'] ?? ''));
if (in_array($fType, ENTRY_TYPES, true)) { $where[] = 'e.type = ?'; $params[] = $fType; }
if (in_array($fStatus, ENTRY_STATUSES, true)) { $where[] = 'e.status = ?'; $params[] = $fStatus; }
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fFrom)) { $where[] = 'e.entry_date >= ?'; $params[] = $fFrom; }
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fTo)) { $where[] = 'e.entry_date <= ?'; $params[] = $fTo; }
if ($search !== '') { $where[] = '(e.title LIKE ? OR e.notes LIKE ? OR c.name LIKE ?)'; array_push($params, "%$search%", "%$search%", "%$search%"); }
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$page = max(1, (int) ($_GET['p'] ?? 1));
$perPage = 30;
$offset = ($page - 1) * $perPage;
$from = 'FROM entries e LEFT JOIN customers c ON c.id = e.customer_id';
$total = (int) q("SELECT COUNT(*) $from $whereSql", $params)->fetchColumn();
$sums = q("SELECT e.type, SUM(e.amount) AS s $from $whereSql GROUP BY e.type", $params)->fetchAll(PDO::FETCH_KEY_PAIR);
$list = q("SELECT e.*, c.name AS customer_name $from $whereSql ORDER BY e.entry_date DESC, e.id DESC LIMIT $perPage OFFSET $offset", $params)->fetchAll();
$self = 'entries.php' . (!empty($_SERVER['QUERY_STRING']) ? '?' . $_SERVER['QUERY_STRING'] : '');

page_header(t('nav_entries'));
?>
<?php if ($showForm): $cur = $editing ?: ['type' => $_GET['type'] ?? 'income', 'status' => 'open', 'entry_date' => date('Y-m-d'), 'customer_id' => $presetCustomer]; ?>
<section class="card form-card">
  <div class="card-head"><h3><?= e($editing ? t('edit_entry') : t('add_entry')) ?></h3><a href="entries.php" class="small"><?= e(t('cancel')) ?></a></div>
  <form method="post" class="form grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= (int) ($editing['id'] ?? 0) ?>">
    <?php if ($presetCustomer): ?><input type="hidden" name="from_customer" value="1"><?php endif; ?>
    <div class="full segmented">
      <?php foreach (ENTRY_TYPES as $tp): ?>
        <label><input type="radio" name="type" value="<?= $tp ?>" <?= ($cur['type'] ?? '') === $tp ? 'checked' : '' ?>><span class="type-<?= $tp ?>"><?= e(t($tp)) ?></span></label>
      <?php endforeach; ?>
    </div>
    <label class="full"><?= e(t('title')) ?> *<input name="title" required value="<?= e($cur['title'] ?? '') ?>"></label>
    <label><?= e(t('amount')) ?> (৳)<input name="amount" type="number" step="0.01" inputmode="decimal" value="<?= e(isset($cur['amount']) ? (string) (float) $cur['amount'] : '') ?>"></label>
    <label><?= e(t('date')) ?><input name="entry_date" type="date" value="<?= e($cur['entry_date']) ?>"></label>
    <label><?= e(t('customer')) ?>
      <select name="customer_id"><option value="">— <?= e(t('none')) ?> —</option>
        <?php foreach ($customers as $c): ?><option value="<?= $c['id'] ?>" <?= (int) ($cur['customer_id'] ?? 0) === (int) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?>
      </select>
    </label>
    <label><?= e(t('status')) ?>
      <select name="status"><?php foreach (ENTRY_STATUSES as $s): ?><option value="<?= $s ?>" <?= $cur['status'] === $s ? 'selected' : '' ?>><?= e(t($s)) ?></option><?php endforeach; ?></select>
    </label>
    <label class="full"><?= e(t('notes')) ?><textarea name="notes" rows="3"><?= e($cur['notes'] ?? '') ?></textarea></label>
    <div class="full form-actions"><button class="btn primary"><?= e(t('save')) ?></button></div>
  </form>
</section>
<?php endif; ?>

<section class="card">
  <form class="filters" method="get">
    <input name="q" value="<?= e($search) ?>" placeholder="🔍 <?= e(t('search')) ?>…">
    <select name="type"><option value=""><?= e(t('all_types')) ?></option><?php foreach (ENTRY_TYPES as $tp): ?><option value="<?= $tp ?>" <?= $fType === $tp ? 'selected' : '' ?>><?= e(t($tp)) ?></option><?php endforeach; ?></select>
    <select name="status"><option value=""><?= e(t('all_status')) ?></option><?php foreach (ENTRY_STATUSES as $s): ?><option value="<?= $s ?>" <?= $fStatus === $s ? 'selected' : '' ?>><?= e(t($s)) ?></option><?php endforeach; ?></select>
    <input type="date" name="from" value="<?= e($fFrom) ?>" title="<?= e(t('from')) ?>">
    <input type="date" name="to" value="<?= e($fTo) ?>" title="<?= e(t('to')) ?>">
    <button class="btn"><?= e(t('filter')) ?></button>
  </form>
  <div class="toolbar">
    <div class="sums">
      <span class="type type-income"><?= e(t('income')) ?>: <?= money((float) ($sums['income'] ?? 0)) ?></span>
      <span class="type type-expense"><?= e(t('expense')) ?>: <?= money((float) ($sums['expense'] ?? 0)) ?></span>
      <span class="muted small"><?= e(t('total')) ?>: <?= $total ?></span>
    </div>
    <div class="toolbar-actions">
      <a class="btn" href="export.php?table=entries&format=csv&<?= e(http_build_query(array_intersect_key($_GET, array_flip(['type', 'status', 'from', 'to', 'q'])))) ?>">⬇ CSV</a>
      <button class="btn" data-xlsx="export.php?table=entries&format=json&<?= e(http_build_query(array_intersect_key($_GET, array_flip(['type', 'status', 'from', 'to', 'q'])))) ?>" data-filename="entries.xlsx">⬇ Excel</button>
      <a class="btn primary" href="entries.php?new=1">+ <?= e(t('add_entry')) ?></a>
    </div>
  </div>
  <?php if (!$list): ?><p class="empty"><?= e(t('no_data')) ?></p><?php else: ?>
  <div class="table-wrap"><table class="table">
    <thead><tr><th></th><th><?= e(t('date')) ?></th><th><?= e(t('type')) ?></th><th><?= e(t('title')) ?></th><th class="hide-sm"><?= e(t('customer')) ?></th><th class="right"><?= e(t('amount')) ?></th><th></th></tr></thead>
    <tbody>
    <?php foreach ($list as $en): ?>
      <tr class="<?= $en['status'] === 'done' ? 'is-done' : '' ?>">
        <td><form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="do" value="toggle"><input type="hidden" name="id" value="<?= $en['id'] ?>"><input type="hidden" name="back" value="<?= e($self) ?>"><button class="check <?= $en['status'] === 'done' ? 'on' : '' ?>" title="<?= e(t($en['status'])) ?>"></button></form></td>
        <td class="nowrap"><?= e($en['entry_date']) ?></td>
        <td><span class="type type-<?= e($en['type']) ?>"><?= e(t($en['type'])) ?></span></td>
        <td><a href="entries.php?edit=<?= $en['id'] ?>"><?= e($en['title']) ?></a><?php if ($en['notes']): ?><br><small class="muted"><?= e(mb_strimwidth($en['notes'], 0, 80, '…')) ?></small><?php endif; ?></td>
        <td class="hide-sm"><?php if ($en['customer_id']): ?><a href="customer.php?id=<?= $en['customer_id'] ?>"><?= e($en['customer_name']) ?></a><?php endif; ?></td>
        <td class="right nowrap"><?= (float) $en['amount'] ? money((float) $en['amount']) : '—' ?></td>
        <td class="right"><?= delete_button('entries.php', (int) $en['id'], $self) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody></table></div>
  <?= pager($page, $total, $perPage) ?>
  <?php endif; ?>
</section>
<?php page_footer(['assets/vendor/xlsx.full.min.js']);
