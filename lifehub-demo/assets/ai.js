// AI Command Center: chat, saved commands, photo attach, voice input, read-aloud, action cards.
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  const T = (k) => (LH.t[k] || k);
  const csrf = document.querySelector('meta[name="csrf"]').content;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const log = $('#chatLog'), form = $('#composer'), input = $('#prompt'), sendBtn = $('#sendBtn');
  const mediaInput = $('#mediaId'), preview = $('#attachPreview'), useData = $('#useData');
  let chatId = Number(log.dataset.chat) || 0;

  const post = async (data, file) => {
    const fd = new FormData();
    fd.append('csrf', csrf);
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append(file[0], file[1], file[2]);
    const res = await fetch('ai.php', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } });
    return res.json();
  };

  const scroll = () => { log.scrollTop = log.scrollHeight; };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*#`_>]/g, ''));
    u.lang = /[ঀ-৿]/.test(text) ? 'bn-BD' : 'en-US';
    speechSynthesis.speak(u);
  };

  const actionLabel = (a) => {
    const bits = [a.type ? T(a.type) : '', a.title || a.name || a.content || '', a.amount ? '৳' + a.amount : '', a.date || '', a.customer ? '→ ' + a.customer : ''];
    return bits.filter(Boolean).join(' · ');
  };

  const renderActions = (box, actions) => {
    box.innerHTML = '';
    actions.forEach((a, index) => {
      const card = document.createElement('div');
      card.className = 'action-card';
      const label = document.createElement('span');
      label.textContent = (T('act_' + a.action) || a.action) + ' — ' + actionLabel(a);
      const btn = document.createElement('button');
      btn.className = 'btn primary sm';
      btn.textContent = T('ai_apply');
      btn.type = 'button';
      if (a._applied) { btn.disabled = true; btn.textContent = T('saved'); card.classList.add('done'); }
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const r = await post({ do: 'apply', msg_id: box.dataset.msg, index });
        btn.textContent = r.ok ? T('saved') : '✗';
        card.classList.add(r.ok ? 'done' : 'fail');
        if (!r.ok) label.textContent += ' — ' + r.message;
      });
      card.append(label, btn);
      box.appendChild(card);
    });
    if (actions.length > 1) {
      const all = document.createElement('button');
      all.className = 'btn sm';
      all.type = 'button';
      all.textContent = T('ai_apply_all');
      all.addEventListener('click', () => $$('.action-card button:not(:disabled)', box).forEach((b) => b.click()));
      box.appendChild(all);
    }
  };

  const decorate = (msg) => {
    const body = $('.msg-body', msg);
    if (body && body.hasAttribute('data-md')) { body.innerHTML = LH.md(body.textContent); body.removeAttribute('data-md'); }
    const acts = $('.msg-actions', msg);
    if (acts && acts.dataset.actions) { try { renderActions(acts, JSON.parse(acts.dataset.actions)); } catch (_) {} }
    if (msg.classList.contains('msg-assistant') && !$('.speak', msg)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn-link speak'; b.title = T('ai_read_aloud'); b.textContent = '🔊';
      b.addEventListener('click', () => speak(body.textContent));
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'btn-link speak'; c.textContent = T('copy');
      c.addEventListener('click', () => navigator.clipboard?.writeText(body.textContent).then(() => { c.textContent = '✓'; }));
      const tools = document.createElement('div'); tools.className = 'msg-tools'; tools.append(b, c);
      msg.appendChild(tools);
    }
  };
  $$('.msg', log).forEach(decorate);
  scroll();

  const addMsg = (role, text, imgSrc) => {
    $('.chat-empty', log)?.remove();
    const m = document.createElement('div');
    m.className = 'msg msg-' + role;
    if (imgSrc) { const i = document.createElement('img'); i.className = 'msg-img'; i.src = imgSrc; m.appendChild(i); }
    const b = document.createElement('div'); b.className = 'msg-body'; b.textContent = text; b.setAttribute('data-md', '');
    m.appendChild(b);
    log.appendChild(m);
    scroll();
    return m;
  };

  const send = async (text, opts = {}) => {
    text = (text ?? input.value).trim();
    const media = mediaInput.value;
    if (!text && !media) return;
    addMsg('user', text || '📷', media ? 'file.php?id=' + media : null);
    input.value = ''; autosize();
    clearAttach();
    const wait = addMsg('assistant', '…');
    wait.classList.add('typing');
    sendBtn.disabled = true;
    try {
      const r = await post({ do: 'send', text, media_id: media, chat_id: chatId, use_data: (opts.useData ?? useData.checked) ? '1' : '0' });
      wait.classList.remove('typing');
      if (r.chat_id && r.chat_id !== chatId) { chatId = r.chat_id; history.replaceState(null, '', 'ai.php?chat=' + chatId); }
      if (r.error) { wait.classList.add('msg-error'); $('.msg-body', wait).textContent = '⚠ ' + r.error; return; }
      $('.msg-body', wait).textContent = r.reply || '…';
      $('.msg-body', wait).setAttribute('data-md', '');
      if (r.actions && r.actions.length) {
        const box = document.createElement('div'); box.className = 'msg-actions';
        box.dataset.actions = JSON.stringify(r.actions);
        box.dataset.msg = r.msg_id;
        wait.appendChild(box);
      }
      decorate(wait);
      if (localStorage.getItem('lh_autospeak') === '1') speak(r.reply);
    } catch (e) {
      $('.msg-body', wait).textContent = '⚠ ' + e.message;
    } finally { sendBtn.disabled = false; scroll(); }
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 200) + 'px'; };
  input.addEventListener('input', autosize);

  $$('.example').forEach((b) => b.addEventListener('click', () => send(b.dataset.prompt)));
  $$('.cmd-run').forEach((b) => b.addEventListener('click', () => {
    if (chatId) { location.href = 'ai.php?run=' + b.dataset.id; return; }
    send(b.dataset.prompt, { useData: b.dataset.useData === '1' });
  }));
  if (window.AI && AI.autorun && input.value.trim()) send();

  /* Photo attach */
  const clearAttach = () => { mediaInput.value = ''; preview.hidden = true; $('img', preview)?.remove(); };
  $('#attachClear').addEventListener('click', clearAttach);
  $('#photoInput').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    sendBtn.disabled = true;
    const r = await post({ do: 'attach' }, ['photo', f, f.name]);
    sendBtn.disabled = false;
    e.target.value = '';
    if (r.error) { alert(r.error); return; }
    mediaInput.value = r.media_id;
    $('img', preview)?.remove();
    const img = document.createElement('img'); img.src = 'file.php?id=' + r.media_id;
    preview.prepend(img); preview.hidden = false;
    input.focus();
  });

  /* Voice input: server Whisper when a key exists, otherwise the browser's own speech recognition */
  const mic = $('#micBtn');
  let rec = null, chunks = [];
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  mic.addEventListener('click', async () => {
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    if (AI.stt && navigator.mediaDevices && window.MediaRecorder) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream);
        chunks = [];
        rec.ondataavailable = (ev) => chunks.push(ev.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          mic.classList.remove('recording'); mic.textContent = '⏳';
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          const r = await post({ do: 'transcribe' }, ['audio', blob, 'voice.webm']);
          mic.textContent = '🎤';
          if (r.error) { alert(r.error); return; }
          input.value = (input.value ? input.value + ' ' : '') + r.text; autosize(); input.focus();
        };
        rec.start();
        mic.classList.add('recording'); mic.textContent = '⏹';
        return;
      } catch (err) { alert(err.message); return; }
    }
    if (SR) {
      const sr = new SR();
      sr.lang = LH.lang === 'bn' ? 'bn-BD' : 'en-US';
      sr.interimResults = false;
      mic.classList.add('recording');
      sr.onresult = (ev) => { input.value = (input.value ? input.value + ' ' : '') + ev.results[0][0].transcript; autosize(); };
      sr.onend = () => mic.classList.remove('recording');
      sr.onerror = (ev) => { mic.classList.remove('recording'); alert(ev.error); };
      sr.start();
      return;
    }
    alert(T('stt_no_key'));
  });
});
