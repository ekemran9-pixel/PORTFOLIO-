<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

$fields = ['name', 'phone', 'email', 'company', 'address', 'tags', 'notes'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int) ($_POST['id'] ?? 0);
    if (post('do') === 'delete') {
        $row = q('SELECT name, notion_id FROM customers WHERE id = ?', [$id])->fetch();
        $name = $row['name'] ?? '';
        q('DELETE FROM customers WHERE id = ?', [$id]);
        notion_archive($row['notion_id'] ?? null);
        log_activity('customer_deleted', (string) $name);
        flash(t('deleted'));
        redirect('customers.php');
    }
    $data = [];
    foreach ($fields as $f) {
        $data[$f] = post($f);
    }
    if ($data['name'] === '') {
        flash(t('name_required'), 'err');
        redirect('customers.php?new=1');
    }
    if ($id) {
        $set = implode(', ', array_map(fn($f) => "$f = ?", $fields));
        q("UPDATE customers SET $set, updated_at = ? WHERE id = ?", [...array_values($data), now(), $id]);
        log_activity('customer_updated', $data['name']);
    } else {
        $cols = implode(', ', $fields);
        $marks = implode(', ', array_fill(0, count($fields), '?'));
        q("INSERT INTO customers ($cols, created_at, updated_at) VALUES ($marks, ?, ?)", [...array_values($data), now(), now()]);
        $id = (int) db()->lastInsertId();
        log_activity('customer_added', $data['name']);
        fire_event('customer_added', customer_event_data($id));
    }
    flash(t('saved'));
    redirect('customer.php?id=' . $id);
}

$editing = null;
if (isset($_GET['edit'])) {
    $editing = q('SELECT * FROM customers WHERE id = ?', [(int) $_GET['edit']])->fetch() ?: null;
}
$showForm = $editing || isset($_GET['new']);

$search = trim((string) ($_GET['q'] ?? ''));
$page = max(1, (int) ($_GET['p'] ?? 1));
$perPage = 25;
$where = '';
$params = [];
if ($search !== '') {
    $where = 'WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR company LIKE ? OR tags LIKE ?';
    $params = array_fill(0, 5, '%' . $search . '%');
}
$total = (int) q("SELECT COUNT(*) FROM customers $where", $params)->fetchColumn();
$offset = ($page - 1) * $perPage;
$list = q("SELECT * FROM customers $where ORDER BY name ASC LIMIT $perPage OFFSET $offset", $params)->fetchAll();

page_header(t('nav_customers'));
?>
<?php if ($showForm): ?>
<section class="card form-card">
  <div class="card-head"><h3><?= e($editing ? t('edit_customer') : t('add_customer')) ?></h3><a href="customers.php" class="small"><?= e(t('cancel')) ?></a></div>
  <form method="post" class="form grid-form">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= (int) ($editing['id'] ?? 0) ?>">
    <label><?= e(t('name')) ?> *<input name="name" required value="<?= e($editing['name'] ?? '') ?>"></label>
    <label><?= e(t('phone')) ?><input name="phone" type="tel" value="<?= e($editing['phone'] ?? '') ?>"></label>
    <label><?= e(t('email')) ?><input name="email" type="email" value="<?= e($editing['email'] ?? '') ?>"></label>
    <label><?= e(t('company')) ?><input name="company" value="<?= e($editing['company'] ?? '') ?>"></label>
    <label class="full"><?= e(t('address')) ?><input name="address" value="<?= e($editing['address'] ?? '') ?>"></label>
    <label class="full"><?= e(t('tags')) ?><input name="tags" placeholder="vip, dhaka" value="<?= e($editing['tags'] ?? '') ?>"></label>
    <label class="full"><?= e(t('notes')) ?><textarea name="notes" rows="3"><?= e($editing['notes'] ?? '') ?></textarea></label>
    <div class="full form-actions"><button class="btn primary"><?= e(t('save')) ?></button></div>
  </form>
</section>
<?php endif; ?>

<section class="card">
  <div class="toolbar">
    <form class="search" method="get"><input name="q" value="<?= e($search) ?>" placeholder="🔍 <?= e(t('search')) ?>…"></form>
    <div class="toolbar-actions">
      <a class="btn" href="export.php?table=customers&format=csv">⬇ CSV</a>
      <button class="btn" data-xlsx="export.php?table=customers&format=json" data-filename="customers.xlsx">⬇ Excel</button>
      <a class="btn primary" href="customers.php?new=1">+ <?= e(t('add_customer')) ?></a>
    </div>
  </div>
  <p class="muted small"><?= e(t('total')) ?>: <?= $total ?></p>
  <?php if (!$list): ?>
    <p class="empty"><?= e(t('no_data')) ?> — <a href="import.php"><?= e(t('import_from_excel')) ?></a></p>
  <?php else: ?>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th><?= e(t('name')) ?></th><th><?= e(t('phone')) ?></th><th class="hide-sm"><?= e(t('email')) ?></th><th class="hide-sm"><?= e(t('company')) ?></th><th class="hide-sm"><?= e(t('tags')) ?></th><th></th></tr></thead>
      <tbody>
      <?php foreach ($list as $c): ?>
        <tr>
          <td><a class="row-link" href="customer.php?id=<?= $c['id'] ?>"><span class="avatar sm"><?= e(mb_strtoupper(mb_substr($c['name'], 0, 1))) ?></span><?= e($c['name']) ?></a></td>
          <td><?php if ($c['phone']): ?><a href="tel:<?= e($c['phone']) ?>"><?= e($c['phone']) ?></a><?php endif; ?></td>
          <td class="hide-sm"><?= e($c['email']) ?></td>
          <td class="hide-sm"><?= e($c['company']) ?></td>
          <td class="hide-sm"><?php foreach (array_filter(array_map('trim', explode(',', (string) $c['tags']))) as $tag): ?><span class="tag"><?= e($tag) ?></span><?php endforeach; ?></td>
          <td class="right nowrap"><a class="btn-link" href="customers.php?edit=<?= $c['id'] ?>"><?= e(t('edit')) ?></a> <?= delete_button('customers.php', (int) $c['id'], 'customers.php') ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?= pager($page, $total, $perPage) ?>
  <?php endif; ?>
</section>
<?php page_footer(['assets/vendor/xlsx.full.min.js']);
