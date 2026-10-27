/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k, d) { try { const v = localStorage.getItem('phd:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('phd:' + k, JSON.stringify(v)); } catch (e) {} }
};
const BN = '০১২৩৪৫৬৭৮৯';
const bn = s => String(s).replace(/[0-9]/g, d => BN[d]);
const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
const f = (v, d = 1) => isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const res = (label, value, main) => `<div class="res${main ? ' main' : ''}"><span>${label}</span><b>${value}</b></div>`;
const note = (txt, kind) => `<p class="hint"${kind ? ` style="color:var(--${kind})"` : ''}>${txt}</p>`;
const G = 9.81, DEG = Math.PI / 180, ALPHA = 12e-6;
const EQN = { common: 'সব ড্রাম', gran: 'গ্রানুলেটর', dryer: 'ড্রায়ার', coat: 'কোটিং ড্রাম' };
const FQN = { D: 'দৈনিক', W: 'সাপ্তাহিক', M: 'মাসিক', Q: 'ত্রৈমাসিক', A: 'বার্ষিক' };
function chipGroup(sel, cb) {
  $(sel).addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', $(sel)).forEach(c => c.setAttribute('aria-pressed', String(c === b))); cb(b.dataset.v); });
  return () => $('.chip[aria-pressed="true"]', $(sel)).dataset.v;
}
/* circular segment: fill fraction → central angle */
const phiOf = fill => { let p = 2; for (let i = 0; i < 40; i++) p -= (p - Math.sin(p) - 2 * Math.PI * fill) / (1 - Math.cos(p)); return p; };

/* ---------- router ---------- */
const ORDER = MODULES.map(m => m[0]);
function show(id, focusEl) {
  if (!ORDER.includes(id)) id = 'home';
  $$('.mod').forEach(m => m.hidden = m.id !== 'm-' + id);
  $$('#nav .reg a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
  document.body.classList.remove('navopen'); $('#veil').hidden = true; $('#menu').setAttribute('aria-expanded', 'false');
  const mod = $('#m-' + id);
  if (!$('.pager', mod)) {
    const i = ORDER.indexOf(id), pv = MODULES[i - 1], nx = MODULES[i + 1];
    mod.insertAdjacentHTML('beforeend', `<nav class="pager" aria-label="মডিউল নেভিগেশন">${pv ? `<a href="#${pv[0]}"><small>← আগের · ${bn(pv[1])}</small>${pv[2]}</a>` : ''}${nx ? `<a class="nx" href="#${nx[0]}"><small>পরের · ${bn(nx[1])} →</small>${nx[2]}</a>` : ''}</nav>
      <div class="foot"><span>এই গাইডের সংখ্যা, রেঞ্জ ও সূত্র প্রচলিত ডিজাইন রেফারেন্স (TVA, Perry's, ভেন্ডর বুলেটিন, ISO), সরবরাহকারীদের সুপারিশ ও প্লান্ট-অনুশীলনের ভিত্তিতে শেখার জন্য সাজানো। কাজের সময় আপনার ইকুইপমেন্টের OEM ম্যানুয়াল, ডেটাশিট, প্লান্টের SOP ও সেফটি নিয়মই চূড়ান্ত।</span></div>`);
  }
  document.title = (id === 'home' ? '' : mod.dataset.title + ' · ') + 'ফসফেট প্লান্ট ড্রাম গাইড';
  if (typeof V3D !== 'undefined') V3D.wake(mod);
  if (focusEl) {
    const d = focusEl.closest('details'); if (d) d.open = true; if (focusEl.matches('details')) focusEl.open = true;
    requestAnimationFrame(() => { focusEl.scrollIntoView({ block: 'start' }); focusEl.classList.remove('hit'); void focusEl.offsetWidth; focusEl.classList.add('hit'); });
  } else window.scrollTo(0, 0);
}
function route() { show((location.hash || '#home').slice(1)); }
window.addEventListener('hashchange', route);

$('#menu').addEventListener('click', () => {
  const open = !document.body.classList.contains('navopen');
  document.body.classList.toggle('navopen', open); $('#veil').hidden = !open; $('#menu').setAttribute('aria-expanded', String(open));
});
$('#veil').addEventListener('click', () => { document.body.classList.remove('navopen'); $('#veil').hidden = true; $('#menu').setAttribute('aria-expanded', 'false'); });

(function () {
  const saved = store.get('theme', null);
  if (saved) document.documentElement.dataset.theme = saved;
  $('#theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nx; store.set('theme', nx);
  });
})();

$('#tiles').innerHTML = MODULES.slice(1).map(m => `<a class="tile" href="#${m[0]}"><i>${m[1]}</i><b>${m[2]}</b><span>${m[3]}</span></a>`).join('');

/* ---------- 06 PM schedule ---------- */
(function () {
  $('#pmCount').textContent = bn(MAINT.length) + 'টি';
  const draw = () => {
    const e = eq(), q = fq();
    const rows = MAINT.filter(r => (e === 'all' || r[0] === e) && (q === 'all' || r[1] === q));
    $('#pmTable').innerHTML = `<thead><tr><th>ইকুইপমেন্ট</th><th>সময়</th><th>কাজ</th><th>কীভাবে / কী দেখবেন</th></tr></thead><tbody>` +
      (rows.length ? rows.map(r => `<tr><td>${EQN[r[0]]}</td><td><span class="pill${r[1] === 'A' ? ' r' : r[1] === 'D' ? ' y' : ''}">${FQN[r[1]]}</span></td><td style="color:var(--ink)">${r[2]}</td><td>${r[3]}</td></tr>`).join('') : '<tr><td colspan="4">এই ফিল্টারে কোনো কাজ নেই।</td></tr>') + '</tbody>';
  };
  const eq = chipGroup('#pmEq', draw), fq = chipGroup('#pmFq', draw);
  draw();
})();

/* ---------- 08 inspection checklists ---------- */
(function () {
  let n = 0; Object.values(INSP).forEach(o => Object.values(o).forEach(l => n += l.length));
  $('#icCount').textContent = bn(n) + 'টি পয়েন্ট';
  const keyOf = () => 'insp:' + eq() + ':' + kind();
  const draw = () => {
    const items = INSP[eq()][kind()], done = new Set(store.get(keyOf(), []));
    $('#icList').innerHTML = items.map(([t, d], i) => `<label class="chk${done.has(i) ? ' done' : ''}" for="ic${i}"><input type="checkbox" id="ic${i}" data-i="${i}"${done.has(i) ? ' checked' : ''}><span><b>${t}</b>${d ? `<p>${d}</p>` : ''}</span></label>`).join('');
    upd(done, items.length);
  };
  const upd = (done, total) => { const c = done.size, p = total ? Math.round(c / total * 100) : 0; $('#icBar').style.width = p + '%'; $('#icTxt').textContent = `${bn(c)} / ${bn(total)}`; $('#icPct').textContent = bn(p) + '%'; };
  const eq = chipGroup('#icEq', draw), kind = chipGroup('#icFq', draw);
  $('#icList').addEventListener('change', e => {
    const cb = e.target; if (cb.type !== 'checkbox') return;
    const done = new Set(store.get(keyOf(), [])), i = +cb.dataset.i;
    cb.checked ? done.add(i) : done.delete(i); cb.closest('.chk').classList.toggle('done', cb.checked);
    store.set(keyOf(), Array.from(done)); upd(done, INSP[eq()][kind()].length);
  });
  let armed = false;
  $('#icReset').addEventListener('click', () => {
    if (!armed) { armed = true; $('#icReset').textContent = 'নিশ্চিত? আবার চাপুন'; $('#icMsg').textContent = 'এই তালিকার সব টিক মুছে যাবে।'; setTimeout(() => { armed = false; $('#icReset').textContent = 'এই তালিকা মুছুন'; $('#icMsg').textContent = ''; }, 4000); return; }
    armed = false; store.set(keyOf(), []); draw(); $('#icReset').textContent = 'এই তালিকা মুছুন'; $('#icMsg').textContent = 'মুছে ফেলা হয়েছে।';
  });
  $('#icPrint').addEventListener('click', () => window.print());
  draw();
})();

/* ---------- 09 skew direction tool ---------- */
(function () {
  const run = () => {
    const rot = +$('#skRot').value, side = $('#skSide').value, mv = $('#skMove').value;
    const base = { ui: 1, uo: -1, di: -1, do: 1 }[mv], th = side === 'R' ? base : -base, dir = -rot * th;
    const sideBn = side === 'R' ? 'ডান' : 'বাম', other = side === 'R' ? 'বাম' : 'ডান';
    const partner = th * (side === 'R' ? -1 : 1) > 0 ? 'আপহিল বেয়ারিং ভেতরে, অথবা ডাউনহিল বেয়ারিং বাইরে' : 'আপহিল বেয়ারিং বাইরে, অথবা ডাউনহিল বেয়ারিং ভেতরে';
    $('#skOut').innerHTML = res('ড্রাম (টায়ার) সরবে', dir > 0 ? 'আপহিলে (ফিড প্রান্তে) ↑' : 'ডাউনহিলে (ডিসচার্জে) ↓', true) +
      res(`${sideBn} রোলার নিজে ঠেলা পাবে`, dir > 0 ? 'ডাউনহিলে' : 'আপহিলে') +
      res(`একই স্টেশনের ${other} রোলারে একই ফল পেতে`, `<span style="font-family:var(--body);font-size:14px">${partner}</span>`) +
      note('প্লান্টে প্রয়োগের আগে থ্রাস্ট রোলারের চাপ ও রোলার থ্রাস্ট কলারের দিক দেখে মিলিয়ে নিন। ঘোরার দিক ডিসচার্জ প্রান্ত থেকে দেখা।');
    const ang = 9 * th, rx = side === 'R' ? 196 : 64;
    const arr = dir > 0 ? 'M130 120 V70' : 'M130 100 V150';
    $('#skSvg').innerHTML = `<defs><marker id="skA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
      <text x="130" y="14" text-anchor="middle" class="tx">আপহিল · ফিড প্রান্ত ↑</text><text x="130" y="214" text-anchor="middle" class="tx">ডিসচার্জ প্রান্ত (আপনি এখানে)</text>
      <rect class="f" x="95" y="24" width="70" height="172" rx="4"/><rect class="fm" x="90" y="98" width="80" height="22"/>
      <text x="130" y="113" text-anchor="middle" class="tx" style="fill:var(--marker-ink)">টায়ার</text>
      <g transform="rotate(${-ang} ${rx} 109)"><rect class="fs" x="${rx - 14}" y="82" width="28" height="54" rx="3"/><line x1="${rx}" y1="62" x2="${rx}" y2="156" class="d"/><rect class="fl" x="${rx - 9}" y="66" width="18" height="12"/><rect class="fl" x="${rx - 9}" y="140" width="18" height="12"/></g>
      <rect class="fl" x="${(side === 'R' ? 64 : 196) - 14}" y="82" width="28" height="54" rx="3" style="opacity:.5"/>
      <path d="${arr}" stroke="var(--accent)" stroke-width="4" fill="none" marker-end="url(#skA)"/>
      <text x="${side === 'R' ? 196 : 64}" y="176" text-anchor="middle" class="txa">${sideBn} রোলার</text>`;
  };
  ['#skRot', '#skSide', '#skMove'].forEach(s => $(s).addEventListener('change', run)); run();
})();

/* ---------- 10 calculators ---------- */
(function () {
  const nav = $('#calcNav');
  nav.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', nav).forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    $$('#m-calc .calc').forEach(c => c.hidden = c.dataset.calc !== b.dataset.k);
  });
  const on = (ids, fn) => { const run = () => { try { fn(); } catch (e) {} }; ids.forEach(id => { const el = $(id); el.addEventListener('input', run); el.addEventListener('change', run); }); run(); };
  const ok = (cond, good, bad) => cond ? `<span class="pill g">${good}</span>` : `<span class="pill r">${bad}</span>`;

  on(['#crD', '#crN', '#crE'], () => {
    const D = num('#crD'), N = num('#crN'), e = $('#crE').value, Nc = 42.3 / Math.sqrt(D), p = N / Nc * 100;
    const rg = { gran: [30, 45], dryer: [10, 25], coat: [30, 45] }[e];
    $('#crOut').innerHTML = res('ক্রিটিকাল গতি Nc', f(Nc, 2) + ' rpm', true) + res('বর্তমান % ক্রিটিকাল', f(p, 1) + '% ' + ok(p >= rg[0] && p <= rg[1], 'সাধারণ রেঞ্জে', 'রেঞ্জের বাইরে')) +
      res(`${EQN[e]}-এর সাধারণ রেঞ্জ (${bn(rg[0])}–${bn(rg[1])}%)`, f(Nc * rg[0] / 100, 1) + ' – ' + f(Nc * rg[1] / 100, 1) + ' rpm') +
      res('পেরিফেরাল গতি', f(Math.PI * D * N / 60, 2) + ' মি/সে') + res('ফ্রাউড সংখ্যা', f((N / Nc) ** 2, 3));
  });

  on(['#rtL', '#rtD', '#rtS', '#rtN', '#rtA', '#rtF', '#rtQ', '#rtRho', '#rtG', '#rtP', '#rtM'], () => {
    const L = num('#rtL'), D = num('#rtD'), S = num('#rtS'), N = num('#rtN'), A = num('#rtA'), F = num('#rtF'), Q = num('#rtQ'), rho = num('#rtRho');
    const Lf = L * 3.2808, Df = D * 3.2808, area = Math.PI * D * D / 4, vol = area * L;
    const tU = 1.77 * Math.sqrt(A) * Lf * F / (S * Df * N);
    const conv = 2.20462 / 10.7639, Gs = num('#rtG') / area * conv, Fs = Q * 1000 / area * conv, B = 5 * Math.pow(num('#rtP'), -0.5);
    const tFM = 0.23 * Lf / (Math.tan(S * DEG) * Math.pow(N, 0.9) * Df) + (+$('#rtM').value) * 0.6 * B * Lf * Gs / Fs;
    const hold = t => Q * t / 60, fill = t => hold(t) / rho / vol * 100;
    $('#rtOut').innerHTML = res('USBM রিটেনশন টাইম', f(tU, 1) + ' মিনিট', true) + res('USBM অনুযায়ী হোল্ডআপ / ফিল', f(hold(tU), 1) + ' টন · ' + f(fill(tU), 1) + '%') +
      res('ফ্রিডম্যান-মার্শাল (ফ্লাইটেড ড্রায়ার)', f(tFM, 1) + ' মিনিট') + res('FM অনুযায়ী হোল্ডআপ / ফিল', f(hold(tFM), 1) + ' টন · ' + f(fill(tFM), 1) + '%') +
      res('ড্রামের আয়তন', f(vol, 1) + ' মি³') + note('গ্রানুলেটর ও কোটিং ড্রামে USBM দেখুন (ড্যাম রিং থাকলে প্রকৃত সময় বেশি)। ড্রায়ারে FM বেশি বাস্তবসম্মত। প্লান্টে ট্রেসার (রঙিন দানা) দিয়ে যাচাই করুন।');
  });

  on(['#sgD', '#sgMode', '#sgV'], () => {
    const R = num('#sgD') / 2, v = num('#sgV');
    let phi, fill;
    if ($('#sgMode').value === 'f') { fill = v / 100; phi = phiOf(fill); } else { const h = Math.min(v / 1000, 2 * R); phi = 2 * Math.acos(1 - h / R); fill = (phi - Math.sin(phi)) / (2 * Math.PI); }
    const h = R * (1 - Math.cos(phi / 2)), chord = 2 * R * Math.sin(phi / 2), rc = 4 * R * Math.pow(Math.sin(phi / 2), 3) / (3 * (phi - Math.sin(phi)));
    $('#sgOut').innerHTML = res('ফিল', f(fill * 100, 1) + '%', true) + res('বেড গভীরতা', f(h * 1000, 0) + ' মিমি') + res('বেডের উপরের প্রস্থ (কর্ড)', f(chord, 2) + ' মি') +
      res('কেন্দ্রীয় কোণ', f(phi / DEG, 1) + '°') + res('প্রস্থচ্ছেদে বেডের ক্ষেত্রফল', f(R * R / 2 * (phi - Math.sin(phi)), 2) + ' মি²') + res('অক্ষ থেকে বেডের ভরকেন্দ্র', f(rc, 3) + ' মি');
  });

  on(['#pwD', '#pwL', '#pwF', '#pwRho', '#pwN', '#pwB', '#pwW', '#pwT', '#pwMu', '#pwEta'], () => {
    const R = num('#pwD') / 2, L = num('#pwL'), phi = phiOf(num('#pwF') / 100), A = R * R / 2 * (phi - Math.sin(phi));
    const M = num('#pwRho') * 1000 * A * L, rc = 4 * R * Math.pow(Math.sin(phi / 2), 3) / (3 * (phi - Math.sin(phi)));
    const Tl = M * G * rc * Math.sin(num('#pwB') * DEG), Wt = (num('#pwW') * 1000 + M) * G;
    const Tf = num('#pwMu') * Wt / Math.cos(30 * DEG) * num('#pwT') / 2, w = 2 * Math.PI * num('#pwN') / 60, eta = num('#pwEta') || 1;
    const P = (Tl + Tf) * w / eta / 1000;
    $('#pwOut').innerHTML = res('প্রয়োজনীয় চলন্ত পাওয়ার (মোটর শ্যাফটে)', f(P, 0) + ' kW', true) + res('বেডের ভর', f(M / 1000, 1) + ' টন') + res('লোড টর্ক', f(Tl / 1000, 0) + ' kN·m') +
      res('ঘর্ষণ টর্ক', f(Tf / 1000, 0) + ' kN·m') + res('ড্রামে মোট টর্ক', f((Tl + Tf) / 1000, 0) + ' kN·m') + res('প্রস্তাবিত মোটর (×১.৩ সার্ভিস ফ্যাক্টর)', f(P * 1.3, 0) + ' kW') +
      note('বিল্ড-আপ (গ্রানুলেটরে বেশি), ফ্লাইটে তোলা মালামাল (ড্রায়ারে) ও স্টার্টিং টর্কের জন্য অতিরিক্ত ভাতা রাখুন। আপনার মোটরের প্রকৃত কারেন্ট দিয়ে মিলিয়ে নিন।');
  });

  on(['#grM', '#grI', '#grZp', '#grZg', '#grT', '#grR', '#grTgt'], () => {
    const pn = num('#grM') / num('#grI'), dn = pn * num('#grZp') / num('#grZg'), rr = dn * num('#grT') / num('#grR');
    $('#grOut').innerHTML = res('ড্রামের গতি', f(dn, 2) + ' rpm', true) + res('পিনিয়নের গতি', f(pn, 1) + ' rpm') + res('রোলারের গতি', f(rr, 1) + ' rpm') +
      res('মোট রেশিও (মোটর : ড্রাম)', f(num('#grM') / dn, 1) + ' : ১') + res('টায়ারের পৃষ্ঠের গতি', f(Math.PI * num('#grT') * dn / 60, 2) + ' মি/সে') +
      res('লক্ষ্য গতির জন্য গিয়ারবক্স রেশিও', f(num('#grM') * num('#grZp') / (num('#grZg') * num('#grTgt')), 2)) + res('অথবা VFD-তে মোটর গতি', f(num('#grTgt') * num('#grZg') / num('#grZp') * num('#grI'), 0) + ' rpm (' + f(num('#grTgt') / dn * 50, 1) + ' Hz, ৫০ Hz ভিত্তি)');
  });

  on(['#ldW', '#ldS', '#ldSh', '#ldA', '#ldSl', '#ldT', '#ldR', '#ldB'], () => {
    const W = num('#ldW') * 1000 * G, st = W * num('#ldSh') / 100, Fr = st / (2 * Math.cos(num('#ldA') * DEG)), th = W * Math.sin(num('#ldSl') * DEG);
    const q = Fr / num('#ldB'), k = 1 / (num('#ldT') * 500) + 1 / (num('#ldR') * 500), p = Math.sqrt(q * 210000 * k / (2 * Math.PI * (1 - 0.09)));
    $('#ldOut').innerHTML = res('প্রতি রোলারে স্বাভাবিক বল', f(Fr / 1000, 0) + ' kN', true) + res('স্টেশন লোড (উল্লম্ব)', f(st / 1000, 0) + ' kN') + res('ঢালের কারণে অ্যাক্সিয়াল থ্রাস্ট (মোট)', f(th / 1000, 1) + ' kN') +
      res('লাইন লোড', f(q, 0) + ' N/মিমি') + res('হার্জ কন্টাক্ট চাপ', f(p, 0) + ' MPa ' + ok(p < 450, 'সাধারণ সীমার নিচে', 'বেশি, OEM দেখুন')) +
      note('স্টেশন ভাগ সমান নাও হতে পারে (গিয়ার স্টেশনে বেশি)। সমান ফেস কন্টাক্ট ধরে হিসাব; টেপার ক্ষয় বা স্কিউতে প্রকৃত চাপ অনেক বেশি হয়। সাধারণ অনুমোদিত সীমা ফোর্জড/কাস্ট স্টিলে প্রায় ৪০০–৫০০ MPa।');
  });

  on(['#cpX', '#cpN', '#cpD', '#cpTs', '#cpTt'], () => {
    const c = num('#cpX') / (num('#cpN') || 1), gap = c / Math.PI, D = num('#cpD') * 1000, dg = ALPHA * D * (num('#cpTs') - num('#cpTt'));
    $('#cpOut').innerHTML = res('ক্রিপ', f(c, 1) + ' মিমি/পাক', true) + res('চালু অবস্থার ব্যাসগত গ্যাপ', f(gap, 2) + ' মিমি') + res('গ্যাপ, ব্যাসের শতাংশে', f(gap / D * 100, 3) + '%') +
      res('শেল-টায়ার তাপমাত্রা পার্থক্যে গ্যাপ কমেছে', f(dg, 2) + ' মিমি') + res('আনুমানিক ঠান্ডা গ্যাপ', f(gap + dg, 2) + ' মিমি') +
      note(gap + dg > 0 && gap < 0.3 ? 'চালু গ্যাপ খুব কম: শেল টায়ারে চাপ খাচ্ছে কিনা দেখুন।' : 'ট্রেন্ডে বৃদ্ধি দেখলে রি-শিমিংয়ের পরিকল্পনা করুন।');
  });

  on(['#ovN', '#ovX', '#ovI'], () => {
    const N = num('#ovN'), w = (num('#ovX') - num('#ovI')) / N * 100, lim = N / 1000 / 10;
    $('#ovOut').innerHTML = res('আপেক্ষিক ওভালিটি', f(w, 3) + '%', true) + res('নির্দেশিকা সীমা (D/১০)', f(lim, 2) + '% ' + ok(w <= lim, 'সীমার মধ্যে', 'সীমা অতিক্রম')) + res('সীমার ব্যবহার', f(w / lim * 100, 0) + '%');
  });

  on(['#thL', '#thD', '#thT1', '#thT2', '#thA', '#thX'], () => {
    const a = num('#thA') * 1e-6, dT = num('#thT2') - num('#thT1');
    $('#thOut').innerHTML = res('শেল দৈর্ঘ্য বৃদ্ধি', f(a * num('#thL') * 1000 * dT, 1) + ' মিমি', true) + res('ব্যাস বৃদ্ধি', f(a * num('#thD') * 1000 * dT, 2) + ' মিমি') +
      res('দূরবর্তী টায়ারের সরণ (থ্রাস্ট স্টেশন থেকে)', f(a * num('#thX') * 1000 * dT, 1) + ' মিমি') + note('ঠান্ডায় দূরবর্তী টায়ারকে রোলারের ফেসে এমনভাবে বসান যাতে গরমে সরে গিয়ে মাঝখানে আসে।');
  });

  on(['#dyF', '#dyX1', '#dyX2', '#dyTs1', '#dyTs2', '#dyCp', '#dyTg1', '#dyTg2', '#dyLoss', '#dyFuel', '#dyD', '#dyL'], () => {
    const F = num('#dyF') * 1000, x1 = num('#dyX1') / 100, x2 = num('#dyX2') / 100, dry = F * (1 - x1), prod = dry / (1 - x2), W = F - prod;
    const Ts1 = num('#dyTs1'), Tg1 = num('#dyTg1'), Tg2 = num('#dyTg2');
    const Qw = W * (4.19 * (100 - Ts1) + 2257 + 1.9 * (Tg2 - 100)), Qs = prod * num('#dyCp') * (num('#dyTs2') - Ts1), Qt = (Qw + Qs) / (1 - num('#dyLoss') / 100);
    const gas = Qt / (1.08 * (Tg1 - Tg2)), [lhv, unit] = $('#dyFuel').value.split('|'), fuel = Qt / 1000 / +lhv;
    const D = num('#dyD'), L = num('#dyL'), rhoOut = 1.293 * 273.15 / (273.15 + Tg2), Qout = (gas + W) / rhoOut, vel = Qout / 3600 / (Math.PI * D * D / 4 * 0.88);
    $('#dyOut').innerHTML = res('বাষ্পীভূত পানি', f(W, 0) + ' কেজি/ঘণ্টা', true) + res('শুকনো সলিড / পণ্য', f(dry / 1000, 1) + ' / ' + f(prod / 1000, 1) + ' টন/ঘণ্টা') +
      res('মোট তাপ দরকার', f(Qt / 1e6, 2) + ' GJ/ঘণ্টা (' + f(Qt / 3.6e6, 2) + ' MW)') + res('প্রতি কেজি পানিতে তাপ', f(Qt / W / 1000, 2) + ' MJ/কেজি') +
      res('জ্বালানি খরচ', f(fuel, 0) + (unit === 'kg' ? ' কেজি/ঘণ্টা' : ' Nm³/ঘণ্টা'), true) + res('ইনলেট গরম গ্যাস (দহন + ডাইলিউশন)', f(gas, 0) + ' কেজি/ঘণ্টা') +
      res('আউটলেট গ্যাস (প্রকৃত)', f(Qout, 0) + ' মি³/ঘণ্টা') + res('ড্রামে গ্যাসের বেগ', f(vel, 2) + ' মি/সে ' + ok(vel <= 3.5, '≤ ৩.৫', 'বেশি, ধুলা বাড়বে')) +
      res('ভলিউমেট্রিক ইভাপোরেশন', f(W / (Math.PI * D * D / 4 * L), 1) + ' কেজি/ঘণ্টা·মি³');
  });

  on(['#szQ', '#szV', '#szF', '#szW', '#szLD'], () => {
    const D = Math.sqrt(4 * num('#szQ') / (Math.PI * num('#szV') * 3600 * (1 - num('#szF') / 100))), L = D * num('#szLD'), ve = num('#szW') / (Math.PI * D * D / 4 * L);
    $('#szOut').innerHTML = res('প্রয়োজনীয় ভেতরের ব্যাস', f(D, 2) + ' মি', true) + res('দৈর্ঘ্য', f(L, 1) + ' মি') + res('ভলিউমেট্রিক ইভাপোরেশন', f(ve, 1) + ' কেজি/ঘণ্টা·মি³ ' + ok(ve >= 10 && ve <= 50, 'সাধারণ রেঞ্জে', 'রেঞ্জের বাইরে')) +
      note('রিটেনশন টাইম ক্যালকুলেটর দিয়ে দৈর্ঘ্য, ঢাল ও গতি মিলিয়ে নিন। চূড়ান্ত সাইজিং পাইলট টেস্ট ও ভেন্ডর ডেটায়।');
  });

  on(['#dpP', '#dpN', '#dpP2', '#dpA', '#dpRho', '#dpLoss', '#dpNl', '#dpMRp', '#dpRR'], () => {
    const P = num('#dpP'), p2 = P * num('#dpP2') / 100, p2in = p2 / (1 - num('#dpLoss') / 100), acid = p2in / (num('#dpA') / 100);
    const N = P * num('#dpN') / 100, nh3 = N * 17.031 / 14.007 / (1 - num('#dpNl') / 100), MR = (num('#dpN') / 14.007) / (2 * num('#dpP2') / 141.94);
    const pn = nh3 * Math.min(num('#dpMRp') / MR, 1), nP = p2in * 1000 * 2 / 141.94, heat = nP * (134 + Math.max(MR - 1, 0) * 78);
    const water = acid * (1 - 1.3806 * num('#dpA') / 100);
    $('#dpOut').innerHTML = res('ফসফরিক অ্যাসিড', f(acid, 2) + ' টন/ঘণ্টা (' + f(acid / num('#dpRho'), 1) + ' মি³/ঘণ্টা)', true) + res('মোট অ্যামোনিয়া', f(nh3, 2) + ' টন/ঘণ্টা', true) +
      res('পণ্যের মোল রেশিও', f(MR, 2)) + res('প্রি-নিউট্রালাইজারে NH₃', f(pn, 2) + ' টন/ঘণ্টা') + res('গ্রানুলেটর স্পার্জারে NH₃', f(nh3 - pn, 2) + ' টন/ঘণ্টা') +
      res('অ্যাসিডের সাথে ঢোকা পানি', f(water, 1) + ' টন/ঘণ্টা') + res('রিসাইকেল', f(P * num('#dpRR'), 0) + ' টন/ঘণ্টা') +
      res('বিক্রিয়ার তাপ (আনুমানিক)', f(heat / 1000, 1) + ' GJ/ঘণ্টা') + res('এই তাপে বাষ্প হতে পারে প্রায়', f(heat / 2.4 / 1000, 1) + ' টন পানি/ঘণ্টা') +
      note('ফসফরিক অ্যাসিডে অপদ্রব্যের (Fe, Al, Mg, F) কারণে প্রকৃত গ্রেড ও MR একটু ভিন্ন হয়। স্লারি পানি ও স্ক্রাবার লিকার এখানে ধরা হয়নি।');
  });

  on(['#mrN', '#mrP', '#mrNH', '#mrAc', '#mrAs'], () => {
    const a = (num('#mrN') / 14.007) / (2 * num('#mrP') / 141.94), b = (num('#mrNH') / 17.031) / (2 * num('#mrAc') * num('#mrAs') / 100 / 141.94);
    const tag = m => m < 1.2 ? 'MAP-এর দিকে' : m < 1.6 ? 'প্রি-নিউট্রালাইজার রেঞ্জ' : m < 1.8 ? 'DAP-এর জন্য কম' : m <= 1.95 ? 'DAP লক্ষ্য' : 'বেশি: NH₃ লস';
    $('#mrOut').innerHTML = res('বিশ্লেষণ থেকে MR', f(a, 3) + ' · ' + tag(a), true) + res('ফিড ফ্লো থেকে MR', f(b, 3) + ' · ' + tag(b)) + res('নমুনার N:P₂O₅ ওজন অনুপাত', f(num('#mrN') / num('#mrP'), 3));
  });

  on(['#rrP', '#rrX', '#rrB'], () => {
    const P = num('#rrP'), tot = (P + num('#rrB')) / (num('#rrX') / 100), R = tot - P;
    $('#rrOut').innerHTML = res('রিসাইকেল রেশিও', f(R / P, 2) + ' : ১', true) + res('রিসাইকেল', f(R, 0) + ' টন/ঘণ্টা') + res('স্ক্রিন/এলিভেটরে মোট লোড', f(tot, 0) + ' টন/ঘণ্টা') +
      note('অন-সাইজ ভগ্নাংশ ১% বাড়ালেই রিসাইকেল ও শক্তি খরচ অনেক কমে; গ্রানুলেশন নিয়ন্ত্রণ তাই সবচেয়ে লাভজনক।');
  });

  on(['#ctP', '#ctD', '#ctRho', '#ctPw', '#ctDisp', '#ctH', '#ctStk'], () => {
    const kg = num('#ctP') * num('#ctD'), l = kg / num('#ctRho'), day = kg * num('#ctH');
    $('#ctOut').innerHTML = res('অয়েল ফ্লো', f(kg, 1) + ' কেজি/ঘণ্টা', true) + res('আয়তনে', f(l, 1) + ' লিটার/ঘণ্টা') + res('পাম্পের গতি', f(l * 1000 / 60 / num('#ctDisp'), 0) + ' rpm') +
      res('পাউডার', f(num('#ctP') * 1000 * num('#ctPw') / 100, 0) + ' কেজি/ঘণ্টা') + res('দৈনিক অয়েল খরচ', f(day / 1000, 2) + ' টন') + res('স্টক চলবে', f(num('#ctStk') * 1000 / day, 1) + ' দিন') + res('কোটিং (ওজনে)', f(num('#ctD') / 10, 2) + '%');
  });

  on(['#grsD', '#grsB', '#grsd', '#grsN', '#grsK', '#grsT', '#grsS'], () => {
    const g = 0.005 * num('#grsD') * num('#grsB'), d = num('#grsd');
    let tf = +$('#grsK').value * (14e6 / (num('#grsN') * Math.sqrt(d)) - 4 * d); const T = num('#grsT'); if (T > 70) tf /= Math.pow(2, (T - 70) / 15);
    $('#grsOut').innerHTML = res('প্রতিবার গ্রিজ', f(g, 0) + ' গ্রাম', true) + res('গ্রিজ গানের স্ট্রোক', f(g / num('#grsS'), 0) + 'টি') + res('সাপ্তাহিক ছোট ডোজ (০.০০২DB)', f(0.002 * num('#grsD') * num('#grsB'), 0) + ' গ্রাম') +
      res('তাত্ত্বিক রিলুব্রিকেশন সময়', tf > 0 ? f(tf, 0) + ' ঘণ্টা' : '—') + note('ধীরগতির ড্রাম রোলারে তাত্ত্বিক সময় খুব বেশি আসে; কিন্তু ধুলা ও আর্দ্রতা বের করে দিতে প্লান্টে সাধারণত সাপ্তাহিক থেকে মাসিক রিলুব্রিকেশন করা হয় (সর্বোচ্চ ~৭০০ ঘণ্টা)।');
  });

  on(['#gcM', '#gcZg', '#gcZp', '#gcDT', '#gcDP'], () => {
    const m = num('#gcM'), dg = m * num('#gcZg'), dp = m * num('#gcZp'), a = (dg + dp) / 2, drg = ALPHA * dg / 2 * num('#gcDT'), drp = ALPHA * dp / 2 * num('#gcDP');
    $('#gcOut').innerHTML = res('ঠান্ডায় রুট ক্লিয়ারেন্স সেটিং', f(0.25 * m + drg + drp, 2) + ' মিমি', true) + res('নমিনাল রুট ক্লিয়ারেন্স (০.২৫m)', f(0.25 * m, 2) + ' মিমি') +
      res('গরমে গিয়ার + পিনিয়নের বৃদ্ধি', f(drg + drp, 2) + ' মিমি') + res('ব্যাকল্যাশ নির্দেশিকা', f(0.04 * m, 2) + ' – ' + f(0.08 * m, 2) + ' মিমি') +
      res('গার্থ গিয়ারের পিচ ব্যাস', f(dg, 0) + ' মিমি') + res('পিনিয়নের পিচ ব্যাস', f(dp, 0) + ' মিমি') + res('সেন্টার দূরত্ব', f(a, 1) + ' মিমি') + res('গিয়ার রেশিও', f(num('#gcZg') / num('#gcZp'), 2));
  });

  on(['#coT0', '#coT1', '#coY', '#coTm'], () => {
    const r = (num('#coT0') - num('#coT1')) / (num('#coY') || 1), life = (num('#coT1') - num('#coTm')) / r;
    $('#coOut').innerHTML = res('ক্ষয়ের হার', f(r, 2) + ' মিমি/বছর', true) + res('বাকি আয়ু', r > 0 ? f(life, 1) + ' বছর' : 'ক্ষয় নেই') + res('মূলের কত শতাংশ বাকি', f(num('#coT1') / num('#coT0') * 100, 0) + '%') +
      note(life < 2 ? 'দুই বছরের কম: পরের শাটডাউনে মেরামত/বদলের পরিকল্পনা করুন।' : 'পরবর্তী UT একই পয়েন্টে করুন যাতে তুলনা সঠিক হয়।', life < 2 ? 'crit' : null);
  });

  (function () {
    const ids = ['#slDeg', '#slPct', '#slMm', '#slIn'], toT = [v => Math.tan(v * DEG), v => v / 100, v => v / 1000, v => v / 12], fromT = [t => Math.atan(t) / DEG, t => t * 100, t => t * 1000, t => t * 12];
    let t = Math.tan(2 * DEG);
    const out = () => { $('#slOut').innerHTML = res('দুই টায়ারের মধ্যে উচ্চতার পার্থক্য', f(t * num('#slLen') * 1000, 1) + ' মিমি', true) + res('প্রতি মিটারে', f(t * 1000, 2) + ' মিমি'); };
    const sync = src => ids.forEach((id, i) => { if (id !== src) $(id).value = +fromT[i](t).toPrecision(5); });
    ids.forEach((id, i) => $(id).addEventListener('input', () => { const v = parseFloat($(id).value); if (!isFinite(v)) return; t = toT[i](v); sync(id); out(); }));
    $('#slLen').addEventListener('input', out); sync('#slDeg'); out();
  })();

  on(['#gsN', '#gsT', '#gsP', '#gsD'], () => {
    const QN = num('#gsN'), Qa = QN * (273.15 + num('#gsT')) / 273.15 * 10332 / (10332 + num('#gsP')), d = num('#gsD');
    $('#gsOut').innerHTML = res('প্রকৃত প্রবাহ', f(Qa, 0) + ' মি³/ঘণ্টা', true) + res('প্রতি সেকেন্ডে', f(Qa / 3600, 2) + ' মি³/সে') + res('ভর (বাতাস ধরে)', f(QN * 1.293, 0) + ' কেজি/ঘণ্টা') +
      res('ডাক্টে বেগ', f(Qa / 3600 / (Math.PI * d * d / 4), 1) + ' মি/সে') + res('চাপ (Pa)', f(num('#gsP') * 9.807, 0) + ' Pa');
  });

  on(['#smC', '#smX', '#smW', '#smT', '#smMu'], () => {
    const psi = Math.atan(num('#smX') / num('#smC'));
    $('#smOut').innerHTML = res('স্কিউ কোণ', f(psi / DEG, 4) + '°', true) + res('পিছলানো ছাড়া প্রতি পাকে সরণ', f(Math.PI * num('#smT') * 1000 * Math.tan(psi), 1) + ' মিমি') +
      res('এক রোলারের সর্বোচ্চ অ্যাক্সিয়াল বল (≈ μ × বল)', f(num('#smMu') * num('#smW'), 0) + ' kN') + note('এক মিমির কম সরানোতেও প্রতি পাকে কয়েক মিমি সরণের প্রবণতা তৈরি হয়, তাই সামান্য স্কিউতেই ড্রাম সাড়া দেয়। এক ধাপে সামান্য সরান, তারপর ২৪ ঘণ্টা অপেক্ষা করুন।');
  });
})();

/* ---------- 11 troubleshooting ---------- */
(function () {
  $('#tsCount').textContent = bn(TROUBLE.length) + 'টি';
  const draw = () => {
    const e = eq(), q = $('#tsQ').value.trim().toLowerCase();
    const rows = TROUBLE.filter(r => (e === 'all' || r[0] === e) && (!q || (r[1] + r[2].join(' ') + r[3].join(' ')).toLowerCase().includes(q)));
    $('#tsWrap').innerHTML = rows.length ? rows.map(r => `<div class="card"><span class="k">${EQN[r[0]]}</span><h3>${r[1]}</h3><div class="grid g2"><div><b style="font-size:13px;color:var(--ink-3)">সম্ভাব্য কারণ</b><ol class="l">${r[2].map(c => `<li>${c}</li>`).join('')}</ol></div><div><b style="font-size:13px;color:var(--ink-3)">করণীয়</b><ul class="l">${r[3].map(c => `<li>${c}</li>`).join('')}</ul></div></div></div>`).join('') : '<p class="hint">কিছু পাওয়া যায়নি। অন্য শব্দে চেষ্টা করুন।</p>';
  };
  const eq = chipGroup('#tsEq', draw);
  $('#tsQ').addEventListener('input', draw); draw();
})();

/* ---------- 13 quiz ---------- */
(function () {
  const box = $('#quizBox'); let set = [], i = 0, score = 0;
  $('#qzCount').textContent = bn(QUIZ.length) + 'টি';
  const best = () => { const b = store.get('quizBest', null); $('#qzBest').textContent = b == null ? '—' : bn(b) + ' / ১০'; };
  const start = () => { set = QUIZ.map((q, k) => [Math.random(), k]).sort((a, b) => a[0] - b[0]).slice(0, 10).map(x => QUIZ[x[1]]); i = 0; score = 0; render(); };
  const render = () => {
    if (i >= set.length) {
      const b = store.get('quizBest', 0); if (score > b) store.set('quizBest', score); best();
      box.innerHTML = `<div class="qtop"><span>রাউন্ড শেষ</span></div><div class="qq">আপনার স্কোর: ${bn(score)} / ${bn(set.length)}</div><p class="qx">${score >= 8 ? 'চমৎকার! ড্রাম সম্পর্কে আপনার জ্ঞান শক্ত।' : score >= 5 ? 'ভালো। ভুল প্রশ্নগুলোর মডিউল আরেকবার পড়ুন।' : 'মডিউলগুলো ক্রম অনুযায়ী পড়ে আবার চেষ্টা করুন।'}</p><div><button class="btn go" id="qzAgain" type="button">নতুন রাউন্ড</button></div>`;
      $('#qzAgain').addEventListener('click', start); return;
    }
    const q = set[i];
    box.innerHTML = `<div class="qtop"><span>প্রশ্ন ${bn(i + 1)} / ${bn(set.length)}</span><span>স্কোর ${bn(score)}</span></div><div class="qq">${q[0]}</div><div class="qo">${q[1].map((o, k) => `<button type="button" data-k="${k}">${o}</button>`).join('')}</div><div id="qzAfter"></div>`;
    $$('.qo button', box).forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k; if (k === q[2]) score++;
      $$('.qo button', box).forEach(x => { x.disabled = true; if (+x.dataset.k === q[2]) x.classList.add('ok'); else if (x === b) x.classList.add('no'); });
      $('#qzAfter').innerHTML = `<p class="qx">${k === q[2] ? '<b>সঠিক।</b> ' : '<b>ভুল।</b> '}${q[3]}</p><div style="margin-top:10px"><button class="btn go" type="button" id="qzNext">${i + 1 < set.length ? 'পরের প্রশ্ন' : 'ফলাফল দেখুন'}</button></div>`;
      $('#qzNext').addEventListener('click', () => { i++; render(); }); $('#qzNext').focus();
    }));
  };
  best(); start();
})();

/* ---------- 14 glossary ---------- */
(function () {
  const list = GLOSS.slice().sort((a, b) => a[0].localeCompare(b[0]));
  $('#glCount').textContent = bn(list.length) + 'টি';
  const draw = () => {
    const q = $('#glQ').value.trim().toLowerCase();
    const hits = list.filter(g => !q || (g[0] + ' ' + g[1]).toLowerCase().includes(q));
    $('#glList').innerHTML = hits.length ? hits.map(g => `<div><dt>${esc(g[0])}</dt><dd>${g[1]}</dd></div>`).join('') : '<p class="hint">কিছু পাওয়া যায়নি।</p>';
  };
  $('#glQ').addEventListener('input', draw); draw();
})();

/* ---------- site search ---------- */
(function () {
  let idx = null, k = 0;
  const build = () => {
    idx = [];
    $$('.mod').forEach(mod => {
      const mid = mod.id.slice(2), mtitle = mod.dataset.title;
      $$('.sec, .fig, .card, details.acc, .gl > div', mod).forEach(el => {
        if (el.closest('.calc') && !el.matches('.calc')) return;
        const h = el.matches('details') ? $('summary', el) : $('h2, h3, h4, dt, .k', el); if (!h) return;
        if (!el.id) el.id = 'x' + (k++);
        const title = h.textContent.replace(/^\s*\d+\.\d+\s*/, '').trim();
        idx.push({ mid, mtitle, el, title, tl: title.toLowerCase(), text: el.textContent.replace(/\s+/g, ' ').toLowerCase() });
      });
      $$('.v3d', mod).forEach(el => PARTS[el.dataset.model].forEach(p => idx.push({ mid, mtitle, el, part: p[0], title: '৩ডি: ' + p[1] + ' · ' + p[2], tl: (p[1] + ' ' + p[2]).toLowerCase(), text: p.slice(1).join(' ').toLowerCase() })));
    });
  };
  const q = $('#q'), box = $('#results');
  const search = () => {
    const s = q.value.trim().toLowerCase();
    if (s.length < 2) { box.hidden = true; return; }
    if (!idx) build();
    const terms = s.split(/\s+/);
    const hits = idx.map(r => { if (!terms.every(t => r.text.includes(t) || r.tl.includes(t))) return null; let sc = 0; terms.forEach(t => { if (r.tl.includes(t)) sc += 5; }); if (r.el.matches('.sec')) sc -= 1; return [sc, r]; })
      .filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 14).map(x => x[1]);
    box.innerHTML = hits.length ? hits.map(r => {
      const src = r.part ? r.text : r.el.textContent.replace(/\s+/g, ' '), p = src.toLowerCase().indexOf(terms[0]);
      return `<a href="#${r.mid}" data-i="${idx.indexOf(r)}"><small>${r.mtitle}</small>${esc(r.title)}<span>${esc(p >= 0 ? src.slice(Math.max(0, p - 30), p + 70) : '')}</span></a>`;
    }).join('') : '<div class="none">কিছু পাওয়া যায়নি। অন্য শব্দে চেষ্টা করুন (বাংলা বা ইংরেজি)।</div>';
    box.hidden = false;
  };
  q.addEventListener('input', search);
  q.addEventListener('focus', search);
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { box.hidden = true; q.blur(); } if (e.key === 'ArrowDown') { const a = $('a', box); if (a) { e.preventDefault(); a.focus(); } } if (e.key === 'Enter') { const a = $('a', box); if (a) { e.preventDefault(); a.click(); } } });
  box.addEventListener('keydown', e => { const a = document.activeElement; if (e.key === 'ArrowDown' && a.nextElementSibling) { e.preventDefault(); a.nextElementSibling.focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); (a.previousElementSibling || q).focus(); } if (e.key === 'Escape') { box.hidden = true; q.focus(); } });
  box.addEventListener('click', e => {
    const a = e.target.closest('a[data-i]'); if (!a) return; e.preventDefault();
    const r = idx[+a.dataset.i]; box.hidden = true;
    if (r.el.hidden) r.el.hidden = false;
    if (location.hash !== '#' + r.mid) history.replaceState(null, '', '#' + r.mid);
    show(r.mid, r.el);
    if (r.part) V3D.select(r.el, r.part);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.sbox')) box.hidden = true; });
})();

route();
