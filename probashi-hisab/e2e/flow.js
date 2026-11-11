/**
 * End-to-end check of the web build in headless Chromium.
 * Replays the owner's spreadsheet month through the real UI and compares the totals.
 *
 *   npx expo export --platform web && node e2e/serve.js dist &
 *   node e2e/flow.js [screenshot-dir]
 */
const { chromium } = require('playwright');
const assert = require('node:assert');

const URL = process.env.APP_URL || 'http://localhost:8099/';
const shots = process.argv[2];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: shots ? 2 : 1 });
  const page = await ctx.newPage();
  globalThis.__page = page;
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const shot = async (name) => shots && (await page.screenshot({ path: `${shots}/${name}.png` }));
  // Screens lower in the navigation stack stay in the DOM (hidden), so always pick the visible match.
  const seen = (loc) => loc.locator('visible=true').first();
  // Other tabs also stay mounted underneath the active one: click the match that is really on top.
  const tapOnTop = async (text) => {
    await page.waitForFunction((t) => [...document.querySelectorAll('div')].some((e) => {
      if (e.children.length || e.textContent !== t) return false;
      const r = e.getBoundingClientRect();
      const hit = r.width && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (hit !== e) return false;
      e.setAttribute('data-e2e', '1');
      return true;
    }), text);
    await page.locator('[data-e2e="1"]').first().click();
    await page.evaluate(() => document.querySelectorAll('[data-e2e]').forEach((e) => e.removeAttribute('data-e2e')));
  };
  const tap = (text) => seen(page.getByText(text, { exact: true })).click();
  const body = () => page.innerText('body');
  const step = (m) => console.log('•', m);

  await page.goto(URL);
  await page.getByText('শুরু করুন').waitFor({ timeout: 20000 });
  await shot('01-welcome');

  step('onboarding');
  await tap('শুরু করুন');
  await tap('সৌদি আরব');
  await page.getByTestId('onb-rate').fill('৩২.৪০'); // Bengali digits are accepted
  await shot('02-country');
  await tap('পরের ধাপ');
  await page.getByTestId('onb-salary').fill('4200');
  await tap('পরের ধাপ');
  await page.getByTestId('mode-track').click();
  await shot('03-mode');
  await tap('হিসাব শুরু করুন');
  await page.getByText('প্রথম লেনদেন যোগ করুন').waitFor();
  await shot('04-empty-dashboard');

  const add = async (action, fill) => {
    await page.getByTestId('tab-add').click();
    await page.getByRole('button', { name: action, exact: true }).last().click();
    await page.getByTestId('amount').waitFor();
    await fill();
    await tap('সেভ করুন');
    await page.getByTestId('net-savings').waitFor();
  };
  const date = (d) => page.getByLabel('তারিখ', { exact: true }).fill(d);
  const cat = (name) => page.getByRole('button', { name, exact: true }).click();

  step('income 4,200 SAR');
  await add('আয় যোগ করুন', async () => {
    await page.getByTestId('amount').fill('4200');
    await cat('বেতন');
    await date('2026-11-01');
  });

  step('remittance ৳62,000 at 32.40');
  await add('দেশে টাকা পাঠানো', async () => {
    await tap('BDT');
    await page.getByTestId('amount').fill('62000');
    assert.equal(await page.getByTestId('rate').inputValue(), '32.40');
    await cat('সংসার খরচ');
    await date('2026-11-01');
    await page.getByLabel('কাকে পাঠালেন').fill('মা');
    assert.match(await body(), /= ১,৯১৩\.৫৮ SAR/);
    if (shots) await shot('05-remittance-form');
  });

  step('expenses 20 + 100 + 80 SAR');
  for (const [amount, category, d] of [['20', 'মোবাইল ও ইন্টারনেট', '2026-11-02'], ['100', 'দান ও যাকাত', '2026-11-09'], ['80', 'যাতায়াত', '2026-11-09']]) {
    await add('খরচ যোগ করুন', async () => {
      await page.getByTestId('amount').fill(amount);
      await cat(category);
      await date(d);
    });
  }

  step('family expense ৳10,000');
  await add('দেশের খরচ', async () => {
    await page.getByTestId('amount').fill('10000');
    await cat('সংসার খরচ (বাবা-মা)');
    await date('2026-11-02');
    await page.getByLabel('কে খরচ করেছে').fill('মা');
  });

  step('loans: lent 1,800 and 100');
  for (const [name, amount] of [['রিজওয়ান ভাই', '1800'], ['রাসেল', '100']]) {
    await page.getByTestId('tab-add').click();
    await page.getByRole('button', { name: 'ধার / ঋণ', exact: true }).last().click();
    await page.getByTestId('debt-person').fill(name);
    await page.getByTestId('debt-amount').fill(amount);
    await page.getByLabel('তারিখ', { exact: true }).fill('2026-11-02');
    await tap('সেভ করুন');
    await seen(page.getByText(name)).waitFor();
    await shot('06-debts');
    await page.goBack();
    await page.getByTestId('net-savings').waitFor();
  }

  step('dashboard totals');
  let text = await body();
  await shot('07-dashboard');
  // cash left abroad = 4200 − 200 − 1913.58 − 1900. (The sheet's 166.42 also has a 20 SAR
  // loan repayment; that exact figure is asserted in __tests__/summary.test.ts.)
  assert.match(text, /১৮৬\.৪২ SAR/, 'cash abroad should be 186.42 SAR');
  // net savings = 4200 − 200 − (10000 / 32.40 = 308.64) = 3,691.36 SAR
  assert.equal(await page.getByTestId('net-savings').innerText(), '৩,৬৯১.৩৬ SAR');
  assert.match(text, /১,৯১৩\.৫৮ SAR/, 'remitted');
  assert.match(text, /১,৯০০\.০০ SAR/, 'receivable');
  assert.match(text, /৳৫২,০০০/, 'home balance');

  step('switch to BDT');
  await page.getByTestId('switch-currency').click();
  assert.equal(await page.getByTestId('net-savings').innerText(), '৳১,১৯,৬০০');
  await page.getByTestId('switch-currency').click();

  step('persistence across reload');
  await page.reload();
  await page.getByTestId('net-savings').waitFor({ timeout: 20000 });
  assert.equal(await page.getByTestId('net-savings').innerText(), '৩,৬৯১.৩৬ SAR');

  step('edit then delete a transaction');
  await tap('লেনদেন');
  await tapOnTop('যাতায়াত');
  await page.getByTestId('amount').fill('90');
  await tap('পরিবর্তন সেভ করুন');
  await page.getByText('−৯০.০০ SAR').locator('visible=true').last().waitFor();
  await shot('08-transactions');
  await tapOnTop('যাতায়াত');
  await tap('মুছে ফেলুন');
  await page.waitForFunction(() => !document.body.innerText.includes('−৯০.০০ SAR'));
  await page.getByLabel('খুঁজুন').fill('মোবাইল');
  const onTop = (t) => page.evaluate((t) => [...document.querySelectorAll('div')].some((e) => {
    if (e.children.length || e.textContent !== t) return false;
    const r = e.getBoundingClientRect();
    return !!r.width && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e;
  }), t);
  await page.waitForFunction(() => true);
  await page.waitForTimeout(300);
  assert.equal(await onTop('মোবাইল ও ইন্টারনেট'), true, 'search keeps the match');
  assert.equal(await onTop('দান ও যাকাত'), false, 'search hides the rest');

  step('home account ledger');
  await page.goto(URL + 'home-account');
  await page.getByTestId('home-balance').waitFor({ timeout: 20000 });
  assert.equal(await page.getByTestId('home-balance').innerText(), '৳৫২,০০০');
  await shot('09-home-account');

  step('reports, goals, budgets, tools, profile render');
  for (const [path, marker, name] of [['reports', 'আয়-ব্যয়ের সারাংশ', '10-reports'], ['goals', 'নতুন লক্ষ্য', '11-goals'], ['budgets', 'খাবার ও বাজার', '12-budgets'], ['tools', 'ভবিষ্যৎ সঞ্চয়ের হিসাব', '13-tools'], ['profile', 'দেশ, মুদ্রা ও রেট', '14-profile'], ['about', 'হিসাবের নিয়ম', '15-about']]) {
    await page.goto(URL + path);
    await page.getByText(marker).first().waitFor({ timeout: 20000 });
    await shot(name);
  }
  await page.goto(URL + 'tools');
  await page.getByTestId('sim-result').waitFor({ timeout: 20000 });
  assert.equal(await page.getByTestId('sim-result').innerText(), '৩০,০০০.০০ SAR'); // 500 × 60 months

  step('goal: create and deposit');
  await page.goto(URL + 'goals');
  await page.getByText('নতুন লক্ষ্য').first().click();
  await page.getByTestId('goal-name').fill('জমি কেনা');
  await page.getByTestId('goal-target').fill('10000');
  await tap('সেভ করুন');
  await page.getByText('জমা দিন').click();
  await page.getByTestId('amount').fill('500');
  await tap('সেভ করুন');
  await page.getByText('৫.০%').waitFor();
  await shot('11-goals');

  step('English + dark theme');
  await page.goto(URL + 'profile');
  await page.getByText('English').click();
  await page.getByText('Dark', { exact: true }).click();
  await page.goto(URL);
  await page.getByText('Real savings').first().waitFor({ timeout: 20000 });
  await shot('16-dashboard-en-dark');
  await page.goto(URL + 'profile');
  await page.getByText('বাংলা').click();
  await page.getByText('লাইট', { exact: true }).click();

  step('wipe → demo mode');
  await page.goto(URL + 'profile');
  await page.getByText('সব তথ্য মুছে ফেলুন').click();
  await page.getByText('আগে নমুনা দেখে নিই').click();
  await page.getByText('আপনি নমুনা তথ্য দেখছেন').waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await shot('17-demo-dashboard');
  await page.evaluate(() => window.scrollTo(0, 0));
  if (shots) await page.screenshot({ path: `${shots}/18-demo-full.png`, fullPage: true });

  const real = errors.filter((e) => !/favicon|Download the React DevTools/.test(e));
  assert.deepEqual(real, [], 'no console errors');
  console.log('E2E OK');
  await browser.close();
})().catch(async (e) => {
  console.error('E2E FAILED:', e.message); globalThis.__page && (await globalThis.__page.screenshot({ path: (process.argv[2] || '.') + '/fail.png', fullPage: true }));
  process.exit(1);
});
