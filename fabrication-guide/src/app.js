/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k, d) { try { const v = localStorage.getItem('fabg:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fabg:' + k, JSON.stringify(v)); } catch (e) {} }
};
const BN = '০১২৩৪৫৬৭৮৯';
const bn = s => String(s).replace(/[0-9]/g, d => BN[d]);
const num = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
const f = (v, d = 1) => isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const res = (label, value, main) => `<div class="res${main ? ' main' : ''}"><span>${label}</span><b>${value}</b></div>`;
const pipeBy = n => PIPE.find(p => p[0] === n);
const nOpts = (sel, def) => PIPE.map(p => `<option value="${p[0]}"${p[0] === def ? ' selected' : ''}>${p[0]}" · DN${p[2]}</option>`).join('');
function fillSch(nSel, sSel, def) {
  const p = pipeBy($(nSel).value), cur = $(sSel).value || def;
  $(sSel).innerHTML = SCH_COLS.filter(s => p[4][s]).map(s => `<option value="${s}"${s === cur ? ' selected' : ''}>Sch ${s} · ${p[4][s].toFixed(2)} মিমি</option>`).join('');
  if (!p[4][cur]) $(sSel).value = p[4]['40'] ? '40' : SCH_COLS.find(s => p[4][s]);
}

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
      <div class="foot"><span>এই গাইডের সংখ্যা ও নিয়ম ASME, ASTM, AWS, API স্ট্যান্ডার্ড ও প্রচলিত সাইট-অনুশীলনের ভিত্তিতে শেখার জন্য সাজানো। কাজের সময় প্রজেক্ট স্পেসিফিকেশন, অনুমোদিত WPS, IFC ড্রয়িং ও স্ট্যান্ডার্ডের সর্বশেষ সংস্করণই চূড়ান্ত।</span></div>`);
  }
  document.title = (id === 'home' ? '' : mod.dataset.title + ' · ') + 'ফ্যাব্রিকেশন ফোরম্যান গাইড';
  if (focusEl) {
    requestAnimationFrame(() => { focusEl.scrollIntoView({ block: 'start' }); focusEl.classList.remove('hit'); void focusEl.offsetWidth; focusEl.classList.add('hit'); });
  } else window.scrollTo(0, 0);
}
function route() { show((location.hash || '#home').slice(1)); }
window.addEventListener('hashchange', route);

/* nav drawer */
$('#menu').addEventListener('click', () => {
  const open = !document.body.classList.contains('navopen');
  document.body.classList.toggle('navopen', open); $('#veil').hidden = !open; $('#menu').setAttribute('aria-expanded', String(open));
});
$('#veil').addEventListener('click', () => { document.body.classList.remove('navopen'); $('#veil').hidden = true; $('#menu').setAttribute('aria-expanded', 'false'); });

/* theme */
(function () {
  const saved = store.get('theme', null);
  if (saved) document.documentElement.dataset.theme = saved;
  $('#theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nx = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nx; store.set('theme', nx);
  });
})();

/* ---------- home tiles ---------- */
$('#tiles').innerHTML = MODULES.slice(1).map(m => `<a class="tile" href="#${m[0]}"><i>${m[1]}</i><b>${m[2]}</b><span>${m[3]}</span></a>`).join('');

/* ---------- 01 schedule table ---------- */
(function () {
  const t = $('#schTable');
  t.innerHTML = `<thead><tr><th>NPS</th><th class="num">DN</th><th class="num">OD</th>${SCH_COLS.map(s => `<th class="num">${s}</th>`).join('')}</tr></thead><tbody>` +
    PIPE.map(p => `<tr data-n="${p[0]}" tabindex="0" style="cursor:pointer"><td>${p[0]}"</td><td class="num">${p[2]}</td><td class="num"><b>${p[3].toFixed(1)}</b></td>${SCH_COLS.map(s => p[4][s] ? `<td class="num">${p[4][s].toFixed(2)}</td>` : '<td class="na">—</td>').join('')}</tr>`).join('') + '</tbody>';
  const pick = n => {
    const p = pipeBy(n); $$('tr', t).forEach(r => r.classList.toggle('hi', r.dataset.n === n));
    $('#schDetail').innerHTML = `<div class="tw"><table class="t dense"><thead><tr><th>শিডিউল</th><th class="num">WT মিমি</th><th class="num">ID মিমি</th><th class="num">কেজি/মি (CS)</th><th class="num">পানি লিটার/মি</th></tr></thead><tbody>` +
      SCH_COLS.filter(s => p[4][s]).map(s => { const w = p[4][s], id = p[3] - 2 * w; return `<tr><td>Sch ${s}</td><td class="num">${w.toFixed(2)}</td><td class="num">${id.toFixed(1)}</td><td class="num">${((p[3] - w) * w * 0.02466).toFixed(2)}</td><td class="num">${(Math.PI / 4 * id * id / 1000).toFixed(2)}</td></tr>`; }).join('') +
      `</tbody></table></div><p class="hint" style="margin-top:6px">${p[0]}" · DN${p[2]} · OD ${p[3]} মিমি (${(p[3] / 25.4).toFixed(3)}")</p>`;
  };
  t.addEventListener('click', e => { const r = e.target.closest('tr[data-n]'); if (r) pick(r.dataset.n); });
  t.addEventListener('keydown', e => { if (e.key === 'Enter') { const r = e.target.closest('tr[data-n]'); if (r) pick(r.dataset.n); } });
  pick('6');
})();

/* ---------- 03 line number decoder ---------- */
(function () {
  const svc = { P: 'প্রসেস', CW: 'কুলিং ওয়াটার', CWS: 'কুলিং ওয়াটার সাপ্লাই', CWR: 'কুলিং ওয়াটার রিটার্ন', LS: 'লো প্রেসার স্টিম', MS: 'মিডিয়াম প্রেসার স্টিম', HS: 'হাই প্রেসার স্টিম', C: 'কনডেনসেট', CD: 'কনডেনসেট', IA: 'ইনস্ট্রুমেন্ট এয়ার', PA: 'প্লান্ট এয়ার', UA: 'ইউটিলিটি এয়ার', N: 'নাইট্রোজেন', NG: 'ন্যাচারাল গ্যাস', FW: 'ফায়ার ওয়াটার', DR: 'ড্রেন', FL: 'ফ্লেয়ার', W: 'পানি', PW: 'প্রসেস/পটেবল ওয়াটার', SW: 'সি ওয়াটার' };
  const run = () => {
    const parts = $('#lineIn').value.trim().split(/\s*-\s*/).filter(Boolean);
    if (!parts.length) { $('#lineOut').innerHTML = '<p class="hint">একটি লাইন নম্বর লিখুন।</p>'; return; }
    const rows = parts.map((p, i) => {
      let lab = 'অংশ ' + bn(i + 1), mean = 'প্রজেক্টের লেজেন্ড দেখুন';
      if (/"/.test(p) || (i === 0 && /^(\d+(\.\d+)?|\d+-\d\/\d)(IN)?$/i.test(p))) { lab = 'সাইজ'; const v = parseFloat(p); mean = `${p.replace(/"$/, '')}" নমিনাল পাইপ সাইজ${v ? ' (≈ DN' + (pipeBy(String(v)) ? pipeBy(String(v))[2] : Math.round(v * 25)) + ')' : ''}`; }
      else if (svc[p.toUpperCase()] && i <= 2) { lab = 'সার্ভিস'; mean = svc[p.toUpperCase()]; }
      else if (/^\d{3,6}$/.test(p)) { lab = 'ইউনিট/সিরিয়াল'; mean = `লাইনের ক্রমিক নম্বর (প্রথম অঙ্কগুলো প্রায়ই ইউনিট/এরিয়া)`; }
      else if (/^[A-Z]{1,2}\d{1,2}[A-Z]?\d?$/i.test(p) && i >= 2 && !/^(H|C|P|PP|A|ET|ST)\d*$/i.test(p)) {
        lab = 'পাইপ ক্লাস'; const r = { A: '150#', B: '300#', C: '400#', D: '600#', E: '900#', F: '1500#', G: '2500#' }[p[0].toUpperCase()];
        mean = `ক্লাস শিট দেখুন${r ? ` (সাধারণ নিয়মে প্রথম অক্ষর ${p[0].toUpperCase()} = রেটিং ${r})` : ''}`;
      }
      else if (/^(H|C|P|PP|A|ET|ST|N|NIL)\d*$/i.test(p)) { lab = 'ইনসুলেশন/ট্রেসিং'; const m = p.match(/^([A-Z]+)(\d*)$/i); const k = { H: 'হিট কনজারভেশন', C: 'কোল্ড', P: 'পার্সোনেল প্রোটেকশন', PP: 'পার্সোনেল প্রোটেকশন', A: 'অ্যাকুস্টিক', ET: 'ইলেকট্রিক ট্রেসিং', ST: 'স্টিম ট্রেসিং', N: 'ইনসুলেশন নেই', NIL: 'ইনসুলেশন নেই' }[m[1].toUpperCase()]; mean = k + (m[2] ? `, ${m[2]} মিমি পুরু` : ''); }
      return res(`<b style="font-family:var(--mono);font-size:14px;color:var(--ink)">${esc(p)}</b> · ${lab}`, `<span style="font-family:var(--body);font-size:14px;font-weight:500">${mean}</span>`);
    });
    $('#lineOut').innerHTML = rows.join('');
  };
  $('#lineIn').addEventListener('input', run); run();
})();

/* ---------- 04 flange table ---------- */
(function () {
  const draw = c => {
    $$('#flClass .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === c)));
    $('#flTable').innerHTML = `<thead><tr><th>NPS</th><th class="num">OD মিমি</th><th class="num">বোল্ট</th><th class="num">স্টাড</th><th class="num">PCD মিমি</th><th>রেঞ্চ/সকেট</th><th class="num">WN লেংথ মিমি</th></tr></thead><tbody>` +
      Object.entries(FLG[c]).map(([n, v]) => { const y = c === '150' ? FIT[n][6] : c === '300' ? FIT[n][7] : null; return `<tr><td>${n}"</td><td class="num">${v[0]}</td><td class="num"><b>${v[1]}</b></td><td class="num">${v[2]}"</td><td class="num">${v[3].toFixed(1)}</td><td class="mono" style="font-size:12.5px">${STUD[v[2]][2]}</td><td class="num">${y ? y.toFixed(1) : '<span class="tcap">স্ট্যান্ডার্ড দেখুন</span>'}</td></tr>`; }).join('') + '</tbody>';
  };
  $('#flClass').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) draw(b.dataset.c); });
  draw('150');
})();

/* ---------- 05 fittings ---------- */
$('#fitChips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  $$('#fitChips .chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
  $$('#fitGrid .fig').forEach(fg => fg.hidden = !(b.dataset.f === 'all' || fg.dataset.cat === b.dataset.f));
});
$('#fitTable').innerHTML = `<thead><tr><th>NPS</th><th class="num">OD</th><th class="num">90° LR</th><th class="num">45° LR</th><th class="num">90° SR</th><th class="num">টি C-E</th><th class="num">রিডিউসার H</th><th class="num">ক্যাপ E</th></tr></thead><tbody>` +
  PIPE.map(p => { const d = FIT[p[0]]; return `<tr><td>${p[0]}"</td><td class="num">${p[3].toFixed(1)}</td>${d.slice(0, 6).map(v => v ? `<td class="num">${v}</td>` : '<td class="na">—</td>').join('')}</tr>`; }).join('') + '</tbody>';

/* ---------- 08 electrode ---------- */
(function () {
  $('#elBase').innerHTML = ELECTRODE.map((e, i) => `<option value="${i}">${e.b}</option>`).join('');
  const out = () => { const e = ELECTRODE[$('#elBase').value]; $('#elOut').innerHTML = res('P-নম্বর', e.p) + res('SMAW (স্টিক)', e.s, true) + res('GTAW (TIG রড)', e.g) + res('FCAW', e.f) + `<p class="hint">${e.n}</p>`; };
  $('#elBase').addEventListener('change', out); out();
  $('#elTable').innerHTML = `<thead><tr><th>বেস মেটাল</th><th>P-No.</th><th>SMAW</th><th>GTAW</th><th>FCAW</th><th>নোট</th></tr></thead><tbody>` +
    ELECTRODE.map(e => `<tr><td>${e.b}</td><td class="mono" style="font-size:12.5px">${e.p}</td><td class="mono" style="font-size:12.5px;color:var(--ink)">${e.s}</td><td class="mono" style="font-size:12.5px">${e.g}</td><td class="mono" style="font-size:12.5px">${e.f}</td><td>${e.n}</td></tr>`).join('') + '</tbody>';

  const coat = { '10': 'সেলুলোজ-সোডিয়াম, DCEP; গভীর পেনিট্রেশন, রুট পাসে (বেক নয়)', '11': 'সেলুলোজ-পটাশিয়াম, AC বা DCEP', '12': 'রুটাইল-সোডিয়াম, AC/DCEN', '13': 'রুটাইল-পটাশিয়াম, AC/DC; সহজ, সাধারণ কাজ', '14': 'রুটাইল + আয়রন পাউডার', '15': 'লো-হাইড্রোজেন সোডিয়াম, DCEP', '16': 'লো-হাইড্রোজেন পটাশিয়াম, AC/DCEP', '18': 'লো-হাইড্রোজেন পটাশিয়াম + আয়রন পাউডার, AC/DCEP; বেক করে রাখতে হয়', '20': 'আয়রন অক্সাইড, ফ্ল্যাট', '24': 'রুটাইল + বেশি আয়রন পাউডার, ফ্ল্যাট/হরাইজন্টাল', '27': 'আয়রন অক্সাইড + আয়রন পাউডার', '28': 'লো-হাইড্রোজেন + বেশি আয়রন পাউডার, ফ্ল্যাট/হরাইজন্টাল', '48': 'লো-হাইড্রোজেন, ভার্টিক্যাল ডাউনসহ' };
  const suf = { '1': 'উন্নত ইমপ্যাক্ট টাফনেস (−৪৬°C)', A1: 'C-½Mo', B1: '½Cr-½Mo', B2: '1¼Cr-½Mo (P11)', B2L: '1¼Cr-½Mo লো কার্বন', B3: '2¼Cr-1Mo (P22)', B6: '5Cr-½Mo (P5)', B8: '9Cr-1Mo (P9)', B9: '9Cr-1Mo-V (P91)', C1: '2.5% Ni (লো-টেম্প)', C2: '3.5% Ni', C3: '1% Ni', D1: 'Mn-Mo', D2: 'Mn-Mo', G: 'সাধারণ (রসায়ন নির্দিষ্ট নয়, চুক্তি অনুযায়ী)', P1: 'পাইপলাইন (ভার্টিক্যাল ডাউন)', W: 'ওয়েদারিং স্টিল' };
  const pos = { '1': 'সব পজিশন', '2': 'ফ্ল্যাট ও হরাইজন্টাল ফিলেট', '4': 'সব পজিশন + ভার্টিক্যাল ডাউন' };
  const decode = () => {
    const raw = $('#awsIn').value.toUpperCase().replace(/\s+/g, '');
    const rows = []; let m;
    const tail = s => {
      const h = s.match(/H(4|8|16)/); if (h) rows.push(res('H' + h[1], `ডিফিউজিবল হাইড্রোজেন ≤ ${h[1]} মিলি/১০০ গ্রাম`));
      if (/(\d|H\d+)R$/.test(s)) rows.push(res('R', 'আর্দ্রতা-প্রতিরোধী কোটিং'));
    };
    if ((m = raw.match(/^ER(\d{2,3})S-?([A-Z0-9]+)/))) {
      rows.push(res('ER', 'ইলেক্ট্রোড বা রড (TIG রড / MIG তার)'), res(m[1], `ন্যূনতম টেনসাইল ${m[1]},000 psi (≈ ${Math.round(m[1] * 6.895)} MPa)`, true), res('S', 'সলিড তার/রড'));
      const k = m[2]; rows.push(res(k, suf[k] || ({ '2': 'Ti-Zr-Al ডিঅক্সিডাইজার; রুট পাসে জনপ্রিয়', '3': 'সাধারণ, পরিষ্কার স্টিলে', '6': 'বেশি Mn-Si; মরিচা/ময়লা সহনশীল, সবচেয়ে প্রচলিত MIG তার', '7': 'বেশি Mn', 'NI1': '1% Ni (লো-টেম্প)', 'D2': 'Mn-Mo', 'A1': 'C-½Mo' }[k] || 'রাসায়নিক শ্রেণি')));
    } else if ((m = raw.match(/^ER(NI[A-Z]*|CU[A-Z]*)-?(\d*)/))) {
      rows.push(res('ER', 'ইলেক্ট্রোড বা রড'), res(m[1], m[1].startsWith('NI') ? 'নিকেল-ভিত্তিক অ্যালয় (Cr, Mo, Fe ইত্যাদি)' : 'কপার-ভিত্তিক'), res('নম্বর', m[2] || '—'));
    } else if ((m = raw.match(/^ER(\d{3,4}[A-Z]*)/))) {
      rows.push(res('ER', 'TIG রড / MIG তার'), res(m[1], `স্টেইনলেস/ডুপ্লেক্স টাইপ ${m[1]}${/L/.test(m[1]) ? ' · L = লো কার্বন' : ''}${/SI/.test(m[1]) ? ' · Si = বেশি সিলিকন, প্রবাহ ভালো' : ''}${/MO/.test(m[1]) ? ' · Mo যুক্ত' : ''}`, true));
    } else if ((m = raw.match(/^E(\d)(\d)T(\d*)-?(\d+)?([A-Z])?/))) {
      rows.push(res('E', 'ইলেক্ট্রোড (ফ্লাক্স কোর তার)'), res(m[1] + '0', `ন্যূনতম টেনসাইল ${m[1]}0,000 psi`, true), res(m[2], m[2] === '0' ? 'ফ্ল্যাট ও হরাইজন্টাল' : 'সব পজিশন'), res('T', 'টিউবুলার (ফ্লাক্স কোর)'));
      if (m[4]) rows.push(res('-' + m[4], { '1': 'গ্যাস শিল্ডেড, রুটাইল স্ল্যাগ, সব পজিশনে জনপ্রিয়', '5': 'গ্যাস শিল্ডেড, বেসিক স্ল্যাগ', '8': 'সেলফ-শিল্ডেড', '11': 'সেলফ-শিল্ডেড, সাধারণ কাজ' }[m[4]] || 'ব্যবহারযোগ্যতা শ্রেণি'));
      if (m[5]) rows.push(res(m[5], { C: '১০০% CO₂ গ্যাস', M: 'Ar + CO₂ মিশ্র গ্যাস' }[m[5]] || '—'));
    } else if ((m = raw.match(/^E(\d{3,4}[A-Z]*?)-(15|16|17|26)/)) && !/^E\d{4,5}$/.test(raw.split('-')[0])) {
      rows.push(res('E', 'স্টেইনলেস/ডুপ্লেক্স স্টিক ইলেক্ট্রোড (AWS A5.4)'), res(m[1], `টাইপ ${m[1]}${/L/.test(m[1]) ? ' · L = লো কার্বন' : ''}${/MO/.test(m[1]) ? ' · Mo যুক্ত' : ''}`, true), res('-' + m[2], { '15': 'বেসিক কোটিং, শুধু DCEP; সব পজিশনে ভালো', '16': 'রুটাইল কোটিং, AC বা DCEP; মসৃণ বিড', '17': 'রুটাইল-সিলিকা, মসৃণ, স্প্রে-ধরন আর্ক', '26': 'ফ্ল্যাট/হরাইজন্টাল' }[m[2]]));
    } else if ((m = raw.match(/^E(\d{2,3})(\d)(\d)(-([A-Z]+\d*L?|1))?/))) {
      const st = m[1], p = m[2], c = m[2] + m[3];
      rows.push(res('E', 'ইলেক্ট্রোড (স্টিক, ফ্লাক্স লেপা)'), res(st, `ন্যূনতম টেনসাইল ${st},000 psi (≈ ${Math.round(st * 6.895)} MPa)`, true), res(p, pos[p] || 'পজিশন কোড'), res(c, coat[c] || 'কোটিং ও কারেন্ট কোড'));
      if (m[5]) rows.push(res('-' + m[5], suf[m[5]] || 'রাসায়নিক/বিশেষ শ্রেণি'));
    } else {
      $('#awsOut').innerHTML = '<p class="hint">কোডটি চেনা যায়নি। উদাহরণ: E7018-1 H4R, E6010, E8018-B2, ER70S-6, E308L-16, E71T-1C, ERNiCrMo-3</p>'; return;
    }
    tail(raw);
    $('#awsOut').innerHTML = rows.join('');
  };
  $('#awsIn').addEventListener('input', decode); decode();
})();

/* ---------- 14 calculators ---------- */
(function () {
  const nav = $('#calcNav');
  const pickCalc = k => {
    $$('.chip', nav).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    $$('#m-calc .calc[data-calc]').forEach(c => c.hidden = c.dataset.calc !== k);
    store.set('calc', k);
  };
  nav.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) pickCalc(b.dataset.k); });
  pickCalc(store.get('calc', 'cw'));
  const on = (ids, fn) => { ids.forEach(id => { const el = $(id); el.addEventListener('input', fn); el.addEventListener('change', fn); }); fn(); };

  /* pipe weight */
  $('#cwN').innerHTML = nOpts('#cwN', '6'); fillSch('#cwN', '#cwS', '40');
  $('#cwN').addEventListener('change', () => fillSch('#cwN', '#cwS', $('#cwS').value));
  on(['#cwN', '#cwS', '#cwL', '#cwM'], () => {
    const p = pipeBy($('#cwN').value), w = p[4][$('#cwS').value] || 0, L = num('#cwL'), rho = num('#cwM');
    const id = p[3] - 2 * w, kgm = Math.PI * (p[3] * p[3] - id * id) / 4 * rho / 1000, wl = Math.PI / 4 * id * id / 1000;
    $('#cwOut').innerHTML = res('OD × WT → ID', `${f(p[3])} × ${f(w, 2)} → ${f(id)} মিমি`) + res('ওজন প্রতি মিটার', f(kgm, 2) + ' কেজি/মি') +
      res(`মোট ওজন (${f(L, 1)} মি)`, f(kgm * L, 1) + ' কেজি', true) + res('পানি প্রতি মিটার', f(wl, 2) + ' লিটার/মি') +
      res('মোট পানি (হাইড্রোটেস্ট)', f(wl * L, 0) + ' লিটার') + res('পানিসহ মোট ওজন', f(kgm * L + wl * L, 1) + ' কেজি') +
      res('বাইরের তল (পেইন্টিং)', f(Math.PI * p[3] / 1000 * L, 2) + ' বর্গমিটার');
  });

  /* cut length */
  const ends = [['none', 'কিছু না / সোজা পাইপের মাথা'], ['90lr', '90° LR এলবো'], ['45lr', '45° LR এলবো'], ['90sr', '90° SR এলবো'], ['tee', 'টি (সেন্টার থেকে)'], ['wn150', 'WN ফ্ল্যাঞ্জ 150# (ফেস থেকে)'], ['wn300', 'WN ফ্ল্যাঞ্জ 300# (ফেস থেকে)'], ['red', 'রিডিউসার (পুরো দৈর্ঘ্য)'], ['cap', 'ক্যাপ']];
  const idx = { '90lr': 0, '45lr': 1, '90sr': 2, tee: 3, red: 4, cap: 5, wn150: 6, wn300: 7 };
  $('#ctN').innerHTML = nOpts('#ctN', '6');
  $('#ctA').innerHTML = ends.map(e => `<option value="${e[0]}"${e[0] === 'wn150' ? ' selected' : ''}>${e[1]}</option>`).join('');
  $('#ctB').innerHTML = ends.map(e => `<option value="${e[0]}"${e[0] === '90lr' ? ' selected' : ''}>${e[1]}</option>`).join('');
  on(['#ctN', '#ctD', '#ctA', '#ctB', '#ctG', '#ctX'], () => {
    const d = FIT[$('#ctN').value], a = $('#ctA').value, b = $('#ctB').value, g = num('#ctG');
    const ta = a === 'none' ? 0 : d[idx[a]], tb = b === 'none' ? 0 : d[idx[b]];
    const gaps = (a === 'none' ? 0 : 1) + (b === 'none' ? 0 : 1);
    if (ta == null || tb == null) { $('#ctOut').innerHTML = '<p class="hint">এই সাইজে নির্বাচিত ফিটিং B16.9 টেবিলে নেই।</p>'; return; }
    const cut = num('#ctD') - ta - tb - gaps * g - num('#ctX');
    $('#ctOut').innerHTML = res('প্রান্ত ১ টেক-অফ', f(ta, 1) + ' মিমি') + res('প্রান্ত ২ টেক-অফ', f(tb, 1) + ' মিমি') + res(`রুট গ্যাপ (${bn(gaps)} টি)`, f(gaps * g, 1) + ' মিমি') +
      res('পাইপ কাট লেংথ', f(cut, 0) + ' মিমি', true) + (cut <= 0 ? '<p class="hint" style="color:var(--crit)">কাট লেংথ শূন্য বা ঋণাত্মক: ফিটিং সরাসরি জোড়া (fitting-to-fitting) বা মাপ ভুল।</p>' : '');
  });

  /* offset */
  $('#ofN').innerHTML = nOpts('#ofN', '6');
  on(['#ofR', '#ofL', '#ofA', '#ofN', '#ofG'], () => {
    const rise = num('#ofR'), roll = num('#ofL'), a = num('#ofA') * Math.PI / 180, set = Math.hypot(rise, roll);
    const travel = set / Math.sin(a), run = set / Math.tan(a), nps = pipeBy($('#ofN').value)[1];
    const to = num('#ofA') === 45 ? FIT[$('#ofN').value][1] : 1.5 * nps * 25.4 * Math.tan(a / 2);
    $('#ofOut').innerHTML = (roll ? res('আসল অফসেট (√রাইজ² + রোল²)', f(set, 1) + ' মিমি') : '') + res('ট্রাভেল (সেন্টার-টু-সেন্টার)', f(travel, 1) + ' মিমি') + res('রান (সামনের দিকে অগ্রগতি)', f(run, 1) + ' মিমি') +
      res('প্রতি এলবো টেক-অফ', f(to, 1) + ' মিমি') + res('ট্রাভেল পাইপের কাট লেংথ', f(travel - 2 * to - 2 * num('#ofG'), 0) + ' মিমি', true) +
      (roll ? res('রোলের কোণ (উল্লম্ব থেকে)', f(Math.atan2(roll, rise) * 180 / Math.PI, 1) + '°') : '');
  });

  /* mitre */
  on(['#miD', '#miA', '#miW', '#miR'], () => {
    const D = num('#miD'), A = num('#miA'), W = Math.max(1, Math.round(num('#miW'))), R = num('#miR');
    const c = A / (2 * W), t = Math.tan(c * Math.PI / 180);
    $('#miOut').innerHTML = res('টুকরো সংখ্যা', bn(W + 1) + ' (দুই মাথার টুকরো অর্ধেক মাপের)') + res('প্রতিটি কাটের কোণ (লম্ব থেকে)', f(c, 2) + '°', true) +
      res('কাট-ব্যাক (লম্বা দিক − ছোট দিক)', f(D * t, 1) + ' মিমি') + res('মাঝের টুকরোর সেন্টারলাইন দৈর্ঘ্য', f(2 * R * t, 1) + ' মিমি') +
      res('মাঝের টুকরো: বাইরের দিক / ভেতরের দিক', `${f(2 * (R + D / 2) * t, 0)} / ${f(2 * (R - D / 2) * t, 0)} মিমি`) + res('শেষের টুকরো (ট্যানজেন্ট বিন্দু পর্যন্ত, সেন্টার)', f(R * t, 1) + ' মিমি');
  });

  /* fishmouth */
  on(['#fsM', '#fsB', '#fsD'], () => {
    const R = num('#fsM') / 2, r = num('#fsB') / 2, N = parseInt($('#fsD').value, 10), svg = $('#fsSvg');
    if (r > R || r <= 0) { $('#fsOut').innerHTML = '<p class="hint" style="color:var(--crit)">ব্রাঞ্চ OD মূল পাইপের OD এর চেয়ে বড় হতে পারবে না।</p>'; svg.innerHTML = ''; return; }
    const base = Math.sqrt(R * R - r * r), C = 2 * Math.PI * r, pts = [];
    for (let i = 0; i <= N; i++) { const th = 2 * Math.PI * i / N; pts.push([C * i / N, Math.sqrt(R * R - (r * Math.sin(th)) ** 2) - base]); }
    const dmax = R - base;
    $('#fsOut').innerHTML = res('ব্রাঞ্চের পরিধি', f(C, 1) + ' মিমি') + res('প্রতিটি দাগের দূরত্ব', f(C / N, 1) + ' মিমি', true) + res('সর্বোচ্চ কাট গভীরতা', f(dmax, 1) + ' মিমি') +
      `<div class="tw"><table class="t dense"><thead><tr><th>দাগ</th><th class="num">পরিধি বরাবর (মিমি)</th><th class="num">মাথা থেকে কাট (মিমি)</th></tr></thead><tbody>${pts.slice(0, N).map((p, i) => `<tr><td>${i + 1}</td><td class="num">${f(p[0], 1)}</td><td class="num">${f(p[1], 1)}</td></tr>`).join('')}</tbody></table></div>`;
    const W = 560, H = 140, sx = W / C, sy = dmax > 0 ? H / dmax : 1, ox = 20, oy = 30;
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${(ox + p[0] * sx).toFixed(1)} ${(oy + p[1] * sy).toFixed(1)}`).join(' ');
    svg.innerHTML = `<rect x="${ox}" y="${oy}" width="${W}" height="${H + 10}" fill="var(--panel-2)" stroke="var(--line-2)"/>` +
      pts.map((p, i) => `<path d="M${(ox + p[0] * sx).toFixed(1)} ${oy} V${(oy + p[1] * sy).toFixed(1)}" stroke="var(--accent)" stroke-width="1"/>${i < N ? `<text x="${(ox + p[0] * sx + 2).toFixed(1)}" y="${oy - 6}" class="tx" style="font-size:9px">${i + 1}</text>` : ''}`).join('') +
      `<path d="${path} V${oy + H + 10} H${ox} Z" fill="var(--steel-soft)" stroke="none"/><path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2"/>` +
      `<text x="${ox}" y="${oy + H + 26}" class="tx" style="font-size:10px">ব্রাঞ্চ পাইপের পরিধি খোলা অবস্থায় (স্কেল আনুপাতিক নয়); নীল অংশ রাখা হবে, উপরের অংশ কাটা হবে</text>`;
  });

  /* hydrotest */
  on(['#hyP', '#hyR', '#hyH', '#hyT'], () => {
    const fac = num('#hyT'), hyd = fac === 1.5, Pt = fac * num('#hyP') * (hyd ? Math.min(6.5, Math.max(1, num('#hyR'))) : 1), head = 0.0981 * num('#hyH');
    $('#hyOut').innerHTML = res('টেস্ট চাপ (সর্বোচ্চ বিন্দুতে)', f(Pt, 2) + ' barg', true) + (hyd ? res('গেজে পড়তে হবে (গেজ নিচে থাকলে)', f(Pt + head, 2) + ' barg') + res('পানির উচ্চতার চাপ', f(head, 2) + ' bar') : '') +
      res('প্রস্তাবিত গেজ রেঞ্জ', `${f(Pt * 1.5, 0)}–${f(Pt * 4, 0)} bar (আদর্শ ≈ ${f(Pt * 2, 0)})`) + res('রিলিফ ভাল্ভ সেট (আনুমানিক)', `${f(Pt * 1.05, 1)}–${f(Pt * 1.1, 1)} barg`) +
      res('PSI তে', f(Pt * 14.504, 0) + ' psig') + `<p class="hint">${hyd ? 'হোল্ড কমপক্ষে ১০ মিনিট (B31.3), তারপর ডিজাইন চাপে পরিদর্শন। নিচের বিন্দুর চাপ যেন কোনো ফ্ল্যাঞ্জ/ভাল্ভের টেস্ট সীমা না ছাড়ায়।' : 'নিউমেটিক টেস্টে প্রথমে ০.৫ bar বা ২৫% এ প্রাথমিক লিক চেক, তারপর ধাপে ধাপে; বিশেষ অনুমোদন ও নিরাপদ দূরত্ব বাধ্যতামূলক।'}</p>`;
  });

  /* torque */
  $('#tqD').innerHTML = Object.keys(STUD).map(k => `<option value="${k}"${k === '3/4' ? ' selected' : ''}>${k}"</option>`).join('');
  on(['#tqD', '#tqS', '#tqK'], () => {
    const s = STUD[$('#tqD').value], A = s[1] * 645.16, F = num('#tqS') * A, T = num('#tqK') * F * s[0] * 0.0254;
    $('#tqOut').innerHTML = res('টেনসাইল স্ট্রেস এরিয়া', f(A, 1) + ' মিমি²') + res('বোল্ট টান (প্রিলোড)', f(F / 1000, 1) + ' kN') +
      res('টর্ক', `${f(T, 0)} N·m`, true) + res('টর্ক (ft·lb)', f(T * 0.7376, 0) + ' ft·lb') + res('ধাপ: ৩০% / ৬০% / ১০০%', `${f(T * 0.3, 0)} / ${f(T * 0.6, 0)} / ${f(T, 0)} N·m`) + res('নাট সাইজ', s[2]);
  });

  /* electrode consumption */
  $('#elN').innerHTML = nOpts('#elN', '6'); fillSch('#elN', '#elS', '40');
  $('#elN').addEventListener('change', () => fillSch('#elN', '#elS', $('#elS').value));
  on(['#elN', '#elS', '#elJ', '#elE'], () => {
    const p = pipeBy($('#elN').value), t = p[4][$('#elS').value] || 0, g = 3, land = Math.min(1.6, t), tn = Math.tan(37.5 * Math.PI / 180);
    const wCap = g + 2 * (t - land) * tn + 3, area = g * t + (t - land) ** 2 * tn + (2 / 3) * wCap * 1.5;
    const len = Math.PI * p[3], kg = area * len * 7.85e-6, J = Math.max(1, Math.round(num('#elJ'))), eff = num('#elE');
    $('#elOut2').innerHTML = res('ওয়েল্ডের প্রস্থচ্ছেদ (আনুমানিক)', f(area, 0) + ' মিমি²') + res('প্রতি জয়েন্ট ওয়েল্ড মেটাল', f(kg, 3) + ' কেজি') +
      res(`মোট ওয়েল্ড মেটাল (${bn(J)} জয়েন্ট)`, f(kg * J, 2) + ' কেজি') + res('প্রয়োজনীয় ইলেক্ট্রোড/তার', f(kg * J / eff, 2) + ' কেজি', true) +
      res('মোট ইঞ্চ-ডায়া', f(p[1] * J, 1) + ' ID') + '<p class="hint">৩৭.৫° বেভেল, ৩ মিমি গ্যাপ, ১.৬ মিমি ল্যান্ড, ১.৫ মিমি ক্যাপ ধরে। রুট TIG ও বাকিটা SMAW হলে মোটামুটি ১৫–২০% TIG রড, বাকি স্টিক। ১০–১৫% বাড়তি রাখুন (অপচয়, স্টাব এন্ড)।</p>';
  });

  /* inch-dia & manpower */
  const sizes = ['1/2', '3/4', '1', '1-1/2', '2', '3', '4', '6', '8', '10', '12', '14', '16', '18', '20', '24'];
  const sample = { '2': 40, '3': 12, '4': 20, '6': 12, '8': 6 };
  $('#idRows').innerHTML = sizes.map(s => `<div class="fld"><label for="id_${s.replace(/\W/g, '_')}">${s}" জয়েন্ট</label><input id="id_${s.replace(/\W/g, '_')}" type="number" min="0" step="1" value="${sample[s] || 0}"></div>`).join('');
  on(sizes.map(s => '#id_' + s.replace(/\W/g, '_')).concat(['#idRate', '#idDays']), () => {
    let tot = 0, jn = 0; sizes.forEach(s => { const n = num('#id_' + s.replace(/\W/g, '_')); jn += n; tot += n * pipeBy(s)[1]; });
    const wd = tot / Math.max(1, num('#idRate')), w = wd / Math.max(1, num('#idDays'));
    $('#idOut').innerHTML = res('মোট জয়েন্ট', f(jn, 0)) + res('মোট ইঞ্চ-ডায়া', f(tot, 1) + ' ID', true) + res('ওয়েল্ডার-দিন', f(wd, 1)) +
      res('প্রয়োজনীয় ওয়েল্ডার', f(Math.ceil(w), 0) + ` জন (হিসাবে ${f(w, 2)})`) + res('প্রস্তাবিত ফিটার / হেল্পার', `${f(Math.ceil(w), 0)} / ${f(Math.ceil(w * 1.5), 0)} জন`) +
      '<p class="hint">ফিটার:ওয়েল্ডার অনুপাত সাধারণত ১:১ থেকে ১:১.৫; সাইটের অবস্থা অনুযায়ী বদলান। ফিট-আপ এগিয়ে না থাকলে ওয়েল্ডার বসে থাকবে।</p>';
  });

  /* CE */
  on(['#ceC', '#ceMn', '#ceCr', '#ceMo', '#ceV', '#ceNi', '#ceCu'], () => {
    const ce = num('#ceC') + num('#ceMn') / 6 + (num('#ceCr') + num('#ceMo') + num('#ceV')) / 5 + (num('#ceNi') + num('#ceCu')) / 15;
    const [txt, cls] = ce <= 0.35 ? ['ভালো ওয়েল্ডেবিলিটি; পাতলা হলে সাধারণত প্রি-হিট লাগে না', 'g'] : ce <= 0.45 ? ['মাঝারি; মোটা হলে প্রি-হিট ৫০–১০০°C ও লো-H রড', 'y'] : ce <= 0.6 ? ['কঠিন; প্রি-হিট ১০০–২০০°C, নিয়ন্ত্রিত প্রক্রিয়া', 'r'] : ['খুব কঠিন; প্রি-হিট ও PWHT অপরিহার্য', 'r'];
    $('#ceOut').innerHTML = res('CE (IIW)', f(ce, 3), true) + `<p><span class="pill ${cls}">${txt}</span></p>`;
  });

  /* heat input */
  on(['#hiV', '#hiA', '#hiL', '#hiT', '#hiE'], () => {
    const L = Math.max(0.1, num('#hiL')), t = Math.max(0.1, num('#hiT')), sp = L / t * 60, hi = num('#hiV') * num('#hiA') * 60 / (sp * 1000) * num('#hiE');
    $('#hiOut').innerHTML = res('ট্রাভেল স্পিড', f(sp, 0) + ' মিমি/মিনিট') + res('হিট ইনপুট', f(hi, 2) + ' kJ/মিমি', true) + res('kJ/ইঞ্চি তে', f(hi * 25.4, 1) + ' kJ/in');
  });

  /* slope */
  on(['#slX', '#slL', '#slE'], () => {
    const x = Math.max(1, num('#slX')), drop = num('#slL') / x;
    $('#slOut').innerHTML = res('মোট নামবে', f(drop, 1) + ' মিমি', true) + res('শেষ প্রান্তের এলিভেশন', f(num('#slE') - drop, 1) + ' মিমি') + res('ঢাল শতাংশে', f(100 / x, 2) + '%') + res('কোণ', f(Math.atan(1 / x) * 180 / Math.PI, 3) + '°') + res('প্রতি মিটারে', f(1000 / x, 1) + ' মিমি');
  });

  /* units */
  const link = (pairs) => pairs.forEach(([id, toBase, fromBase, group]) => {
    $(id).addEventListener('input', () => { const v = parseFloat($(id).value); if (!isFinite(v)) return; const b = toBase(v); group.forEach(([oid, , fb]) => { if (oid !== id) $(oid).value = +fb(b).toPrecision(6); }); });
  });
  const L = [['#uMm', v => v, v => v], ['#uIn', v => v * 25.4, v => v / 25.4], ['#uFt', v => v * 304.8, v => v / 304.8]];
  const P = [['#uBar', v => v, v => v], ['#uPsi', v => v / 14.5038, v => v * 14.5038], ['#uMpa', v => v * 10, v => v / 10], ['#uKsc', v => v * 0.980665, v => v / 0.980665]];
  const T = [['#uC', v => v, v => v], ['#uF', v => (v - 32) * 5 / 9, v => v * 9 / 5 + 32]];
  const M = [['#uKg', v => v, v => v], ['#uLb', v => v * 0.453592, v => v / 0.453592]];
  const Q = [['#uNm', v => v, v => v], ['#uFtlb', v => v * 1.355818, v => v / 1.355818]];
  [L, P, T, M, Q].forEach(g => { link(g.map(x => [x[0], x[1], x[2], g])); $(g[0][0]).dispatchEvent(new Event('input')); });
})();

/* ---------- 15 quiz ---------- */
(function () {
  const box = $('#quizBox'); let set = [], i = 0, score = 0;
  $('#qzCount').textContent = bn(QUIZ.length) + 'টি';
  const best = () => { const b = store.get('quizBest', null); $('#qzBest').textContent = b == null ? '—' : bn(b) + ' / ১০'; };
  const start = () => { set = QUIZ.map((q, k) => [Math.random(), k]).sort((a, b) => a[0] - b[0]).slice(0, 10).map(x => QUIZ[x[1]]); i = 0; score = 0; render(); };
  const render = () => {
    if (i >= set.length) {
      const b = store.get('quizBest', 0); if (score > b) store.set('quizBest', score); best();
      box.innerHTML = `<div class="qtop"><span>রাউন্ড শেষ</span></div><div class="qq">আপনার স্কোর: ${bn(score)} / ${bn(set.length)}</div><p class="qx">${score >= 8 ? 'চমৎকার! আপনি ফোরম্যান পর্যায়ের জ্ঞান রাখেন।' : score >= 5 ? 'ভালো। ভুল প্রশ্নগুলোর মডিউল আরেকবার পড়ুন।' : 'মডিউলগুলো ক্রম অনুযায়ী পড়ে আবার চেষ্টা করুন।'}</p><div><button class="btn go" id="qzAgain" type="button">নতুন রাউন্ড</button></div>`;
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

/* ---------- 16 glossary ---------- */
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

/* ---------- 17 roadmap ---------- */
(function () {
  const done = new Set(store.get('skills', []));
  let n = 0;
  $('#rmSkillWrap').innerHTML = SKILLS.map(([g, items]) => `<div class="card"><span class="k">${g}</span>${items.map(([t, d]) => { const id = 'sk' + (n++); return `<label class="chk${done.has(id) ? ' done' : ''}" for="${id}"><input type="checkbox" id="${id}"${done.has(id) ? ' checked' : ''}><span><b>${t}</b><p>${d}</p></span></label>`; }).join('')}</div>`).join('');
  const total = n;
  $('#rmTotal').textContent = bn(total) + 'টি';
  const upd = () => {
    const c = done.size, p = Math.round(c / total * 100);
    $('#rmBar').style.width = p + '%'; $('#rmTxt').textContent = `${bn(c)} / ${bn(total)}`; $('#rmPct').textContent = bn(p) + '%';
  };
  $('#rmSkillWrap').addEventListener('change', e => {
    const cb = e.target; if (cb.type !== 'checkbox') return;
    cb.checked ? done.add(cb.id) : done.delete(cb.id); cb.closest('.chk').classList.toggle('done', cb.checked);
    store.set('skills', Array.from(done)); upd();
  });
  let armed = false;
  $('#rmReset').addEventListener('click', () => {
    if (!armed) { armed = true; $('#rmReset').textContent = 'নিশ্চিত? আবার চাপুন'; $('#rmConfirm').hidden = false; $('#rmConfirm').textContent = 'সব টিক মুছে যাবে।'; setTimeout(() => { armed = false; $('#rmReset').textContent = 'সব মুছুন'; $('#rmConfirm').hidden = true; }, 4000); return; }
    armed = false; done.clear(); $$('#rmSkillWrap input').forEach(i => { i.checked = false; i.closest('.chk').classList.remove('done'); });
    store.set('skills', []); upd(); $('#rmReset').textContent = 'সব মুছুন'; $('#rmConfirm').textContent = 'মুছে ফেলা হয়েছে।';
  });
  upd();
})();

/* ---------- site search ---------- */
(function () {
  let idx = null, k = 0;
  const build = () => {
    idx = [];
    $$('.mod').forEach(mod => {
      const mid = mod.id.slice(2), mtitle = mod.dataset.title;
      $$('.sec, .fig, .card, .gl > div', mod).forEach(el => {
        if (el.closest('.calc') && !el.matches('.calc')) return;
        const h = $('h2, h3, h4, dt', el); if (!h) return;
        if (!el.id) el.id = 'x' + (k++);
        const title = h.textContent.replace(/^\s*\d+\.\d+\s*/, '').trim();
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
    const hits = idx.map(r => { if (!terms.every(t => r.text.includes(t) || r.tl.includes(t))) return null; let sc = 0; terms.forEach(t => { if (r.tl.includes(t)) sc += 5; }); if (r.el.matches('.sec')) sc -= 1; return [sc, r]; })
      .filter(Boolean).sort((a, b) => b[0] - a[0]).slice(0, 14).map(x => x[1]);
    box.innerHTML = hits.length ? hits.map((r, n) => {
      const p = r.text.indexOf(terms[0]); const snip = p >= 0 ? r.el.textContent.replace(/\s+/g, ' ').slice(Math.max(0, p - 30), p + 70) : '';
      return `<a href="#${r.mid}" data-i="${idx.indexOf(r)}"><small>${r.mtitle}</small>${esc(r.title)}<span>${esc(snip)}</span></a>`;
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
    if (r.el.hidden) { $$('#fitChips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.f === 'all'))); $$('#fitGrid .fig').forEach(fg => fg.hidden = false); }
    if (location.hash !== '#' + r.mid) history.replaceState(null, '', '#' + r.mid);
    show(r.mid, r.el);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.sbox')) box.hidden = true; });
})();

route();
