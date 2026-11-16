// LifeHub read-only demo: nothing is saved; actions show a notice instead.
(function () {
  'use strict';
  var bn = document.documentElement.lang !== 'en';
  var MSG = bn ? 'এটি ডেমো সংস্করণ — এখানে কিছু সেভ হয় না। আসল সাইটে (cPanel) সব কাজ করবে।'
               : 'This is a read-only demo — nothing is saved here. Everything works on the real (cPanel) site.';
  var AI = bn ? '✦ ডেমো উত্তর: আসল সাইটে আপনার Gemini/Groq key দিলে AI এখানে আপনার ডেটা দেখে উত্তর দেবে, হিসাব যোগ করবে, ভয়েস ও ছবিও বুঝবে।'
              : '✦ Demo answer: on the real site, with your Gemini/Groq key, the AI answers from your data, records entries and understands voice and photos.';
  function toast(text) {
    var t = document.createElement('div');
    t.className = 'demo-toast'; t.textContent = text || MSG;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3800);
  }
  window.LH_DEMO_TOAST = toast;
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'composer') return; // the AI chat answers with a demo reply
    e.preventDefault(); e.stopImmediatePropagation(); toast();
  }, true);
  document.addEventListener('change', function (e) {
    if (e.target.matches('.switch input, [onchange]')) {
      e.stopImmediatePropagation();
      if (e.target.type === 'checkbox') e.target.checked = !e.target.checked;
      toast();
    }
  }, true);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#demo"]');
    if (a) { e.preventDefault(); toast(); }
  });
  var realFetch = window.fetch;
  window.fetch = function (url, opts) {
    if (opts && opts.method && opts.method.toUpperCase() === 'POST') {
      var fd = opts.body, act = fd && fd.get ? fd.get('do') : '';
      var body = { ok: false, error: MSG, text: MSG, message: '' }, status = 400;
      if (act === 'send') { body = { ok: true, chat_id: 1, msg_id: 0, reply: AI, actions: [] }; status = 200; }
      else if (act === 'insight') { body = { text: AI }; status = 200; }
      else { toast(); }
      return Promise.resolve(new Response(JSON.stringify(body), { status: status, headers: { 'Content-Type': 'application/json' } }));
    }
    return realFetch.apply(this, arguments);
  };
  var realOpen = XMLHttpRequest.prototype.open, realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m) { this._demoPost = String(m).toUpperCase() === 'POST'; return realOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () { if (this._demoPost) { toast(); return; } return realSend.apply(this, arguments); };
})();
