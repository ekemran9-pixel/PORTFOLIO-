<?php
// Page shell: header with sidebar, and footer.

function nav_items(): array
{
    return [
        'index.php'     => ['nav_dashboard', '<path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"/>'],
        'ai.php'        => ['nav_ai', '<path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9zM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7z"/>'],
        'customers.php' => ['nav_customers', '<path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.7 0-8 1.3-8 4v3h8v-3c0-1.1.4-2.1 1.2-3A10 10 0 0 0 8 13zm8 0c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4z"/>'],
        'entries.php'   => ['nav_entries', '<path d="M4 4h16v2H4zm0 5h16v2H4zm0 5h10v2H4zm0 5h10v2H4zm13-4h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/>'],
        'media.php'     => ['nav_media', '<path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z"/>'],
        'reports.php'   => ['nav_reports', '<path d="M4 20h16v2H2V2h2zm3-3V9h3v8zm5 0V4h3v13zm5 0v-6h3v6z"/>'],
        'notion.php'    => ['nav_notion', '<path d="M4 3.5 14.8 2.7c1.3-.1 1.7 0 2.5.6l3.5 2.4c.6.4.7.6.7 1.1v13c0 .8-.3 1.3-1.4 1.4L7.6 22c-.8 0-1.2-.1-1.6-.7L3.3 17.9c-.5-.6-.7-1.1-.7-1.7V4.9c0-.7.3-1.3 1.4-1.4zm4.2 4.2v11.7l9.6-.6V7.2zM9.6 9l1.6-.1 3.5 5.4V9.2l1.4-.1v7.3l-1.3.1-3.7-5.6v5.3l-1.5.1z"/>'],
        'import.php'    => ['nav_import', '<path d="M5 20h14v-2H5zm7-18-5.5 5.5 1.4 1.4L11 5.8V16h2V5.8l3.1 3.1 1.4-1.4z"/>'],
        'settings.php'  => ['nav_settings', '<path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5z"/>'],
    ];
}

function page_header(string $title, array $opts = []): void
{
    $current = basename($_SERVER['SCRIPT_NAME']);
    $user = current_user();
    $flash = flash();
    $otherLang = lang() === 'bn' ? 'en' : 'bn';
    $qs = $_GET;
    $qs['lang'] = $otherLang;
    ?>
<!doctype html>
<html lang="<?= lang() ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f6f7fb">
<meta name="csrf" content="<?= csrf_token() ?>">
<title><?= e($title) ?> · <?= e(t('app_name')) ?></title>
<link rel="manifest" href="manifest.json">
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/app.css?v=<?= APP_VERSION ?>">
</head>
<body class="lang-<?= lang() ?>">
<?php if ($user): ?>
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <a class="brand" href="index.php">
      <span class="brand-mark"><img src="assets/icon.svg" alt=""></span>
      <span><?= e(t('app_name')) ?><small><?= e(t('tagline')) ?></small></span>
    </a>
    <nav>
      <?php foreach (nav_items() as $file => [$key, $icon]): ?>
        <a href="<?= $file ?>" class="<?= $current === $file ? 'active' : '' ?>">
          <svg viewBox="0 0 24 24" aria-hidden="true"><?= $icon ?></svg><?= e(t($key)) ?>
        </a>
      <?php endforeach; ?>
    </nav>
    <div class="sidebar-foot">
      <div class="soon">
        <strong><?= e(t('coming_soon')) ?></strong>
        <span><?= e(t('coming_soon_list')) ?></span>
      </div>
    </div>
  </aside>
  <div class="scrim" id="scrim"></div>
  <main class="main">
    <header class="topbar">
      <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu">
        <svg viewBox="0 0 24 24"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
      </button>
      <h1><?= e($title) ?></h1>
      <div class="topbar-right">
        <a class="pill" href="?<?= e(http_build_query($qs)) ?>"><?= $otherLang === 'en' ? 'English' : 'বাংলা' ?></a>
        <span class="user-chip"><span class="avatar"><?= e(mb_strtoupper(mb_substr($user['username'], 0, 1))) ?></span><?= e($user['username']) ?></span>
        <form method="post" action="logout.php" class="inline"><?= csrf_field() ?><button class="pill ghost"><?= e(t('logout')) ?></button></form>
      </div>
    </header>
    <?php if ($flash): ?>
      <div class="flash flash-<?= e($flash['type']) ?>"><?= e($flash['msg']) ?></div>
    <?php endif; ?>
    <div class="content">
<?php else: ?>
<div class="auth-wrap">
<?php endif;
}

function page_footer(array $scripts = []): void
{
    ?>
<?php if (current_user()): ?>
    </div>
  </main>
</div>
<?php else: ?>
</div>
<?php endif; ?>
<script>window.LH = { lang: <?= json_encode(lang()) ?>, t: <?= json_encode(js_strings(), JSON_UNESCAPED_UNICODE) ?> };</script>
<?php foreach ($scripts as $src): ?>
<script src="<?= e($src) ?>"></script>
<?php endforeach; ?>
<script src="assets/app.js?v=<?= APP_VERSION ?>"></script>
</body>
</html>
<?php
}

// Strings the JavaScript side needs.
function js_strings(): array
{
    $keys = ['income', 'expense', 'task', 'note', 'saved', 'copy', 'ai_apply', 'ai_apply_all', 'ai_read_aloud', 'stt_no_key',
        'act_add_entry', 'act_add_customer', 'act_add_note', 'act_complete_task', 'confirm_delete', 'skip_column', 'rows_ready', 'rows_imported', 'import_failed', 'no_rows', 'uploading', 'upload_done'];
    $out = [];
    foreach ($keys as $k) {
        $out[$k] = t($k);
    }
    return $out;
}

function delete_button(string $action, int $id, string $back): string
{
    return '<form method="post" action="' . e($action) . '" class="inline" data-confirm>'
        . csrf_field()
        . '<input type="hidden" name="do" value="delete">'
        . '<input type="hidden" name="id" value="' . $id . '">'
        . '<input type="hidden" name="back" value="' . e($back) . '">'
        . '<button class="btn-link danger">' . e(t('delete')) . '</button></form>';
}

function pager(int $page, int $total, int $perPage): string
{
    $pages = (int) max(1, ceil($total / $perPage));
    if ($pages <= 1) {
        return '';
    }
    $qs = $_GET;
    $html = '<div class="pager">';
    if ($page > 1) {
        $qs['p'] = $page - 1;
        $html .= '<a class="pill" href="?' . e(http_build_query($qs)) . '">← ' . e(t('page_prev')) . '</a>';
    }
    $html .= '<span>' . $page . ' / ' . $pages . '</span>';
    if ($page < $pages) {
        $qs['p'] = $page + 1;
        $html .= '<a class="pill" href="?' . e(http_build_query($qs)) . '">' . e(t('page_next')) . ' →</a>';
    }
    return $html . '</div>';
}
