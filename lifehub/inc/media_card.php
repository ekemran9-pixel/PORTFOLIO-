<?php
/** @var array $m one media row */
$label = $m['title'] ?: ($m['original_name'] ?: t('text'));
?>
<figure class="media-card kind-<?= e($m['kind']) ?>">
  <?php if ($m['kind'] === 'image'): ?>
    <a href="file.php?id=<?= $m['id'] ?>" target="_blank" class="media-thumb"><img src="file.php?id=<?= $m['id'] ?>" alt="<?= e($label) ?>" loading="lazy"></a>
  <?php elseif ($m['kind'] === 'video'): ?>
    <div class="media-thumb"><video src="file.php?id=<?= $m['id'] ?>" controls preload="metadata"></video></div>
  <?php elseif ($m['kind'] === 'audio'): ?>
    <div class="media-thumb icon">🎵<audio src="file.php?id=<?= $m['id'] ?>" controls preload="none"></audio></div>
  <?php elseif ($m['kind'] === 'text'): ?>
    <div class="media-thumb text"><p><?= nl2br(e(mb_strimwidth((string) $m['content'], 0, 400, '…'))) ?></p></div>
  <?php else: ?>
    <a href="file.php?id=<?= $m['id'] ?>&dl=1" class="media-thumb icon">📄<span><?= e(strtoupper(pathinfo((string) $m['original_name'], PATHINFO_EXTENSION))) ?></span></a>
  <?php endif; ?>
  <figcaption>
    <strong title="<?= e($label) ?>"><?= e($label) ?></strong>
    <small class="muted"><?= e(substr($m['created_at'], 0, 10)) ?><?= $m['size'] ? ' · ' . human_size((int) $m['size']) : '' ?></small>
    <?php if ($m['tags']): ?><div><?php foreach (array_filter(array_map('trim', explode(',', $m['tags']))) as $tag): ?><span class="tag"><?= e($tag) ?></span><?php endforeach; ?></div><?php endif; ?>
    <div class="media-actions">
      <?php if ($m['kind'] !== 'text'): ?><a class="btn-link" href="file.php?id=<?= $m['id'] ?>&dl=1">⬇</a><?php else: ?><button class="btn-link" data-copy="<?= e((string) $m['content']) ?>"><?= e(t('copy')) ?></button><?php endif; ?>
      <?= delete_button('media.php', (int) $m['id'], 'media.php') ?>
    </div>
  </figcaption>
</figure>
