<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

$id = (int) ($_GET['id'] ?? 0);
$c = q('SELECT * FROM customers WHERE id = ?', [$id])->fetch();
if (!$c) {
    flash(t('not_found'), 'err');
    redirect('customers.php');
}

$entries = q('SELECT * FROM entries WHERE customer_id = ? ORDER BY entry_date DESC, id DESC LIMIT 50', [$id])->fetchAll();
$media = q('SELECT * FROM media WHERE customer_id = ? ORDER BY id DESC LIMIT 24', [$id])->fetchAll();
$income = $expense = 0.0;
foreach ($entries as $en) {
    if ($en['type'] === 'income') $income += (float) $en['amount'];
    if ($en['type'] === 'expense') $expense += (float) $en['amount'];
}

page_header($c['name']);
?>
<section class="profile card">
  <span class="avatar xl"><?= e(mb_strtoupper(mb_substr($c['name'], 0, 1))) ?></span>
  <div class="profile-main">
    <h2><?= e($c['name']) ?></h2>
    <p class="muted"><?= e($c['company']) ?></p>
    <div class="chips">
      <?php if ($c['phone']): ?><a class="pill" href="tel:<?= e($c['phone']) ?>">📞 <?= e($c['phone']) ?></a>
        <a class="pill" href="https://wa.me/<?= e(preg_replace('/\D/', '', $c['phone'])) ?>" target="_blank" rel="noopener">💬 WhatsApp</a><?php endif; ?>
      <?php if ($c['email']): ?><a class="pill" href="mailto:<?= e($c['email']) ?>">✉ <?= e($c['email']) ?></a><?php endif; ?>
      <?php foreach (array_filter(array_map('trim', explode(',', (string) $c['tags']))) as $tag): ?><span class="tag"><?= e($tag) ?></span><?php endforeach; ?>
    </div>
    <?php if ($c['address']): ?><p>📍 <?= e($c['address']) ?></p><?php endif; ?>
    <?php if ($c['notes']): ?><p class="note-box"><?= nl2br(e($c['notes'])) ?></p><?php endif; ?>
  </div>
  <div class="profile-actions">
    <a class="btn" href="customers.php?edit=<?= $id ?>"><?= e(t('edit')) ?></a>
    <a class="btn primary" href="entries.php?new=1&customer_id=<?= $id ?>">+ <?= e(t('add_entry')) ?></a>
  </div>
</section>

<section class="stats three">
  <div class="stat"><span class="stat-ico c2">↗</span><div><small><?= e(t('income')) ?></small><strong><?= money($income) ?></strong></div></div>
  <div class="stat"><span class="stat-ico c3">↘</span><div><small><?= e(t('expense')) ?></small><strong><?= money($expense) ?></strong></div></div>
  <div class="stat"><span class="stat-ico c1">#</span><div><small><?= e(t('entries')) ?></small><strong><?= count($entries) ?></strong></div></div>
</section>

<section class="card">
  <div class="card-head"><h3><?= e(t('related_entries')) ?></h3></div>
  <?php if (!$entries): ?><p class="empty"><?= e(t('no_data')) ?></p><?php else: ?>
  <div class="table-wrap"><table class="table">
    <thead><tr><th><?= e(t('date')) ?></th><th><?= e(t('type')) ?></th><th><?= e(t('title')) ?></th><th class="right"><?= e(t('amount')) ?></th><th><?= e(t('status')) ?></th></tr></thead>
    <tbody>
    <?php foreach ($entries as $en): ?>
      <tr><td class="nowrap"><?= e($en['entry_date']) ?></td><td><span class="type type-<?= e($en['type']) ?>"><?= e(t($en['type'])) ?></span></td>
        <td><a href="entries.php?edit=<?= $en['id'] ?>"><?= e($en['title']) ?></a></td>
        <td class="right"><?= (float) $en['amount'] ? money((float) $en['amount']) : '—' ?></td><td><?= e(t($en['status'])) ?></td></tr>
    <?php endforeach; ?>
    </tbody></table></div>
  <?php endif; ?>
</section>

<section class="card">
  <div class="card-head"><h3><?= e(t('related_media')) ?></h3><a class="small" href="media.php?customer_id=<?= $id ?>">⬆ <?= e(t('upload_files')) ?></a></div>
  <?php if (!$media): ?><p class="empty"><?= e(t('no_data')) ?></p><?php else: ?>
  <div class="media-grid">
    <?php foreach ($media as $m) { include __DIR__ . '/inc/media_card.php'; } ?>
  </div>
  <?php endif; ?>
</section>
<?php page_footer();
