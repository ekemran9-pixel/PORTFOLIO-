<?php
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

if (current_user()) {
    redirect('index.php');
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    // Simple brute-force guard: 5 failures locks login for 15 minutes.
    $fails = (int) setting('login_fails', '0');
    $lockedUntil = (int) setting('login_locked_until', '0');
    if ($lockedUntil > time()) {
        $error = t('login_locked');
    } else {
        $user = q('SELECT * FROM users WHERE username = ?', [post('username')])->fetch();
        if ($user && password_verify($_POST['password'] ?? '', $user['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['uid'] = (int) $user['id'];
            set_setting('login_fails', '0');
            log_activity('login', $user['username']);
            redirect('index.php');
        }
        $fails++;
        set_setting('login_fails', (string) $fails);
        if ($fails >= 5) {
            set_setting('login_locked_until', (string) (time() + 900));
            set_setting('login_fails', '0');
        }
        $error = t('login_failed');
    }
}

page_header(t('login'));
?>
<div class="auth-card">
  <div class="auth-logo"><img src="assets/icon.svg" alt=""><h1><?= e(t('app_name')) ?></h1><p><?= e(t('tagline')) ?></p></div>
  <?php if ($error): ?><div class="flash flash-err"><?= e($error) ?></div><?php endif; ?>
  <form method="post" class="form">
    <?= csrf_field() ?>
    <label><?= e(t('username')) ?><input name="username" autocomplete="username" required autofocus></label>
    <label><?= e(t('password')) ?><input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn primary block"><?= e(t('sign_in')) ?></button>
  </form>
  <p class="center muted small"><a href="?lang=bn">বাংলা</a> · <a href="?lang=en">English</a></p>
</div>
<?php page_footer();
