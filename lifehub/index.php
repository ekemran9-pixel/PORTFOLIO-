<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

$monthStart = date('Y-m-01');
$sixStart = date('Y-m-01', strtotime('-5 months', strtotime($monthStart)));

$stats = [
    'customers' => (int) q('SELECT COUNT(*) FROM customers')->fetchColumn(),
    'entries'   => (int) q('SELECT COUNT(*) FROM entries')->fetchColumn(),
    'media'     => (int) q('SELECT COUNT(*) FROM media')->fetchColumn(),
    'tasks'     => (int) q("SELECT COUNT(*) FROM entries WHERE type = 'task' AND status = 'open'")->fetchColumn(),
];

// Income/expense per month for the last six months (aggregated in PHP so it works on MySQL and SQLite).
$months = [];
for ($i = 0; $i < 6; $i++) {
    $months[date('Y-m', strtotime("+$i months", strtotime($sixStart)))] = ['income' => 0.0, 'expense' => 0.0];
}
$rows = q("SELECT type, amount, entry_date FROM entries WHERE type IN ('income','expense') AND entry_date >= ?", [$sixStart]);
foreach ($rows as $r) {
    $m = substr($r['entry_date'], 0, 7);
    if (isset($months[$m])) {
        $months[$m][$r['type']] += (float) $r['amount'];
    }
}
$cur = $months[date('Y-m')];
$balance = $cur['income'] - $cur['expense'];

$recentCustomers = q('SELECT id, name, phone, company FROM customers ORDER BY id DESC LIMIT 5')->fetchAll();
$openTasks = q("SELECT id, title, entry_date FROM entries WHERE type = 'task' AND status = 'open' ORDER BY entry_date ASC LIMIT 5")->fetchAll();
$activity = q('SELECT action, detail, created_at FROM activity ORDER BY id DESC LIMIT 8')->fetchAll();
$recentImages = q("SELECT id, title, original_name FROM media WHERE kind = 'image' ORDER BY id DESC LIMIT 6")->fetchAll();

$hour = (int) date('G');
$greet = $hour < 12 ? t('good_morning') : ($hour < 17 ? t('good_afternoon') : t('good_evening'));

page_header(t('nav_dashboard'));
?>
<section class="hero">
  <div>
    <p class="eyebrow"><?= e(date('l, j F Y')) ?></p>
    <h2><?= e($greet) ?>, <?= e(current_user()['username']) ?> 👋</h2>
    <p class="muted"><?= e(t('hero_sub')) ?></p>
  </div>
  <div class="hero-actions">
    <a class="btn primary" href="ai.php">✦ <?= e(t('nav_ai')) ?></a>
    <a class="btn" href="customers.php?new=1">+ <?= e(t('add_customer')) ?></a>
    <a class="btn" href="entries.php?new=1">+ <?= e(t('add_entry')) ?></a>
    <a class="btn" href="media.php">⬆ <?= e(t('upload_files')) ?></a>
  </div>
</section>

<section class="stats">
  <a class="stat" href="customers.php"><span class="stat-ico c1">👥</span><div><small><?= e(t('total_customers')) ?></small><strong><?= $stats['customers'] ?></strong></div></a>
  <a class="stat" href="entries.php?type=income"><span class="stat-ico c2">↗</span><div><small><?= e(t('this_month_income')) ?></small><strong><?= money($cur['income']) ?></strong></div></a>
  <a class="stat" href="entries.php?type=expense"><span class="stat-ico c3">↘</span><div><small><?= e(t('this_month_expense')) ?></small><strong><?= money($cur['expense']) ?></strong></div></a>
  <div class="stat"><span class="stat-ico c4">⚖</span><div><small><?= e(t('balance')) ?></small><strong class="<?= $balance < 0 ? 'neg' : 'pos' ?>"><?= money($balance) ?></strong></div></div>
</section>

<div class="grid-2">
  <section class="card span-2">
    <div class="card-head"><h3><?= e(t('last_6_months')) ?></h3><span class="legend"><i class="dot c2"></i><?= e(t('income')) ?> <i class="dot c3"></i><?= e(t('expense')) ?></span></div>
    <div class="chart-box"><canvas id="chart" data-chart='<?= e(json_encode([
        'labels'  => array_map(fn($m) => date('M', strtotime($m . '-01')), array_keys($months)),
        'income'  => array_column($months, 'income'),
        'expense' => array_column($months, 'expense'),
    ])) ?>'></canvas></div>
  </section>

  <section class="card">
    <div class="card-head"><h3><?= e(t('open_tasks')) ?> <span class="badge"><?= $stats['tasks'] ?></span></h3><a href="entries.php?type=task&status=open" class="small"><?= e(t('view_all')) ?></a></div>
    <?php if (!$openTasks): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
    <ul class="list">
      <?php foreach ($openTasks as $tk): ?>
        <li><a href="entries.php?edit=<?= $tk['id'] ?>"><span class="check"></span><?= e($tk['title']) ?></a><small class="muted"><?= e($tk['entry_date']) ?></small></li>
      <?php endforeach; ?>
    </ul>
  </section>

  <section class="card">
    <div class="card-head"><h3><?= e(t('recent_customers')) ?></h3><a href="customers.php" class="small"><?= e(t('view_all')) ?></a></div>
    <?php if (!$recentCustomers): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
    <ul class="list">
      <?php foreach ($recentCustomers as $c): ?>
        <li><a href="customer.php?id=<?= $c['id'] ?>"><span class="avatar sm"><?= e(mb_strtoupper(mb_substr($c['name'], 0, 1))) ?></span><?= e($c['name']) ?></a><small class="muted"><?= e($c['phone'] ?: $c['company']) ?></small></li>
      <?php endforeach; ?>
    </ul>
  </section>

  <section class="card">
    <div class="card-head"><h3><?= e(t('recent_media')) ?></h3><a href="media.php" class="small"><?= e(t('view_all')) ?></a></div>
    <?php if (!$recentImages): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
    <div class="thumbs">
      <?php foreach ($recentImages as $m): ?>
        <a href="file.php?id=<?= $m['id'] ?>" target="_blank"><img src="file.php?id=<?= $m['id'] ?>" alt="<?= e($m['title'] ?: $m['original_name']) ?>" loading="lazy"></a>
      <?php endforeach; ?>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h3><?= e(t('recent_activity')) ?></h3></div>
    <?php if (!$activity): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
    <ul class="timeline">
      <?php foreach ($activity as $a): ?>
        <li><strong><?= e(t('act_' . $a['action'])) ?></strong> <?= e($a['detail']) ?><small><?= e($a['created_at']) ?></small></li>
      <?php endforeach; ?>
    </ul>
  </section>
</div>
<?php page_footer(['assets/vendor/chart.umd.min.js']);
