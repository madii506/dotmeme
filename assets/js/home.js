// .meme home: the floating memes, the typed pairing line, the pinned story, the builder, the payout jar, the live register.
import { $, $$, RM, esc, short, clamp, usd, sol, num, ago, solscan, api, boot, splitText, seg, burst, memeImg, PL, spots, crCard } from './core.js?v=1';

$$('.split').forEach(splitText);
boot();
const DPR = Math.min(2, devicePixelRatio || 1);
const NAMES = ['smile', 'laugh', 'shock', 'shades', 'wink', 'sad', 'mad', 'love', 'dazed', 'meh', 'puppy', 'bliss'];
const IMGS = NAMES.map((_, i) => { const im = new Image(); im.src = `/memes/${i + 1}.png`; return im; });
function stage(cv, draw, opt = {}) {
  if (!cv) return; const g = cv.getContext('2d'); let w = 0, h = 0, on = false, t0 = performance.now(), last = 0;
  const size = () => { const r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = Math.max(1, w * DPR); cv.height = Math.max(1, h * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0); };
  size(); addEventListener('resize', size); new IntersectionObserver(es => es.forEach(e => on = e.isIntersecting), { rootMargin: '100px' }).observe(cv);
  const fr = now => { requestAnimationFrame(fr); if (!on || document.hidden || now - last < (opt.ms || 16)) return; last = now; g.clearRect(0, 0, w, h); draw(g, w, h, RM ? 2 : (now - t0) / 1000); };
  requestAnimationFrame(fr);
}
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const back = u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2);

// ---------------------------------------------------------------- hero: memes drifting around the name, the pairing line typing itself
{
  const host = $('#floaters'), spots2 = [[8, 18], [16, 70], [26, 34], [74, 22], [86, 62], [92, 30], [70, 80], [32, 84], [6, 46], [58, 12]];
  spots2.forEach(([x, y], i) => { const d = document.createElement('span'); d.className = 'fl'; const s = innerWidth < 700 ? 38 + (i % 3) * 8 : 56 + (i % 4) * 14; d.style.cssText = `left:${x}%;top:${y}%;--s:${s}px;--r:${(i % 2 ? -1 : 1) * (6 + i * 2)}deg;--t:${11 + i * 1.3}s;--o:${.22 + (i % 3) * .1};background-image:url(/memes/${(i % 12) + 1}.png);animation-delay:-${i * 1.7}s`; host.append(d); });
  addEventListener('pointermove', e => { if (RM) return; const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; host.style.transform = `translate(${x * -18}px,${y * -14}px)`; }, { passive: true });
  const wm = $('#wm'); if (!RM) { wm.style.opacity = 0; wm.style.transform = 'translateY(20px) scale(.96)'; wm.style.transition = 'opacity 1s cubic-bezier(.2,.8,.2,1),transform 1.2s cubic-bezier(.2,.8,.2,1)'; requestAnimationFrame(() => setTimeout(() => { wm.style.opacity = 1; wm.style.transform = 'none'; }, 120)); }
  const hosts = ['x.com/', 'instagram.com/', 'facebook.com/'], el = $('#plHost'); let k = 0;
  const type = async () => { if (RM) return; for (; ;) { await new Promise(r => setTimeout(r, 2600)); const next = hosts[++k % hosts.length]; while (el.textContent.length) { el.textContent = el.textContent.slice(0, -1); await new Promise(r => setTimeout(r, 28)); } for (const c of next) { el.textContent += c; await new Promise(r => setTimeout(r, 45)); } } };
  type();
  const hcv = $('#heroCv'), hero = $('.hero'), pline = $('.pairline'), hg = hcv.getContext('2d'), th = []; let hw = 0, hh = 0, hOn = true, lastSpawn = 0;
  const hsize = () => { const r = hero.getBoundingClientRect(); hw = r.width; hh = r.height; hcv.width = hw * DPR; hcv.height = hh * DPR; hg.setTransform(DPR, 0, 0, DPR, 0, 0); }; hsize(); addEventListener('resize', hsize);
  new IntersectionObserver(es => es.forEach(e => hOn = e.isIntersecting)).observe(hero);
  const hframe = now => {
    requestAnimationFrame(hframe); if (!hOn || document.hidden || RM) return;
    if (now - lastSpawn > 1500 && th.length < 3) { lastSpawn = now; const list = $$('.fl', host), f = list[Math.floor(Math.random() * list.length)]; if (f) { th.push({ f, t0: now }); f.classList.add('ping'); setTimeout(() => f.classList.remove('ping'), 900); } }
    hg.clearRect(0, 0, hw, hh); const hr = hero.getBoundingClientRect(), pr = pline.getBoundingClientRect();
    for (let i = th.length - 1; i >= 0; i--) {
      const T = th[i], u = (now - T.t0) / 1000, fr = T.f.getBoundingClientRect(), sx = fr.left + fr.width / 2 - hr.left, sy = fr.top + fr.height / 2 - hr.top;
      const left = sx < pr.left + pr.width / 2, ex = (left ? pr.left : pr.right) - hr.left, ey = pr.top + pr.height / 2 - hr.top;
      const c1x = sx + (ex - sx) * .25, c1y = sy + (sy < ey ? 90 : -90), c2x = ex + (left ? -110 : 110), c2y = ey;
      const d = ease(clamp(u / 1.1)), fade = 1 - clamp((u - 1.7) / .5); if (fade <= 0) { th.splice(i, 1); continue; }
      const pt = k => { const m = 1 - k; return [m * m * m * sx + 3 * m * m * k * c1x + 3 * m * k * k * c2x + k * k * k * ex, m * m * m * sy + 3 * m * m * k * c1y + 3 * m * k * k * c2y + k * k * k * ey]; };
      hg.globalAlpha = fade; hg.strokeStyle = 'rgba(255,90,168,.6)'; hg.lineWidth = 1.4; hg.setLineDash([3, 5]); hg.beginPath();
      for (let k = 0; k <= 48; k++) { const [x, y] = pt(k / 48 * d); k ? hg.lineTo(x, y) : hg.moveTo(x, y); } hg.stroke(); hg.setLineDash([]);
      const [hx, hy] = pt(d); hg.fillStyle = '#ffc2e0'; hg.beginPath(); hg.arc(hx, hy, 3.2, 0, 6.29); hg.fill();
      if (u >= 1.1) { if (!T.hit) { T.hit = 1; pline.classList.add('hit'); setTimeout(() => pline.classList.remove('hit'), 520); } const r = (u - 1.1) * 46; hg.strokeStyle = `rgba(255,90,168,${clamp(1 - r / 30) * fade})`; hg.lineWidth = 1.6; hg.beginPath(); hg.arc(ex, ey, r, 0, 6.29); hg.stroke(); }
      hg.globalAlpha = 1;
    }
  };
  requestAnimationFrame(hframe);
  const mq = $('#marq'); mq.innerHTML += mq.innerHTML;
}

// ---------------------------------------------------------------- 01: one scene, pinned, driven by scroll
{
  const box = $('#story'), steps = $$('.st', box), rail = $('#storyRail'); let P = 0;
  const onS = () => { const r = box.getBoundingClientRect(), total = box.offsetHeight - innerHeight; P = innerWidth < 880 ? (performance.now() / 9000) % 1 : clamp(-r.top / Math.max(1, total)); const i = Math.min(3, Math.floor(P * 4)); steps.forEach((s, j) => s.classList.toggle('on', j === i)); rail.style.setProperty('--p', P.toFixed(3)); };
  addEventListener('scroll', onS, { passive: true }); onS(); if (innerWidth < 880) setInterval(onS, 120);
  const drops = [];
  stage($('#storyCv'), (g, w, h, t) => {
    if (innerWidth < 880) onS();
    const p = P, u1 = clamp(p / .25), u2 = clamp((p - .25) / .25), u3 = clamp((p - .5) / .25), u4 = clamp((p - .75) / .25);
    const cx = w * .3, cy = h * .5, S = Math.min(w, h) * .25;
    // the curve area (right) and the vault (bottom right) and the creator's post (top right)
    const vx = w * .76, vy = h * .7, vw = S * .9, vh = S * 1.05, px = w * .6, py = h * .08, pw = w * .36, ph = h * .26;
    // 01 the meme drops in
    const dropY = cy - (1 - back(Math.min(1, u1 * 1.4))) * h * .6;
    g.save(); g.translate(cx, dropY); g.rotate((1 - ease(u1)) * -.4 + Math.sin(t * 1.2) * .03);
    const flip = ease(u2); const sx = Math.abs(Math.cos(flip * Math.PI)) || .001;
    g.scale(sx, 1);
    if (flip < .5) { g.shadowColor = 'rgba(255,90,168,.45)'; g.shadowBlur = 30; rr(g, -S / 2, -S / 2, S, S, S * .2); g.save(); g.clip(); if (IMGS[0].complete) g.drawImage(IMGS[0], -S / 2, -S / 2, S, S); g.restore(); g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#ff5aa8'; rr(g, -S / 2, -S / 2, S, S, S * .2); g.stroke(); }
    else { g.shadowColor = 'rgba(255,90,168,.6)'; g.shadowBlur = 34; g.fillStyle = '#1a0d18'; g.beginPath(); g.arc(0, 0, S * .52, 0, 6.29); g.fill(); g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = '#ff5aa8'; g.stroke(); g.save(); g.beginPath(); g.arc(0, 0, S * .4, 0, 6.29); g.clip(); if (IMGS[0].complete) g.drawImage(IMGS[0], -S * .4, -S * .4, S * .8, S * .8); g.restore(); }
    g.restore();
    g.globalAlpha = clamp(u1 * 2 - .6); g.fillStyle = '#f7eef3'; g.font = `700 ${Math.max(14, S * .14)}px JB`; g.textAlign = 'center'; g.fillText(flip < .5 ? 'smile' : '$SMILE', cx, cy + S * .78); g.globalAlpha = 1;
    // 02 the pairing line, stamped under the coin
    if (u2 > .3) { const a = clamp((u2 - .3) * 2); g.globalAlpha = a; g.font = `500 ${Math.max(11, S * .085)}px JB`; const txt = 'fees to instagram.com/', tw = g.measureText(txt).width + S * .55 + 20; const lx = cx - tw / 2, ly = cy + S * .95; g.strokeStyle = 'rgba(255,90,168,.5)'; g.setLineDash([4, 5]); rr(g, lx - 10, ly - S * .08, tw + 20, S * .2, 8); g.stroke(); g.setLineDash([]); g.fillStyle = '#c9b6c2'; g.textAlign = 'left'; g.fillText(txt, lx, ly + S * .04); const bx = lx + g.measureText(txt).width + 4; const sh = (t * .8) % 1; const gr = g.createLinearGradient(bx, 0, bx + S * .55, 0); gr.addColorStop(0, 'rgba(247,238,243,.18)'); gr.addColorStop(sh, 'rgba(247,238,243,.42)'); gr.addColorStop(1, 'rgba(247,238,243,.18)'); g.fillStyle = gr; rr(g, bx, ly - S * .035, S * .55, S * .07, 5); g.fill(); g.globalAlpha = 1; }
    // 03 trades on the curve drip fees into the vault
    const a3 = clamp(u3 * 1.6);
    if (a3 > 0) {
      g.globalAlpha = a3; const x0 = cx + S * .7, x1 = vx - vw * .2, y0 = cy + S * .2;
      g.strokeStyle = 'rgba(255,90,168,.55)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, x = x0 + (x1 - x0) * u, y = y0 - Math.pow(u, 1.8) * S * .9 - Math.sin(u * 18 + t * 3) * 3; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      for (let i = 0; i < 7; i++) { const u = ((t * .25 + i / 7) % 1), x = x0 + (x1 - x0) * u, y = y0 - Math.pow(u, 1.8) * S * .9; g.fillStyle = i % 3 ? '#5ef0b0' : '#ff6b7a'; g.beginPath(); g.arc(x, y, 3, 0, 6.29); g.fill(); }
      if (!RM && Math.random() < .25 && drops.length < 40) drops.push({ x: x0 + (x1 - x0) * Math.random(), y: y0 - S * .4 * Math.random(), v: 0 });
      g.globalAlpha = 1;
    }
    // the vault: a jar that fills toward the $25 line
    const fill = u4 > 0 ? (1 - ease(clamp(u4 * 1.6 - .6))) * .92 + .08 * (u4 > .9 ? 1 : 0) : ease(u3) * .92;
    g.globalAlpha = clamp((p - .45) * 6);
    g.lineWidth = 2.5; g.strokeStyle = '#ff5aa8'; rr(g, vx - vw / 2, vy - vh / 2, vw, vh, 18); g.stroke();
    g.save(); rr(g, vx - vw / 2, vy - vh / 2, vw, vh, 18); g.clip(); const fy = vy + vh / 2 - vh * fill; const wg = g.createLinearGradient(0, fy, 0, vy + vh / 2); wg.addColorStop(0, 'rgba(255,90,168,.75)'); wg.addColorStop(1, 'rgba(184,51,111,.85)'); g.fillStyle = wg; g.beginPath(); g.moveTo(vx - vw / 2, vy + vh / 2); for (let x = vx - vw / 2; x <= vx + vw / 2; x += 6) g.lineTo(x, fy + Math.sin(x * .06 + t * 3) * 3); g.lineTo(vx + vw / 2, vy + vh / 2); g.fill(); g.restore();
    g.setLineDash([5, 6]); g.strokeStyle = 'rgba(247,238,243,.5)'; g.beginPath(); g.moveTo(vx - vw / 2 - 8, vy - vh / 2 + vh * .08); g.lineTo(vx + vw / 2 + 8, vy - vh / 2 + vh * .08); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#f7eef3'; g.font = '700 13px JB'; g.textAlign = 'left'; g.fillText('$25', vx + vw / 2 + 12, vy - vh / 2 + vh * .08 + 4); g.fillStyle = '#8b7584'; g.font = '500 12px JB'; g.textAlign = 'center'; g.fillText('the vault', vx, vy + vh / 2 + 22);
    g.globalAlpha = 1;
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.v += .25; d.x += (vx - d.x) * .05; d.y += d.v; g.fillStyle = '#ffc2e0'; g.beginPath(); g.arc(d.x, d.y, 2.6, 0, 6.29); g.fill(); if (d.y > fy || d.y > vy + vh / 2) drops.splice(i, 1); }
    // 04 the gift flies from the vault onto the creator's post
    const a4 = clamp((p - .7) * 6); if (a4 > 0) {
      g.globalAlpha = a4; g.lineWidth = 2; g.strokeStyle = 'rgba(255,90,168,.7)'; rr(g, px, py, pw, ph, 16); g.fillStyle = '#170e17'; g.fill(); g.stroke();
      g.strokeStyle = 'rgba(247,238,243,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px + 26, py + 26, 12, 0, 6.29); g.stroke(); g.fillStyle = 'rgba(247,238,243,.3)'; rr(g, px + 46, py + 18, pw * .32, 8, 4); g.fill(); g.fillStyle = 'rgba(247,238,243,.14)'; rr(g, px + 46, py + 31, pw * .2, 6, 3); g.fill();
      g.fillStyle = 'rgba(247,238,243,.05)'; rr(g, px + 14, py + 50, pw - 28, ph - 64, 10); g.fill(); g.fillStyle = '#ff5aa8'; g.font = '700 11px JB'; g.textAlign = 'right'; g.fillText('INSTAGRAM', px + pw - 14, py + 24);
      const fu = clamp((u4 - .15) / .5), gx = vx + (px + pw * .72 - vx) * ease(fu), gy = vy - vh / 2 + (py + ph - 26 - (vy - vh / 2)) * ease(fu) - Math.sin(fu * Math.PI) * h * .12;
      if (fu < 1) { g.fillStyle = '#ff5aa8'; g.save(); g.translate(gx, gy); g.rotate(Math.sin(t * 6) * .15); rr(g, -14, -10, 28, 22, 4); g.fill(); g.fillStyle = '#1a0612'; g.fillRect(-2, -10, 4, 22); g.restore(); }
      else { const pop = back(clamp((u4 - .65) * 4)); g.save(); g.translate(px + pw - 62, py + ph - 26); g.scale(pop, pop); g.fillStyle = '#ff5aa8'; g.shadowColor = 'rgba(255,90,168,.7)'; g.shadowBlur = 20; rr(g, -48, -16, 96, 32, 16); g.fill(); g.shadowBlur = 0; g.fillStyle = '#1a0612'; g.font = '700 14px JB'; g.textAlign = 'center'; g.fillText('+ $25 gift', 0, 5); g.restore(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + t, d = 30 + ((t * 40 + i * 9) % 50); g.fillStyle = ['#ff5aa8', '#ffc2e0', '#ffd166'][i % 3]; g.globalAlpha = a4 * clamp(1 - d / 80); g.fillRect(px + pw - 62 + Math.cos(a) * d, py + ph - 26 + Math.sin(a) * d, 4, 4); } }
      g.globalAlpha = 1;
    }
  });
}

// ---------------------------------------------------------------- 02: the builder (a preview; the real launch is on /pair)
{
  let app = 'x', meme = 1; const hIn = $('#bHandle');
  $('#bPres').innerHTML = NAMES.map((n, i) => `<button type="button" data-i="${i + 1}" aria-label="${n}" class="${i ? '' : 'on'}" style="background-image:url(/memes/${i + 1}.png)"></button>`).join('');
  const paint = () => {
    const raw = hIn.value.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30), h = raw || '…', pl = PL[app], nm = NAMES[meme - 1];
    $('#pvIm').style.backgroundImage = `url(/memes/${meme}.png)`; $('#pvName').textContent = nm; $('#pvSym').textContent = '$' + nm.toUpperCase() + ' · on pump.fun';
    $('#pvLine').innerHTML = `fees to <b>${esc(pl.host)}/${esc(h)}</b> via .meme`; $('#pvHandle').textContent = raw ? '@' + raw : '@their handle'; $('#pvApp').textContent = pl.name; $('#pvRail').textContent = pl.rail.toLowerCase();
    $('#bGo').href = `/pair?p=${app}&h=${encodeURIComponent(raw)}&i=${meme}&n=${nm}&s=${nm.toUpperCase()}`;
  };
  seg($('#bApp'), b => { app = b.dataset.p; paint(); });
  $('#bPres').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; meme = +b.dataset.i; $$('#bPres button').forEach(x => x.classList.toggle('on', x === b)); paint(); });
  hIn.addEventListener('input', paint); paint();
  const gift = () => { const gEl = $('#pvGift'), post = $('#pvPost'); gEl.classList.remove('pop'); void gEl.offsetWidth; gEl.classList.add('pop'); setTimeout(() => { const r = gEl.getBoundingClientRect(), pr = post.getBoundingClientRect(); burst(post, r.left - pr.left + r.width / 2, r.top - pr.top + r.height / 2); }, 420); };
  $('#bGift').addEventListener('click', gift);
  let seen = false; new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !seen) { seen = true; setTimeout(gift, 700); } }), { threshold: .4 }).observe($('#pvPost'));
}

// ---------------------------------------------------------------- 03: the jar, on a loop: coins in, a gift out at $25
{
  const coins = []; let level = 0, tipping = 0, gifts = [];
  stage($('#jarCv'), (g, w, h, t) => {
    const jx = w / 2, jy = h * .56, jw = Math.min(200, w * .52), jh = Math.min(240, h * .66);
    if (!RM && Math.random() < .12 && !tipping) coins.push({ x: jx + (Math.random() - .5) * jw * .5, y: -10, v: 1 + Math.random() });
    for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; c.v += .18; c.y += c.v; const top = jy + jh / 2 - jh * level; if (c.y > top - 4) { coins.splice(i, 1); level = Math.min(1, level + .035); } else { g.fillStyle = '#ffd166'; g.beginPath(); g.ellipse(c.x, c.y, 8, 8, 0, 0, 6.29); g.fill(); g.fillStyle = '#b8891f'; g.font = '700 10px JB'; g.textAlign = 'center'; g.fillText('$', c.x, c.y + 3.5); } }
    if (level >= .92 && !tipping) { tipping = 1; gifts.push({ t: 0 }); }
    if (tipping) { level = Math.max(0, level - .025); if (level <= .02) tipping = 0; }
    g.lineWidth = 3; g.strokeStyle = '#ff5aa8'; rr(g, jx - jw / 2, jy - jh / 2, jw, jh, 22); g.stroke();
    g.save(); rr(g, jx - jw / 2, jy - jh / 2, jw, jh, 22); g.clip(); const fy = jy + jh / 2 - jh * level; const wg = g.createLinearGradient(0, fy, 0, jy + jh / 2); wg.addColorStop(0, 'rgba(255,90,168,.8)'); wg.addColorStop(1, 'rgba(184,51,111,.9)'); g.fillStyle = wg; g.beginPath(); g.moveTo(jx - jw / 2, jy + jh / 2); for (let x = jx - jw / 2; x <= jx + jw / 2; x += 5) g.lineTo(x, fy + Math.sin(x * .07 + t * 3.4) * 3.5); g.lineTo(jx + jw / 2, jy + jh / 2); g.fill(); g.restore();
    g.fillStyle = 'rgba(247,238,243,.94)'; g.font = '700 34px JB'; g.textAlign = 'center'; g.fillText(tipping ? 'sent' : '$' + Math.min(25, Math.round(level / .92 * 25)), jx, jy + 12);
    const ly = jy - jh / 2 + jh * .08; g.setLineDash([5, 6]); g.strokeStyle = 'rgba(247,238,243,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(jx - jw / 2 - 12, ly); g.lineTo(jx + jw / 2 + 12, ly); g.stroke(); g.setLineDash([]); g.fillStyle = '#f7eef3'; g.font = '700 14px JB'; g.textAlign = 'left'; g.fillText('$25', jx + jw / 2 + 16, ly + 5);
    for (let i = gifts.length - 1; i >= 0; i--) { const q = gifts[i]; q.t += .016; const u = clamp(q.t / 1.4), x = jx + (w * .9 - jx) * ease(u), y = ly - Math.sin(u * Math.PI) * h * .3 - u * h * .1; g.save(); g.translate(x, y); g.rotate(u * 1.2); g.fillStyle = '#ff5aa8'; g.shadowColor = 'rgba(255,90,168,.7)'; g.shadowBlur = 18; rr(g, -15, -11, 30, 24, 5); g.fill(); g.shadowBlur = 0; g.fillStyle = '#1a0612'; g.fillRect(-2, -11, 4, 24); g.restore(); if (u >= 1) gifts.splice(i, 1); }
  }, { ms: 16 });
}

// ---------------------------------------------------------------- 04 + 05: the register and the receipts, live
async function loadRegister() {
  const el = $('#reg');
  try {
    const r = await api('register');
    el.innerHTML = r.creators.length ? r.creators.slice(0, 6).map(c => crCard(c, r.solUsd)).join('') : '<div class="empty"><b>no pairings yet.</b>the first meme paired here starts the register. <a class="pink" href="/pair">pair one</a>.</div>';
    spots(el);
  } catch (e) { el.innerHTML = `<div class="empty"><b>the chain isn't answering right now.</b>${esc(e.message.replace(/\.$/, ''))}. it retries on its own.</div>`; }
}
async function loadReceipts() {
  const el = $('#rcp'), head = '<div class="row h"><span>creator</span><span>landed as</span><span>amount</span><span>when</span><span>proof</span></div>';
  try { const r = await api('receipts'); el.innerHTML = head + (r.receipts.length ? r.receipts.slice(0, 8).map(y => `<div class="row"><span class="mono">@${esc(y.h)}</span><span>${esc((PL[y.p] || {}).rail || y.p)}</span><span class="mono">${usd(y.usd)}</span><span class="dim">${ago(y.time)}</span><span>${y.proof ? `<a href="${esc(y.proof)}" target="_blank" rel="noopener">post ↗</a> · ` : ''}<a href="${solscan(y.sig)}" target="_blank" rel="noopener">tx ↗</a></span></div>`).join('') : '<div class="row"><span class="dim" style="grid-column:1/-1">no payouts yet. each one will be listed here with its proof.</span></div>'); }
  catch (e) { el.innerHTML = head + `<div class="row"><span class="dim" style="grid-column:1/-1">the chain isn't answering right now: ${esc(e.message)}</span></div>`; }
}

// ---------------------------------------------------------------- 09: questions
const FAQ = [
  ['who gets the money?', "the creator you paired. the coin's on-chain creator is a vault made for them alone, so its creator fees can't go anywhere else."],
  ['do they have to do anything?', "no. no wallet, no login, nothing to claim. it lands in their app as X Money, Instagram gifts or Facebook stars."],
  ['who sends the gifts?', 'a person, from the payout wallet. no app lets software send gifts, so every one is sent by hand and recorded on-chain with its proof.'],
  ['why $25 at a time?', 'every receipt is the same size, which makes the record easy to check, and it fits the apps’ own limits (X Money allows one payment per person per day).'],
  ['what if their app can’t receive?', 'their $25s wait in their vault, in public, until it can. nothing is ever re-pointed to anyone else.'],
  ['can a pairing be changed?', 'no. the pairing is written into the coin at launch. nobody can re-point it, including us.'],
  ['what if a creator wants out?', 'one message and they are out: nothing new pairs to them, and what is waiting is theirs only if they want it.'],
  ['what does it cost?', "launching costs what pump.fun charges, plus your optional first buy. the apps take their own cut of each gift, and every receipt shows how much."],
  ['is this financial advice?', 'no. memecoins are risky and most go to zero. .meme is independent and isn’t part of pump.fun, X, Instagram or Facebook.'],
];
$('#faqs').innerHTML = FAQ.map(([q, a], i) => `<div class="q rv${i % 2 ? ' d1' : ''}"><button type="button">${esc(q)}<i></i></button><div class="a"><div><p>${esc(a)}</p></div></div></div>`).join('');
$('#faqs').addEventListener('click', e => { const b = e.target.closest('.q button'); if (b) b.parentElement.classList.toggle('on'); });
new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); })).observe($('#faqs')); $$('#faqs .rv').forEach(x => setTimeout(() => x.classList.add('in'), 100));

// ---------------------------------------------------------------- closing: memes orbiting the name
stage($('#endCv'), (g, w, h, t) => {
  const cx = w / 2, cy = h / 2;
  for (let ring = 0; ring < 3; ring++) { const R = Math.min(w, h) * (.3 + ring * .13), n = 5 + ring * 2; g.strokeStyle = `rgba(255,90,168,${.08 - ring * .02})`; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, R * 1.6, R * .62, 0, 0, 6.29); g.stroke();
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + t * (.12 - ring * .03) * (ring % 2 ? -1 : 1), x = cx + Math.cos(a) * R * 1.6, y = cy + Math.sin(a) * R * .62, s = 26 + ring * 6, depth = (Math.sin(a) + 1) / 2; const im = IMGS[(i + ring * 4) % 12]; g.globalAlpha = .2 + depth * .45; g.save(); g.translate(x, y); g.rotate(Math.sin(t + i) * .15); rr(g, -s / 2, -s / 2, s, s, s * .22); g.clip(); if (im.complete) g.drawImage(im, -s / 2, -s / 2, s, s); g.restore(); }
  } g.globalAlpha = 1;
}, { ms: 24 });

loadRegister(); loadReceipts(); setInterval(() => { loadRegister(); loadReceipts(); }, 40000);
