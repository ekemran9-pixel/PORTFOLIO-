<?php
// Notion connection: set up databases, sync, and send overview pages.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    set_time_limit(300);
    try {
        switch (post('do')) {
            case 'setup':
                $id = notion_parse_id(post('parent'));
                if (!$id) {
                    throw new RuntimeException(t('notion_bad_link'));
                }
                notion_setup($id);
                flash(t('notion_setup_done'));
                break;
            case 'sync':
                $s = notion_sync();
                flash(sprintf(t('notion_sync_result'), $s['pushed'], $s['updated'], $s['pulled']) . ($s['remaining'] ? ' · ' . sprintf(t('notion_remaining'), $s['remaining']) : ''));
                break;
            case 'overview':
                [$from, $to, $label] = period_range(post('period', 'month'));
                $report = build_report($from, $to);
                $insight = '';
                if (post('with_ai') === '1' && ai_provider()) {
                    $res = ai_ask(t('ai_insight_prompt') . "\n\n" . report_text($report, $label), false);
                    $insight = $res['ok'] ? ai_extract_actions($res['text'])[0] : '';
                }
                $url = notion_overview_page('LifeHub — ' . $label, $report, $insight);
                flash(t('notion_page_done') . ($url ? ' ' . $url : ''));
                break;
            case 'auto':
                set_setting('notion_auto', post('auto') === '1' ? '1' : '0');
                flash(t('saved'));
                break;
        }
    } catch (Throwable $e) {
        flash($e->getMessage(), 'err');
    }
    redirect('notion.php');
}

$token = notion_token() !== '';
$ready = $token && setting('notion_db_customers') && setting('notion_db_entries');
$bot = null;
if ($token) {
    try {
        [, $bot] = notion_api('GET', '/users/me');
    } catch (Throwable $e) {
        $botError = $e->getMessage();
    }
}
$last = json_decode((string) setting('notion_last_result', ''), true);
$pending = $ready ? (int) q('SELECT COUNT(*) FROM customers WHERE notion_id IS NULL')->fetchColumn() + (int) q('SELECT COUNT(*) FROM entries WHERE notion_id IS NULL')->fetchColumn() : 0;
$dbUrl = fn(string $id) => 'https://www.notion.so/' . str_replace('-', '', $id);

page_header(t('nav_notion'));
?>
<section class="hero hero-notion">
  <div>
    <p class="eyebrow">Notion</p>
    <h2><?= e(t('notion_title')) ?></h2>
    <p class="muted"><?= e(t('notion_sub')) ?></p>
  </div>
  <div class="hero-actions">
    <?php if ($ready): ?>
      <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="sync"><button class="btn primary">⟳ <?= e(t('notion_sync_now')) ?></button></form>
    <?php endif; ?>
  </div>
</section>

<div class="grid-2">
  <section class="card">
    <div class="card-head"><h3><?= e(t('notion_status')) ?></h3></div>
    <ul class="list">
      <li><span>🔑 <?= e(t('notion_token')) ?></span>
        <?php if (!$token): ?><a href="settings.php#keys"><?= e(t('not_set')) ?> →</a>
        <?php elseif ($bot): ?><span class="type type-income">✓ <?= e($bot['name'] ?? 'OK') ?></span>
        <?php else: ?><span class="type type-expense" title="<?= e($botError ?? '') ?>">✗ <?= e(t('notion_token_bad')) ?></span><?php endif; ?></li>
      <li><span>🗂 <?= e(t('notion_databases')) ?></span>
        <?php if ($ready): ?><span><a href="<?= e($dbUrl(setting('notion_db_customers'))) ?>" target="_blank" rel="noopener"><?= e(t('nav_customers')) ?></a> · <a href="<?= e($dbUrl(setting('notion_db_entries'))) ?>" target="_blank" rel="noopener"><?= e(t('nav_entries')) ?></a></span>
        <?php else: ?><span class="muted"><?= e(t('not_set')) ?></span><?php endif; ?></li>
      <li><span>⏳ <?= e(t('notion_pending')) ?></span><strong><?= $pending ?></strong></li>
      <li><span>🕘 <?= e(t('notion_last_sync')) ?></span><span class="muted small"><?= $last ? e($last['at']) . ' · +' . (int) $last['pushed'] . ' ~' . (int) $last['updated'] . ' ↓' . (int) $last['pulled'] : '—' ?></span></li>
    </ul>
    <?php if ($ready): ?>
      <form method="post" class="form" style="margin-top:12px"><?= csrf_field() ?><input type="hidden" name="do" value="auto">
        <label class="check-label"><input type="checkbox" name="auto" value="1" <?= setting('notion_auto') === '1' ? 'checked' : '' ?> onchange="this.form.submit()"> <?= e(t('notion_auto')) ?></label>
      </form>
    <?php endif; ?>
  </section>

  <section class="card">
    <div class="card-head"><h3><?= e($ready ? t('notion_overview') : t('notion_connect')) ?></h3></div>
    <?php if ($ready): ?>
      <p class="muted small"><?= e(t('notion_overview_help')) ?></p>
      <form method="post" class="form">
        <?= csrf_field() ?><input type="hidden" name="do" value="overview">
        <label><?= e(t('period')) ?>
          <select name="period">
            <?php foreach (['month' => t('period_month'), 'last_month' => t('period_last_month'), 'week' => t('period_week'), 'year' => t('period_year')] as $v => $l): ?>
              <option value="<?= $v ?>"><?= e($l) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="check-label"><input type="checkbox" name="with_ai" value="1" <?= ai_provider() ? 'checked' : 'disabled' ?>> <?= e(t('notion_with_ai')) ?></label>
        <button class="btn primary">📄 <?= e(t('notion_make_page')) ?></button>
      </form>
      <hr>
      <details><summary class="small muted"><?= e(t('notion_reconnect')) ?></summary>
    <?php endif; ?>
      <ol class="steps small">
        <li><?= t('notion_step1') ?></li>
        <li><?= t('notion_step2') ?></li>
        <li><?= t('notion_step3') ?></li>
        <li><?= t('notion_step4') ?></li>
      </ol>
      <form method="post" class="form">
        <?= csrf_field() ?><input type="hidden" name="do" value="setup">
        <label><?= e(t('notion_parent')) ?><input name="parent" required placeholder="https://www.notion.so/My-Page-1a2b3c…" <?= $token ? '' : 'disabled' ?>></label>
        <button class="btn <?= $ready ? '' : 'primary' ?>" <?= $token ? '' : 'disabled' ?>><?= e(t('notion_create_dbs')) ?></button>
      </form>
    <?php if ($ready): ?></details><?php endif; ?>
  </section>
</div>
<?php page_footer();
