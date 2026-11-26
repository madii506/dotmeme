// .meme core: helpers, the wallet, signing, the living background, reveals and motion. Every page imports this.
export const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const SOL = 'So11111111111111111111111111111111111111112';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const short = (a, n = 4) => a ? a.slice(0, n) + '…' + a.slice(-n) : '';
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const num = (x, d = 2) => x == null || !isFinite(x) ? '—' : (+x).toLocaleString('en-US', { maximumFractionDigits: d });
export const usd = x => x == null || !isFinite(x) ? '—' : '$' + (+x).toLocaleString('en-US', { maximumFractionDigits: x >= 100 ? 0 : 2 });
export const sol = (x, d = 3) => x == null || !isFinite(x) ? '—' : num(x, d) + ' SOL';
export const ago = t => { if (!t) return '—'; const s = Date.now() / 1000 - t; return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : s < 86400 ? Math.floor(s / 3600) + 'h ago' : Math.floor(s / 86400) + 'd ago'; };
export const solscan = (x, kind = 'tx') => `https://solscan.io/${kind}/${x}`;
export const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const PL = { x: { name: 'X', rail: 'X Money', host: 'x.com' }, instagram: { name: 'Instagram', rail: 'Gifts', host: 'instagram.com' }, facebook: { name: 'Facebook', rail: 'Stars', host: 'facebook.com' } };
export const memeImg = i => !i ? '/memes/1.png' : /^([1-9]|1[0-2])$/.test(i) ? `/memes/${i}.png` : i[0] === 'u' ? (() => { try { return atob(i.slice(1).replace(/-/g, '+').replace(/_/g, '/')); } catch { return '/memes/1.png'; } })() : '/memes/1.png';

export async function api(a, q = '', ms = 15000) { const r = await fetch('/api/meme?a=' + a + (q ? '&' + q : ''), { signal: AbortSignal.timeout(ms) }); const j = await r.json().catch(() => ({ error: 'the server sent something unreadable' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; }
export async function post(a, b, ms = 45000) { const r = await fetch('/api/meme?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b), signal: AbortSignal.timeout(ms) }); const j = await r.json().catch(() => ({ error: 'the server sent something unreadable' })); if (!r.ok || j.error) throw new Error(j.error || r.statusText); return j; }
export function toast(m) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.append(t); } t.innerHTML = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 4600); }
export function copy(text, what = 'copied') { navigator.clipboard.writeText(text).then(() => toast(what)).catch(() => toast('copy failed')); }

// one creator in the register: their memes, how full their vault is toward the next $25, what reached them
export function crCard(c, px) {
  const waitUsd = c.waitingSol != null && px ? c.waitingSol * px : null, prog = waitUsd != null ? clamp((waitUsd % 25) / 25) * 100 : 0, pl = PL[c.p] || { name: c.p, rail: '' };
  return `<a class="card cr spot" href="/creator#${esc(c.p)}:${esc(c.h)}"><div class="top1"><div class="ims">${c.coins.slice(0, 3).map(x => `<span style="background-image:url('${esc(memeImg(x.img))}')"></span>`).join('')}</div><div style="min-width:0"><b>@${esc(c.h)}</b><small>${esc(pl.name)} · ${c.coins.length} meme${c.coins.length === 1 ? '' : 's'}</small></div><span class="chip ${c.out ? 'out' : 'live'}" style="margin-left:auto"><i></i>${c.out ? 'out' : esc(pl.rail.toLowerCase())}</span></div><div class="meter"><i style="--w:${prog.toFixed(1)}%"></i></div><div class="kv"><span>waiting</span><b>${c.waitingSol == null ? '—' : sol(c.waitingSol, 4)}</b></div><div class="kv"><span>sent to them</span><b>${c.payouts ? usd(c.paidUsd) : 'nothing yet'}</b></div></a>`;
}

// ---------------------------------------------------------------- the signer, loaded only when a transaction needs it
let w3 = null;
export const web3 = () => w3 || (w3 = new Promise((ok, no) => { if (window.solanaWeb3) return ok(window.solanaWeb3); const s = document.createElement('script'); s.src = '/assets/web3.min.js'; s.onload = () => ok(window.solanaWeb3); s.onerror = () => no(new Error('could not load the signer')); document.head.append(s); }));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64 = u => { let s = ''; u.forEach(c => s += String.fromCharCode(c)); return btoa(s); };
const LIST = () => [['Phantom', window.phantom && window.phantom.solana, 'https://phantom.app'], ['Solflare', window.solflare && window.solflare.isSolflare ? window.solflare : null, 'https://solflare.com'], ['Backpack', window.backpack, 'https://backpack.app']];
export const W = { pk: null, p: null, name: '', subs: [] };
export const onWallet = fn => { W.subs.push(fn); fn(W.pk); };
const emit = () => { W.subs.forEach(f => { try { f(W.pk); } catch { } }); paint(); };
async function use(name, p, silent) { const r = await p.connect(silent ? { onlyIfTrusted: true } : undefined); const key = (r && r.publicKey) || p.publicKey; if (!key) throw new Error('no account'); W.pk = key.toString(); W.p = p; W.name = name; try { localStorage.setItem('meme:w', name); } catch { } p.on && p.on('accountChanged', k => { if (k) { W.pk = k.toString(); emit(); } else disconnect(); }); emit(); }
export function connect() { const m = $('#wmodal'); if (!m) return; $('.wl', m).innerHTML = LIST().map(([n, p, url]) => `<button ${p ? `data-w="${n}"` : `data-url="${url}"`}><b>${n[0]}</b>${n}<small>${p ? 'detected' : 'install'}</small></button>`).join(''); m.classList.add('on'); }
export function disconnect() { try { W.p && W.p.disconnect && W.p.disconnect(); } catch { } W.pk = null; W.p = null; try { localStorage.removeItem('meme:w'); } catch { } emit(); }
function paint() { const b = $('#wbtn'); if (!b) return; b.classList.toggle('on', !!W.pk); $('.t', b).textContent = W.pk ? short(W.pk) : 'connect'; }
function walletInit() {
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'wmodal';
  m.innerHTML = '<div class="box"><h3>connect a wallet</h3><p class="dim" style="margin-top:6px;font-size:14.5px">it signs your launches, trades and claims. .meme never sees a key.</p><div class="wl"></div><button class="btn btn-g btn-s" style="margin-top:16px;width:100%" data-close>not now</button></div>';
  document.body.append(m);
  m.addEventListener('click', async e => { if (e.target === m || e.target.closest('[data-close]')) return m.classList.remove('on'); const b = e.target.closest('button[data-w],button[data-url]'); if (!b) return; if (b.dataset.url) return window.open(b.dataset.url, '_blank', 'noopener'); const [n, p] = LIST().find(x => x[0] === b.dataset.w) || []; try { await use(n, p); m.classList.remove('on'); toast('connected ' + short(W.pk)); } catch (er) { toast('not connected: ' + esc(er.message || 'refused')); } });
  const btn = $('#wbtn'); let armed = 0; if (btn) btn.addEventListener('click', () => { if (!W.pk) return connect(); if (Date.now() - armed < 3000) { disconnect(); toast('disconnected'); return; } armed = Date.now(); toast('tap again to disconnect ' + short(W.pk)); });
  let pref = null; try { pref = localStorage.getItem('meme:w'); } catch { } const hit = pref && LIST().find(x => x[0] === pref && x[1]); if (hit) use(hit[0], hit[1], true).catch(() => { });
  paint();
}
const deser = (S, t) => { const raw = unb64(t); try { return S.VersionedTransaction.deserialize(raw); } catch { return S.Transaction.from(raw); } };
// transactions only the wallet signs (trades, payout memos, collects the server already co-signed)
export async function signSend(txsB64, onStep) {
  if (!W.p) throw new Error('connect a wallet first'); const S = await web3(); const list = txsB64.map(t => deser(S, t));
  onStep && onStep('approve in ' + W.name + '…');
  const signed = list.length > 1 && W.p.signAllTransactions ? await W.p.signAllTransactions(list) : [await W.p.signTransaction(list[0])];
  onStep && onStep('sending to Solana…'); return post('send', { txs: signed.map(t => b64(t.serialize())) }, 120000);
}
// a launch: the wallet signs, then the coin's own key (made here, in this browser) signs last
export async function signLaunch(txB64, mintKp, onStep) {
  if (!W.p) throw new Error('connect a wallet first'); const S = await web3(); const tx = deser(S, txB64);
  onStep && onStep('approve in ' + W.name + '…'); const signed = await W.p.signTransaction(tx); signed.sign([mintKp]);
  onStep && onStep('sending to pump.fun…'); return post('send', { txs: [b64(signed.serialize())] }, 120000);
}

// ---------------------------------------------------------------- the background: memes drifting on streams, barely there
function flow() {
  const c = $('#flow'); if (!c) return; const g = c.getContext('2d'); const dpr = Math.min(1.5, devicePixelRatio || 1); let w, h, sy = 0;
  const size = () => { w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size); addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  const small = innerWidth < 700, R = Math.random, N = small ? 16 : 32;
  const L = Array.from({ length: N }, () => ({ y: R() * 1.1 - .05, A: 12 + R() * 44, lam: 420 + R() * 700, ph: R() * 6.28, sp: (.12 + R() * .3) * (R() < .5 ? 1 : -1), pink: R() < .72, a: .035 + R() * .045, tilt: (R() - .5) * 80, par: .02 + R() * .06 }));
  const sparks = Array.from({ length: small ? 18 : 40 }, () => ({ l: Math.floor(R() * N), x: R(), v: .012 + R() * .035, r: .8 + R() * 1.6, a: .18 + R() * .3 }));
  const cards = Array.from({ length: small ? 5 : 11 }, () => ({ l: Math.floor(R() * N), x: R(), v: .004 + R() * .01, s: 13 + R() * 14, rot: (R() - .5) * .5, face: R() < .65, a: .1 + R() * .12 }));
  const yAt = (l, x, t) => (l.y * h - sy * l.par) % (h * 1.1) + l.A * Math.sin(x / l.lam * 6.283 + l.ph + t * l.sp) + l.tilt * (x / w - .5);
  let last = 0, t0 = performance.now(), prev = t0;
  function frame(now) {
    requestAnimationFrame(frame); if (document.hidden || now - last < 33) return; const dt = Math.min(.1, (now - prev) / 1000); prev = now; last = now; const t = RM ? 0 : (now - t0) / 1000;
    g.clearRect(0, 0, w, h); g.lineWidth = 1;
    for (const l of L) { g.strokeStyle = l.pink ? `rgba(255,90,168,${l.a})` : `rgba(247,238,243,${l.a * .7})`; g.beginPath(); for (let x = -20; x <= w + 20; x += 28) { const y = yAt(l, x, t); x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    for (const s of sparks) { if (!RM) s.x = (s.x + s.v * dt) % 1.05; const l = L[s.l], x = s.x * w, y = yAt(l, x, t); const x2 = x - 26, y2 = yAt(l, x2, t); const gr = g.createLinearGradient(x2, y2, x, y); gr.addColorStop(0, 'rgba(255,90,168,0)'); gr.addColorStop(1, `rgba(255,140,200,${s.a * .8})`); g.strokeStyle = gr; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.stroke(); g.fillStyle = `rgba(255,194,224,${s.a})`; g.beginPath(); g.arc(x, y, s.r, 0, 6.29); g.fill(); }
    for (const k of cards) { if (!RM) k.x = (k.x + k.v * dt) % 1.08; const l = L[k.l], x = k.x * w - 20, y = yAt(l, x, t), s = k.s; g.save(); g.translate(x, y); g.rotate(k.rot + Math.sin(t * .6 + k.l) * .08); g.globalAlpha = k.a; g.strokeStyle = '#ff5aa8'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(-s / 2 + 3, -s / 2 - 3, s, s, s * .22); g.stroke(); g.fillStyle = '#0f0a0f'; g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * .22); g.fill(); g.stroke(); if (k.face) { g.fillStyle = '#ff5aa8'; g.beginPath(); g.arc(-s * .18, -s * .1, s * .06, 0, 6.29); g.arc(s * .18, -s * .1, s * .06, 0, 6.29); g.fill(); g.beginPath(); g.arc(0, s * .02, s * .2, .35, 2.8); g.stroke(); } g.restore(); }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- reveals, split text, spotlights, segmented controls, motion
export function splitText(el) {
  if (!el || el.dataset.split) return; el.dataset.split = 1;
  const walk = n => { [...n.childNodes].forEach(ch => { if (ch.nodeType === 3) { const f = document.createDocumentFragment(); ch.textContent.split(/(\s+)/).forEach(word => { if (!word) return; if (/^\s+$/.test(word)) return f.append(word); const wv = document.createElement('span'); wv.style.display = 'inline-block'; wv.style.whiteSpace = 'nowrap'; [...word].forEach(cc => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = cc; wv.append(s); }); f.append(wv); }); ch.replaceWith(f); } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch); }); };
  walk(el); $$('.ch', el).forEach((s, i) => s.style.transitionDelay = (i * .02) + 's');
}
export function reveals() { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }); $$('.rv,.split').forEach(el => io.observe(el)); }
export function spots(root = document) { $$('.spot', root).forEach(el => el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); })); }
export function seg(el, onPick) {
  if (!el) return; let ind = $('.ind', el); if (!ind) { ind = document.createElement('i'); ind.className = 'ind'; el.prepend(ind); }
  const place = () => { const b = $('button.on', el); if (!b) return; ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px'; };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('button', el).forEach(x => x.classList.toggle('on', x === b)); place(); onPick && onPick(b); });
  addEventListener('resize', place); requestAnimationFrame(place); setTimeout(place, 300); return place;
}
export function countTo(el, to, fmt = v => num(v, 0), ms = 1400) { if (!el) return; if (to == null || !isFinite(to)) { el.textContent = '—'; return; } if (RM) { el.textContent = fmt(to); return; } const from = +(el.dataset.v || 0), t0 = performance.now(); el.dataset.v = to; const step = now => { const u = clamp((now - t0) / ms), e = 1 - Math.pow(1 - u, 3); el.textContent = fmt(from + (to - from) * e); if (u < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
export function burst(host, x, y, n = 16) { for (let i = 0; i < n; i++) { const b = document.createElement('i'); b.className = 'burst'; const a = Math.random() * 6.28, d = 40 + Math.random() * 70; b.style.cssText = `left:${x}px;top:${y}px;background:${['#ff5aa8', '#ffc2e0', '#ffd166', '#f7eef3'][i % 4]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 20}px;--rr:${Math.random() * 360}deg`; host.append(b); setTimeout(() => b.remove(), 1100); } }
function motion() {
  if (RM || !matchMedia('(pointer:fine)').matches) return; let cur = null; const rest = el => { el.style.transform = ''; el.style.transition = ''; };
  document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('.cr,.wd,.rl,.st.on,.coin1,.pres button'); if (cur && cur !== el) rest(cur); cur = el; if (!el || el.matches('.pres button') || (el.classList.contains('rv') && !el.classList.contains('in'))) return; const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)'; el.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`; }, { passive: true });
  $$('.btn-p').forEach(b => { b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.translate = `${((e.clientX - r.left) / r.width - .5) * 10}px ${((e.clientY - r.top) / r.height - .5) * 8}px`; }); b.addEventListener('pointerleave', () => { b.style.translate = ''; }); });
}
export function boot() {
  flow(); walletInit(); reveals(); spots(); motion();
  const top = $('.top'), prog = $('.prog'); const onS = () => { top && top.classList.toggle('solid', scrollY > 20); prog && prog.style.setProperty('--p', clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4)); };
  addEventListener('scroll', onS, { passive: true }); onS();
  const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/'; $$('.nav a,.sheet a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === path));
  const sh = $('.sheet'), mb = $('.menu'); if (mb && sh) { mb.addEventListener('click', () => sh.classList.add('on')); $('.x', sh).addEventListener('click', () => sh.classList.remove('on')); $$('a', sh).forEach(a => a.addEventListener('click', () => sh.classList.remove('on'))); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) copy(b.dataset.c, 'copied'); });
}
