/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k, d) { try { const v = localStorage.getItem('hse:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hse:' + k, JSON.stringify(v)); } catch (e) {} }
};
const BN = '০১২৩৪৫৬৭৮৯';
const bn = s => String(s).replace(/[0-9]/g, d => BN[d]);
const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
const f = (v, d = 1) => isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const res = (label, value, main) => `<div class="res${main ? ' main' : ''}"><span>${label}</span><b>${value}</b></div>`;
const note = (txt, kind) => `<p class="hint"${kind ? ` style="color:var(--${kind})"` : ''}>${txt}</p>`;
const pill = (cls, txt) => `<span class="pill ${cls}">${txt}</span>`;
const SEV = { x: ['চরম', 'Extreme'], h: ['উচ্চ', 'High'], m: ['মাঝারি', 'Medium'], l: ['কম', 'Low'] };
const SEVC = { x: 'var(--crit)', h: 'var(--high)', m: 'var(--warn)', l: 'var(--good)' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function chipGroup(sel, cb) {
  $(sel).addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', $(sel)).forEach(c => c.setAttribute('aria-pressed', String(c === b))); cb(b.dataset.v); });
  return () => $('.chip[aria-pressed="true"]', $(sel)).dataset.v;
}
const riskLevel = r => r >= 15 ? 'x' : r >= 10 ? 'h' : r >= 5 ? 'm' : 'l';

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
      <div class="foot"><span>এই গাইডের সীমা, সংখ্যা ও পদ্ধতি ACGIH, OSHA, NIOSH, ANSI, NFPA, IFA, ILO ও বাংলাদেশ শ্রম আইন ২০০৬/বিধিমালা ২০১৫-এর প্রচলিত মান থেকে শেখার জন্য সাজানো। কাজের সময় আপনার প্লান্টের SOP, সর্বশেষ SDS, OEM ম্যানুয়াল ও বর্তমান আইনই চূড়ান্ত।</span><span class="e">For learning and field reference. Your plant SOPs, current SDS, OEM manuals and the law in force prevail.</span></div>`);
  }
  document.title = (id === 'home' ? '' : mod.dataset.title + ' · ') + 'ফসফেট প্লান্ট সেফটি অফিসার গাইড';
  if (focusEl) {
    const d = focusEl.closest('details'); if (d) d.open = true;
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
  const setLang = bnOnly => {
    document.body.classList.toggle('only-bn', bnOnly);
    $('#lgBoth').setAttribute('aria-pressed', String(!bnOnly)); $('#lgBn').setAttribute('aria-pressed', String(bnOnly));
    store.set('bnOnly', bnOnly);
  };
  setLang(store.get('bnOnly', false));
  $('#lgBoth').addEventListener('click', () => setLang(false));
  $('#lgBn').addEventListener('click', () => setLang(true));
})();

$('#tiles').innerHTML = MODULES.slice(1).map(m => `<a class="tile" href="#${m[0]}"><i>${m[1]}</i><b>${m[2]}</b><span>${m[3]}</span></a>`).join('');

/* ---------- 00 rules ---------- */
(function () {
  const I = {
    permit: '<rect x="10" y="6" width="24" height="32" class="f"/><path d="M15 15h14M15 21h14M15 27h8" class="s"/><circle cx="32" cy="34" r="7" class="fm"/><path d="M29 34l2 2 4-4" class="s"/>',
    lock: '<rect x="10" y="20" width="24" height="18" rx="2" class="fm"/><path d="M15 20v-6a7 7 0 0 1 14 0v6" class="s"/><circle cx="22" cy="29" r="2.5" fill="var(--ink)"/>',
    gas: '<rect x="13" y="6" width="18" height="32" rx="3" class="f"/><rect x="16" y="10" width="12" height="9" fill="var(--good-soft)" stroke="var(--ink)"/><circle cx="22" cy="28" r="3" class="fm"/>',
    harness: '<circle cx="22" cy="9" r="4" class="f"/><path d="M14 18h16l-2 16h-12z" class="f"/><path d="M16 18l12 16M28 18l-12 16" stroke="var(--high)" stroke-width="2.5"/><path d="M22 4V0" class="s"/>',
    load: '<path d="M22 2v14" class="s"/><rect x="12" y="16" width="20" height="12" class="fm"/><path d="M8 40l28-6" class="d"/><path d="M6 32l32 10" stroke="var(--crit)" stroke-width="3"/>',
    guard: '<circle cx="18" cy="22" r="10" class="f"/><circle cx="18" cy="22" r="3" fill="var(--ink)"/><path d="M28 10h10v24H28" class="fm"/>',
    acid: '<path d="M22 4c6 10 10 15 10 21a10 10 0 0 1-20 0c0-6 4-11 10-21z" fill="var(--crit-soft)" stroke="var(--crit)" stroke-width="2"/><path d="M16 26h12" class="s"/>',
    wind: '<path d="M8 6v34" class="s"/><path d="M8 8l26 5v8L8 26z" fill="var(--high)" stroke="var(--ink)" stroke-width="1.5"/>',
    fire: '<path d="M22 4c8 12 12 18 8 28 5-2 6-7 6-7 3 11-5 15-14 15S8 34 10 25c2 5 5 6 5 6-3-11 4-17 7-27z" fill="var(--high)" stroke="var(--ink)" stroke-width="1.5"/>',
    override: '<rect x="6" y="14" width="32" height="16" rx="8" class="f"/><circle cx="16" cy="22" r="6" class="fm"/><path d="M6 38L38 6" stroke="var(--crit)" stroke-width="3"/>',
    drug: '<path d="M14 6h16l-2 8v22a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V14z" class="f"/><path d="M6 38L38 6" stroke="var(--crit)" stroke-width="3"/>',
    stop: '<path d="M14 4h16l10 10v16L30 40H14L4 30V14z" fill="var(--crit)" stroke="var(--ink)" stroke-width="1.5"/><path d="M14 22h16" stroke="var(--panel)" stroke-width="4"/>'
  };
  $('#rules').innerHTML = RULES.map(r => `<div class="rule"><svg viewBox="0 0 44 44" aria-hidden="true">${I[r[0]]}</svg><div><b>${r[1]}</b><span class="e">${r[2]}</span></div></div>`).join('');
})();

/* ---------- 01 own kit ---------- */
(function () {
  const svg = $('#kitSvg'), out = $('#kitInfo');
  const pick = k => {
    $$('.hot', svg).forEach(h => h.classList.toggle('on', h.dataset.k === k));
    const d = KIT[k];
    out.innerHTML = `<h3>${d[0]}<span class="e">${d[1]}</span></h3><p>${d[2]}</p><p><span class="pill y">${d[3]}</span></p>`;
  };
  svg.addEventListener('click', e => { const h = e.target.closest('.hot'); if (h) pick(h.dataset.k); });
  svg.addEventListener('keydown', e => { const h = e.target.closest('.hot'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(h.dataset.k); } });
  pick('mon');
})();

/* ---------- 02 animated process flow ---------- */
(function () {
  const W = 170, H = 56;
  const P = { rock: [20, 30], sa: [20, 170], nh3: [20, 320], pa: [250, 100], filt: [250, 240], conc: [480, 100], gran: [480, 250], dry: [690, 250], scr: [910, 250], store: [910, 380], scrub: [690, 90], util: [250, 390] };
  const SHORT = { rock: ['রক ফসফেট', 'Rock & mill'], sa: ['সালফিউরিক অ্যাসিড', 'H₂SO₄ plant'], nh3: ['অ্যামোনিয়া ট্যাংক', 'NH₃ storage'], pa: ['ফসফরিক রিঅ্যাক্টর', 'H₃PO₄ reactor'], filt: ['ফিল্টার ও জিপসাম', 'Filter · gypsum'], conc: ['কনসেন্ট্রেশন', 'Evaporator · FSA'], gran: ['গ্রানুলেশন', 'DAP / MAP'], dry: ['ড্রায়ার ও বার্নার', 'Dryer · burner'], scr: ['স্ক্রিন ও ক্রাশার', 'Screens · cooler'], store: ['স্টোরেজ ও ব্যাগিং', 'Storage · bagging'], scrub: ['স্ক্রাবার', 'Scrubbers'], util: ['ইউটিলিটি ও ETP', 'Boiler · air · ETP'] };
  const pipes = [
    ['M190 58H220V118H250', ''], ['M190 198H220V138H250', 'acid'], ['M335 156V240', ''], ['M420 268H450V128H480', 'acid'],
    ['M565 156V250', 'acid'], ['M190 348H450V290H480', 'nh3'], ['M650 278H690', ''], ['M860 278H910', ''], ['M995 306V380', ''],
    ['M995 250V222H620V250', ''], ['M335 100V60H760V90', 'gas'], ['M600 250V200H740V146', 'gas'], ['M800 250V146', 'gas'], ['M860 118H900', 'gas']
  ];
  const worst = id => ['x', 'h', 'm', 'l'].find(s => UNITS[id][3].some(h => h[0] === s));
  let g = `<svg viewBox="0 0 1100 470" role="img" aria-label="ফসফেট প্লান্টের প্রসেস ফ্লো চার্ট"><defs><marker id="pfA" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink-2)"/></marker></defs>`;
  g += pipes.map(p => `<path class="pipe ${p[1]}" d="${p[0]}" marker-end="url(#pfA)"/>`).join('');
  g += `<rect x="900" y="20" width="24" height="130" fill="var(--panel-3)" stroke="var(--ink)" stroke-width="1.6"/><text x="912" y="168" text-anchor="middle" class="lbl" style="font-size:9.5px">stack</text>`;
  g += [0, 1.3, 2.6].map(d => `<circle class="drift" cx="912" cy="14" r="6" fill="var(--panel-3)" stroke="var(--ink-3)" style="animation-delay:${d}s"/>`).join('');
  g += `<path d="M335 296V322" class="pipe" /><text x="344" y="322" class="lbl">ফসফোজিপসাম স্তূপ · gypsum stack</text>`;
  g += Object.keys(P).map(id => {
    const [x, y] = P[id], hz = UNITS[id][3];
    const dots = hz.map((h, i) => `<circle cx="${x + W - 10 - i * 12}" cy="${y + 10}" r="4.5" fill="${SEVC[h[0]]}"/>`).join('');
    return `<g class="node" data-id="${id}" tabindex="0" role="button" aria-label="${SHORT[id][0]}"><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="5"/><text x="${x + 10}" y="${y + 29}">${SHORT[id][0]}</text><text class="sub" x="${x + 10}" y="${y + 45}">${SHORT[id][1]}</text><g class="hz">${dots}</g><rect x="${x}" y="${y}" width="5" height="${H}" fill="${SEVC[worst(id)]}" stroke="none"/></g>`;
  }).join('');
  g += `<g class="lg" transform="translate(480 398)">
    <path class="pipe" d="M0 6H34"/><text x="40" y="10">কঠিন/স্লারি · solids</text>
    <path class="pipe acid" d="M170 6H204"/><text x="210" y="10">অ্যাসিড · acid</text>
    <path class="pipe nh3" d="M0 32H34"/><text x="40" y="36">অ্যামোনিয়া · NH₃</text>
    <path class="pipe gas" d="M170 32H204"/><text x="210" y="36">গ্যাস/ফিউম · off-gas</text></g></svg>`;
  $('#pf').innerHTML = g;
  const total = Object.values(UNITS).reduce((a, u) => a + u[3].length, 0);
  $('#pfUnits').textContent = bn(Object.keys(UNITS).length) + 'টি'; $('#pfHz').textContent = bn(total) + 'টি';
  const panel = $('#hzInfo');
  const pick = id => {
    $$('#pf .node').forEach(n => n.classList.toggle('on', n.dataset.id === id));
    const u = UNITS[id];
    panel.innerHTML = `<h3>${u[0]}<span class="e">${u[1]} · ${u[2]}</span></h3>` + u[3].map(h => `<div class="hzrow"><span class="sev ${h[0]}">${SEV[h[0]][0]}</span><div><b>${h[1]}</b><span class="e">${h[2]}</span><p>নিয়ন্ত্রণ · Control: ${h[3]}</p></div></div>`).join('');
  };
  $('#pf').addEventListener('click', e => { const n = e.target.closest('.node'); if (n) pick(n.dataset.id); });
  $('#pf').addEventListener('keydown', e => { const n = e.target.closest('.node'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(n.dataset.id); } });
  pick('nh3');
  const pb = $('#pfPause');
  const setP = paused => { $$('#pf .pipe, #pf .drift').forEach(p => p.style.animationPlayState = paused ? 'paused' : 'running'); pb.setAttribute('aria-pressed', String(paused)); pb.textContent = paused ? 'অ্যানিমেশন চালান · Play' : 'অ্যানিমেশন থামান · Pause'; };
  pb.addEventListener('click', () => setP(pb.getAttribute('aria-pressed') !== 'true'));
  if (reduced) setP(true);
  $('#hzTable').innerHTML = `<thead><tr><th>এলাকা · Area</th><th class="num">চরম</th><th class="num">উচ্চ</th><th class="num">মাঝারি</th><th>প্রধান ঝুঁকি · Top hazard</th></tr></thead><tbody>` +
    Object.keys(UNITS).map(id => { const u = UNITS[id], c = s => u[3].filter(h => h[0] === s).length; return `<tr><td>${u[0]}<span class="e">${u[1]}</span></td><td class="num">${c('x') ? `<span class="sev x">${bn(c('x'))}</span>` : '—'}</td><td class="num">${c('h') ? `<span class="sev h">${bn(c('h'))}</span>` : '—'}</td><td class="num">${c('m') ? `<span class="sev m">${bn(c('m'))}</span>` : '—'}</td><td>${u[3][0][1]}</td></tr>`; }).join('') + '</tbody>';
})();

/* ---------- 03 risk matrix ---------- */
(function () {
  const SL = ['প্রাথমিক চিকিৎসা', 'চিকিৎসা', 'LTI', 'স্থায়ী ক্ষতি', 'মৃত্যু'], LL = ['প্রায় অসম্ভব', 'কম', 'সম্ভব', 'সম্ভাব্য', 'প্রায় নিশ্চিত'];
  const ACT = { l: 'বর্তমান কন্ট্রোল রাখুন, রুটিন পর্যবেক্ষণ। · Maintain controls.', m: 'সুপারভাইজারের অনুমোদন; নির্দিষ্ট সময়ের মধ্যে অতিরিক্ত কন্ট্রোল। · Supervisor approval, improve controls.', h: 'কাজের আগে অতিরিক্ত কন্ট্রোল, পারমিট ও ম্যানেজার অনুমোদন। · Extra controls before work.', x: 'কাজ শুরু করা যাবে না। ঝুঁকি কমিয়ে আবার মূল্যায়ন। · Do not start.' };
  let h = '<div class="hd"></div>' + SL.map((s, i) => `<div class="hd">${bn(i + 1)}<br>${s}</div>`).join('');
  for (let L = 5; L >= 1; L--) { h += `<div class="hd rh">${bn(L)} · ${LL[L - 1]}</div>`; for (let S = 1; S <= 5; S++) { const r = L * S; h += `<button type="button" class="${riskLevel(r)}" data-l="${L}" data-s="${S}" aria-label="সম্ভাবনা ${L}, মাত্রা ${S}, স্কোর ${r}">${bn(r)}</button>`; } }
  $('#rm').innerHTML = h;
  const run = () => {
    const L = +$('#rmL').value, S = +$('#rmS').value, r = L * S, lv = riskLevel(r);
    $$('#rm button').forEach(b => b.classList.toggle('on', +b.dataset.l === L && +b.dataset.s === S));
    $('#rmOut').innerHTML = res('ঝুঁকি স্কোর · Risk score', `${bn(L)} × ${bn(S)} = ${bn(r)}`, true) + `<div class="res"><span>মাত্রা · Level</span><b><span class="sev ${lv}">${SEV[lv][0]} · ${SEV[lv][1]}</span></b></div>` + note(ACT[lv]);
  };
  $('#rm').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#rmL').value = b.dataset.l; $('#rmS').value = b.dataset.s; run(); });
  ['#rmL', '#rmS'].forEach(s => $(s).addEventListener('change', run)); run();
})();

/* ---------- 04 chemicals ---------- */
(function () {
  $('#chCount').textContent = bn(CHEM.length) + 'টি';
  $('#chTable').innerHTML = '<thead><tr><th>রাসায়নিক · Chemical</th><th>সূত্র</th><th>সীমা · Limits</th><th>কোথায় · Where</th></tr></thead><tbody>' +
    CHEM.map(c => `<tr><td>${c[0]}</td><td class="mono">${c[1]}</td><td style="font-family:var(--mono);font-size:12.5px">${c[3]}</td><td>${c[2]}</td></tr>`).join('') + '</tbody>';
  $('#chCards').innerHTML = CHEM.map(c => `<div class="card"><span class="k">${c[1]}</span><h3>${c[0]}</h3><p>${c[4]}<span class="e">${c[5]}</span></p><div class="callout crit" style="font-size:13.5px"><b class="h">প্রাথমিক চিকিৎসা · First aid</b>${c[6]}</div><p><b>PPE:</b> ${c[7]}</p></div>`).join('');
})();

/* ---------- 05 PPE matrix ---------- */
(function () {
  $('#ppeTable').innerHTML = `<thead><tr><th>এলাকা · Area</th>${PPE_COLS.map(c => `<th style="text-align:center">${c[0]}<span class="e">${c[1]}</span></th>`).join('')}<th>বিশেষ · Notes</th></tr></thead><tbody>` +
    PPE_AREAS.map(a => `<tr><td>${a[0]}<span class="e">${a[1]}</span></td>${a[2].map(v => v === 2 ? '<td class="y"></td>' : v === 1 ? '<td class="o"></td>' : '<td class="na">·</td>').join('')}<td>${a[3]}</td></tr>`).join('') + '</tbody>';
})();

/* ---------- flow chart player (permit, LOTO, ERP) ---------- */
(function () {
  const timers = {};
  const boxes = id => $$('#' + id + ' .box');
  const stopIt = id => { clearInterval(timers[id]); timers[id] = null; };
  const reset = id => { stopIt(id); boxes(id).forEach(b => b.classList.remove('on')); const st = $('#' + id + 'St'); if (st) st.textContent = ''; };
  $$('[data-play]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.play, bx = boxes(id); reset(id); let i = 0;
    const step = () => {
      bx.forEach((b, k) => b.classList.toggle('on', k === i));
      const st = $('#' + id + 'St'); if (st) st.textContent = `ধাপ ${bn(i + 1)} / ${bn(bx.length)} · ` + ($('b', bx[i]).firstChild.textContent.trim());
      i++; if (i >= bx.length) stopIt(id);
    };
    step(); timers[id] = setInterval(step, reduced ? 2200 : 1400);
  }));
  $$('[data-reset]').forEach(btn => btn.addEventListener('click', () => reset(btn.dataset.reset)));
})();

/* ---------- 08 gas test animation ---------- */
(function () {
  const steps = [
    [60, 'O₂ 20.9', 'good-soft', 'উপরে: O₂ ২০.৯%, LEL ২%, NH₃ ৮ ppm · ঠিক আছে'],
    [60, 'LEL 2%', 'good-soft', ''],
    [150, 'O₂ 20.8', 'good-soft', 'মাঝে: O₂ ২০.৮%, LEL ০%, CO ৪ ppm · ঠিক আছে'],
    [150, 'CO 4', 'good-soft', ''],
    [240, 'O₂ 19.2', 'crit-soft', 'নিচে: O₂ ১৯.২% (কম!), H₂S ৬ ppm (বেশি!)'],
    [240, 'H₂S 6', 'crit-soft', 'ফল: প্রবেশ নয়। আরও ভেন্টিলেশন, উৎস খুঁজুন, আবার টেস্ট। · Fail: ventilate and retest.']
  ];
  let t = null;
  const set = ([y, txt, bg, msg]) => {
    $('#gtProbe').setAttribute('d', `M145 10V${y}`); $('#gtTip').setAttribute('cy', y);
    $('#gtRead').textContent = txt; $('#gtRead').previousElementSibling.setAttribute('fill', `var(--${bg})`);
    if (msg) $('#gtSt').textContent = msg;
  };
  $('#gtPlay').addEventListener('click', () => {
    clearInterval(t); let i = 0; set(steps[0]); i = 1;
    $$('#fcGas .box').forEach(b => b.classList.remove('on')); $$('#fcGas .box')[0].classList.add('on');
    t = setInterval(() => {
      if (i >= steps.length) { clearInterval(t); return; }
      set(steps[i]); const bx = $$('#fcGas .box'), map = [0, 1, 0, 2, 0, 2]; bx.forEach((b, k) => b.classList.toggle('on', k === map[i])); i++;
      if (i >= steps.length) setTimeout(() => $$('#fcGas .box').forEach((b, k) => b.classList.toggle('on', k === 3)), 1100);
    }, 1100);
  });
})();

/* ---------- 11 shock chart ---------- */
(function () {
  const x = v => 40 + (Math.log10(v) + 0.3) / 4 * 580; // 0.5 mA .. 5000 mA
  const seg = [[0.5, 1, 'good', 'অনুভব হয় না', 'not felt'], [1, 5, 'good', 'ঝিনঝিন', 'tingle'], [5, 10, 'warn', 'ব্যথাদায়ক শক', 'painful'], [10, 30, 'high', 'ছাড়তে পারে না', 'can\'t let go'], [30, 100, 'crit', 'শ্বাস বন্ধ, ফিব্রিলেশন সম্ভব', 'breathing stops'], [100, 5000, 'crit', 'হৃদ্‌যন্ত্র বন্ধ, পোড়া', 'cardiac arrest, burns']];
  let s = `<line x1="40" y1="150" x2="620" y2="150" class="ax"/>`;
  [1, 10, 100, 1000].forEach(v => { s += `<line x1="${x(v)}" y1="30" x2="${x(v)}" y2="150" class="gr"/><text x="${x(v)}" y="166" text-anchor="middle" class="lbl">${v} mA</text>`; });
  seg.forEach((g, i) => {
    const x1 = x(g[0]), x2 = x(g[1]), h = 30 + i * 18;
    s += `<rect class="grow" style="animation-delay:${i * 0.12}s" x="${x1}" y="${150 - h}" width="${x2 - x1 - 2}" height="${h}" fill="var(--${g[2]})" opacity="${0.4 + i * 0.1}"/>`;
    s += `<circle cx="${(x1 + x2) / 2}" cy="${140 - h}" r="9" fill="var(--panel)" stroke="var(--ink)"/><text x="${(x1 + x2) / 2}" y="${144 - h}" text-anchor="middle" class="bn" style="font-size:11px">${bn(i + 1)}</text>`;
    const lx = 40 + (i % 2) * 300, ly = 192 + Math.floor(i / 2) * 20;
    s += `<text x="${lx}" y="${ly}" class="bn" style="font-size:12px"><tspan style="font-weight:700">${bn(i + 1)}.</tspan> ${g[3]} <tspan class="lbl">· ${g[4]}</tspan></text>`;
  });
  s += `<line x1="${x(30)}" y1="14" x2="${x(30)}" y2="150" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="${x(30) - 4}" y="20" text-anchor="end" class="lbl">RCD 30 mA</text>`;
  $('#shockSvg').innerHTML = s;
})();

/* ---------- 15 noise chart ---------- */
(function () {
  const Ls = [85, 88, 91, 94, 97, 100, 103, 106, 109];
  const T = L => 8 / Math.pow(2, (L - 85) / 3);
  const lab = h => h >= 1 ? bn(f(h, h % 1 ? 1 : 0)) + ' ঘণ্টা' : h * 60 >= 1 ? bn(f(h * 60, h * 60 % 1 ? 1 : 0)) + ' মিনিট' : bn(f(h * 3600, 0)) + ' সেকেন্ড';
  const bw = 56, x0 = 50, base = 200;
  let s = `<line x1="40" y1="${base}" x2="630" y2="${base}" class="ax"/>`;
  Ls.forEach((L, i) => {
    const h = (Math.log2(T(L)) + 6) / 9 * 170, x = x0 + i * 64, lv = L <= 85 ? 'good' : L <= 91 ? 'warn' : L <= 100 ? 'high' : 'crit';
    s += `<rect class="grow" style="animation-delay:${i * 0.07}s" x="${x}" y="${base - h}" width="${bw}" height="${h}" fill="var(--${lv})"/>`;
    s += `<text x="${x + bw / 2}" y="${base - h - 6}" text-anchor="middle" class="bn" style="font-size:11px">${lab(T(L))}</text><text x="${x + bw / 2}" y="${base + 16}" text-anchor="middle" class="lbl">${L} dB</text>`;
  });
  s += `<text x="335" y="240" text-anchor="middle" class="lbl">শব্দের মাত্রা dB(A) → প্রতি ৩ dB-তে সময় অর্ধেক (উচ্চতা লগ স্কেলে)</text>`;
  $('#noiseSvg').innerHTML = s;
})();

/* ---------- 13 sling chart + quick calc ---------- */
(function () {
  const A = [90, 75, 60, 45, 30, 15], base = 200;
  let s = `<line x1="30" y1="${base}" x2="350" y2="${base}" class="ax"/>`;
  A.forEach((a, i) => {
    const k = 1 / Math.sin(a * Math.PI / 180), h = k / 4 * 170, x = 40 + i * 52, lv = a >= 60 ? 'good' : a >= 45 ? 'warn' : a >= 30 ? 'high' : 'crit';
    s += `<rect class="grow" style="animation-delay:${i * 0.08}s" x="${x}" y="${base - h}" width="38" height="${h}" fill="var(--${lv})"/><text x="${x + 19}" y="${base - h - 6}" text-anchor="middle" class="bn">${bn(f(k, 2))}×</text><text x="${x + 19}" y="${base + 16}" text-anchor="middle" class="lbl">${a}°</text>`;
  });
  s += `<text x="190" y="234" text-anchor="middle" class="lbl">আনুভূমিক থেকে স্লিংয়ের কোণ · sling angle from horizontal</text>`;
  $('#slingBars').innerHTML = s;
  const run = src => {
    if (src === 'r') $('#slA').value = $('#slR').value; else $('#slR').value = $('#slA').value;
    const W = num('#slW'), a = Math.min(90, Math.max(5, num('#slA'))), r = a * Math.PI / 180, T = W / (2 * Math.sin(r)), lv = a >= 60 ? 'g' : a >= 45 ? 'y' : 'r';
    const L = 90, cx = 120, top = 12, dx = L * Math.cos(r), dy = L * Math.sin(r);
    $('#slPic').innerHTML = `<circle cx="${cx}" cy="${top}" r="5" fill="var(--ink)"/><path d="M${cx} ${top}L${cx - dx} ${top + dy}M${cx} ${top}L${cx + dx} ${top + dy}" stroke="var(--${a >= 60 ? 'good' : a >= 45 ? 'warn' : 'crit'})" stroke-width="4"/><rect x="${cx - dx - 8}" y="${top + dy}" width="${2 * dx + 16}" height="22" class="fm"/><text x="${cx}" y="${top + dy + 15}" text-anchor="middle" class="tx" style="fill:var(--marker-ink)">${bn(f(W, 1))} t</text><text x="${cx + dx / 2 + 8}" y="${top + dy / 2}" class="txa">${bn(a)}°</text>`;
    $('#slOut').innerHTML = res('প্রতি লেগে টান · Tension per leg', bn(f(T, 2)) + ' t', true) + res('লোড ফ্যাক্টর', bn(f(1 / Math.sin(r), 2)) + '×') + `<div class="res"><span>মূল্যায়ন</span><b>${pill(lv, a >= 60 ? 'ভালো ≥৬০°' : a >= 45 ? 'সতর্কতা' : a >= 30 ? 'বেশি টান' : 'নিষেধ <৩০°')}</b></div>`;
  };
  $('#slR').addEventListener('input', () => run('r')); ['#slW', '#slA'].forEach(i => $(i).addEventListener('input', () => run('a'))); run('a');
})();

/* ---------- 14 wind & escape ---------- */
(function () {
  const DIRS = { 0: ['উত্তর', 'N'], 90: ['পূর্ব', 'E'], 180: ['দক্ষিণ', 'S'], 270: ['পশ্চিম', 'W'] };
  const AP = { 0: 'A1', 90: 'A2', 180: 'A3', 270: 'A4' };
  const draw = d => {
    d = +d; const r = d * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r); // toward where wind comes from
    const cx = 150, cy = 150, px = -ux, py = -uy; // plume direction
    const tip = (len, off) => { const a = Math.atan2(py, px) + off; return [cx + len * Math.cos(a), cy + len * Math.sin(a)]; };
    const [a1x, a1y] = tip(140, 0.42), [a2x, a2y] = tip(140, -0.42);
    let s = `<circle cx="150" cy="150" r="138" fill="none" class="d"/>`;
    s += `<path class="pulse" d="M150 150L${a1x} ${a1y}A140 140 0 0 ${0} ${a2x} ${a2y}z" fill="color-mix(in srgb,var(--crit) 22%,transparent)" stroke="var(--crit)" stroke-dasharray="4 3"/>`;
    Object.keys(AP).forEach(k => { const rr = k * Math.PI / 180, x = 150 + 122 * Math.sin(rr), y = 150 - 122 * Math.cos(rr), safe = +k === d, bad = (+k + 180) % 360 === d;
      s += `<g><rect x="${x - 17}" y="${y - 11}" width="34" height="22" rx="4" fill="var(--${safe ? 'good' : bad ? 'crit-soft' : 'panel-2'})" stroke="var(--ink)"/><text x="${x}" y="${y + 4}" text-anchor="middle" style="font-family:var(--mono);font-size:11px;font-weight:600;fill:var(--${safe ? 'panel' : 'ink'})">${AP[k]}</text></g>`; });
    ['N', 'E', 'S', 'W'].forEach((t, i) => { const rr = i * Math.PI / 2; s += `<text x="${150 + 146 * Math.sin(rr)}" y="${154 - 146 * Math.cos(rr)}" text-anchor="middle" class="lbl">${t}</text>`; });
    s += `<circle cx="150" cy="150" r="12" fill="var(--accent)" stroke="var(--ink)"/><text x="150" y="154" text-anchor="middle" style="font-family:var(--mono);font-size:8px;fill:var(--panel)">NH₃</text>`;
    const wx = 150 + 96 * ux, wy = 150 + 96 * uy;
    s += `<defs><marker id="wA" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--steel)"/></marker></defs><path d="M${wx} ${wy}L${150 + 40 * ux} ${150 + 40 * uy}" stroke="var(--steel)" stroke-width="4" marker-end="url(#wA)"/><text x="${wx + ux * 8}" y="${wy + uy * 8 - 6}" text-anchor="middle" class="txa" style="fill:var(--steel)">wind</text>`;
    const cw1 = (d + 90) % 360, cw2 = (d + 270) % 360;
    $('#windSvg').innerHTML = s;
    $('#windOut').innerHTML = `<h3>বাতাস ${DIRS[d][0]} থেকে আসছে <span class="e">Wind from the ${DIRS[d][1]}</span></h3>
      <div class="hzrow"><span class="sev x">বিপদ</span><div><b>গ্যাস মেঘ যাবে ${DIRS[(d + 180) % 360][0]} দিকে · ${AP[(d + 180) % 360]} ব্যবহার করবেন না</b></div></div>
      <div class="hzrow"><span class="sev m">ধাপ ১</span><div><b>আড়াআড়ি সরুন: ${DIRS[cw1][0]} বা ${DIRS[cw2][0]} দিকে</b><span class="e">Move crosswind first</span></div></div>
      <div class="hzrow"><span class="sev l">ধাপ ২</span><div><b>তারপর আপউইন্ড অ্যাসেম্বলি পয়েন্ট ${AP[d]}-এ</b><span class="e">Then go to upwind assembly point ${AP[d]}</span></div></div>
      <p class="hint">এসকেপ মাস্ক পরুন, মুখে ভেজা কাপড় (বিকল্প), নিচু জায়গা ও ড্রেন এড়ান; লিকের দিকে হাঁটবেন না।</p>`;
  };
  chipGroup('#windDir', draw); draw(0);
})();

/* ---------- 18 KPI calculator + trend ---------- */
(function () {
  const run = () => {
    const H = Math.max(1, num('#kpH')), L = num('#kpL'), R = num('#kpR'), D = num('#kpD'), N = num('#kpN'), F = num('#kpF');
    const ltifr = L * 1e6 / H, trir = R * 2e5 / H, sev = D * 1e6 / H, avg = L ? D / L : 0, ratio = R ? N / R : N;
    const k = (t, v, s) => `<div class="kpi"><small>${t}</small><b>${v}</b>${s ? `<span class="hint">${s}</span>` : ''}</div>`;
    $('#kpOut').innerHTML = k('LTIFR', bn(f(ltifr, 2)), 'প্রতি ১০ লক্ষ ঘণ্টায়') + k('TRIR', bn(f(trir, 2)), 'প্রতি ২ লক্ষ ঘণ্টায়') + k('সিভিয়ারিটি রেট', bn(f(sev, 1)), 'হারানো দিন / ১০ লক্ষ ঘণ্টা') + k('গড় হারানো দিন', bn(f(avg, 1)), 'প্রতি LTI') + k('নিয়ার-মিস : রেকর্ডযোগ্য', bn(f(ratio, 0)) + ' : ১', ratio < 10 ? 'কম, রিপোর্টিং বাড়ান' : 'ভালো রিপোর্টিং সংস্কৃতি') + k('FAC প্রতি ১০ লক্ষ ঘণ্টা', bn(f(F * 1e6 / H, 1)));
  };
  ['#kpH', '#kpL', '#kpR', '#kpD', '#kpN', '#kpF'].forEach(i => $(i).addEventListener('input', run)); run();
  const M = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const parse = id => $(id).value.split(/[,\s]+/).map(Number).filter(v => isFinite(v)).slice(0, 12);
  const draw = () => {
    const a = parse('#trNm'), b = parse('#trRc'), max = Math.max(5, ...a), maxb = Math.max(2, ...b), base = 210, top = 30, Hh = base - top;
    let s = `<line x1="44" y1="${base}" x2="620" y2="${base}" class="ax"/>`;
    for (let i = 0; i <= 4; i++) { const y = base - Hh * i / 4; s += `<line x1="44" y1="${y}" x2="620" y2="${y}" class="gr"/><text x="38" y="${y + 4}" text-anchor="end" class="lbl">${Math.round(max * i / 4)}</text><text x="626" y="${y + 4}" class="lbl" style="fill:var(--crit)">${f(maxb * i / 4, maxb < 8 ? 1 : 0)}</text>`; }
    a.forEach((v, i) => { const h = v / max * Hh, x = 54 + i * 47; s += `<rect class="grow" style="animation-delay:${i * 0.04}s" x="${x}" y="${base - h}" width="30" height="${h}" fill="var(--steel)" opacity=".8"/><text x="${x + 15}" y="${base + 15}" text-anchor="middle" class="lbl">${M[i]}</text>`; });
    const pts = b.map((v, i) => [69 + i * 47, base - v / maxb * Hh]);
    if (pts.length) s += `<path d="M${pts.map(p => p.join(' ')).join('L')}" fill="none" stroke="var(--crit)" stroke-width="2.5"/>` + pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--crit)" stroke="var(--panel)" stroke-width="1.5"/>`).join('');
    s += `<rect x="50" y="8" width="12" height="10" fill="var(--steel)"/><text x="68" y="17" class="lbl">নিয়ার-মিস (বাম অক্ষ)</text><circle cx="250" cy="13" r="4" fill="var(--crit)"/><text x="260" y="17" class="lbl">রেকর্ডযোগ্য ঘটনা (ডান অক্ষ)</text><text x="460" y="17" class="lbl">উদাহরণ ডেটা · example</text>`;
    $('#trSvg').innerHTML = s;
  };
  ['#trNm', '#trRc'].forEach(i => $(i).addEventListener('input', draw)); draw();
})();

/* ---------- 19 checklists ---------- */
(function () {
  let n = 0; Object.values(CHECKS).forEach(c => n += c[2].length);
  $('#ckCount').textContent = bn(Object.keys(CHECKS).length) + 'টি · ' + bn(n) + ' পয়েন্ট';
  const keyOf = () => 'ck:' + cur();
  const upd = (done, total) => { const c = done.size, p = total ? Math.round(c / total * 100) : 0; $('#ckBar').style.width = p + '%'; $('#ckTxt').textContent = `${bn(c)} / ${bn(total)}`; $('#ckPct').textContent = bn(p) + '%'; };
  const draw = () => {
    const items = CHECKS[cur()][2], done = new Set(store.get(keyOf(), []));
    $('#ckBox').innerHTML = items.map(([t, e], i) => `<label class="chk${done.has(i) ? ' done' : ''}" for="ck${i}"><input type="checkbox" id="ck${i}" data-i="${i}"${done.has(i) ? ' checked' : ''}><span><b>${t}</b><span class="e">${e}</span></span></label>`).join('');
    upd(done, items.length);
  };
  const cur = chipGroup('#ckSel', draw);
  $('#ckBox').addEventListener('change', e => {
    const cb = e.target; if (cb.type !== 'checkbox') return;
    const done = new Set(store.get(keyOf(), [])), i = +cb.dataset.i;
    cb.checked ? done.add(i) : done.delete(i); cb.closest('.chk').classList.toggle('done', cb.checked);
    store.set(keyOf(), Array.from(done)); upd(done, CHECKS[cur()][2].length);
  });
  let armed = false;
  $('#ckReset').addEventListener('click', () => {
    if (!armed) { armed = true; $('#ckReset').textContent = 'নিশ্চিত? আবার চাপুন'; $('#ckMsg').textContent = 'এই তালিকার সব টিক মুছে যাবে।'; setTimeout(() => { armed = false; $('#ckReset').textContent = 'এই তালিকা মুছুন · Clear'; $('#ckMsg').textContent = ''; }, 4000); return; }
    armed = false; store.set(keyOf(), []); draw(); $('#ckReset').textContent = 'এই তালিকা মুছুন · Clear'; $('#ckMsg').textContent = 'মুছে ফেলা হয়েছে · Cleared';
  });
  draw();
})();

/* ---------- 20 TBT ---------- */
$('#tbtList').innerHTML = TBT.map((t, i) => `<div class="card"><span class="k">TBT ${String(i + 1).padStart(2, '0')}</span><h3>${t[0]}<span class="e">${t[1]}</span></h3><p>${t[2]}</p></div>`).join('');

/* ---------- 21 calculators ---------- */
(function () {
  const nav = $('#calcNav');
  nav.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', nav).forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    $$('#m-calc .calc').forEach(c => c.hidden = c.dataset.calc !== b.dataset.k);
  });
  const on = (ids, fn) => { const run = () => { try { fn(); } catch (e) {} }; ids.forEach(id => { const el = $(id); el.addEventListener('input', run); el.addEventListener('change', run); }); run(); };
  const ok = (cond, good, bad) => cond ? pill('g', good) : pill('r', bad);
  const verdict = html => `<div class="res"><span>মূল্যায়ন · Verdict</span><b>${html}</b></div>`;
  const T85 = L => 8 / Math.pow(2, (L - 85) / 3);

  on(['#nz1', '#nt1', '#nz2', '#nt2', '#nz3', '#nt3', '#nz4', '#nt4'], () => {
    let D = 0, hrs = 0, rows = '';
    for (let i = 1; i <= 4; i++) { const L = num('#nz' + i), C = num('#nt' + i); if (L > 0 && C > 0) { hrs += C; if (L >= 80) { const T = T85(L); D += C / T; rows += res(`এলাকা ${bn(i)}: ${bn(L)} dB, অনুমোদিত ${bn(f(T, 2))} ঘণ্টা`, bn(f(C / T * 100, 0)) + '%'); } } }
    D *= 100; const twa = D > 0 ? 85 + 10 * Math.log10(D / 100) : 0;
    $('#nzOut').innerHTML = res('দৈনিক ডোজ · Daily dose', bn(f(D, 0)) + '%', true) + res('৮ ঘণ্টার সমতুল্য · LEX,8h', D > 0 ? bn(f(twa, 1)) + ' dB(A)' : '< ৮০ dB') + rows + res('মোট সময়', bn(f(hrs, 2)) + ' ঘণ্টা') +
      verdict(D <= 50 ? pill('g', 'নিরাপদ') : D <= 100 ? pill('y', 'অ্যাকশন: প্রোটেকশন ও অডিওমেট্রি') : pill('r', 'সীমা অতিক্রম: কন্ট্রোল ও সময় কমান'));
  });

  on(['#hpL', '#hpS', '#hpD', '#hpX'], () => {
    const L = num('#hpL'), ear = L - num('#hpS') * +$('#hpD').value - +$('#hpX').value;
    $('#hpOut').innerHTML = res('কানে আনুমানিক শব্দ · At the ear', bn(f(ear, 1)) + ' dB(A)', true) + res('এই শব্দে অনুমোদিত সময়', ear <= 85 ? '৮ ঘণ্টা+' : bn(f(T85(ear), 2)) + ' ঘণ্টা') +
      verdict(ear > 85 ? pill('r', 'অপর্যাপ্ত: আরও সুরক্ষা') : ear > 80 ? pill('y', 'সীমায়, ভালো ফিট নিশ্চিত') : ear >= 70 ? pill('g', 'উপযুক্ত (৭০–৮০)') : pill('y', 'অতিরিক্ত সুরক্ষা: সংকেত শোনা কঠিন'));
  });

  const TLV = [[31.0, 28.0, null, null], [31.0, 29.0, 27.5, null], [32.0, 30.0, 29.0, 28.0], [32.5, 31.5, 30.5, 30.0]];
  const AL = [[28.0, 25.0, null, null], [28.5, 26.0, 24.0, null], [29.5, 27.0, 25.5, 24.5], [30.0, 29.0, 28.0, 27.0]];
  const ALLOC = ['৭৫–১০০% কাজ (প্রতি ঘণ্টায় ≤১৫ মিনিট বিশ্রাম)', '৫০–৭৫% কাজ (প্রতি ঘণ্টায় ১৫–৩০ মিনিট বিশ্রাম)', '২৫–৫০% কাজ (প্রতি ঘণ্টায় ৩০–৪৫ মিনিট বিশ্রাম)', '০–২৫% কাজ (প্রতি ঘণ্টায় ৪৫+ মিনিট বিশ্রাম)'];
  on(['#wbN', '#wbG', '#wbD', '#wbS', '#wbW', '#wbA'], () => {
    const n = num('#wbN'), g = num('#wbG'), d = num('#wbD'), out = $('#wbS').value === 'out';
    const w = out ? 0.7 * n + 0.2 * g + 0.1 * d : 0.7 * n + 0.3 * g, load = +$('#wbW').value, tab = $('#wbA').value === '1' ? TLV : AL;
    const row = tab.findIndex(r => r[load] != null && w <= r[load]);
    $('#wbOut').innerHTML = res('WBGT', bn(f(w, 1)) + ' °C', true) + res('সুপারিশ · Work–rest', row < 0 ? '<span style="font-family:var(--body);font-size:14px;color:var(--crit)">কাজ বন্ধ বা বিশেষ নিয়ন্ত্রণ (কুলিং, শিফট বদল)</span>' : `<span style="font-family:var(--body);font-size:14px">${ALLOC[row]}</span>`) +
      verdict(row === 0 ? pill('g', 'স্বাভাবিক কাজ') : row > 0 ? pill('y', 'বিশ্রাম বাড়ান, পানি') : pill('r', 'তাপ চাপ বেশি')) + note($('#wbA').value === '1' ? 'ACGIH TLV (অভ্যস্ত শ্রমিক)।' : 'ACGIH অ্যাকশন লিমিট (অনভ্যস্ত/নতুন শ্রমিক)।');
  });

  on(['#tw1', '#th1', '#tw2', '#th2', '#tw3', '#th3', '#twL'], () => {
    const s = num('#tw1') * num('#th1') + num('#tw2') * num('#th2') + num('#tw3') * num('#th3'), h = num('#th1') + num('#th2') + num('#th3'), twa = s / 8, lim = num('#twL');
    $('#twOut').innerHTML = res('৮ ঘণ্টার TWA', bn(f(twa, 2)) + ' ppm', true) + res('সীমার শতাংশ', bn(f(lim ? twa / lim * 100 : 0, 0)) + '%') + res('মাপা সময়', bn(f(h, 2)) + ' ঘণ্টা') +
      verdict(ok(twa <= lim, 'সীমার মধ্যে', 'সীমা অতিক্রম')) + (h > 8 ? note('৮ ঘণ্টার বেশি শিফট: সীমা কমিয়ে হিসাব করুন (Brief & Scala)।', 'warn') : note('একটি সময়ের মান STEL বা Ceiling পার হলে TWA ঠিক থাকলেও লঙ্ঘন।'));
  });

  on(['#pmG', '#pmV', '#pmU'], () => {
    const mw = +$('#pmG').value, v = num('#pmV'), fromPpm = $('#pmU').value === 'ppm';
    $('#pmOut').innerHTML = fromPpm ? res(`${bn(f(v, 2))} ppm =`, bn(f(v * mw / 24.45, 3)) + ' mg/m³', true) : res(`${bn(f(v, 2))} mg/m³ =`, bn(f(v * 24.45 / mw, 3)) + ' ppm', true);
    $('#pmOut').innerHTML += res('আণবিক ভর · MW', bn(f(mw, 2)) + ' g/mol');
  });

  on(['#leG', '#leR'], () => {
    const lel = +$('#leG').value, r = num('#leR'), vol = r * lel / 100;
    $('#leOut').innerHTML = res('গ্যাসের আয়তন', bn(f(vol, 3)) + ' %', true) + res('= ppm', bn(f(vol * 1e4, 0)) + ' ppm') +
      verdict(r <= 0 ? pill('g', 'হট ওয়ার্ক সম্ভব (০%)') : r < 10 ? pill('y', 'প্রবেশ সম্ভব, হট ওয়ার্ক নয়') : pill('r', 'প্রবেশ নয়: উৎস বন্ধ ও ভেন্টিলেশন')) + (lel === 15 ? note('মনে রাখুন: অ্যামোনিয়ায় বিষাক্ততার সীমা (৩০০ ppm IDLH) LEL-এর অনেক আগে আসে। ১% LEL ≈ ১৫০০ ppm!', 'crit') : '');
  });

  on(['#vnV', '#vnQ', '#vnC0', '#vnC', '#vnK'], () => {
    const V = num('#vnV'), Q = num('#vnQ'), K = +$('#vnK').value, c0 = num('#vnC0'), c = num('#vnC');
    const ach = Q * 60 / V, t = c0 > c && c > 0 ? K * (V / Q) * Math.log(c0 / c) : 0;
    $('#vnOut').innerHTML = res('প্রয়োজনীয় সময় · Purge time', bn(f(t, 0)) + ' মিনিট', true) + res('ঘণ্টায় বাতাস বদল · ACH', bn(f(ach, 1))) + verdict(ok(ach >= 20, 'ভালো (≥ ২০ ACH)', 'ব্লোয়ার বাড়ান')) + note('সময় শেষে অবশ্যই গ্যাস টেস্ট; হিসাব শুধু পরিকল্পনার জন্য।');
  });

  on(['#fcL', '#fcD', '#fcA', '#fcS', '#fcX'], () => {
    const ff = Math.max(0, num('#fcL') - num('#fcA')), need = ff + num('#fcD') + 0.3 + num('#fcS'), have = num('#fcX');
    $('#fcOut').innerHTML = res('প্ল্যাটফর্মের নিচে প্রয়োজন · Clearance needed', bn(f(need, 2)) + ' m', true) + res('ফ্রি-ফল দূরত্ব', bn(f(ff, 2)) + ' m') + res('আছে · Available', bn(f(have, 2)) + ' m') +
      verdict(have >= need && ff <= 1.8 ? pill('g', 'নিরাপদ') : ff > 1.8 ? pill('r', 'ফ্রি-ফল > ১.৮ m: অ্যাঙ্কর উপরে নিন') : pill('r', 'জায়গা কম: SRL বা ছোট ল্যানিয়ার্ড'));
  });

  on(['#sgW', '#sgA', '#sgN', '#sgS'], () => {
    const W = num('#sgW'), a = Math.max(5, Math.min(90, num('#sgA'))), n = +$('#sgN').value, T = W / (n * Math.sin(a * Math.PI / 180)), wll = num('#sgS');
    $('#sgOut').innerHTML = res('প্রতি লেগে টান', bn(f(T, 2)) + ' t', true) + res('ব্যবহার · Utilisation', bn(f(wll ? T / wll * 100 : 0, 0)) + '%') + verdict(a < 30 ? pill('r', 'কোণ < ৩০°: নিষেধ') : ok(T <= wll, 'স্লিং যথেষ্ট', 'স্লিং দুর্বল: বড় WLL নিন'));
  });

  on(['#ldH'], () => {
    const H = num('#ldH'), b = H / 4, Lg = Math.sqrt(H * H + b * b) + 1;
    $('#ldOut').innerHTML = res('দেয়াল থেকে নিচের দূরত্ব', bn(f(b, 2)) + ' m', true) + res('ন্যূনতম মইয়ের দৈর্ঘ্য', bn(f(Lg, 2)) + ' m') + res('কোণ', '৭৫.৫°') + note('মই উপরে বাঁধুন বা নিচে একজন ধরে রাখুন; ৬ মিটারের বেশি হলে খাঁচাযুক্ত স্থায়ী মই বা স্ক্যাফোল্ড ভাবুন।');
  });

  on(['#acS', '#acT', '#acM'], () => {
    const s = num('#acS'), t = num('#acT'), M = num('#acM'), a = s > 0 ? M * t / s : 0, w = M - a;
    $('#acOut').innerHTML = t >= s ? note('লক্ষ্য শক্তি স্টকের চেয়ে কম হতে হবে।', 'crit') :
      res('প্রথমে পানি নিন · Water first', bn(f(w, 1)) + ' kg', true) + res('তারপর ধীরে অ্যাসিড · Then acid', bn(f(a, 1)) + ' kg') + res('অ্যাসিড আয়তন (৯৮% হলে)', bn(f(a / 1.84, 1)) + ' L') + note('প্রচুর তাপ হয়: ঠান্ডা পানি, অ্যাসিড-রোধী পাত্র, নাড়তে থাকুন, ফেস শিল্ড ও গ্লাভস।', 'warn');
  });

  on(['#bdV', '#bdT', '#bdL', '#bdB', '#bdF'], () => {
    const req = Math.max(1.1 * num('#bdV'), 0.25 * num('#bdT')), area = num('#bdL') * num('#bdB') - num('#bdF'), h = area > 0 ? req / area : 0;
    $('#bdOut').innerHTML = res('প্রয়োজনীয় ধারণ ক্ষমতা', bn(f(req, 0)) + ' m³', true) + res('কার্যকর মেঝে', bn(f(area, 0)) + ' m²') + res('দেয়ালের ন্যূনতম উচ্চতা', bn(f(h, 2)) + ' m') + res('+ ফ্রিবোর্ড ০.১ m সহ', bn(f(h + 0.1, 2)) + ' m') + (h > 1.5 ? note('দেয়াল ১.৫ মিটারের বেশি: অগ্নি নির্বাপণ ও উদ্ধারে প্রবেশ কঠিন; বান্ডের এলাকা বাড়ানোর কথা ভাবুন।', 'warn') : '');
  });

  on(['#exA', '#exH', '#exF'], () => {
    const per = Math.max(2, Math.ceil(num('#exA') / +$('#exH').value)), fl = Math.max(1, Math.round(num('#exF')));
    $('#exOut').innerHTML = res('মোট এক্সটিংগুইশার (আনুমানিক)', bn(per * fl) + 'টি', true) + res('প্রতি তলায়', bn(per) + 'টি') + note('ধরন বেছে নিন: সাধারণ এলাকায় ABC পাউডার, প্যানেল রুমে CO₂, জ্বালানি এলাকায় ফোম। ব্যাপক ঝুঁকিতে হোজ রিল ও হাইড্রেন্টও লাগবে।');
  });

  on(['#rkL', '#rkS', '#rkL2', '#rkS2'], () => {
    const c = v => Math.max(1, Math.min(5, Math.round(v))), r1 = c(num('#rkL')) * c(num('#rkS')), r2 = c(num('#rkL2')) * c(num('#rkS2')), l1 = riskLevel(r1), l2 = riskLevel(r2);
    $('#rkOut').innerHTML = res('প্রাথমিক ঝুঁকি · Initial', `${bn(r1)} <span class="sev ${l1}">${SEV[l1][0]}</span>`) + res('অবশিষ্ট ঝুঁকি · Residual', `${bn(r2)} <span class="sev ${l2}">${SEV[l2][0]}</span>`, true) + res('ঝুঁকি কমেছে', bn(f(r1 ? (r1 - r2) / r1 * 100 : 0, 0)) + '%') +
      verdict(r2 >= 15 ? pill('r', 'কাজ শুরু নয়') : r2 >= 10 ? pill('r', 'আরও কন্ট্রোল দরকার') : r2 >= 5 ? pill('y', 'অনুমোদন সাপেক্ষে') : pill('g', 'গ্রহণযোগ্য'));
  });
})();

/* ---------- 22 quiz ---------- */
(function () {
  const box = $('#quizBox'); let set = [], i = 0, score = 0;
  $('#qzCount').textContent = bn(QUIZ.length) + 'টি';
  const best = () => { const b = store.get('quizBest', null); $('#qzBest').textContent = b == null ? '—' : bn(b) + ' / ১০'; };
  const start = () => { set = QUIZ.map((q, k) => [Math.random(), k]).sort((a, b) => a[0] - b[0]).slice(0, 10).map(x => QUIZ[x[1]]); i = 0; score = 0; render(); };
  const render = () => {
    if (i >= set.length) {
      const b = store.get('quizBest', 0); if (score > b) store.set('quizBest', score); best();
      box.innerHTML = `<div class="qtop"><span>রাউন্ড শেষ · Round over</span></div><div class="qq">আপনার স্কোর: ${bn(score)} / ${bn(set.length)}</div><p class="qx">${score >= 8 ? 'চমৎকার! সেফটি জ্ঞান শক্ত।' : score >= 5 ? 'ভালো। ভুল প্রশ্নগুলোর মডিউল আরেকবার পড়ুন।' : 'মডিউলগুলো ক্রম অনুযায়ী পড়ে আবার চেষ্টা করুন।'}</p><div><button class="btn go" id="qzAgain" type="button">নতুন রাউন্ড · New round</button></div>`;
      $('#qzAgain').addEventListener('click', start); return;
    }
    const q = set[i];
    box.innerHTML = `<div class="qtop"><span>প্রশ্ন ${bn(i + 1)} / ${bn(set.length)}</span><span>স্কোর ${bn(score)}</span></div><div class="qq">${q[0]}</div><div class="qo">${q[1].map((o, k) => `<button type="button" data-k="${k}">${o}</button>`).join('')}</div><div id="qzAfter"></div>`;
    $$('.qo button', box).forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k; if (k === q[2]) score++;
      $$('.qo button', box).forEach(x => { x.disabled = true; if (+x.dataset.k === q[2]) x.classList.add('ok'); else if (x === b) x.classList.add('no'); });
      $('#qzAfter').innerHTML = `<p class="qx">${k === q[2] ? '<b>সঠিক।</b> ' : '<b>ভুল।</b> '}${q[3]}</p><div style="margin-top:10px"><button class="btn go" type="button" id="qzNext">${i + 1 < set.length ? 'পরের প্রশ্ন · Next' : 'ফলাফল দেখুন · Result'}</button></div>`;
      $('#qzNext').addEventListener('click', () => { i++; render(); }); $('#qzNext').focus();
    }));
  };
  best(); start();
})();

/* ---------- 23 glossary ---------- */
(function () {
  const list = GLOSS.slice().sort((a, b) => a[0].localeCompare(b[0]));
  $('#glCount').textContent = bn(list.length) + 'টি';
  const draw = () => {
    const q = $('#glQ').value.trim().toLowerCase();
    const hits = list.filter(g => !q || (g[0] + ' ' + g[1]).toLowerCase().includes(q));
    $('#glList').innerHTML = hits.length ? hits.map(g => `<div><dt>${esc(g[0])}</dt><dd>${g[1]}</dd></div>`).join('') : '<p class="hint">কিছু পাওয়া যায়নি · Nothing found</p>';
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
      $$('.sec, .card, .calc, .gl > div, tr', mod).forEach(el => {
        if (el.closest('.calc') && !el.matches('.calc')) return;
        let h;
        if (el.matches('tr')) { if (el.closest('thead')) return; h = $('td', el); } else h = $('h2, h3, h4, dt, .k', el);
        if (!h) return;
        if (!el.id) el.id = 'x' + (k++);
        const title = h.textContent.replace(/^\s*\d+\.\d+\s*/, '').replace(/\s+/g, ' ').trim();
        idx.push({ mid, mtitle, el, title, tl: title.toLowerCase(), text: el.textContent.replace(/\s+/g, ' ').toLowerCase() });
      });
    });
  };
  const q = $('#q'), box = $('#results');
  const search = () => {
    const s = q.value.trim().toLowerCase();
    if (s.length < 2) { box.hidden = true; return; }
    if (!idx) build();
    const terms = s.split(/\s+/);
    const hits = idx.map(r => { if (!terms.every(t => r.text.includes(t) || r.tl.includes(t))) return null; let sc = 0; terms.forEach(t => { if (r.tl.includes(t)) sc += 5; }); if (r.el.matches('.sec')) sc -= 1; if (r.el.matches('tr')) sc -= 0.5; return [sc, r]; })
      .filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 14).map(x => x[1]);
    box.innerHTML = hits.length ? hits.map(r => {
      const src = r.el.textContent.replace(/\s+/g, ' '), p = src.toLowerCase().indexOf(terms[0]);
      return `<a href="#${r.mid}" data-i="${idx.indexOf(r)}"><small>${esc(r.mtitle)}</small>${esc(r.title.slice(0, 90))}<span>${esc(p >= 0 ? src.slice(Math.max(0, p - 30), p + 70) : '')}</span></a>`;
    }).join('') : '<div class="none">কিছু পাওয়া যায়নি। অন্য শব্দে চেষ্টা করুন (বাংলা বা ইংরেজি)। · Nothing found.</div>';
    box.hidden = false;
  };
  q.addEventListener('input', search);
  q.addEventListener('focus', search);
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { box.hidden = true; q.blur(); } if (e.key === 'ArrowDown') { const a = $('a', box); if (a) { e.preventDefault(); a.focus(); } } if (e.key === 'Enter') { const a = $('a', box); if (a) { e.preventDefault(); a.click(); } } });
  box.addEventListener('keydown', e => { const a = document.activeElement; if (e.key === 'ArrowDown' && a.nextElementSibling) { e.preventDefault(); a.nextElementSibling.focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); (a.previousElementSibling || q).focus(); } if (e.key === 'Escape') { box.hidden = true; q.focus(); } });
  box.addEventListener('click', e => {
    const a = e.target.closest('a[data-i]'); if (!a) return; e.preventDefault();
    const r = idx[+a.dataset.i]; box.hidden = true;
    if (r.el.matches('.calc') && r.el.hidden) { const c = $(`#calcNav .chip[data-k="${r.el.dataset.calc}"]`); if (c) c.click(); }
    if (location.hash !== '#' + r.mid) history.replaceState(null, '', '#' + r.mid);
    show(r.mid, r.el);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.sbox')) box.hidden = true; });
})();

route();
