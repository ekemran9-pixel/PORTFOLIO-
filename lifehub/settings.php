<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_login();

// API keys saved now; the AI, voice and Notion modules (Phase 2–3) read them from here.
const API_KEYS = [
    'api_gemini' => ['Google Gemini', 'https://aistudio.google.com/app/apikey'],
    'api_groq'   => ['Groq (Whisper + Llama)', 'https://console.groq.com/keys'],
    'api_openai' => ['OpenAI', 'https://platform.openai.com/api-keys'],
    'api_claude' => ['Anthropic Claude', 'https://console.anthropic.com/settings/keys'],
    'api_notion' => ['Notion Integration', 'https://www.notion.so/my-integrations'],
    'api_telegram' => ['Telegram Bot', 'https://t.me/BotFather'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $do = post('do');
    if ($do === 'password') {
        $u = q('SELECT * FROM users WHERE id = ?', [current_user()['id']])->fetch();
        $new = $_POST['new_password'] ?? '';
        if (!password_verify($_POST['current_password'] ?? '', $u['password_hash'])) {
            flash(t('wrong_password'), 'err');
        } elseif (strlen($new) < 8) {
            flash(t('password_short'), 'err');
        } else {
            q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($new, PASSWORD_DEFAULT), $u['id']]);
            log_activity('password_changed');
            flash(t('password_changed'));
        }
    } elseif ($do === 'keys') {
        foreach (array_keys(API_KEYS) as $k) {
            $val = post($k);
            if (!empty($_POST['clear_' . $k])) {
                set_setting($k, '');
            } elseif ($val !== '') {
                set_setting($k, $val);
            }
        }
        log_activity('keys_updated');
        flash(t('saved'));
    } elseif ($do === 'ai') {
        set_setting('ai_provider', isset(AI_PROVIDERS[post('ai_provider')]) ? post('ai_provider') : '');
        foreach (array_keys(AI_PROVIDERS) as $p) {
            set_setting('ai_model_' . $p, post('ai_model_' . $p));
        }
        set_setting('stt_language', in_array(post('stt_language'), ['auto', 'bn', 'en'], true) ? post('stt_language') : 'auto');
        flash(t('saved'));
    } elseif ($do === 'ai_test') {
        session_write_close();
        $res = ai_chat([['role' => 'user', 'content' => 'Reply with exactly: OK']]);
        json_out($res['ok'] ? ['ok' => true, 'text' => AI_PROVIDERS[$res['provider']]['label'] . ': ' . mb_strimwidth($res['text'], 0, 80, '…')] : ['ok' => false, 'text' => $res['error']]);
    } elseif ($do === 'backup') {
        $data = ['app' => 'LifeHub', 'version' => APP_VERSION, 'exported_at' => now()];
        foreach (['customers', 'entries', 'media', 'activity', 'commands', 'recipes', 'ai_chats', 'ai_messages'] as $tbl) {
            $data[$tbl] = q("SELECT * FROM $tbl")->fetchAll();
        }
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="lifehub-backup-' . date('Y-m-d') . '.json"');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    redirect('settings.php');
}

$mask = fn(string $v) => $v === '' ? '' : str_repeat('•', 8) . substr($v, -4);

page_header(t('nav_settings'));
?>
<div class="grid-2">
  <section class="card span-2">
    <div class="card-head"><h3>🔑 <?= e(t('api_keys')) ?></h3></div>
    <p class="muted"><?= e(t('api_help')) ?></p>
    <form method="post" class="form">
      <?= csrf_field() ?>
      <input type="hidden" name="do" value="keys">
      <div class="keys">
        <?php foreach (API_KEYS as $k => [$label, $url]): $cur = (string) setting($k, ''); ?>
          <div class="key-row">
            <div class="key-label">
              <strong><?= e($label) ?></strong>
              <?php if ($cur !== ''): ?><span class="status-dot on"></span><small class="mono"><?= e($mask($cur)) ?></small><?php else: ?><span class="status-dot"></span><small class="muted"><?= e(t('not_set')) ?></small><?php endif; ?>
              <a class="small" href="<?= e($url) ?>" target="_blank" rel="noopener"><?= e(t('get_key')) ?> ↗</a>
            </div>
            <input name="<?= $k ?>" type="password" autocomplete="off" placeholder="<?= e($cur !== '' ? t('replace_key') : t('paste_key')) ?>">
            <?php if ($cur !== ''): ?><label class="check-label"><input type="checkbox" name="clear_<?= $k ?>" value="1"> <?= e(t('remove')) ?></label><?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>
      <button class="btn primary"><?= e(t('save')) ?></button>
    </form>
  </section>

  <section class="card span-2" id="ai">
    <div class="card-head"><h3>✦ <?= e(t('ai_settings')) ?></h3><button class="btn sm" type="button" id="aiTest"><?= e(t('ai_test')) ?></button></div>
    <p class="muted small" id="aiTestOut"><?= e(t('ai_settings_help')) ?></p>
    <form method="post" class="form grid-form">
      <?= csrf_field() ?>
      <input type="hidden" name="do" value="ai">
      <label><?= e(t('ai_provider')) ?>
        <select name="ai_provider">
          <option value=""><?= e(t('ai_auto')) ?></option>
          <?php foreach (AI_PROVIDERS as $p => $info): ?>
            <option value="<?= $p ?>" <?= setting('ai_provider') === $p ? 'selected' : '' ?> <?= ai_key($p) === '' ? 'disabled' : '' ?>><?= e($info['label']) ?><?= ai_key($p) === '' ? ' — ' . e(t('not_set')) : '' ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label><?= e(t('stt_language')) ?>
        <select name="stt_language">
          <?php foreach (['auto' => t('ai_auto'), 'bn' => 'বাংলা', 'en' => 'English'] as $v => $l): ?>
            <option value="<?= $v ?>" <?= setting('stt_language', 'auto') === $v ? 'selected' : '' ?>><?= e($l) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <?php foreach (AI_PROVIDERS as $p => $info): ?>
        <label><?= e($info['label']) ?> — <?= e(t('ai_model')) ?><input name="ai_model_<?= $p ?>" value="<?= e((string) setting('ai_model_' . $p, '')) ?>" placeholder="<?= e($info['model']) ?>"></label>
      <?php endforeach; ?>
      <div class="full form-actions"><button class="btn primary"><?= e(t('save')) ?></button></div>
    </form>
  </section>

  <section class="card">
    <div class="card-head"><h3>🔒 <?= e(t('change_password')) ?></h3></div>
    <form method="post" class="form">
      <?= csrf_field() ?>
      <input type="hidden" name="do" value="password">
      <label><?= e(t('current_password')) ?><input type="password" name="current_password" required autocomplete="current-password"></label>
      <label><?= e(t('new_password')) ?><input type="password" name="new_password" required minlength="8" autocomplete="new-password"></label>
      <button class="btn primary"><?= e(t('save')) ?></button>
    </form>
  </section>

  <section class="card">
    <div class="card-head"><h3>💾 <?= e(t('backup')) ?></h3></div>
    <p class="muted"><?= e(t('backup_help')) ?></p>
    <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="backup"><button class="btn">⬇ <?= e(t('download_backup')) ?></button></form>
    <hr>
    <p class="muted small">LifeHub v<?= APP_VERSION ?> · PHP <?= PHP_VERSION ?> · <?= e(db()->getAttribute(PDO::ATTR_DRIVER_NAME)) ?></p>
  </section>
</div>
<script>
document.getElementById('aiTest')?.addEventListener('click', async (e) => {
  const out = document.getElementById('aiTestOut');
  e.target.disabled = true; out.textContent = '…';
  const fd = new FormData(); fd.append('csrf', document.querySelector('meta[name=csrf]').content); fd.append('do', 'ai_test');
  try { const r = await (await fetch('settings.php', { method: 'POST', body: fd })).json(); out.textContent = (r.ok ? '✅ ' : '⚠ ') + r.text; }
  catch (err) { out.textContent = '⚠ ' + err.message; }
  e.target.disabled = false;
});
</script>
<?php page_footer();
