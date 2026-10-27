/* ---------- 3D viewer: procedural drum models (three.js r128) ----------
   Drum axis = X (feed end at −X, slightly higher), Y up, drive side = +Z.
   Each pickable part is a Group with userData.part; "skin" parts (shell, liner, hoods)
   are clipped in cutaway mode and faded in x-ray mode so the internals show. */
const V3D = (function () {
  const INFO = {
    drum: ['রোটারি ড্রামের সাপোর্ট ও ড্রাইভ', 'দুটি টায়ার, প্রতিটির নিচে দুটি রোলার, একটি থ্রাস্ট রোলার, গার্থ গিয়ার আর মোটর-গিয়ারবক্স-পিনিয়ন ড্রাইভ। ঢাল বোঝাতে ফিড প্রান্ত (বামে) একটু উঁচু।'],
    gran: ['গ্রানুলেটর', 'রাবার লাইনড ড্রাম, তলায় রিসাইকেল দানার রোলিং বেড, বেডের নিচে অ্যামোনিয়া স্পার্জার, উপরে স্লারি ডিস্ট্রিবিউটর, পাশে ঘূর্ণায়মান স্ক্র্যাপার। ফিড প্রান্ত বামে।'],
    dryer: ['ফসফেট ড্রায়ার', 'বামে বার্নার ও কম্বাশন চেম্বার, তারপর ইনলেট চুট, স্পাইরাল ফ্লাইট, লিফটিং ফ্লাইটের সারি ও দানার পর্দা; ডানে ডিসচার্জ ব্রিচিং, সাইক্লোন ও ID ফ্যান।'],
    coat: ['কোটিং ড্রাম', 'ঠান্ডা দানার বেডের উপরে স্প্রে বার ও নজল, ভেতরে টাম্বলিং বার; বাইরে অয়েল ট্যাংক, ডোজিং পাম্প ও পাউডার ফিডার।']
  };
  const C = {
    shell: 0x7d8b95, tyre: 0x50585e, pad: 0xa0784a, stop: 0x9c5a3c, roller: 0x5b646b, rbear: 0x2f6f8f, base: 0x41474c,
    thrust: 0x6b747b, gear: 0x3f464b, spring: 0x8e979d, pinion: 0x2f3539, pbear: 0x2f6f8f, coupling: 0xb28a2e, gbox: 0x4f7d5a,
    motor: 0x2f6f8f, aux: 0x5a8db0, lube: 0xd9a21b, seal: 0x9a6b3a, liner: 0x26292b, bed: 0x8a7556, sparger: 0x8e6fc8,
    slurry: 0xc5ccd1, scrub: 0x5aa0b8, scraper: 0xb0b8bd, scrdrive: 0x2f6f8f, dam: 0x3a3d40, feedch: 0x9aa7ae, dischood: 0x9aa7ae,
    exhaust: 0xa9b3b8, burner: 0xc2552f, comb: 0xa8693f, dil: 0x5a8db0, inchute: 0xb9c2c7, spiral: 0xa3acb2, flights: 0xa3acb2,
    curtain: 0x9c8460, knocker: 0xcf8a2a, breech: 0x9aa7ae, cyclone: 0xb3bcc1, idfan: 0x5a8db0, bars: 0xa3acb2, spray: 0xd7dde1,
    tank: 0x8a6f3e, pump: 0x3f7fb0, powder: 0xc9c2b1, dusthood: 0xa9b3b8, disch: 0x9aa7ae, drive: 0x4f7d5a
  };
  const SKIN = { shell: 1, liner: 1, feedch: 1, dischood: 1, breech: 1, dusthood: 1, disch: 0 };
  const views = []; let looping = false, last = 0;

  function make(el) {
    const key = el.dataset.model, list = PARTS[key];
    el.innerHTML = `<div class="vstage"><span class="ov">টেনে ঘোরান · স্ক্রল/পিঞ্চে জুম · ট্যাপে অংশ</span></div>
      <div class="tools"><button class="chip" type="button" data-t="cut" aria-pressed="false">কাটঅ্যাওয়ে</button><button class="chip" type="button" data-t="xray" aria-pressed="false">স্বচ্ছ শেল</button><button class="chip" type="button" data-t="spin" aria-pressed="false">ঘোরান</button><button class="chip" type="button" data-t="lbl" aria-pressed="false">সব লেবেল</button><button class="chip" type="button" data-t="reset">ভিউ রিসেট</button></div>
      <div class="side"><div class="info" aria-live="polite"></div><div class="parts" role="list">${list.map((p, i) => `<button type="button" data-p="${p[0]}" role="listitem"><i>${String(i + 1).padStart(2, '0')}</i><span>${p[1]}</span></button>`).join('')}</div></div>`;
    const stage = $(".vstage", el), info = $('.info', el);
    const byId = Object.fromEntries(list.map(p => [p[0], p]));
    const showInfo = id => {
      if (!id) { const t = INFO[key]; info.innerHTML = `<span class="eqtag">৩ডি মডেল</span><h4>${t[0]}</h4><p>${t[1]}</p><p class="hint">ডানের তালিকা থেকে বা মডেলে ট্যাপ করে অংশ বেছে নিন। "কাটঅ্যাওয়ে" চাপলে সামনের অর্ধেক শেল সরে যাবে।</p>`; return; }
      const p = byId[id]; info.innerHTML = `<span class="eqtag">${String(list.indexOf(p) + 1).padStart(2, '0')}</span><h4>${p[1]}<span class="en">${p[2]}</span></h4><p>${p[3]}</p><div class="chkp"><b>ইন্সপেকশন:</b> ${p[4]}</div>`;
    };
    showInfo(null);
    if (typeof THREE === 'undefined') { stage.insertAdjacentHTML('beforeend', '<div class="fail">৩ডি লাইব্রেরি লোড হয়নি। একবার ইন্টারনেট সংযোগসহ পাতাটি খুলুন; তারপর অফলাইনেও চলবে। নিচের তালিকা থেকে প্রতিটি অংশের বিবরণ পড়তে পারবেন।</div>'); }
    const v = { el, key, stage, list, showInfo, sel: null, cut: false, xray: false, spin: false, lbl: false, ok: false };
    $$('.parts button', el).forEach(b => b.addEventListener('click', () => select(v, v.sel === b.dataset.p ? null : b.dataset.p)));
    $$('.tools .chip', el).forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.t;
      if (t === 'reset') { if (v.ok) resetCam(v); return; }
      v[t] = !v[t]; b.setAttribute('aria-pressed', String(v[t]));
      if (t === 'cut' && v[t] && v.xray) { v.xray = false; $('[data-t=xray]', el).setAttribute('aria-pressed', 'false'); }
      if (t === 'xray' && v[t] && v.cut) { v.cut = false; $('[data-t=cut]', el).setAttribute('aria-pressed', 'false'); }
      if (v.ok) { applySkin(v); if (t === 'lbl') buildLabels(v); }
      v.dirty = true;
    }));
    if (typeof THREE !== 'undefined') { try { initGL(v); } catch (e) { stage.insertAdjacentHTML('beforeend', '<div class="fail">এই ডিভাইসে ৩ডি (WebGL) চালু করা যায়নি। নিচের তালিকা থেকে অংশের বিবরণ পড়ুন।</div>'); } }
    views.push(v);
    return v;
  }

  /* ---------- scene ---------- */
  function initGL(v) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    v.stage.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', INFO[v.key][0] + ' এর ঘোরানো যায় এমন ৩ডি মডেল');
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6066, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(8, 14, 10); scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-10, 4, -8); scene.add(fill);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
    Object.assign(v, { renderer, scene, camera, parts: {}, mats: {}, spinners: [], anims: [], clip: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0) });
    const M = BUILD[v.key](v);
    scene.add(M);
    const box = new THREE.Box3().setFromObject(M), sph = box.getBoundingSphere(new THREE.Sphere());
    v.target = sph.center.clone(); v.target.y = Math.max(v.target.y, 0.3); v.rad = sph.radius;
    const grid = new THREE.GridHelper(Math.ceil(sph.radius * 2.6), Math.ceil(sph.radius * 1.3), 0x8a949b, 0x8a949b);
    grid.position.y = box.min.y - 0.02; grid.material.transparent = true; grid.material.opacity = 0.22; scene.add(grid);
    Object.entries(v.groups).forEach(([id, gs]) => { const b = new THREE.Box3(); gs.forEach(g => b.expandByObject(g)); v.parts[id].userData.anchor = b.getCenter(new THREE.Vector3()); });
    resetCam(v);
    v.tag = document.createElement('span'); v.tag.className = 'tag'; v.tag.hidden = true; v.stage.appendChild(v.tag);
    v.ray = new THREE.Raycaster(); v.ray.params.Points.threshold = 0.05; v.ok = true; v.dirty = true;
    const ro = new ResizeObserver(() => { v.dirty = true; size(v); }); ro.observe(v.stage); size(v);
    controls(v);
  }
  function size(v) {
    const w = v.stage.clientWidth, h = v.stage.clientHeight; if (!w || !h) return;
    v.renderer.setSize(w, h, false); v.camera.aspect = w / h; v.camera.updateProjectionMatrix();
  }
  function resetCam(v) { v.th = -0.55; v.ph = 1.12; v.r = v.rad * 2.05; v.tgt = v.target.clone(); place(v); v.dirty = true; }
  function place(v) {
    v.ph = Math.min(Math.max(v.ph, 0.15), 1.62); v.r = Math.min(Math.max(v.r, v.rad * 0.5), v.rad * 4);
    const s = Math.sin(v.ph);
    v.camera.position.set(v.tgt.x + v.r * s * Math.sin(v.th), v.tgt.y + v.r * Math.cos(v.ph), v.tgt.z + v.r * s * Math.cos(v.th));
    v.camera.lookAt(v.tgt);
  }
  function controls(v) {
    const cv = v.renderer.domElement, pts = new Map(); let down = null, pinch = 0;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = pts.size === 1 ? [e.clientX, e.clientY, 0] : null; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { v.th -= dx * 0.008; v.ph -= dy * 0.006; if (down) down[2] += Math.abs(dx) + Math.abs(dy); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) v.r *= pinch / d; pinch = d; down = null; }
      place(v); v.dirty = true;
    });
    const up = e => { if (pts.has(e.pointerId)) { pts.delete(e.pointerId); if (down && down[2] < 7 && e.type === 'pointerup') pickAt(v, e); down = null; pinch = 0; } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); v.r *= Math.exp(e.deltaY * 0.0012); place(v); v.dirty = true; }, { passive: false });
  }
  function pickAt(v, e) {
    const r = v.renderer.domElement.getBoundingClientRect();
    v.ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), v.camera);
    const hits = v.ray.intersectObjects(v.scene.children, true).map(h => { let o = h.object; while (o && !o.userData.part) o = o.parent; return o ? [o.userData.part, h] : null; })
      .filter(x => x && v.parts[x[0]] && !(v.cut && SKIN[x[0]] && x[1].point.z > 0));
    const solid = hits.find(x => !((v.xray || v.cut) && SKIN[x[0]])) || hits[0];
    select(v, solid ? solid[0] : null);
  }
  function select(v, id) {
    v.sel = id; v.showInfo(id);
    $$('.parts button', v.el).forEach(b => b.classList.toggle('on', b.dataset.p === id));
    if (id) { const b = $(`.parts button[data-p="${id}"]`, v.el); if (b && b.scrollIntoView && v.el.querySelector('.side').scrollHeight > v.el.querySelector('.side').clientHeight) b.scrollIntoView({ block: 'nearest' }); }
    if (!v.ok) return;
    Object.entries(v.mats).forEach(([pid, ms]) => ms.forEach(m => { m.emissive.setHex(pid === id ? 0xf2c230 : 0x000000); m.emissiveIntensity = pid === id ? 0.55 : 0; }));
    v.tag.hidden = !id; if (id) v.tag.textContent = (v.list.find(p => p[0] === id) || [, ''])[1];
    applySkin(v); v.dirty = true;
  }
  function applySkin(v) {
    Object.entries(v.mats).forEach(([pid, ms]) => ms.forEach(m => {
      const skin = SKIN[pid];
      m.clippingPlanes = v.cut && skin ? [v.clip] : null;
      const fade = v.xray && skin && pid !== v.sel;
      m.transparent = fade || !!m.userData.alpha; m.opacity = fade ? (pid === 'liner' ? 0.28 : 0.14) : (m.userData.alpha || 1); m.depthWrite = !fade;
      m.needsUpdate = true;
    }));
  }
  function buildLabels(v) {
    $$('.lbl', v.stage).forEach(n => n.remove()); v.lbls = null;
    if (!v.lbl) return;
    v.lbls = v.list.map((p, i) => { const n = document.createElement('span'); n.className = 'lbl'; n.textContent = (i + 1) + ' · ' + p[1]; v.stage.appendChild(n); return [p[0], n]; });
  }
  function project(v, id, node) {
    const g = v.parts[id]; if (!g) { node.hidden = true; return; }
    const p = g.userData.anchor.clone().project(v.camera);
    if (p.z > 1) { node.hidden = true; return; }
    node.hidden = false; node.style.left = ((p.x + 1) / 2 * v.stage.clientWidth) + 'px'; node.style.top = ((1 - p.y) / 2 * v.stage.clientHeight) + 'px';
  }

  /* ---------- loop ---------- */
  function frame(t) {
    const dt = Math.min((t - last) / 1000 || 0, 0.05); last = t;
    let any = false;
    views.forEach(v => {
      if (!v.ok || v.el.offsetParent === null || document.hidden) return;
      any = true;
      if (v.spin) { v.spinners.forEach(([o, k]) => { o.rotation.x += dt * 0.55 * k; }); v.anims.forEach(f => f(dt, true)); v.dirty = true; }
      if (!v.dirty) return;
      v.renderer.render(v.scene, v.camera); v.dirty = false;
      if (v.sel) project(v, v.sel, v.tag);
      if (v.lbls) v.lbls.forEach(([id, n]) => project(v, id, n));
    });
    looping = any || views.some(v => v.ok && v.el.offsetParent !== null);
    if (looping) requestAnimationFrame(frame);
  }
  function wake(root) {
    $$('.v3d', root).forEach(el => { if (!el.dataset.ready) { el.dataset.ready = '1'; make(el); } });
    views.forEach(v => { if (v.ok) { size(v); v.dirty = true; } });
    if (!looping) { looping = true; requestAnimationFrame(frame); }
  }

  /* ---------- geometry helpers ---------- */
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const cylX = (r1, r2, len, seg = 40, open = false) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1, open); g.rotateZ(Math.PI / 2); return g; };
  const ringX = (ri, ro, w, seg = 72) => { const g = new THREE.LatheGeometry([V2(ri, -w / 2), V2(ro, -w / 2), V2(ro, w / 2), V2(ri, w / 2), V2(ri, -w / 2)], seg); g.rotateZ(Math.PI / 2); return g; };
  const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  function kit(v) {
    v.groups = v.groups || {};
    const part = (id, parent) => {
      const list = v.groups[id] || (v.groups[id] = []);
      let g = parent ? list.find(x => x.parent === parent) : list[0];
      if (!g) { g = new THREE.Group(); g.userData.part = id; list.push(g); if (parent) parent.add(g); if (!v.parts[id]) v.parts[id] = g; }
      return g;
    };
    const mat = (id, color, alpha) => {
      const key = id + ':' + (color == null ? '' : color);
      v.matCache = v.matCache || {};
      if (!v.matCache[key]) {
        const m = new THREE.MeshStandardMaterial({ color: color == null ? C[id] : color, metalness: 0.32, roughness: 0.58, side: THREE.DoubleSide });
        if (alpha) { m.userData.alpha = alpha; m.transparent = true; m.opacity = alpha; }
        v.matCache[key] = m; (v.mats[id] = v.mats[id] || []).push(m);
      }
      return v.matCache[key];
    };
    const add = (geo, id, parent, pos, color, alpha) => { const m = new THREE.Mesh(geo, mat(id, color, alpha)); if (pos) m.position.set(pos[0], pos[1], pos[2]); (parent || part(id)).add(m); return m; };
    return { part, mat, add };
  }
  /* bed cross-section: circular segment of fill f, tilted by `tilt` toward the rising side */
  function bedGeo(R, f, x0, x1, tilt) {
    let phi = 2; for (let i = 0; i < 30; i++) { phi -= (phi - Math.sin(phi) - 2 * Math.PI * f) / (1 - Math.cos(phi)); }
    const s = new THREE.Shape(); const n = 28;
    for (let i = 0; i <= n; i++) { const a = -phi / 2 + phi * i / n; const p = [R * Math.sin(a), -R * Math.cos(a)]; i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]); }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false, curveSegments: 4 });
    g.rotateY(Math.PI / 2); g.translate(x0, 0, 0); g.rotateX(tilt);
    return { g, top: -R * Math.cos(phi / 2), half: R * Math.sin(phi / 2) };
  }

  /* common mechanicals: shell, tyres, rollers, thrust roller, girth gear + drive */
  function mech(v, k, root, o) {
    const { part, add } = k;
    const rot = new THREE.Group(); root.add(rot); v.spinners.push([rot, 1]);
    const R = o.R, Rt = R + 0.42, rr = o.rr || 0.55, w = o.tw || 0.55, ground = -(Rt + rr) * Math.cos(Math.PI / 6) - 0.39 - o.floor;
    add(cylX(R, R, o.L, 64, true), 'shell', part('shell', rot));
    o.tyres.forEach((x, ti) => {
      add(ringX(R + 0.1, Rt, w), 'tyre', part('tyre', rot), [x, 0, 0]);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, m = add(box(w + 0.16, 0.1, 0.16), 'pad', part('pad', rot), [x, (R + 0.05) * Math.cos(a), (R + 0.05) * Math.sin(a)]); m.rotation.x = -a; }
      for (let i = 0; i < 12; i++) { const a = (i + 0.5) / 12 * Math.PI * 2; [-1, 1].forEach(sd => { const m = add(box(0.1, 0.16, 0.22), 'stop', part('stop', rot), [x + sd * (w / 2 + 0.09), (R + 0.09) * Math.cos(a), (R + 0.09) * Math.sin(a)]); m.rotation.x = -a; }); }
      [-1, 1].forEach(sd => {
        const d = Rt + rr, cy = -d * Math.cos(Math.PI / 6), cz = sd * d * Math.sin(Math.PI / 6);
        const sp = new THREE.Group(); sp.position.set(x, cy, cz); part('roller', root).add(sp); v.spinners.push([sp, -Rt / rr]);
        add(cylX(rr, rr, w + 0.22, 40), 'roller', sp); add(cylX(0.13, 0.13, w + 1.5, 16), 'roller', sp, null, 0x40474c);
        [-1, 1].forEach(e => add(box(0.42, 0.42, 0.58), 'rbear', part('rbear', root), [x + e * (w / 2 + 0.55), cy, cz]));
        add(box(w + 1.7, 0.18, 0.9), 'base', part('base', root), [x, cy - 0.3, cz]);
      });
      add(box(w + 2, o.floor, 2 * (Rt + rr) * Math.sin(Math.PI / 6) + 1.2), 'base', part('base', root), [x, ground + o.floor / 2, 0], 0x5b6166);
      if (ti === o.thrustAt) {
        const tg = new THREE.Group(); tg.position.set(x + w / 2 + 0.34, -Rt + 0.3, 0); part('thrust', root).add(tg);
        const m = add(new THREE.CylinderGeometry(0.3, 0.3, 0.32, 32), 'thrust', tg); m.rotation.z = 0;
        add(box(0.7, 0.9, 0.7), 'thrust', tg, [0.1, -0.62, 0], 0x2f6f8f);
      }
    });
    if (o.noGear) return { rot, R, Rt };
    const gx = o.gearX, Rg = R + 0.62, rp = 0.36, zt = o.teeth || 96;
    add(ringX(R + 0.38, Rg - 0.05, 0.32), 'gear', part('gear', rot), [gx, 0, 0]);
    for (let i = 0; i < zt; i++) { const a = i / zt * Math.PI * 2, m = add(box(0.32, 0.14, 0.09), 'gear', part('gear', rot), [gx, Rg * Math.cos(a), Rg * Math.sin(a)]); m.rotation.x = -a; }
    for (let i = 0; i < 16; i++) { const a = (i + 0.5) / 16 * Math.PI * 2, rm = R + 0.2, m = add(box(0.06, 0.44, 0.12), 'spring', part('spring', rot), [gx - 0.22, rm * Math.cos(a), rm * Math.sin(a)]); m.rotation.x = -a + 0.5; }
    const pa = -0.42, pd = Rg + rp + 0.02, py = pd * Math.sin(pa), pz = pd * Math.cos(pa);
    const pg = new THREE.Group(); pg.position.set(gx, py, pz); part('pinion', root).add(pg); v.spinners.push([pg, -Rg / rp]);
    add(cylX(rp - 0.06, rp - 0.06, 0.4, 24), 'pinion', pg);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, m = add(box(0.4, 0.13, 0.08), 'pinion', pg, [0, (rp - 0.02) * Math.cos(a), (rp - 0.02) * Math.sin(a)]); m.rotation.x = -a; }
    add(cylX(0.1, 0.1, 2.0, 12), 'pinion', part('pinion', root), [gx + 0.75, py, pz], 0x40474c);
    [-0.5, 0.75].forEach(dx => add(box(0.36, 0.5, 0.56), 'pbear', part('pbear', root), [gx + dx, py, pz]));
    add(box(1.8, 0.22, 1.0), 'base', part('base', root), [gx + 0.15, py - 0.36, pz]);
    const dId = o.driveAs || null;
    add(cylX(0.22, 0.22, 0.28, 20), dId || 'coupling', part(dId || 'coupling', root), [gx + 1.35, py, pz]);
    add(box(1.3, 1.1, 1.0), dId || 'gbox', part(dId || 'gbox', root), [gx + 2.25, py + 0.12, pz]);
    add(cylX(0.08, 0.08, 0.5, 10), dId || 'motor', part(dId || 'motor', root), [gx + 3.1, py + 0.3, pz], 0x40474c);
    add(cylX(0.4, 0.4, 1.2, 28), dId || 'motor', part(dId || 'motor', root), [gx + 3.85, py + 0.3, pz]);
    add(box(0.5, 0.3, 0.3), dId || 'motor', part(dId || 'motor', root), [gx + 3.85, py + 0.78, pz]);
    add(box(4.2, 0.24, 1.3), 'base', part('base', root), [gx + 2.8, py - 0.55, pz]);
    add(box(5.6, py - 0.67 - ground, 1.5), 'base', part('base', root), [gx + 2.2, (py - 0.67 + ground) / 2, pz], 0x5b6166);
    if (o.aux) { add(box(0.55, 0.5, 0.5), 'aux', part('aux', root), [gx + 2.25, py + 0.1, pz + 0.85]); add(cylX(0.2, 0.2, 0.6, 16), 'aux', part('aux', root), [gx + 2.75, py + 0.1, pz + 0.85]); }
    if (o.lube) {
      add(box(0.24, 0.12, 0.7), 'lube', part('lube', root), [gx - 0.1, py + 0.62, pz - 0.12]);
      for (let i = -1; i <= 1; i++) { const m = add(new THREE.ConeGeometry(0.05, 0.14, 10), 'lube', part('lube', root), [gx - 0.1, py + 0.5, pz - 0.12 + i * 0.22]); m.rotation.x = Math.PI; }
      add(box(0.5, 0.7, 0.4), 'lube', part('lube', root), [gx - 0.9, py - 0.2, pz + 0.55]);
    }
    if (o.seal) [-o.L / 2, o.L / 2].forEach(x => add(ringX(R + 0.01, R + 0.18, 0.2), 'seal', part('seal', root), [x + Math.sign(x) * -0.08, 0, 0]));
    return { rot, R, Rt, Rg, py, pz };
  }
  const floorFor = R => R + 0.42 + 0.55 + 0.8;

  const BUILD = {
    drum(v) {
      const k = kit(v), root = new THREE.Group(); root.rotation.z = -0.035;
      const R = 1.8, L = 12;
      mech(v, k, root, { R, L, tyres: [-3.6, 3.4], gearX: 0.6, thrustAt: 1, floor: 1.2, aux: true, lube: true, seal: true, teeth: 104 });
      return root;
    },
    gran(v) {
      const k = kit(v), { part, add } = k, root = new THREE.Group(); root.rotation.z = -0.02;
      const R = 2.0, L = 9;
      const m = mech(v, k, root, { R, L, tyres: [-2.7, 2.7], gearX: 0.5, thrustAt: 1, floor: 1.2, driveAs: 'drive', teeth: 108 });
      add(cylX(R - 0.05, R - 0.05, L - 0.1, 64, true), 'liner', part('liner', m.rot), null);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, mm = add(box(L - 0.2, 0.03, 0.04), 'liner', part('liner', m.rot), [0, (R - 0.09) * Math.cos(a), (R - 0.09) * Math.sin(a)], 0x3b4044); mm.rotation.x = -a; }
      add(ringX(R - 0.62, R - 0.06, 0.14), 'dam', part('dam', m.rot), [L / 2 - 0.25, 0, 0]);
      const tilt = 0.6, bd = bedGeo(R - 0.08, 0.25, -L / 2 + 0.15, L / 2 - 0.3, tilt);
      const bed = add(bd.g, 'bed', part('bed', root)); bed.material.roughness = 1; bed.material.metalness = 0;
      /* sparger: under the bed, toward its deep side */
      const sa = 0.25, sr = R - 0.42, sy = -sr * Math.cos(sa), sz = -sr * Math.sin(sa);
      add(cylX(0.07, 0.07, 6.2, 14), 'sparger', part('sparger', root), [-L / 2 + 2.6, sy, sz]);
      add(cylX(0.07, 0.07, 1.6, 14), 'sparger', part('sparger', root), [-L / 2 - 0.3, sy, sz]);
      const riser = add(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 14), 'sparger', part('sparger', root), [-L / 2 - 1.05, sy + 1.8, sz]);
      for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.035, 8, 6), 'sparger', part('sparger', root), [-L / 2 + 0.2 + i * 0.42, sy - 0.07, sz], 0xf2c230);
      /* slurry distributor & scrubber liquor pipe above the bed */
      const ty = bd.top + 0.75;
      add(cylX(0.08, 0.08, 7.2, 14), 'slurry', part('slurry', root), [-L / 2 + 2.6, ty, 0.35]);
      add(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 14), 'slurry', part('slurry', root), [-L / 2 - 1.0, ty + 1.6, 0.35]);
      add(cylX(0.08, 0.08, 1.0, 14), 'slurry', part('slurry', root), [-L / 2 - 0.5, ty, 0.35]);
      for (let i = 0; i < 10; i++) { const n = add(new THREE.ConeGeometry(0.07, 0.16, 10), 'slurry', part('slurry', root), [-L / 2 + 0.7 + i * 0.68, ty - 0.12, 0.35]); n.rotation.x = Math.PI; }
      add(cylX(0.06, 0.06, 5.5, 12), 'scrub', part('scrub', root), [-L / 2 + 1.75, ty + 0.35, -0.25]);
      add(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 12), 'scrub', part('scrub', root), [-L / 2 - 0.85, ty + 1.8, -0.25]);
      add(cylX(0.06, 0.06, 0.95, 12), 'scrub', part('scrub', root), [-L / 2 - 0.4, ty + 0.35, -0.25]);
      /* scraper: shaft on the rising side, blades toward the lining */
      const ca = 2.25, cr = R - 0.55, cy = -cr * Math.cos(ca), cz = -cr * Math.sin(ca);
      const sg = new THREE.Group(); sg.position.set(0, cy, cz); part('scraper', root).add(sg); v.spinners.push([sg, -0.7]);
      add(cylX(0.11, 0.11, L + 1.6, 16), 'scraper', sg);
      for (let i = 0; i < 18; i++) { const a = i * 1.1, bl = add(box(0.3, 0.42, 0.06), 'scraper', sg, [-L / 2 + 0.4 + i * 0.47, 0.24 * Math.cos(a), 0.24 * Math.sin(a)]); bl.rotation.x = -a; }
      add(box(0.9, 0.7, 0.7), 'scrdrive', part('scrdrive', root), [L / 2 + 1.55, cy, cz]);
      add(cylX(0.28, 0.28, 0.8, 20), 'scrdrive', part('scrdrive', root), [L / 2 + 2.4, cy, cz]);
      /* hoods, chute, exhaust */
      add(box(0.9, 2 * R + 0.7, 2 * R + 0.7), 'feedch', part('feedch', root), [-L / 2 - 0.55, 0.05, 0]);
      const ch = add(box(0.7, 2.6, 0.9), 'feedch', part('feedch', root), [-L / 2 - 0.3, R + 1.2, -0.8]); ch.rotation.z = -0.5;
      add(new THREE.CylinderGeometry(0.55, 0.55, 3.2, 28), 'exhaust', part('exhaust', root), [-L / 2 - 0.55, R + 2.0, 0.9]);
      add(box(1.0, 2 * R + 0.9, 2 * R + 0.6), 'dischood', part('dischood', root), [L / 2 + 0.6, -0.1, 0]);
      add(box(0.9, 1.6, 1.1), 'dischood', part('dischood', root), [L / 2 + 0.6, -R - 1.15, 0]);
      for (let i = -3; i <= 3; i++) add(box(0.06, 0.06, 1.6), 'dischood', part('dischood', root), [L / 2 + 0.15, -R + 0.5, i * 0.26], 0x40474c);
      /* rolling granules on the bed surface */
      const n = 260, pos = new Float32Array(n * 3), seed = [];
      for (let i = 0; i < n; i++) seed.push([Math.random() * (L - 0.6) - L / 2 + 0.2, Math.random()]);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x6a5940, size: 0.09 })); part('bed', root).add(pts);
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const upd = (dt, on) => {
        seed.forEach((s, i) => {
          if (on) s[1] = (s[1] + dt * 0.35) % 1;
          const u = (0.5 - s[1]) * 2 * bd.half * 0.92, h = bd.top + 0.04;
          pos[i * 3] = s[0]; pos[i * 3 + 1] = h * ct - u * st; pos[i * 3 + 2] = h * st + u * ct;
        });
        pg.attributes.position.needsUpdate = true;
      };
      upd(0, false); v.anims.push((dt, on) => { if (on) upd(dt, on); });
      return root;
    },
    dryer(v) {
      const k = kit(v), { part, add } = k, root = new THREE.Group(); root.rotation.z = -0.03;
      const R = 1.8, L = 20;
      const m = mech(v, k, root, { R, L, tyres: [-5.6, 5.6], gearX: 2.2, thrustAt: 1, floor: 1.2, driveAs: 'drive', seal: true, teeth: 100 });
      /* spiral feed flights */
      const sp = part('spiral', m.rot);
      for (let i = 0; i < 70; i++) { const a = i * 0.27, x = -L / 2 + 0.25 + i * 0.034; const f = add(box(0.06, 0.45, 0.42), 'spiral', sp, [x, (R - 0.24) * Math.cos(a), (R - 0.24) * Math.sin(a)]); f.rotation.x = -a; f.rotation.y = 0.5; }
      /* lifting flights, staggered sections */
      const fl = part('flights', m.rot), secs = [[-7.2, -2.6], [-2.3, 2.3], [2.6, 7.2], [7.5, 9.6]];
      secs.forEach(([x0, x1], si) => { for (let i = 0; i < 18; i++) {
        const a = (i + (si % 2) * 0.5) / 18 * Math.PI * 2, len = x1 - x0, cx = (x0 + x1) / 2;
        const g = new THREE.Group(); g.position.set(cx, 0, 0); g.rotation.x = -a; fl.add(g);
        add(box(len, 0.34, 0.04), 'flights', g, [0, R - 0.18, 0]);
        add(box(len, 0.04, 0.16), 'flights', g, [0, R - 0.35, 0.07]);
      } });
      /* knocker plates on the shell, hammers parked above */
      [-3.6, 0, 4.2, 8.2].forEach(x => { for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4, pl = add(box(0.6, 0.06, 0.4), 'knocker', part('knocker', m.rot), [x, (R + 0.03) * Math.cos(a), (R + 0.03) * Math.sin(a)]); pl.rotation.x = -a; }
        add(box(0.36, 0.36, 0.36), 'knocker', part('knocker', root), [x, R + 0.45, -0.7], 0x8a5a1a); add(box(0.1, 0.9, 0.1), 'knocker', part('knocker', root), [x, R + 1.0, -0.7], 0x40474c); });
      /* thin bed + falling curtain */
      const bd = bedGeo(R - 0.06, 0.07, -L / 2 + 2.6, L / 2 - 0.3, 0.45); const b = add(bd.g, 'curtain', part('curtain', root)); b.material.roughness = 1; b.material.metalness = 0;
      const n = 700, pos = new Float32Array(n * 3), seeds = [];
      for (let i = 0; i < n; i++) seeds.push([-L / 2 + 2.8 + Math.random() * (L - 3.4), (Math.random() * 1.5 - 0.75) * R, Math.random()]);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      part('curtain', root).add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x8a7350, size: 0.07 })));
      const upd = (dt, on) => { seeds.forEach((s, i) => { if (on) s[2] = (s[2] + dt * (0.55 + (i % 7) * 0.05)) % 1; const top = Math.sqrt(Math.max(R * R * 0.8 - s[1] * s[1], 0)); pos[i * 3] = s[0]; pos[i * 3 + 1] = top - s[2] * (top + R * 0.75); pos[i * 3 + 2] = s[1]; }); pg.attributes.position.needsUpdate = true; };
      upd(0, false); v.anims.push((dt, on) => { if (on) upd(dt, on); });
      /* combustion chamber + burner + dilution fan */
      const cx0 = -L / 2 - 1.0;
      add(new THREE.CylinderGeometry(1.2, R + 0.15, 1.4, 40).rotateZ(Math.PI / 2), 'comb', part('comb', root), [cx0 - 0.25, 0, 0]);
      add(cylX(1.55, 1.55, 4.6, 40), 'comb', part('comb', root), [cx0 - 3.2, 0, 0]);
      add(box(4.4, 0.4, 2.2), 'comb', part('comb', root), [cx0 - 3.2, -1.65, 0], 0x5b6166);
      add(cylX(0.5, 0.5, 1.2, 24), 'burner', part('burner', root), [cx0 - 6.1, 0, 0]);
      add(new THREE.ConeGeometry(0.75, 0.9, 28).rotateZ(Math.PI / 2), 'burner', part('burner', root), [cx0 - 5.25, 0, 0]);
      add(box(0.6, 0.5, 0.5), 'burner', part('burner', root), [cx0 - 6.6, 0.55, 0], 0x40474c);
      const fz = 2.6;
      add(new THREE.CylinderGeometry(0.85, 0.85, 0.6, 32).rotateX(Math.PI / 2), 'dil', part('dil', root), [cx0 - 3.6, -0.7, fz]);
      add(cylX(0.32, 0.32, 0.9, 20), 'dil', part('dil', root), [cx0 - 3.6, -0.7, fz + 0.7], 0x2f6f8f);
      add(box(0.5, 0.5, fz - 1.5), 'dil', part('dil', root), [cx0 - 3.0, -0.2, (fz + 1.5) / 2]);
      /* inlet chute */
      const ic = add(box(0.7, 3.6, 0.8), 'inchute', part('inchute', root), [-L / 2 + 0.2, R + 0.9, -0.5]); ic.rotation.z = -0.62;
      /* discharge breeching, cyclone, ID fan */
      const bx = L / 2 + 1.1;
      add(box(1.8, 2 * R + 2.6, 2 * R + 0.9), 'breech', part('breech', root), [bx, 0.5, 0]);
      add(box(1.0, 1.4, 1.2), 'breech', part('breech', root), [bx, -R - 1.4, 0]);
      add(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 28), 'cyclone', part('cyclone', root), [bx, R + 2.8, 0], 0xa9b3b8);
      add(cylX(0.6, 0.6, 3.0, 28), 'cyclone', part('cyclone', root), [bx + 1.5, R + 3.9, 0], 0xa9b3b8);
      add(new THREE.CylinderGeometry(1.0, 1.0, 2.2, 32), 'cyclone', part('cyclone', root), [bx + 3.6, R + 3.6, 0]);
      add(new THREE.ConeGeometry(1.0, 1.9, 32).rotateX(Math.PI), 'cyclone', part('cyclone', root), [bx + 3.6, R + 1.55, 0]);
      add(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 12), 'cyclone', part('cyclone', root), [bx + 3.6, R - 0.6, 0]);
      add(cylX(0.5, 0.5, 2.4, 24), 'idfan', part('idfan', root), [bx + 5.4, R + 4.3, 0], 0xa9b3b8);
      add(new THREE.CylinderGeometry(1.3, 1.3, 0.9, 36).rotateX(Math.PI / 2), 'idfan', part('idfan', root), [bx + 7.4, R + 3.4, 0]);
      add(cylX(0.45, 0.45, 1.2, 24), 'idfan', part('idfan', root), [bx + 7.4, R + 3.4, 1.2], 0x2f6f8f);
      add(new THREE.CylinderGeometry(0.55, 0.55, 3.0, 24), 'idfan', part('idfan', root), [bx + 7.4, R + 5.6, -0.2], 0xa9b3b8);
      return root;
    },
    coat(v) {
      const k = kit(v), { part, add } = k, root = new THREE.Group(); root.rotation.z = -0.025;
      const R = 1.35, L = 6.4;
      const m = mech(v, k, root, { R, L, tyres: [-1.9, 1.9], gearX: 0.1, thrustAt: 1, floor: 1.0, driveAs: 'drive', rr: 0.42, tw: 0.4, teeth: 80 });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, g = new THREE.Group(); g.rotation.x = -a; part('bars', m.rot).add(g); add(box(L - 0.4, 0.16, 0.05), 'bars', g, [0, R - 0.1, 0]); }
      const bd = bedGeo(R - 0.04, 0.12, -L / 2 + 0.2, L / 2 - 0.2, 0.5); const b = add(bd.g, 'bed', part('bed', root)); b.material.roughness = 1; b.material.metalness = 0;
      const sy = 0.25, sz = -0.15;
      add(cylX(0.06, 0.06, 6.0, 12), 'spray', part('spray', root), [-L / 2 + 1.6, sy, sz]);
      for (let i = 0; i < 7; i++) { const n = add(new THREE.ConeGeometry(0.08, 0.2, 12), 'spray', part('spray', root), [-L / 2 + 0.7 + i * 0.62, sy - 0.14, sz + 0.05]); n.rotation.x = Math.PI - 0.5; add(new THREE.ConeGeometry(0.22, 0.6, 16, 1, true), 'spray', part('spray', root), [-L / 2 + 0.7 + i * 0.62, sy - 0.5, sz + 0.2], 0xe6c45a, 0.35).rotation.x = Math.PI - 0.5; }
      add(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 32), 'tank', part('tank', root), [-L / 2 - 2.6, -0.4, -2.4]);
      add(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12), 'tank', part('tank', root), [-L / 2 - 2.6, 0.85, -2.4], 0x40474c);
      add(box(0.35, 0.35, 0.5), 'tank', part('tank', root), [-L / 2 - 2.6, -1.0, -1.55], 0xc2552f);
      add(box(0.7, 0.45, 0.5), 'pump', part('pump', root), [-L / 2 - 1.5, -1.1, -1.4]);
      add(cylX(0.18, 0.18, 0.5, 16), 'pump', part('pump', root), [-L / 2 - 2.0, -1.1, -1.4], 0x2f6f8f);
      add(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 10), 'pump', part('pump', root), [-L / 2 - 1.3, -0.4, -1.4], 0xd7dde1);
      add(box(0.05, 0.05, 1.25), 'pump', part('pump', root), [-L / 2 - 1.3, 0.28, -0.78], 0xd7dde1);
      add(box(0.3, 0.22, 0.22), 'pump', part('pump', root), [-L / 2 - 1.3, 0.28, -0.6], 0x3f7fb0);
      add(new THREE.ConeGeometry(0.8, 1.2, 4, 1).rotateX(Math.PI), 'powder', part('powder', root), [-L / 2 - 1.6, R + 2.0, 0.9]);
      add(box(1.15, 0.6, 1.15), 'powder', part('powder', root), [-L / 2 - 1.6, R + 2.9, 0.9]);
      const sc = add(cylX(0.15, 0.15, 2.0, 16), 'powder', part('powder', root), [-L / 2 - 0.75, R + 0.95, 0.6]); sc.rotation.z = -0.55;
      add(box(0.8, 2 * R + 0.6, 2 * R + 0.6), 'feedch', part('feedch', root), [-L / 2 - 0.45, 0, 0]);
      const fc = add(box(0.6, 1.8, 0.7), 'feedch', part('feedch', root), [-L / 2 - 0.2, R + 0.9, -0.5]); fc.rotation.z = -0.45;
      add(box(1.0, 0.9, 2 * R + 0.4), 'dusthood', part('dusthood', root), [L / 2 + 0.5, R + 0.1, 0]);
      add(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 24), 'dusthood', part('dusthood', root), [L / 2 + 0.5, R + 1.6, 0]);
      add(box(0.9, 2 * R - 0.2, 2 * R + 0.4), 'disch', part('disch', root), [L / 2 + 0.5, -0.4, 0], null, 0.6);
      add(box(0.7, 1.3, 0.8), 'disch', part('disch', root), [L / 2 + 0.5, -R - 1.0, 0]);
      return root;
    }
  };
  return { wake, select: (el, id) => { const v = views.find(x => x.el === el); if (v) select(v, id); } };
})();
