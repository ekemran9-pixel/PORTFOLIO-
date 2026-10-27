<?php
// AI Command Center: chat with your data, saved commands, voice input, photo questions.
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/media.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $do = post('do');

    if ($do === 'send') {
        session_write_close();
        $text = post('text');
        $mediaId = (int) post('media_id') ?: null;
        $chatId = (int) post('chat_id');
        if ($text === '' && !$mediaId) {
            json_out(['error' => t('empty')], 400);
        }
        if ($text === '') {
            $text = t('ai_describe_photo');
        }
        if (!$chatId || !q('SELECT id FROM ai_chats WHERE id = ?', [$chatId])->fetchColumn()) {
            q('INSERT INTO ai_chats (title, created_at, updated_at) VALUES (?, ?, ?)', [mb_strimwidth($text, 0, 60, '…'), now(), now()]);
            $chatId = (int) db()->lastInsertId();
        }
        q('INSERT INTO ai_messages (chat_id, role, content, media_id, created_at) VALUES (?, ?, ?, ?, ?)', [$chatId, 'user', $text, $mediaId, now()]);

        // Last 20 turns of this chat as context.
        $history = array_reverse(q('SELECT role, content FROM ai_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 20', [$chatId])->fetchAll());
        $image = $mediaId ? media_image_payload($mediaId) : null;
        $res = ai_chat($history, ai_system_prompt(post('use_data') === '1'), $image);
        if (!$res['ok']) {
            json_out(['chat_id' => $chatId, 'error' => $res['error']]);
        }
        [$reply, $actions] = ai_extract_actions($res['text']);
        q('INSERT INTO ai_messages (chat_id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?)',
            [$chatId, 'assistant', $reply, $actions ? json_encode($actions, JSON_UNESCAPED_UNICODE) : null, now()]);
        $msgId = (int) db()->lastInsertId();
        q('UPDATE ai_chats SET updated_at = ? WHERE id = ?', [now(), $chatId]);
        json_out(['chat_id' => $chatId, 'msg_id' => $msgId, 'reply' => $reply, 'actions' => $actions, 'provider' => $res['provider']]);
    }

    if ($do === 'apply') {
        // Actions are read from the stored message, so each one can be applied only once.
        $msg = q("SELECT id, actions FROM ai_messages WHERE id = ? AND role = 'assistant'", [(int) post('msg_id')])->fetch();
        $list = $msg ? (json_decode((string) $msg['actions'], true) ?: []) : [];
        $i = (int) post('index');
        if (!isset($list[$i])) {
            json_out(['ok' => false, 'message' => t('not_found')]);
        }
        if (!empty($list[$i]['_applied'])) {
            json_out(['ok' => true, 'message' => t('saved')]);
        }
        $res = apply_action($list[$i]);
        if ($res['ok']) {
            $list[$i]['_applied'] = true;
            q('UPDATE ai_messages SET actions = ? WHERE id = ?', [json_encode($list, JSON_UNESCAPED_UNICODE), $msg['id']]);
        }
        json_out($res);
    }

    if ($do === 'transcribe') {
        session_write_close();
        $f = $_FILES['audio'] ?? null;
        if (!$f || $f['error'] !== UPLOAD_ERR_OK) {
            json_out(['error' => t('upload_error')], 400);
        }
        $mime = preg_match('#^audio/[\w.+-]+#', (string) $f['type'], $m) ? $m[0] : 'audio/webm';
        $ext = str_contains($mime, 'mp4') ? 'm4a' : (str_contains($mime, 'ogg') ? 'ogg' : 'webm');
        $res = stt_transcribe($f['tmp_name'], $mime, 'voice.' . $ext);
        json_out($res['ok'] ? ['text' => $res['text']] : ['error' => $res['error']]);
    }

    if ($do === 'attach') {
        $file = files_list('photo')[0] ?? null;
        $res = $file ? store_upload($file, t('ai_photo_title'), 'ai', null) : t('upload_error');
        json_out(is_int($res) ? ['media_id' => $res] : ['error' => $res], is_int($res) ? 200 : 400);
    }

    if ($do === 'save_command') {
        $name = post('name');
        $prompt = post('prompt');
        if ($name !== '' && $prompt !== '') {
            $id = (int) post('id');
            if ($id) {
                q('UPDATE commands SET name = ?, prompt = ?, use_data = ? WHERE id = ?', [$name, $prompt, post('use_data') === '1' ? 1 : 0, $id]);
            } else {
                q('INSERT INTO commands (name, prompt, use_data, created_at) VALUES (?, ?, ?, ?)', [$name, $prompt, post('use_data') === '1' ? 1 : 0, now()]);
            }
            flash(t('saved'));
        }
        redirect('ai.php');
    }

    if ($do === 'delete_command') {
        q('DELETE FROM commands WHERE id = ?', [(int) post('id')]);
        redirect('ai.php');
    }

    if ($do === 'delete_chat') {
        q('DELETE FROM ai_messages WHERE chat_id = ?', [(int) post('id')]);
        q('DELETE FROM ai_chats WHERE id = ?', [(int) post('id')]);
        redirect('ai.php');
    }
}

// Starter commands so the page is useful on day one.
if (!q('SELECT COUNT(*) FROM commands')->fetchColumn() && !setting('commands_seeded')) {
    foreach ((array) ($GLOBALS['LANG']['starter_commands_list'] ?? []) as [$n, $p]) {
        q('INSERT INTO commands (name, prompt, use_data, created_at) VALUES (?, ?, 1, ?)', [$n, $p, now()]);
    }
    set_setting('commands_seeded', '1');
}

$chatId = (int) ($_GET['chat'] ?? 0);
$messages = $chatId ? q('SELECT * FROM ai_messages WHERE chat_id = ? ORDER BY id', [$chatId])->fetchAll() : [];
$chats = q('SELECT id, title, updated_at FROM ai_chats ORDER BY updated_at DESC LIMIT 30')->fetchAll();
$commands = q('SELECT * FROM commands ORDER BY name')->fetchAll();
$editCmd = isset($_GET['cmd']) ? q('SELECT * FROM commands WHERE id = ?', [(int) $_GET['cmd']])->fetch() : null;
$attachMedia = (int) ($_GET['media'] ?? 0);
$attach = $attachMedia ? q("SELECT id, title, original_name FROM media WHERE id = ? AND kind = 'image'", [$attachMedia])->fetch() : null;
$provider = ai_provider();
$runCommand = isset($_GET['run']) ? q('SELECT * FROM commands WHERE id = ?', [(int) $_GET['run']])->fetch() : null;

page_header(t('nav_ai'));
?>
<?php if (!$provider): ?>
  <div class="flash flash-err"><?= e(t('ai_no_key')) ?> <a href="settings.php#ai"><?= e(t('nav_settings')) ?> →</a></div>
<?php endif; ?>
<div class="ai-layout">
  <aside class="ai-side">
    <a class="btn primary block" href="ai.php">+ <?= e(t('ai_new_chat')) ?></a>

    <div class="card compact">
      <div class="card-head"><h3>⚡ <?= e(t('ai_commands')) ?></h3><a class="small" href="?cmd=0#cmdForm">+ <?= e(t('add')) ?></a></div>
      <?php if (!$commands): ?><p class="muted small"><?= e(t('ai_commands_help')) ?></p><?php endif; ?>
      <ul class="cmd-list">
        <?php foreach ($commands as $c): ?>
          <li>
            <button class="cmd-run" data-id="<?= $c['id'] ?>" data-prompt="<?= e($c['prompt']) ?>" data-use-data="<?= (int) $c['use_data'] ?>" title="<?= e($c['prompt']) ?>">▶ <?= e($c['name']) ?></button>
            <a class="btn-link" href="?cmd=<?= $c['id'] ?>#cmdForm">✎</a>
          </li>
        <?php endforeach; ?>
      </ul>
      <?php if (isset($_GET['cmd'])): ?>
      <form method="post" class="form" id="cmdForm">
        <?= csrf_field() ?>
        <input type="hidden" name="do" value="save_command">
        <input type="hidden" name="id" value="<?= (int) ($editCmd['id'] ?? 0) ?>">
        <label><?= e(t('name')) ?><input name="name" required value="<?= e($editCmd['name'] ?? '') ?>"></label>
        <label><?= e(t('ai_prompt')) ?><textarea name="prompt" rows="4" required><?= e($editCmd['prompt'] ?? '') ?></textarea></label>
        <label class="check-label"><input type="checkbox" name="use_data" value="1" <?= ($editCmd['use_data'] ?? 1) ? 'checked' : '' ?>> <?= e(t('ai_use_data')) ?></label>
        <div class="form-actions"><button class="btn primary"><?= e(t('save')) ?></button><a class="btn" href="ai.php"><?= e(t('cancel')) ?></a></div>
      </form>
      <?php if ($editCmd): ?>
        <form method="post" data-confirm><?= csrf_field() ?><input type="hidden" name="do" value="delete_command"><input type="hidden" name="id" value="<?= $editCmd['id'] ?>"><button class="btn-link danger"><?= e(t('delete')) ?></button></form>
      <?php endif; ?>
      <?php endif; ?>
    </div>

    <div class="card compact hide-sm">
      <div class="card-head"><h3>🕘 <?= e(t('ai_history')) ?></h3></div>
      <?php if (!$chats): ?><p class="muted small"><?= e(t('no_data')) ?></p><?php endif; ?>
      <ul class="chat-list">
        <?php foreach ($chats as $c): ?>
          <li class="<?= $chatId === (int) $c['id'] ? 'active' : '' ?>"><a href="?chat=<?= $c['id'] ?>"><?= e($c['title']) ?></a>
            <form method="post" class="inline" data-confirm><?= csrf_field() ?><input type="hidden" name="do" value="delete_chat"><input type="hidden" name="id" value="<?= $c['id'] ?>"><button class="btn-link danger" title="<?= e(t('delete')) ?>">×</button></form></li>
        <?php endforeach; ?>
      </ul>
    </div>
  </aside>

  <section class="card chat-card">
    <div class="chat-log" id="chatLog" data-chat="<?= $chatId ?>">
      <?php if (!$messages): ?>
        <div class="chat-empty">
          <div class="chat-orb">✦</div>
          <h2><?= e(t('ai_hello')) ?></h2>
          <p class="muted"><?= e(t('ai_hello_sub')) ?></p>
          <div class="chips center-chips">
            <?php foreach ((array) ($GLOBALS['LANG']['ai_examples'] ?? []) as $ex): ?>
              <button class="pill example" data-prompt="<?= e($ex) ?>"><?= e($ex) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
      <?php endif; ?>
      <?php foreach ($messages as $m): ?>
        <div class="msg msg-<?= e($m['role']) ?>">
          <?php if ($m['media_id']): ?><img class="msg-img" src="file.php?id=<?= (int) $m['media_id'] ?>" alt=""><?php endif; ?>
          <div class="msg-body" data-md><?= e($m['content']) ?></div>
          <?php if ($m['actions']): ?><div class="msg-actions" data-msg="<?= (int) $m['id'] ?>" data-actions="<?= e($m['actions']) ?>"></div><?php endif; ?>
        </div>
      <?php endforeach; ?>
    </div>

    <form class="composer" id="composer">
      <div class="attach-preview" id="attachPreview" <?= $attach ? '' : 'hidden' ?>>
        <?php if ($attach): ?><img src="file.php?id=<?= $attach['id'] ?>" alt=""><?php endif; ?>
        <button type="button" class="btn-link danger" id="attachClear">×</button>
      </div>
      <input type="hidden" name="media_id" id="mediaId" value="<?= $attach ? (int) $attach['id'] : '' ?>">
      <textarea id="prompt" rows="1" placeholder="<?= e(t('ai_placeholder')) ?>"><?= e($runCommand['prompt'] ?? '') ?></textarea>
      <div class="composer-bar">
        <label class="icon-btn" title="<?= e(t('ai_attach_photo')) ?>">📷<input type="file" id="photoInput" accept="image/*" hidden></label>
        <button type="button" class="icon-btn" id="micBtn" title="<?= e(t('ai_voice')) ?>">🎤</button>
        <label class="check-label small"><input type="checkbox" id="useData" checked> <?= e(t('ai_use_data')) ?></label>
        <span class="muted small provider-tag"><?= $provider ? e(AI_PROVIDERS[$provider]['label']) . ' · ' . e(ai_model($provider)) : '' ?></span>
        <button class="btn primary" id="sendBtn"><?= e(t('ai_send')) ?> ➤</button>
      </div>
    </form>
  </section>
</div>
<script>window.AI = { stt: <?= stt_available() ? 'true' : 'false' ?>, autorun: <?= $runCommand ? 'true' : 'false' ?> };</script>
<?php page_footer(['assets/ai.js?v=' . APP_VERSION]);
