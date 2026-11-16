<?php
// Life & business overview: yearly trend, period breakdown, top customers and costs, AI insight.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

$year = max(2000, min(2100, (int) ($_GET['year'] ?? date('Y'))));
$month = (int) ($_GET['month'] ?? 0);
if ($month >= 1 && $month <= 12) {
    $from = sprintf('%04d-%02d-01', $year, $month);
    $to = date('Y-m-t', strtotime($from));
    $label = date('F Y', strtotime($from));
} else {
    $month = 0;
    $from = "$year-01-01";
    $to = "$year-12-31";
    $label = (string) $year;
}
$report = build_report($from, $to);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    session_write_close();
    $do = post('do');
    if ($do === 'insight') {
        $res = ai_ask(t('ai_insight_prompt') . "\n\n" . report_text($report, $label), false);
        json_out($res['ok'] ? ['text' => ai_extract_actions($res['text'])[0]] : ['error' => $res['error']]);
    }
    if ($do === 'notion') {
        try {
            json_out(['url' => notion_overview_page('LifeHub — ' . $label, $report, post('insight'))]);
        } catch (Throwable $e) {
            json_out(['error' => $e->getMessage()]);
        }
    }
    if ($do === 'telegram') {
        $res = telegram_notify(report_text($report, $label) . (post('insight') !== '' ? "\n\n✦ AI\n" . post('insight') : ''));
        json_out($res['ok'] ? ['ok' => true] : ['error' => $res['error']]);
    }
    json_out(['error' => 'unknown'], 400);
}

$months = monthly_totals($year);
$years = q('SELECT DISTINCT substr(entry_date, 1, 4) AS y FROM entries ORDER BY y DESC')->fetchAll(PDO::FETCH_COLUMN) ?: [date('Y')];
if (!in_array((string) $year, $years, true)) {
    array_unshift($years, (string) $year);
}
$net = $report['income'] - $report['expense'];
$taskTotal = $report['tasks_done'] + $report['tasks_open'];
$maxCust = max(1, ...array_values(array_map(fn($c) => (float) $c['total'], $report['top_customers'] ?: [['total' => 1]])));
$maxExp = max(1, ...array_values(array_map(fn($c) => (float) $c['total'], $report['top_expenses'] ?: [['total' => 1]])));

page_header(t('nav_reports'));
?>
<section class="card">
  <form class="filters" method="get">
    <select name="year"><?php foreach ($years as $y): ?><option <?= (string) $year === (string) $y ? 'selected' : '' ?>><?= e((string) $y) ?></option><?php endforeach; ?></select>
    <select name="month">
      <option value="0"><?= e(t('whole_year')) ?></option>
      <?php for ($m = 1; $m <= 12; $m++): ?><option value="<?= $m ?>" <?= $month === $m ? 'selected' : '' ?>><?= e(date('F', mktime(0, 0, 0, $m, 1))) ?></option><?php endfor; ?>
    </select>
    <button class="btn"><?= e(t('filter')) ?></button>
    <button type="button" class="btn" onclick="window.print()">🖨 <?= e(t('print')) ?></button>
  </form>
  <h2 class="report-title">📊 <?= e($label) ?></h2>
</section>

<section class="stats">
  <div class="stat"><span class="stat-ico c2">↗</span><div><small><?= e(t('income')) ?></small><strong><?= money($report['income']) ?></strong></div></div>
  <div class="stat"><span class="stat-ico c3">↘</span><div><small><?= e(t('expense')) ?></small><strong><?= money($report['expense']) ?></strong></div></div>
  <div class="stat"><span class="stat-ico c4">⚖</span><div><small><?= e(t('balance')) ?></small><strong class="<?= $net < 0 ? 'neg' : 'pos' ?>"><?= money($net) ?></strong></div></div>
  <div class="stat"><span class="stat-ico c1">✓</span><div><small><?= e(t('tasks_done')) ?></small><strong><?= $report['tasks_done'] ?><?= $taskTotal ? ' / ' . $taskTotal : '' ?></strong></div></div>
</section>

<section class="card">
  <div class="card-head"><h3>✦ <?= e(t('ai_insight')) ?></h3>
    <div class="toolbar-actions">
      <button class="btn sm" id="insightBtn" <?= ai_provider() ? '' : 'disabled title="' . e(t('ai_no_key')) . '"' ?>>✦ <?= e(t('ai_insight_make')) ?></button>
      <button class="btn sm" data-send="notion" <?= setting('notion_parent') ? '' : 'disabled title="' . e(t('notion_not_ready')) . '"' ?>>📄 Notion</button>
      <button class="btn sm" data-send="telegram" <?= setting('telegram_chat_id') ? '' : 'disabled title="' . e(t('tg_not_ready')) . '"' ?>>✈ Telegram</button>
    </div>
  </div>
  <div class="insight" id="insight"><p class="muted small"><?= e(t('ai_insight_help')) ?></p></div>
</section>

<div class="grid-2">
  <section class="card span-2">
    <div class="card-head"><h3><?= e(sprintf(t('year_trend'), $year)) ?></h3><span class="legend"><i class="dot c2"></i><?= e(t('income')) ?> <i class="dot c3"></i><?= e(t('expense')) ?></span></div>
    <div class="chart-box"><canvas id="chart" data-chart='<?= e(json_encode([
        'labels' => array_map(fn($m) => date('M', strtotime($m . '-01')), array_keys($months)),
        'income' => array_column($months, 'income'),
        'expense' => array_column($months, 'expense'),
    ])) ?>'></canvas></div>
    <div class="table-wrap"><table class="table report-table">
      <thead><tr><th><?= e(t('month')) ?></th><th class="right"><?= e(t('income')) ?></th><th class="right"><?= e(t('expense')) ?></th><th class="right"><?= e(t('balance')) ?></th></tr></thead>
      <tbody>
      <?php $ti = $te = 0; foreach ($months as $k => $m): $ti += $m['income']; $te += $m['expense']; ?>
        <tr><td><a href="?year=<?= $year ?>&month=<?= (int) substr($k, 5) ?>"><?= e(date('F', strtotime($k . '-01'))) ?></a></td>
          <td class="right"><?= $m['income'] ? money($m['income']) : '—' ?></td>
          <td class="right"><?= $m['expense'] ? money($m['expense']) : '—' ?></td>
          <td class="right <?= $m['income'] - $m['expense'] < 0 ? 'neg' : '' ?>"><?= ($m['income'] || $m['expense']) ? money($m['income'] - $m['expense']) : '—' ?></td></tr>
      <?php endforeach; ?>
      </tbody>
      <tfoot><tr><th><?= e(t('total')) ?></th><th class="right"><?= money($ti) ?></th><th class="right"><?= money($te) ?></th><th class="right"><?= money($ti - $te) ?></th></tr></tfoot>
    </table></div>
  </section>

  <section class="card">
    <div class="card-head"><h3>🏆 <?= e(t('top_customers')) ?></h3></div>
    <?php if (!$report['top_customers']): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
    <table class="table"><tbody>
      <?php foreach ($report['top_customers'] as $c): ?>
        <tr><td class="bar-cell"><i style="width:<?= round((float) $c['total'] / $maxCust * 100) ?>%"></i><span><a href="customer.php?id=<?= $c['id'] ?>"><?= e($c['name']) ?></a> <small class="muted">×<?= (int) $c['n'] ?></small></span></td><td class="right nowrap"><?= money((float) $c['total']) ?></td></tr>
      <?php endforeach; ?>
    </tbody></table>
  </section>

  <section class="card">
    <div class="card-head"><h3>💸 <?= e(t('top_expenses')) ?></h3></div>
    <?php if (!$report['top_expenses']): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
    <table class="table"><tbody>
      <?php foreach ($report['top_expenses'] as $x): ?>
        <tr><td class="bar-cell"><i style="width:<?= round((float) $x['total'] / $maxExp * 100) ?>%"></i><span><?= e($x['title']) ?> <small class="muted">×<?= (int) $x['n'] ?></small></span></td><td class="right nowrap"><?= money((float) $x['total']) ?></td></tr>
      <?php endforeach; ?>
    </tbody></table>
  </section>
</div>
<script>
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('insight');
  let insight = '';
  const post = async (data) => {
    const fd = new FormData(); fd.append('csrf', document.querySelector('meta[name=csrf]').content);
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    return (await fetch(location.href, { method: 'POST', body: fd })).json();
  };
  document.getElementById('insightBtn')?.addEventListener('click', async (e) => {
    e.target.disabled = true; box.innerHTML = '<p class="muted">…</p>';
    const r = await post({ do: 'insight' });
    e.target.disabled = false;
    if (r.error) { box.textContent = '⚠ ' + r.error; return; }
    insight = r.text; box.innerHTML = LH.md(r.text);
  });
  document.querySelectorAll('[data-send]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true; const old = b.textContent; b.textContent = '…';
    const r = await post({ do: b.dataset.send, insight });
    b.textContent = r.error ? '⚠' : '✓';
    if (r.error) alert(r.error); else if (r.url) window.open(r.url, '_blank');
    setTimeout(() => { b.textContent = old; b.disabled = false; }, 2500);
  }));
});
</script>
<?php page_footer(['assets/vendor/chart.umd.min.js']);
