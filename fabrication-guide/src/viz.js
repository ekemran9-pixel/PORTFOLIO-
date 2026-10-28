/* ---------- 14 calculator diagrams ----------
   Each function redraws one calculator's SVG from the computed values, so the picture always
   matches the numbers. Drawings are schematic (not to scale) unless noted; labels carry the real mm. */
const VZ = (() => {
  const r1 = v => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fx = (v, d = 1) => isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
  const T = (x, y, s, cls = 'tx', a = 'middle') => `<text x="${r1(x)}" y="${r1(y)}" class="${cls}" text-anchor="${a}">${s}</text>`;
  // dimension line with drawing-style slash ticks at both ends
  const dim = (x1, y1, x2, y2, cls = 'dm') => {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, tx = 3.5 * (ux - uy), ty = 3.5 * (uy + ux);
    const tk = (x, y) => `M${r1(x - tx)} ${r1(y - ty)}L${r1(x + tx)} ${r1(y + ty)}`;
    return `<path class="${cls}" d="M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}${tk(x1, y1)}${tk(x2, y2)}"/>`;
  };
  // pipe drawn as a thick outlined stroke along a centreline path
  const pipe = (d, w = 18, tone = '', extra = '') => `<path class="pp-o" d="${d}" stroke-width="${w + 3}"${extra}/><path class="pp-i ${tone}" d="${d}" stroke-width="${w}"${extra}/>`;
  const wp = (x, y) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="3" class="wpt"/>`;
  const weld = (x, y, h = 22) => `<rect x="${r1(x - 2)}" y="${r1(y - h / 2)}" width="4" height="${h}" rx="1" class="wd"/>`;
  // animate a value change (needle, pointer) from the previous drawing's value
  const prev = (svg, key, v) => { const p = svg.dataset[key]; svg.dataset[key] = v; return p == null ? v : +p; };
  const set = (svg, html) => { svg.innerHTML = html; };

  /* pipe weight: cross-section with water + side view */
  function cw(svg, o) {
    const cx = 92, cy = 118, R = 72, ri = Math.min(R - 3, R * o.id / o.od), id = 'cwc' + Math.random().toString(36).slice(2, 6);
    set(svg, `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r1(ri)}"/></clipPath></defs>
      <circle cx="${cx}" cy="${cy}" r="${R}" class="fl"/><circle cx="${cx}" cy="${cy}" r="${r1(ri)}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>
      <g clip-path="url(#${id})"><rect class="water" x="${cx - R}" y="${cy - R}" width="${2 * R}" height="${2 * R}"/>
        <path class="wave" d="M${cx - R * 2} ${cy - ri + 6} q 12 -6 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0"/></g>
      ${dim(cx - R, 26, cx + R, 26)}${T(cx, 20, 'OD ' + fx(o.od), 'txa')}
      ${dim(cx - ri, cy, cx + ri, cy)}${T(cx, cy - 6, 'ID ' + fx(o.id))}
      <path class="dm" d="M${cx + R * .7} ${cy - R * .7}L${cx + R + 6} ${cy - R - 4}h18"/>${T(cx + R + 26, cy - R - 7, 'WT ' + fx(o.wt, 2), 'tx', 'start')}
      <g class="pop" style="--i:2">
        <path class="fl" d="M196 96h132a10 22 0 0 1 0 44h-132z"/><ellipse cx="196" cy="118" rx="10" ry="22" class="f"/>
        <path class="water" d="M196 108h132a10 22 0 0 1 4 10a10 22 0 0 1-4 22h-132z" opacity=".8"/>
      </g>
      ${dim(196, 160, 328, 160)}${T(262, 176, 'L = ' + fx(o.L, 1) + ' মি')}
      ${T(262, 62, 'মোট ওজন', 'tx')}${T(262, 86, fx(o.total, 1) + ' kg', 'big')}
      ${T(262, 204, 'পানি ≈ ' + fx(o.water, 0) + ' লিটার', 'txs')}`);
  }

  /* cut length: WP-to-WP with fittings at both ends */
  function fit(type, x, y, dir, w) {
    const face = x + dir * w, sw = dir > 0 ? 1 : 0;
    if (type === '90lr' || type === '90sr') return pipe(`M${r1(face)} ${y}A${r1(w)} ${r1(w)} 0 0 ${sw} ${r1(x)} ${r1(y - w)}V${r1(y - w - 14)}`, 18, 'b');
    if (type === '45lr') {
      const R = w / Math.tan(Math.PI / 8), ex = face - dir * R * Math.SQRT1_2, ey = y - R + R * Math.SQRT1_2;
      return pipe(`M${r1(face)} ${y}A${r1(R)} ${r1(R)} 0 0 ${sw} ${r1(ex)} ${r1(ey)}l${r1(-dir * 16)} -16`, 18, 'b');
    }
    if (type === 'tee') return pipe(`M${r1(face)} ${y}H${r1(x - dir * w)}`, 18, 'b') + pipe(`M${r1(x)} ${y}V${r1(y - w)}`, 18, 'b');
    if (type === 'wn150' || type === 'wn300') return `<path class="fs" d="M${r1(face)} ${y - 10}L${r1(x + dir * 9)} ${y - 15}V${y + 15}L${r1(face)} ${y + 10}z"/><rect class="fl" x="${r1(dir > 0 ? x : x - 9)}" y="${y - 32}" width="9" height="64"/>`;
    if (type === 'red') return `<path class="fs" d="M${r1(face)} ${y - 10}L${r1(x)} ${y - 16}V${y + 16}L${r1(face)} ${y + 10}z"/>`;
    if (type === 'cap') return `<path class="fs" d="M${r1(face)} ${y - 10}C${r1(x)} ${y - 10} ${r1(x)} ${y + 10} ${r1(face)} ${y + 10}z"/>`;
    return '';
  }
  function cut(svg, o) {
    const y = 132, A = 28, B = 332, k = o.D > 0 ? (B - A) / o.D : 0;
    const wa = o.ta ? clamp(o.ta * k, 22, 84) : 0, wb = o.tb ? clamp(o.tb * k, 22, 84) : 0;
    const ga = o.a === 'none' ? 0 : 4, gb = o.b === 'none' ? 0 : 4, p1 = A + wa + ga, p2 = B - wb - gb;
    set(svg, `${dim(A, 22, B, 22)}${T((A + B) / 2, 16, 'ড্রয়িং মাপ (WP–WP) ' + fx(o.D, 0), 'txa')}
      <path class="d" d="M${A} 26V${y}M${B} 26V${y}"/>
      ${fit(o.a, A, y, 1, wa)}${fit(o.b, B, y, -1, wb)}
      ${p2 > p1 ? `<g class="pop" style="--i:2">${pipe(`M${r1(p1)} ${y}H${r1(p2)}`, 18, 'y')}${T((p1 + p2) / 2, y + 4, 'কাট ' + fx(o.cut, 0), 'txk')}</g>` : ''}
      ${ga ? weld(A + wa + 2, y) : ''}${gb ? weld(B - wb - 2, y) : ''}${wp(A, y)}${wp(B, y)}
      ${T(A, y + 44, 'WP', 'txs')}${T(B, y + 44, 'WP', 'txs')}
      ${wa ? dim(A, 192, A + wa, 192) + T(A + wa / 2, 208, fx(o.ta, 0)) : ''}${wb ? dim(B - wb, 192, B, 192) + T(B - wb / 2, 208, fx(o.tb, 0)) : ''}
      ${p2 > p1 ? dim(p1, 192, p2, 192, 'dm y') : ''}`);
  }

  /* offset: true angle, scaled to fit */
  function off(svg, o) {
    const a = o.ang * Math.PI / 180, k = Math.min(120 / Math.max(o.set, 1), 210 / Math.max(o.run, 1));
    const sp = o.set * k, rp = o.run * k, x0 = clamp(140 - rp / 2, 60, 140), y0 = 186, x1 = x0 + rp, y1 = y0 - sp;
    const path = `M14 ${y0}H${r1(x0)}L${r1(x1)} ${r1(y1)}H346`;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -Math.sin(a), ny = -Math.cos(a);
    set(svg, `<path class="d" d="M${r1(x0)} ${y0}H${r1(x1)}V${r1(y1)}"/>
      ${pipe(path, 14, 'b')}<path class="flowd" d="${path}"/>
      <path class="pp-o" d="M${r1(x0)} ${y0}L${r1(x1)} ${r1(y1)}" stroke-width="17"/><path class="pp-i y" d="M${r1(x0)} ${y0}L${r1(x1)} ${r1(y1)}" stroke-width="14"/><path class="flowd" d="M${r1(x0)} ${y0}L${r1(x1)} ${r1(y1)}"/>
      <path class="dm" d="M${r1(x0 + 30)} ${y0}A30 30 0 0 0 ${r1(x0 + 30 * Math.cos(a))} ${r1(y0 - 30 * Math.sin(a))}"/>${T(x0 + 44 * Math.cos(a / 2), y0 - 44 * Math.sin(a / 2) + 4, fx(o.ang, o.ang % 1 ? 2 : 0) + '°', 'txa', 'start')}
      ${dim(x1 + 22, y0, x1 + 22, y1)}${T(x1 + 28, (y0 + y1) / 2 + 4, 'সেট ' + fx(o.set, 0), 'tx', 'start')}
      ${dim(x0, y0 + 20, x1, y0 + 20)}${T(mx, y0 + 34, 'রান ' + fx(o.run, 0))}
      ${T(mx + nx * 22, my + ny * 22, 'ট্রাভেল ' + fx(o.travel, 0), 'txa', 'end')}
      ${o.roll ? `<g class="pop" style="--i:3"><rect x="12" y="10" width="104" height="74" rx="6" class="inset"/><path class="s2" d="M28 72V30M28 72H82M28 30L82 72"/>${T(22, 54, 'রাইজ', 'txs', 'end')}${T(55, 82, 'রোল', 'txs')}${T(62, 46, 'সেট', 'txa', 'start')}${T(64, 22, 'রোলিং অফসেট', 'txs')}</g>` : ''}`);
  }

  /* mitre bend: real geometry of the segments */
  function mit(svg, o) {
    if (!(o.A > 0 && o.A <= 180 && o.W >= 1 && o.R > o.D / 2 && o.D > 0)) { set(svg, T(180, 110, 'রেডিয়াস OD/২ এর বেশি ও কোণ ০–১৮০° হতে হবে', 'txa')); return; }
    const c = o.c * Math.PI / 180, A = o.A * Math.PI / 180, Ri = o.R - o.D / 2, Ro = o.R + o.D / 2, E = Math.max(o.D, o.R * .35);
    const P = (r, f) => [r * Math.cos(f), r * Math.sin(f)], cc = Math.cos(c);
    const pieces = [[[Ri, -E], [Ro, -E], P(Ro / cc, c), P(Ri / cc, c)]];
    for (let j = 1; j < o.W; j++) { const a0 = (2 * j - 1) * c, a1 = (2 * j + 1) * c; pieces.push([P(Ri / cc, a0), P(Ro / cc, a0), P(Ro / cc, a1), P(Ri / cc, a1)]); }
    const tA = [-Math.sin(A) * E, Math.cos(A) * E], q1 = P(Ro, A), q2 = P(Ri, A);
    pieces.push([P(Ri / cc, A - c), P(Ro / cc, A - c), [q1[0] + tA[0], q1[1] + tA[1]], [q2[0] + tA[0], q2[1] + tA[1]]]);
    const all = pieces.flat().concat([[0, 0]]), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const s = Math.min(320 / (maxx - minx || 1), 180 / (maxy - miny || 1)), ox = 180 - (minx + maxx) / 2 * s, oy = 112 + (miny + maxy) / 2 * s;
    const M = p => [ox + p[0] * s, oy - p[1] * s], pt = p => M(p).map(r1).join(' ');
    const arc = Array.from({ length: 41 }, (_, i) => pt(P(o.R, A * i / 40))).join('L');
    const j0 = M(P(Ro / cc, c)), O = M([0, 0]), mid = M(P(o.R, A / 2));
    set(svg, pieces.map((q, i) => `<path class="${i % 2 ? 'fm' : 'fs'} pop" style="--i:${i}" d="M${q.map(pt).join('L')}z"/>`).join('') +
      `<path class="cl" d="M${arc}"/><circle cx="${r1(O[0])}" cy="${r1(O[1])}" r="3" class="wpt"/>
      <path class="dm" d="M${r1(O[0])} ${r1(O[1])}L${r1(mid[0])} ${r1(mid[1])}"/>${T((O[0] + mid[0]) / 2 + 6, (O[1] + mid[1]) / 2 - 4, 'R ' + fx(o.R, 0), 'txs', 'start')}
      <circle cx="${r1(j0[0])}" cy="${r1(j0[1])}" r="12" class="hl"/>${T(j0[0] + 16, j0[1] + 4, fx(o.c, 2) + '°', 'txa', 'start')}
      ${T(14, 210, bn(o.W + 1) + ' টুকরো · ' + bn(o.W) + ' জয়েন্ট (আসল জ্যামিতি)', 'txs', 'start')}`);
  }

  /* fishmouth: end view of branch sitting on the header */
  function fish(svg, o) {
    const cx = 180, cy = 150, Rp = 62, rp = Rp * o.r / o.R, yb = cy - Math.sqrt(Rp * Rp - rp * rp), top = cy - Rp;
    set(svg, `<circle cx="${cx}" cy="${cy}" r="${Rp}" class="fl"/><circle cx="${cx}" cy="${cy}" r="${Rp - 6}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1"/>
      <g class="pop" style="--i:1"><path class="fs" d="M${r1(cx - rp)} 8V${r1(yb)}A${Rp} ${Rp} 0 0 1 ${r1(cx + rp)} ${r1(yb)}V8z"/></g>
      <path class="cut draw" pathLength="1" d="M${r1(cx - rp)} ${r1(yb)}A${Rp} ${Rp} 0 0 1 ${r1(cx + rp)} ${r1(yb)}"/>
      <path class="d" d="M${r1(cx - rp - 34)} ${r1(top)}H${r1(cx + rp + 40)}M${r1(cx - rp - 34)} ${r1(yb)}H${r1(cx - rp)}"/>
      ${dim(cx - rp - 26, yb, cx - rp - 26, top)}${T(cx - rp - 32, (yb + top) / 2 + 4, 'গভীরতা ' + fx(o.dmax, 1), 'txa', 'end')}
      ${dim(cx - rp, 18, cx + rp, 18)}${T(cx, 34, 'ব্রাঞ্চ ' + fx(2 * o.r, 1))}
      ${T(cx, cy + 5, 'হেডার ' + fx(2 * o.R, 1))}${T(cx + rp + 8, 70, 'লাল রেখা = কাটের লাইন', 'txs', 'start')}`);
  }

  /* hydrotest: line height + animated gauge */
  const ranges = [1, 1.6, 2.5, 4, 6, 10, 16, 25, 40, 60, 100, 160, 250, 400, 600, 1000];
  function hyd(svg, o) {
    const max = ranges.find(r => r >= o.gauge * 1.5) || 1000, cx = 252, cy = 112, R = 80, a0 = -225, sweep = 270;
    const ang = v => a0 + sweep * clamp(v / max, 0, 1.04), to = ang(o.gauge), from = prev(svg, 'ang', to);
    const P = (a, r) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    let ticks = '';
    for (let i = 0; i <= 10; i++) { const a = a0 + sweep * i / 10, p = P(a, R - 6), q = P(a, R - 16), l = P(a, R - 28); ticks += `<path class="s2" d="M${p.map(r1).join(' ')}L${q.map(r1).join(' ')}"/>${i % 2 ? '' : T(l[0], l[1] + 4, +(max * i / 10).toPrecision(3), 'txs')}`; }
    const z0 = P(ang(o.Pt), R - 6), z1 = P(ang(o.Pt * 1.1), R - 6);
    const h = clamp(o.H * 12, 20, 140);
    set(svg, `<path class="d" d="M30 30H120"/>${pipe(`M24 ${170 - h}H120M60 ${170 - h}V172`, 12, 'b')}
      <path class="vent" d="M100 ${158 - h}v-12"/>${T(100, 142 - h, 'ভেন্ট', 'txs')}
      <circle cx="60" cy="184" r="10" class="f"/><path class="s" d="M60 184l5-5"/>
      ${dim(36, 170 - h, 36, 184)}${T(30, 177 - h / 2, fx(o.H, 1) + ' মি', 'txs', 'end')}
      ${T(84, 196, 'গেজ', 'txs', 'start')}
      <circle cx="${cx}" cy="${cy}" r="${R}" class="f"/><circle cx="${cx}" cy="${cy}" r="${R - 4}" fill="none" stroke="var(--line-2)"/>
      <path class="zone" d="M${z0.map(r1).join(' ')}A${R - 6} ${R - 6} 0 0 1 ${z1.map(r1).join(' ')}"/>${ticks}
      <g class="needle" style="transform-origin:${cx}px ${cy}px;--from:${r1(from + 90)}deg;--to:${r1(to + 90)}deg"><path d="M${cx - 4} ${cy}L${cx} ${cy - R + 12}L${cx + 4} ${cy}z" fill="var(--crit)"/></g>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--ink)"/>
      ${T(cx, cy + 36, fx(o.gauge, 2), 'big')}${T(cx, cy + 52, 'bar · গেজে পড়বেন', 'txs')}
      ${T(cx, 212, 'হলুদ দাগ = টেস্ট চাপ ' + fx(o.Pt, 2) + ' (উপরে)', 'txs')}`);
  }

  /* bolt torque: star pattern + three passes */
  function tq(svg, o) {
    const cx = 100, cy = 110, seq = [0, 4, 2, 6, 1, 5, 3, 7], order = seq.map((p, i) => [p, i]);
    const P = i => [cx + 66 * Math.sin(i * Math.PI / 4), cy - 66 * Math.cos(i * Math.PI / 4)];
    const star = seq.map(i => P(i).map(r1).join(' ')).join('L');
    const bars = [[.3, '৩০%'], [.6, '৬০%'], [1, '১০০%']];
    set(svg, `<circle cx="${cx}" cy="${cy}" r="92" class="fl"/><circle cx="${cx}" cy="${cy}" r="40" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>
      <path class="star" d="M${star}z"/>
      ${order.map(([p, n]) => { const q = P(p); return `<g class="bolt" style="--d:${n * .55}s"><circle cx="${r1(q[0])}" cy="${r1(q[1])}" r="11"/><text x="${r1(q[0])}" y="${r1(q[1] + 4)}" text-anchor="middle">${bn(n + 1)}</text></g>`; }).join('')}
      ${T(cx, 218, 'ক্রস (স্টার) প্যাটার্নে টাইট', 'txs')}
      ${bars.map(([fr, l], i) => `<g class="pop" style="--i:${i + 1}">${T(214, 52 + i * 52, 'পাস ' + bn(i + 1) + ' · ' + l, 'txs', 'start')}<rect x="214" y="${58 + i * 52}" width="${r1(96 * fr)}" height="16" rx="3" class="${i === 2 ? 'fm' : 'fs'} grow"/>${T(214 + 96 * fr + 4, 71 + i * 52, fx(o.T * fr, 0), 'tx', 'start')}</g>`).join('')}
      ${T(214, 210, 'N·m · শেষে ঘড়ির কাঁটার দিকে এক চক্কর', 'txs', 'start')}`);
  }

  /* electrode: groove cross-section with passes building up */
  function el(svg, o) {
    const tn = Math.tan(37.5 * Math.PI / 180), wTop = o.g + 2 * (o.t - o.land) * tn;
    const k = Math.min(120 / o.t, 220 / (wTop + 3)), cx = 180, yb = 170, h = o.t * k, g2 = o.g / 2 * k, ln = o.land * k, wt = wTop / 2 * k;
    const id = 'elc' + Math.random().toString(36).slice(2, 6), n = clamp(Math.round(o.t / 3), 2, 7), capH = 1.5 * k;
    const groove = `M${r1(cx - g2)} ${yb + 3}H${r1(cx + g2)}V${r1(yb - ln)}L${r1(cx + wt)} ${r1(yb - h)}Q${cx} ${r1(yb - h - capH * 2.2)} ${r1(cx - wt)} ${r1(yb - h)}L${r1(cx - g2)} ${r1(yb - ln)}z`;
    const layers = Array.from({ length: n }, (_, i) => { const y0 = yb + 4 - (h + 4) * i / n, y1 = i === n - 1 ? yb - h - capH * 2 : yb + 4 - (h + 4) * (i + 1) / n; return `<rect class="layer l${i % 2}" style="--d:${i * .45}s" x="${cx - wt - 10}" y="${r1(y1)}" width="${r1(2 * wt + 20)}" height="${r1(y0 - y1 + .5)}"/>`; }).join('');
    const plate = s => `<path class="fl" d="M${cx + s * 168} ${yb}H${r1(cx + s * g2)}V${r1(yb - ln)}L${r1(cx + s * wt)} ${r1(yb - h)}H${cx + s * 168}z"/>`;
    set(svg, `<defs><clipPath id="${id}"><path d="${groove}"/></clipPath></defs>${plate(-1)}${plate(1)}
      <g clip-path="url(#${id})">${layers}</g><path d="${groove}" fill="none" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 2"/>
      ${dim(cx + 150, yb, cx + 150, yb - h)}${T(cx + 144, yb - h / 2 + 4, 't ' + fx(o.t, 2), 'tx', 'end')}
      ${dim(cx - g2, yb + 18, cx + g2, yb + 18)}${T(cx, yb + 34, 'গ্যাপ ' + fx(o.g, 0) + ' · ল্যান্ড ' + fx(o.land, 1))}
      ${T(cx + wt + 6, yb - h - 8, '৩৭.৫°', 'txa', 'start')}${T(cx - wt - 4, yb - h - 8, 'ক্যাপ', 'txs', 'end')}${T(12, yb + 34, 'রুট → ফিল → ক্যাপ', 'txs', 'start')}
      ${T(cx, 20, bn(n) + ' লেয়ারে ভরাট (আনুমানিক)', 'txs')}`);
  }

  /* inch-dia: bars per size + welders needed */
  function idv(svg, o) {
    const rows = o.rows.filter(r => r[1] > 0), max = Math.max(1, ...rows.map(r => r[2])), H = 36 + rows.length * 24 + 56;
    svg.setAttribute('viewBox', `0 0 360 ${Math.max(140, H)}`);
    const men = Math.min(o.welders, 30);
    set(svg, T(12, 20, 'সাইজ অনুযায়ী ইঞ্চ-ডায়া', 'txs', 'start') + rows.map((r, i) => `<g class="pop" style="--i:${i}">${T(46, 42 + i * 24, r[0] + '"', 'tx', 'end')}<rect class="fs grow" x="52" y="${30 + i * 24}" width="${r1(Math.max(2, 230 * r[2] / max))}" height="16" rx="3"/>${T(56 + Math.max(2, 230 * r[2] / max), 42 + i * 24, fx(r[2], 0), 'tx', 'start')}</g>`).join('') +
      (rows.length ? '' : T(180, 60, 'জয়েন্ট সংখ্যা লিখুন', 'txa')) +
      `<g transform="translate(12 ${Math.max(140, H) - 34})">${Array.from({ length: men }, (_, i) => `<g class="pop man" style="--i:${i}" transform="translate(${i * 11} 0)"><circle cx="4" cy="4" r="3.6"/><path d="M0 18v-6a4 4 0 0 1 8 0v6z"/></g>`).join('')}
      ${T(men * 11 + 6, 15, (o.welders > 30 ? '+' + (o.welders - 30) + ' · ' : '') + bn(o.welders) + ' জন ওয়েল্ডার', 'txa', 'start')}</g>`);
  }

  /* carbon equivalent: scale + contribution of each element */
  function ce(svg, o) {
    const X = v => 24 + 312 * clamp(v / .7, 0, 1), from = prev(svg, 'x', X(o.ce)), to = X(o.ce);
    const zones = [[0, .35, 'g', 'সহজ'], [.35, .45, 'y', 'মাঝারি'], [.45, .6, 'o', 'কঠিন'], [.6, .7, 'r', 'খুব কঠিন']];
    let x = 24;
    const parts = o.parts.map(([l, v], i) => { const w = 312 * v / .7, s = `<rect class="pc pc${i} grow" x="${r1(x)}" y="150" width="${r1(Math.max(0, w))}" height="20"/>${w > 26 ? T(x + w / 2, 164, l, i ? 'tx' : 'txk') : ''}`; x += w; return s; }).join('');
    set(svg, zones.map(([a, b, c, l]) => `<rect class="z${c}" x="${r1(X(a))}" y="64" width="${r1(X(b) - X(a))}" height="26"/>${T((X(a) + X(b)) / 2, 106, l, 'txs')}`).join('') +
      [0, .35, .45, .6, .7].map(v => T(X(v), 58, v.toFixed(2), 'txs')).join('') +
      `<g class="ptr" style="--from:${r1(from - to)}px"><path d="M${r1(to)} 92l-7 -12h14z" fill="var(--ink)"/><path d="M${r1(to)} 92V62" stroke="var(--ink)" stroke-width="2"/>${T(to, 30, 'CE ' + fx(o.ce, 3), 'big')}</g>
      ${T(24, 140, 'কোন উপাদান কতটা যোগ করছে', 'txs', 'start')}${parts}
      ${o.parts.map(([l, v], i) => `<rect class="pc pc${i}" x="${24 + (i % 2) * 168}" y="${182 + (i >> 1) * 18}" width="10" height="10"/>${T(38 + (i % 2) * 168, 191 + (i >> 1) * 18, l + ' = ' + fx(v, 3), 'txs', 'start')}`).join('')}`);
  }

  /* heat input: torch travelling along the joint */
  function hi(svg, o) {
    const dur = clamp(o.T / 10, 2.5, 9).toFixed(2) + 's';
    set(svg, `<rect x="24" y="128" width="312" height="30" class="fl"/><path class="s2" d="M24 128H336"/>
      <rect class="bead" x="30" y="121" width="300" height="10" rx="5" style="--t:${dur}"/>
      <g class="torch" style="--t:${dur}"><path class="fs" d="M24 46l12 0 4 58h-20z"/><path d="M26 104h8l-4 12z" fill="var(--ink-2)"/><circle class="arc" cx="30" cy="120" r="7"/></g>
      ${dim(30, 176, 330, 176)}${T(180, 192, 'দৈর্ঘ্য ' + fx(o.L, 0) + ' মিমি · সময় ' + fx(o.T, 0) + ' সে', 'tx')}
      ${T(336, 36, fx(o.V, 1) + ' V × ' + fx(o.A, 0) + ' A', 'tx', 'end')}${T(336, 60, 'স্পিড ' + fx(o.sp, 0) + ' মিমি/মিনিট', 'tx', 'end')}
      ${T(336, 96, fx(o.hi, 2) + ' kJ/মিমি', 'big', 'end')}
      ${T(180, 214, 'ধীরে চালালে (স্পিড কম) হিট ইনপুট বাড়ে', 'txs')}`);
  }

  /* slope: exaggerated fall with elevations */
  function slope(svg, o) {
    const d = clamp(o.drop / Math.max(o.L, 1) * 300 * 25, 10, 110), y0 = 70, y1 = y0 + d, path = `M30 ${y0}L330 ${r1(y1)}`;
    set(svg, `<path class="d" d="M20 ${y0}H340"/>${pipe(path, 16, 'b')}<path class="flowd" d="${path}"/>
      ${dim(344, y0, 344, y1)}${T(340, (y0 + y1) / 2 - 8, '↓ ' + fx(o.drop, 1), 'txa', 'end')}
      ${T(30, y0 - 18, 'EL ' + fx(o.E, 0), 'tx', 'start')}${T(330, y1 + 30, 'EL ' + fx(o.E - o.drop, 0), 'tx', 'end')}
      ${dim(30, 200, 330, 200)}${T(180, 194, 'দৈর্ঘ্য ' + fx(o.L, 0) + ' মিমি', 'txs')}
      ${T(180, 30, 'ঢাল ১ : ' + bn(fx(o.x, 0)) + ' (ছবিতে বাড়িয়ে দেখানো)', 'txs')}`);
  }

  return { cw, cut, off, mit, fish, hyd, tq, el, id: idv, ce, hi, slope };
})();
