<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/media.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $do = post('do');
    $customerId = (int) post('customer_id') ?: null;
    $isAjax = ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';

    if ($do === 'delete') {
        $m = q('SELECT * FROM media WHERE id = ?', [(int) post('id')])->fetch();
        if ($m) {
            if ($m['stored_name']) {
                @unlink(uploads_dir() . '/' . $m['stored_name']);
            }
            q('DELETE FROM media WHERE id = ?', [$m['id']]);
            log_activity('media_deleted', $m['title'] ?: (string) $m['original_name']);
        }
        flash(t('deleted'));
        redirect('media.php');
    }

    if ($do === 'note') {
        $content = post('content');
        if ($content !== '') {
            q("INSERT INTO media (kind, title, content, tags, customer_id, created_at) VALUES ('text', ?, ?, ?, ?, ?)",
                [post('title'), $content, post('tags'), $customerId, now()]);
            log_activity('note_added', post('title') ?: mb_substr($content, 0, 40));
            flash(t('saved'));
        }
        redirect('media.php');
    }

    if ($do === 'upload') {
        $ok = 0;
        $errors = [];
        foreach (files_list('files') as $file) {
            $res = store_upload($file, post('title'), post('tags'), $customerId);
            is_int($res) ? $ok++ : $errors[] = $file['name'] . ': ' . $res;
        }
        if ($isAjax) {
            json_out(['ok' => $ok, 'errors' => $errors]);
        }
        flash($ok . ' ' . t('uploaded') . ($errors ? ' · ' . implode(' | ', $errors) : ''), $errors ? 'err' : 'ok');
        redirect('media.php');
    }
}

$kind = in_array($_GET['kind'] ?? '', MEDIA_KINDS, true) ? $_GET['kind'] : '';
$search = trim((string) ($_GET['q'] ?? ''));
$where = [];
$params = [];
if ($kind) { $where[] = 'kind = ?'; $params[] = $kind; }
if ($search !== '') { $where[] = '(title LIKE ? OR original_name LIKE ? OR tags LIKE ? OR content LIKE ?)'; array_push($params, ...array_fill(0, 4, "%$search%")); }
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
$page = max(1, (int) ($_GET['p'] ?? 1));
$perPage = 24;
$offset = ($page - 1) * $perPage;
$total = (int) q("SELECT COUNT(*) FROM media $whereSql", $params)->fetchColumn();
$list = q("SELECT * FROM media $whereSql ORDER BY id DESC LIMIT $perPage OFFSET $offset", $params)->fetchAll();
$counts = q('SELECT kind, COUNT(*) FROM media GROUP BY kind')->fetchAll(PDO::FETCH_KEY_PAIR);
$customers = q('SELECT id, name FROM customers ORDER BY name')->fetchAll();
$presetCustomer = (int) ($_GET['customer_id'] ?? 0);

page_header(t('nav_media'));
?>
<div class="grid-2">
  <section class="card">
    <div class="card-head"><h3>⬆ <?= e(t('upload_files')) ?></h3></div>
    <form method="post" enctype="multipart/form-data" class="form" id="uploadForm">
      <?= csrf_field() ?>
      <input type="hidden" name="do" value="upload">
      <label class="dropzone" id="dropzone">
        <input type="file" name="files[]" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" capture="environment">
        <span class="dz-icon">☁</span>
        <strong><?= e(t('drop_files')) ?></strong>
        <small class="muted"><?= e(t('allowed_types')) ?></small>
        <span class="dz-list" id="dzList"></span>
      </label>
      <div class="row-2">
        <label><?= e(t('title')) ?><input name="title"></label>
        <label><?= e(t('tags')) ?><input name="tags"></label>
      </div>
      <label><?= e(t('customer')) ?>
        <select name="customer_id"><option value="">— <?= e(t('none')) ?> —</option>
          <?php foreach ($customers as $c): ?><option value="<?= $c['id'] ?>" <?= $presetCustomer === (int) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?>
        </select>
      </label>
      <div class="progress" id="progress" hidden><span></span></div>
      <button class="btn primary block"><?= e(t('upload')) ?></button>
    </form>
  </section>

  <section class="card">
    <div class="card-head"><h3>✎ <?= e(t('write_note')) ?></h3></div>
    <form method="post" class="form">
      <?= csrf_field() ?>
      <input type="hidden" name="do" value="note">
      <label><?= e(t('title')) ?><input name="title"></label>
      <label><?= e(t('text')) ?><textarea name="content" rows="6" required placeholder="<?= e(t('note_placeholder')) ?>"></textarea></label>
      <div class="row-2">
        <label><?= e(t('tags')) ?><input name="tags"></label>
        <label><?= e(t('customer')) ?>
          <select name="customer_id"><option value="">— <?= e(t('none')) ?> —</option>
            <?php foreach ($customers as $c): ?><option value="<?= $c['id'] ?>" <?= $presetCustomer === (int) $c['id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach; ?>
          </select>
        </label>
      </div>
      <button class="btn primary block"><?= e(t('save')) ?></button>
    </form>
  </section>
</div>

<section class="card">
  <div class="toolbar">
    <div class="tabs">
      <a href="media.php" class="<?= $kind === '' ? 'active' : '' ?>"><?= e(t('all')) ?> <span><?= array_sum($counts) ?></span></a>
      <?php foreach (MEDIA_KINDS as $k): ?>
        <a href="?kind=<?= $k ?>" class="<?= $kind === $k ? 'active' : '' ?>"><?= e(t('kind_' . $k)) ?> <span><?= (int) ($counts[$k] ?? 0) ?></span></a>
      <?php endforeach; ?>
    </div>
    <form class="search" method="get"><?php if ($kind): ?><input type="hidden" name="kind" value="<?= e($kind) ?>"><?php endif; ?><input name="q" value="<?= e($search) ?>" placeholder="🔍 <?= e(t('search')) ?>…"></form>
  </div>
  <?php if (!$list): ?><p class="empty"><?= e(t('no_data')) ?></p><?php else: ?>
  <div class="media-grid">
    <?php foreach ($list as $m) { include __DIR__ . '/inc/media_card.php'; } ?>
  </div>
  <?= pager($page, $total, $perPage) ?>
  <?php endif; ?>
</section>
<?php page_footer();
