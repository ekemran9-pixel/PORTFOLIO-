<?php
// Automation: recipes ("when → then"), Telegram bot, phone/API webhook and cron setup.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

/** Ready-made recipes offered as one-click templates. */
function recipe_presets(): array
{
    $bn = lang() === 'bn';
    return [
        'morning' => ['☀️', t('pre_morning'), t('pre_morning_d'), 'daily', '08:00', 'ai', ['prompt' => t('pre_morning_prompt'), 'deliver' => ['telegram']]],
        'evening' => ['🌙', t('pre_evening'), t('pre_evening_d'), 'daily', '21:00', 'report', ['period' => 'today']],
        'weekly' => ['📈', t('pre_weekly'), t('pre_weekly_d'), 'weekly', '5 20:00', 'ai', ['prompt' => t('pre_weekly_prompt'), 'deliver' => ['telegram', 'note']]],
        'notion_month' => ['📄', t('pre_notion'), t('pre_notion_d'), 'monthly', '1 09:00', 'notion_overview', ['period' => 'last_month', 'with_ai' => 1]],
        'big_income' => ['💰', t('pre_income'), t('pre_income_d'), 'event', 'entry_added', 'telegram', ['filter_type' => 'income', 'min_amount' => 10000, 'message' => t('pre_income_msg')]],
        'new_customer' => ['🔗', t('pre_customer'), t('pre_customer_d'), 'event', 'customer_added', 'webhook', ['url' => '', 'include_summary' => 0]],
        'rent' => ['🏠', t('pre_rent'), t('pre_rent_d'), 'monthly', '1 10:00', 'add_entry', ['type' => 'expense', 'title' => $bn ? 'দোকান ভাড়া' : 'Shop rent', 'amount' => 15000]],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $do = post('do');
    $id = (int) post('id');
    try {
        switch ($do) {
            case 'save':
                $trigger = in_array(post('trigger_type'), RECIPE_TRIGGERS, true) ? post('trigger_type') : 'manual';
                $time = preg_match('/^\d{1,2}:\d{2}$/', post('time')) ? post('time') : '08:00';
                $value = match ($trigger) {
                    'daily' => $time,
                    'weekly' => max(1, min(7, (int) post('weekday'))) . ' ' . $time,
                    'monthly' => max(1, min(31, (int) post('monthday'))) . ' ' . $time,
                    'event' => in_array(post('event'), RECIPE_EVENTS, true) ? post('event') : 'entry_added',
                    default => '',
                };
                $action = in_array(post('action_type'), RECIPE_ACTIONS, true) ? post('action_type') : 'telegram';
                $cfg = array_filter([
                    'message' => post('message'), 'prompt' => post('prompt'), 'deliver' => array_values(array_intersect((array) ($_POST['deliver'] ?? []), ['telegram', 'note'])),
                    'period' => post('period'), 'with_ai' => post('with_ai') === '1' ? 1 : 0, 'url' => post('url'), 'include_summary' => post('include_summary') === '1' ? 1 : 0,
                    'type' => post('entry_type'), 'title' => post('entry_title'), 'amount' => (float) post('entry_amount'), 'customer' => post('entry_customer'),
                    'filter_type' => post('filter_type'), 'min_amount' => (float) post('min_amount'),
                ], fn($v) => $v !== '' && $v !== [] && $v !== 0 && $v !== 0.0);
                $name = post('name') ?: t('recipe');
                if ($id) {
                    q('UPDATE recipes SET name = ?, trigger_type = ?, trigger_value = ?, action_type = ?, config = ? WHERE id = ?',
                        [$name, $trigger, $value, $action, json_encode($cfg, JSON_UNESCAPED_UNICODE), $id]);
                } else {
                    q('INSERT INTO recipes (name, enabled, trigger_type, trigger_value, action_type, config, created_at) VALUES (?, 1, ?, ?, ?, ?, ?)',
                        [$name, $trigger, $value, $action, json_encode($cfg, JSON_UNESCAPED_UNICODE), now()]);
                }
                flash(t('saved'));
                break;
            case 'preset':
                $p = recipe_presets()[post('preset')] ?? null;
                if ($p) {
                    q('INSERT INTO recipes (name, enabled, trigger_type, trigger_value, action_type, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [$p[1], $p[5] === 'webhook' ? 0 : 1, $p[3], $p[4], $p[5], json_encode($p[6], JSON_UNESCAPED_UNICODE), now()]);
                    $newId = (int) db()->lastInsertId();
                    flash(t('preset_added'));
                    redirect('recipes.php?edit=' . $newId . '#form');
                }
                break;
            case 'toggle':
                q('UPDATE recipes SET enabled = 1 - enabled WHERE id = ?', [$id]);
                break;
            case 'delete':
                q('DELETE FROM recipe_runs WHERE recipe_id = ?', [$id]);
                q('DELETE FROM recipes WHERE id = ?', [$id]);
                flash(t('deleted'));
                break;
            case 'run':
                $r = q('SELECT * FROM recipes WHERE id = ?', [$id])->fetch();
                $test = ['event' => 'test', 'id' => 0, 'type' => 'income', 'title' => 'Test', 'amount' => 12345, 'name' => 'Test customer'];
                $res = $r ? run_recipe($r, $r['trigger_type'] === 'event' || $r['trigger_type'] === 'webhook' ? $test : []) : ['ok' => false, 'output' => t('not_found')];
                flash(($res['ok'] ? '✓ ' : '✗ ') . mb_strimwidth($res['output'], 0, 300, '…'), $res['ok'] ? 'ok' : 'err');
                redirect('recipes.php?log=' . $id . '#log');
            case 'cron_now':
                $ran = run_due_recipes();
                flash($ran ? implode(' · ', $ran) : t('nothing_due'));
                break;
            case 'tg_connect':
                $me = telegram_api('getMe');
                if (!$me['ok']) {
                    throw new RuntimeException($me['error']);
                }
                $hook = telegram_api('setWebhook', ['url' => base_url() . 'telegram.php', 'secret_token' => secret('tg_secret'), 'allowed_updates' => ['message'], 'drop_pending_updates' => true]);
                if (!$hook['ok']) {
                    throw new RuntimeException($hook['error']);
                }
                telegram_api('setMyCommands', ['commands' => array_map(fn($c) => ['command' => $c[0], 'description' => $c[1]], (array) ($GLOBALS['LANG']['tg_commands'] ?? []))]);
                set_setting('tg_bot_username', (string) ($me['result']['username'] ?? ''));
                if (!setting('telegram_chat_id')) {
                    set_setting('tg_pair_code', (string) random_int(100000, 999999));
                }
                flash(t('tg_connected'));
                break;
            case 'tg_test':
                $res = telegram_notify('👋 LifeHub: ' . t('tg_test_msg'));
                flash($res['ok'] ? t('tg_test_sent') : $res['error'], $res['ok'] ? 'ok' : 'err');
                break;
            case 'tg_unpair':
                set_setting('telegram_chat_id', '');
                set_setting('tg_pair_code', (string) random_int(100000, 999999));
                flash(t('saved'));
                break;
            case 'api_reset':
                set_setting('api_token', bin2hex(random_bytes(20)));
                flash(t('saved'));
                break;
        }
    } catch (Throwable $e) {
        flash($e->getMessage(), 'err');
    }
    redirect('recipes.php');
}

$recipes = q('SELECT * FROM recipes ORDER BY enabled DESC, id')->fetchAll();
$editing = isset($_GET['edit']) ? (q('SELECT * FROM recipes WHERE id = ?', [(int) $_GET['edit']])->fetch() ?: null) : null;
$showForm = $editing || isset($_GET['new']);
$cfg = $editing ? recipe_config($editing) : ['deliver' => ['telegram']];
$logId = (int) ($_GET['log'] ?? 0);
$logRecipe = $logId ? q('SELECT * FROM recipes WHERE id = ?', [$logId])->fetch() : null;
$runs = $logRecipe ? q('SELECT * FROM recipe_runs WHERE recipe_id = ? ORDER BY id DESC LIMIT 20', [$logId])->fetchAll() : [];

$tgToken = telegram_token() !== '';
$tgBot = (string) setting('tg_bot_username', '');
$tgPaired = (string) setting('telegram_chat_id', '') !== '';
$pairCode = (string) setting('tg_pair_code', '');
$apiUrl = base_url() . 'hook.php';
$apiToken = secret('api_token');
$cronTick = setting('cron_last_tick');
$https = str_starts_with(base_url(), 'https://');
$weekdays = (array) ($GLOBALS['LANG']['weekdays'] ?? []);

[$trgType, $trgVal] = [$editing['trigger_type'] ?? 'daily', (string) ($editing['trigger_value'] ?? '08:00')];
$curTime = preg_match('/(\d{1,2}:\d{2})$/', $trgVal, $m) ? $m[1] : '08:00';

page_header(t('nav_recipes'));
?>
<section class="hero">
  <div>
    <p class="eyebrow"><?= e(t('nav_recipes')) ?></p>
    <h2><?= e(t('auto_title')) ?></h2>
    <p class="muted"><?= e(t('auto_sub')) ?></p>
  </div>
  <div class="hero-actions">
    <a class="btn primary" href="?new=1#form">+ <?= e(t('recipe_new')) ?></a>
    <a class="btn" href="#presets">✨ <?= e(t('presets')) ?></a>
  </div>
</section>

<div class="conn-grid">
  <section class="card" id="telegram">
    <div class="card-head"><h3>✈ Telegram</h3>
      <?php if ($tgPaired): ?><span class="type type-income">✓ <?= e(t('connected')) ?></span><?php elseif ($tgBot): ?><span class="type type-task"><?= e(t('tg_waiting_pair')) ?></span><?php else: ?><span class="type type-note"><?= e(t('not_set')) ?></span><?php endif; ?>
    </div>
    <?php if (!$tgToken): ?>
      <ol class="steps small">
        <li><?= t('tg_step1') ?></li>
        <li><?= t('tg_step2') ?></li>
      </ol>
    <?php elseif (!$tgBot || isset($_GET['reconnect'])): ?>
      <p class="small muted"><?= e(t('tg_connect_help')) ?></p>
      <?php if (!$https): ?><p class="small neg"><?= e(t('tg_https')) ?></p><?php endif; ?>
      <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="tg_connect"><button class="btn primary"><?= e(t('tg_connect')) ?></button></form>
    <?php elseif (!$tgPaired): ?>
      <p class="small"><?= e(t('tg_pair_help')) ?></p>
      <div class="pair-code"><?= e($pairCode) ?></div>
      <a class="btn primary block" href="https://t.me/<?= e($tgBot) ?>?start=<?= e($pairCode) ?>" target="_blank" rel="noopener">✈ @<?= e($tgBot) ?> <?= e(t('tg_open')) ?></a>
      <p class="small muted"><a href="?reconnect=1#telegram"><?= e(t('tg_reconnect')) ?></a></p>
    <?php else: ?>
      <p class="small">@<?= e($tgBot) ?> — <?= e(t('tg_paired_help')) ?></p>
      <div class="chips">
        <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="tg_test"><button class="btn sm"><?= e(t('tg_test')) ?></button></form>
        <a class="btn sm" href="?reconnect=1#telegram"><?= e(t('tg_reconnect')) ?></a>
        <form method="post" data-confirm><?= csrf_field() ?><input type="hidden" name="do" value="tg_unpair"><button class="btn-link danger"><?= e(t('tg_unpair')) ?></button></form>
      </div>
      <details class="small"><summary><?= e(t('tg_commands_title')) ?></summary><pre class="cmd-help"><?= e(t('tg_help')) ?></pre></details>
    <?php endif; ?>
  </section>

  <section class="card" id="api">
    <div class="card-head"><h3>📱 <?= e(t('api_title')) ?></h3>
      <form method="post" data-confirm><?= csrf_field() ?><input type="hidden" name="do" value="api_reset"><button class="btn-link"><?= e(t('feed_reset')) ?></button></form></div>
    <p class="small muted"><?= e(t('api_help')) ?></p>
    <label class="small"><strong>URL</strong><div class="code-box"><input readonly value="<?= e($apiUrl) ?>" onclick="this.select()"><button type="button" class="btn sm" data-copy="<?= e($apiUrl) ?>"><?= e(t('copy')) ?></button></div></label>
    <label class="small"><strong>Token</strong><div class="code-box"><input readonly type="password" value="<?= e($apiToken) ?>" onfocus="this.type='text';this.select()"><button type="button" class="btn sm" data-copy="<?= e($apiToken) ?>"><?= e(t('copy')) ?></button></div></label>
    <details class="small"><summary><?= e(t('api_examples')) ?></summary>
      <p><strong>iPhone Shortcuts / Android MacroDroid:</strong> <?= e(t('api_phone')) ?></p>
      <pre class="cmd-help">POST <?= e($apiUrl) ?>

Authorization: Bearer <?= e(substr($apiToken, 0, 6)) ?>…
Content-Type: application/json

{"action":"say","text":"আজ ৫০০ টাকা যাতায়াত খরচ"}
{"action":"add_entry","type":"income","title":"Sale","amount":2500}
{"action":"add_customer","name":"Karim","phone":"017…"}
{"action":"report","period":"today"}
{"action":"run_recipe","id":1}</pre>
      <p><strong>n8n / Zapier / Make / IFTTT:</strong> <?= e(t('api_tools')) ?></p>
    </details>
  </section>

  <section class="card" id="cron">
    <div class="card-head"><h3>⏰ <?= e(t('cron_title')) ?></h3>
      <?php if ($cronTick && strtotime($cronTick) > time() - 900): ?><span class="type type-income">✓ <?= e(t('cron_ok')) ?></span><?php else: ?><span class="type type-task"><?= e(t('cron_missing')) ?></span><?php endif; ?></div>
    <p class="small muted"><?= e(t('cron_help')) ?></p>
    <label class="small"><strong><?= e(t('cron_cmd')) ?></strong><div class="code-box"><input readonly value="<?= e('*/5 * * * * php ' . APP_ROOT . '/cron.php') ?>" onclick="this.select()"></div></label>
    <label class="small"><strong><?= e(t('cron_url')) ?></strong><div class="code-box"><input readonly value="<?= e(base_url() . 'cron.php?key=' . secret('cron_key')) ?>" onclick="this.select()"></div></label>
    <p class="small muted"><?= e(t('cron_last')) ?>: <?= e($cronTick ?: '—') ?></p>
    <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="cron_now"><button class="btn sm">▶ <?= e(t('cron_run_now')) ?></button></form>
  </section>
</div>

<?php if ($showForm): ?>
<section class="card" id="form">
  <div class="card-head"><h3><?= e($editing ? t('recipe_edit') : t('recipe_new')) ?></h3><a class="small" href="recipes.php"><?= e(t('cancel')) ?></a></div>
  <form method="post" class="form recipe-form">
    <?= csrf_field() ?>
    <input type="hidden" name="do" value="save">
    <input type="hidden" name="id" value="<?= (int) ($editing['id'] ?? 0) ?>">
    <label><?= e(t('name')) ?><input name="name" required value="<?= e($editing['name'] ?? '') ?>" placeholder="<?= e(t('recipe_name_ph')) ?>"></label>

    <div class="recipe-step">
      <span class="step-badge"><?= e(t('when')) ?></span>
      <div class="grid-form">
        <label><?= e(t('trigger')) ?>
          <select name="trigger_type" data-switch="trg">
            <?php foreach (RECIPE_TRIGGERS as $tt): ?><option value="<?= $tt ?>" <?= $trgType === $tt ? 'selected' : '' ?>><?= e(t('trg_' . $tt)) ?></option><?php endforeach; ?>
          </select>
        </label>
        <label data-show="trg:daily,weekly,monthly"><?= e(t('time')) ?><input type="time" name="time" value="<?= e($curTime) ?>"></label>
        <label data-show="trg:weekly"><?= e(t('weekday')) ?>
          <select name="weekday"><?php foreach ($weekdays as $i => $d): ?><option value="<?= $i + 1 ?>" <?= $trgType === 'weekly' && (int) $trgVal === $i + 1 ? 'selected' : '' ?>><?= e($d) ?></option><?php endforeach; ?></select>
        </label>
        <label data-show="trg:monthly"><?= e(t('monthday')) ?><input type="number" min="1" max="31" name="monthday" value="<?= $trgType === 'monthly' ? (int) $trgVal : 1 ?>"></label>
        <label data-show="trg:event"><?= e(t('event')) ?>
          <select name="event"><?php foreach (RECIPE_EVENTS as $ev): ?><option value="<?= $ev ?>" <?= $trgVal === $ev ? 'selected' : '' ?>><?= e(t('trg_event_' . $ev)) ?></option><?php endforeach; ?></select>
        </label>
        <label data-show="trg:event"><?= e(t('filter_type')) ?>
          <select name="filter_type"><option value=""><?= e(t('all_types')) ?></option><?php foreach (['income', 'expense', 'task', 'note'] as $tp): ?><option value="<?= $tp ?>" <?= ($cfg['filter_type'] ?? '') === $tp ? 'selected' : '' ?>><?= e(t($tp)) ?></option><?php endforeach; ?></select>
        </label>
        <label data-show="trg:event"><?= e(t('min_amount')) ?><input type="number" name="min_amount" step="0.01" value="<?= e((string) ($cfg['min_amount'] ?? '')) ?>"></label>
        <p class="full small muted" data-show="trg:webhook"><?= e(t('trg_webhook_help')) ?> <code>{"action":"run_recipe","id":<?= (int) ($editing['id'] ?? 0) ?: 'ID' ?>,"data":{…}}</code></p>
      </div>
    </div>

    <div class="recipe-step">
      <span class="step-badge then"><?= e(t('then')) ?></span>
      <div class="grid-form">
        <label class="full"><?= e(t('action')) ?>
          <select name="action_type" data-switch="act">
            <?php foreach (RECIPE_ACTIONS as $a): ?><option value="<?= $a ?>" <?= ($editing['action_type'] ?? 'telegram') === $a ? 'selected' : '' ?>><?= e(t('act_type_' . $a)) ?></option><?php endforeach; ?>
          </select>
        </label>
        <label class="full" data-show="act:telegram"><?= e(t('message')) ?><textarea name="message" rows="4"><?= e($cfg['message'] ?? '') ?></textarea></label>
        <label class="full" data-show="act:ai"><?= e(t('ai_prompt')) ?><textarea name="prompt" rows="4"><?= e($cfg['prompt'] ?? '') ?></textarea></label>
        <div class="full" data-show="act:telegram,ai">
          <p class="small muted"><?= e(t('variables')) ?>: <?php foreach (['date', 'month_income', 'month_expense', 'balance', 'open_tasks', 'tasks_list', 'customers', 'today_summary', 'event.title', 'event.amount', 'event.name', 'event.customer'] as $v): ?><button type="button" class="tag var-chip">{{<?= $v ?>}}</button><?php endforeach; ?></p>
        </div>
        <div class="full chips" data-show="act:ai">
          <label class="check-label"><input type="checkbox" name="deliver[]" value="telegram" <?= in_array('telegram', (array) ($cfg['deliver'] ?? []), true) ? 'checked' : '' ?>> ✈ Telegram</label>
          <label class="check-label"><input type="checkbox" name="deliver[]" value="note" <?= in_array('note', (array) ($cfg['deliver'] ?? []), true) ? 'checked' : '' ?>> 📝 <?= e(t('save_as_note')) ?></label>
        </div>
        <label data-show="act:report,notion_overview"><?= e(t('period')) ?>
          <select name="period"><?php foreach (['today' => t('period_today'), 'yesterday' => t('period_yesterday'), 'week' => t('period_week'), 'month' => t('period_month'), 'last_month' => t('period_last_month'), 'year' => t('period_year')] as $v => $l): ?><option value="<?= $v ?>" <?= ($cfg['period'] ?? '') === $v ? 'selected' : '' ?>><?= e($l) ?></option><?php endforeach; ?></select>
        </label>
        <label class="check-label" data-show="act:notion_overview"><input type="checkbox" name="with_ai" value="1" <?= !empty($cfg['with_ai']) ? 'checked' : '' ?>> <?= e(t('notion_with_ai')) ?></label>
        <label class="full" data-show="act:webhook">Webhook URL (n8n, Zapier, Make, IFTTT…)<input type="url" name="url" value="<?= e($cfg['url'] ?? '') ?>" placeholder="https://hooks.zapier.com/…"></label>
        <label class="check-label full" data-show="act:webhook"><input type="checkbox" name="include_summary" value="1" <?= !empty($cfg['include_summary']) ? 'checked' : '' ?>> <?= e(t('include_summary')) ?></label>
        <label data-show="act:add_entry"><?= e(t('type')) ?><select name="entry_type"><?php foreach (['expense', 'income', 'task', 'note'] as $tp): ?><option value="<?= $tp ?>" <?= ($cfg['type'] ?? '') === $tp ? 'selected' : '' ?>><?= e(t($tp)) ?></option><?php endforeach; ?></select></label>
        <label data-show="act:add_entry"><?= e(t('title')) ?><input name="entry_title" value="<?= e($cfg['title'] ?? '') ?>"></label>
        <label data-show="act:add_entry"><?= e(t('amount')) ?><input type="number" step="0.01" name="entry_amount" value="<?= e((string) ($cfg['amount'] ?? '')) ?>"></label>
        <label data-show="act:add_entry"><?= e(t('customer')) ?><input name="entry_customer" value="<?= e($cfg['customer'] ?? '') ?>"></label>
        <p class="full small muted" data-show="act:notion_sync"><?= e(t('act_notion_sync_help')) ?></p>
      </div>
    </div>
    <div class="form-actions"><button class="btn primary"><?= e(t('save')) ?></button></div>
  </form>
</section>
<?php endif; ?>

<section class="card">
  <div class="card-head"><h3>⚙ <?= e(t('my_recipes')) ?> <span class="badge"><?= count($recipes) ?></span></h3><a class="small" href="?new=1#form">+ <?= e(t('recipe_new')) ?></a></div>
  <?php if (!$recipes): ?><p class="empty"><?= e(t('no_recipes')) ?></p><?php endif; ?>
  <?php foreach ($recipes as $r): ?>
    <div class="recipe-card">
      <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="toggle"><input type="hidden" name="id" value="<?= $r['id'] ?>">
        <label class="switch" title="<?= e($r['enabled'] ? t('on') : t('off')) ?>"><input type="checkbox" <?= $r['enabled'] ? 'checked' : '' ?> onchange="this.form.submit()"><span></span></label></form>
      <div>
        <strong><?= e($r['name']) ?></strong>
        <div class="recipe-flow"><span class="type type-note"><?= e(recipe_trigger_label($r)) ?></span><span class="arrow">→</span><span class="type type-task"><?= e(t('act_type_' . $r['action_type'])) ?></span>
          <?php if ($r['run_count']): ?><span class="muted"><?= (int) $r['run_count'] ?>× · <?= e((string) $r['last_run_at']) ?></span><?php endif; ?></div>
        <?php if ($r['last_status']): ?><small class="<?= str_starts_with($r['last_status'], '✗') ? 'neg' : 'muted' ?>"><?= e(mb_strimwidth(str_replace('**', '', $r['last_status']), 0, 140, '…')) ?></small><?php endif; ?>
      </div>
      <div class="chips">
        <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="run"><input type="hidden" name="id" value="<?= $r['id'] ?>"><button class="btn sm">▶ <?= e(t('run_now')) ?></button></form>
        <a class="btn-link" href="?edit=<?= $r['id'] ?>#form"><?= e(t('edit')) ?></a>
        <a class="btn-link" href="?log=<?= $r['id'] ?>#log"><?= e(t('log')) ?></a>
        <form method="post" data-confirm><?= csrf_field() ?><input type="hidden" name="do" value="delete"><input type="hidden" name="id" value="<?= $r['id'] ?>"><button class="btn-link danger"><?= e(t('delete')) ?></button></form>
      </div>
    </div>
  <?php endforeach; ?>
</section>

<?php if ($logRecipe): ?>
<section class="card" id="log">
  <div class="card-head"><h3>📜 <?= e(t('log')) ?>: <?= e($logRecipe['name']) ?></h3><a class="small" href="recipes.php"><?= e(t('cancel')) ?></a></div>
  <?php if (!$runs): ?><p class="empty"><?= e(t('no_data')) ?></p><?php endif; ?>
  <ul class="timeline">
    <?php foreach ($runs as $run): ?>
      <li><strong class="<?= $run['ok'] ? 'pos' : 'neg' ?>"><?= $run['ok'] ? '✓' : '✗' ?></strong> <small><?= e($run['created_at']) ?></small><div class="run-out"><?= nl2br(e(mb_strimwidth((string) $run['output'], 0, 1500, '…'))) ?></div></li>
    <?php endforeach; ?>
  </ul>
</section>
<?php endif; ?>

<section class="card" id="presets">
  <div class="card-head"><h3>✨ <?= e(t('presets')) ?></h3></div>
  <div class="preset-grid">
    <?php foreach (recipe_presets() as $key => [$icon, $title, $desc]): ?>
      <div class="preset">
        <strong><?= $icon ?> <?= e($title) ?></strong>
        <p><?= e($desc) ?></p>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="preset"><input type="hidden" name="preset" value="<?= $key ?>"><button class="btn sm">+ <?= e(t('add')) ?></button></form>
      </div>
    <?php endforeach; ?>
  </div>
</section>
<script>
document.querySelectorAll('[data-switch]').forEach((sel) => {
  const key = sel.dataset.switch;
  const sync = () => document.querySelectorAll('[data-show^="' + key + ':"]').forEach((el) => {
    el.hidden = !el.dataset.show.split(':')[1].split(',').includes(sel.value);
  });
  sel.addEventListener('change', sync); sync();
});
let lastField = null;
document.querySelectorAll('.recipe-form textarea').forEach((ta) => ta.addEventListener('focus', () => { lastField = ta; }));
document.querySelectorAll('.var-chip').forEach((chip) => chip.addEventListener('click', () => {
  const ta = (lastField && !lastField.closest('[hidden]')) ? lastField : document.querySelector('.recipe-form label:not([hidden]) > textarea');
  if (!ta) return;
  const pos = ta.selectionStart ?? ta.value.length;
  ta.value = ta.value.slice(0, pos) + chip.textContent + ta.value.slice(pos);
  ta.focus();
}));
</script>
<?php page_footer();
