// LifeHub front-end: sidebar, confirms, Excel export/import, uploads with progress, dashboard chart.
(function () {
  'use strict';
  const T = (k) => (window.LH && LH.t[k]) || k;
  const csrf = document.querySelector('meta[name="csrf"]')?.content || '';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Sidebar on mobile */
  const sidebar = $('#sidebar'), scrim = $('#scrim');
  const toggle = (open) => { sidebar?.classList.toggle('open', open); scrim?.classList.toggle('show', open); };
  $('#menuBtn')?.addEventListener('click', () => toggle(!sidebar.classList.contains('open')));
  scrim?.addEventListener('click', () => toggle(false));

  /* Confirm before delete */
  $$('form[data-confirm]').forEach((f) => f.addEventListener('submit', (e) => { if (!confirm(T('confirm_delete'))) e.preventDefault(); }));

  /* Copy text notes */
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = '✓'; });
  }));

  /* Excel (.xlsx) export: fetch JSON rows and build a workbook in the browser */
  $$('[data-xlsx]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!window.XLSX) return;
    btn.disabled = true;
    try {
      const res = await fetch(btn.dataset.xlsx, { credentials: 'same-origin' });
      const { rows } = await res.json();
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, btn.dataset.filename || 'export.xlsx');
    } finally { btn.disabled = false; }
  }));

  /* Dashboard chart */
  const chartEl = $('#chart');
  if (chartEl && window.Chart) {
    const d = JSON.parse(chartEl.dataset.chart);
    const css = getComputedStyle(document.documentElement);
    new Chart(chartEl, {
      type: 'bar',
      data: {
        labels: d.labels,
        datasets: [
          { label: T('income'), data: d.income, backgroundColor: css.getPropertyValue('--green').trim(), borderRadius: 6, maxBarThickness: 28 },
          { label: T('expense'), data: d.expense, backgroundColor: css.getPropertyValue('--rose').trim(), borderRadius: 6, maxBarThickness: 28 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eef0f6' }, ticks: { callback: (v) => '৳' + v.toLocaleString() } } },
      },
    });
  }

  /* Upload: show chosen files, drag & drop, progress bar */
  const upForm = $('#uploadForm');
  if (upForm) {
    const input = $('input[type=file]', upForm), dz = $('#dropzone'), list = $('#dzList');
    const prog = $('#progress'), bar = $('#progress span');
    const show = () => { list.textContent = Array.from(input.files).map((f) => f.name).join(', '); };
    input.addEventListener('change', show);
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', (e) => { input.files = e.dataTransfer.files; show(); });
    upForm.addEventListener('submit', (e) => {
      if (!input.files.length) { e.preventDefault(); input.click(); return; }
      e.preventDefault();
      const xhr = new XMLHttpRequest();
      xhr.open('POST', upForm.action || location.pathname);
      xhr.setRequestHeader('X-Requested-With', 'fetch');
      prog.hidden = false;
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) bar.style.width = (ev.loaded / ev.total * 100) + '%'; };
      xhr.onload = () => {
        let r = {};
        try { r = JSON.parse(xhr.responseText); } catch (_) {}
        if (r.errors && r.errors.length) alert(r.errors.join('\n'));
        location.reload();
      };
      xhr.onerror = () => { alert(T('import_failed')); prog.hidden = true; };
      xhr.send(new FormData(upForm));
    });
  }

  /* Excel / CSV import */
  const impFile = $('#impFile');
  if (impFile) {
    const tableSel = $('#impTable'), card = $('#impMapCard'), mapBox = $('#impMap');
    const preview = $('#impPreview'), startBtn = $('#impStart'), result = $('#impResult');
    const prog = $('#impProgress'), bar = $('#impProgress span');
    let rows = [], headers = [];

    // Header names (English + Bangla) that map automatically to a field.
    const ALIAS = {
      name: ['name', 'full name', 'customer name', 'নাম'], phone: ['phone', 'mobile', 'cell', 'contact', 'ফোন', 'মোবাইল'],
      email: ['email', 'e-mail', 'mail', 'ইমেইল'], company: ['company', 'business', 'organization', 'কোম্পানি', 'প্রতিষ্ঠান'],
      address: ['address', 'location', 'ঠিকানা'], tags: ['tags', 'tag', 'category', 'ট্যাগ'], notes: ['notes', 'note', 'remarks', 'comment', 'details', 'নোট', 'মন্তব্য'],
      date: ['date', 'day', 'তারিখ'], type: ['type', 'kind', 'ধরন'], title: ['title', 'description', 'item', 'particulars', 'বিবরণ', 'শিরোনাম'],
      amount: ['amount', 'total', 'price', 'value', 'টাকা', 'পরিমাণ'], status: ['status', 'অবস্থা'], customer: ['customer', 'client', 'party', 'কাস্টমার', 'গ্রাহক'],
    };

    const render = () => {
      const fields = IMPORT_FIELDS[tableSel.value];
      mapBox.innerHTML = '';
      headers.forEach((h, i) => {
        const key = String(h).trim().toLowerCase();
        const guess = Object.keys(fields).find((f) => (ALIAS[f] || [f]).includes(key)) || '';
        const lab = document.createElement('label');
        lab.innerHTML = `<span class="mono"></span><select data-col="${i}"><option value="">— ${T('skip_column')} —</option>${Object.entries(fields).map(([f, l]) => `<option value="${f}" ${f === guess ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
        lab.querySelector('span').textContent = h;
        mapBox.appendChild(lab);
      });
      preview.innerHTML = '';
      const thead = preview.createTHead().insertRow();
      headers.forEach((h) => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
      const tb = preview.createTBody();
      rows.slice(0, 5).forEach((r) => { const tr = tb.insertRow(); headers.forEach((_, i) => { tr.insertCell().textContent = r[i] ?? ''; }); });
      $('#impCount').textContent = rows.length + ' ' + T('rows_ready');
      card.hidden = false;
      result.textContent = '';
    };

    impFile.addEventListener('change', async () => {
      const f = impFile.files[0];
      if (!f || !window.XLSX) return;
      // CSV is read as UTF-8 text so Bangla survives; Excel files are read as binary.
      const isCsv = /\.csv$/i.test(f.name);
      const wb = isCsv
        ? XLSX.read((await f.text()).replace(/^﻿/, ''), { type: 'string', cellDates: true, raw: true })
        : XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' });
      headers = data[0] || [];
      rows = data.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
      if (!rows.length) { alert(T('no_rows')); return; }
      render();
    });
    tableSel.addEventListener('change', () => { if (headers.length) render(); });

    startBtn.addEventListener('click', async () => {
      const map = $$('select[data-col]', mapBox).filter((s) => s.value).map((s) => [Number(s.dataset.col), s.value]);
      const mapped = rows.map((r) => Object.fromEntries(map.map(([i, f]) => [f, r[i] ?? ''])));
      startBtn.disabled = true; prog.hidden = false;
      let imported = 0, skipped = 0;
      try {
        for (let i = 0; i < mapped.length; i += 500) {
          const body = new FormData();
          body.append('csrf', csrf);
          body.append('payload', JSON.stringify({ table: tableSel.value, rows: mapped.slice(i, i + 500), last: i + 500 >= mapped.length }));
          const res = await fetch(location.pathname, { method: 'POST', body, credentials: 'same-origin' });
          const j = await res.json();
          if (!res.ok) throw new Error(j.error || res.status);
          imported += j.imported; skipped += j.skipped;
          bar.style.width = Math.min(100, (i + 500) / mapped.length * 100) + '%';
        }
        result.className = 'flash flash-ok';
        result.textContent = `✅ ${imported} ${T('rows_imported')}` + (skipped ? ` · ${skipped} skipped` : '');
      } catch (err) {
        result.className = 'flash flash-err';
        result.textContent = T('import_failed') + ': ' + err.message;
      } finally { startBtn.disabled = false; }
    });
  }

  /* Installable app (PWA) */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
