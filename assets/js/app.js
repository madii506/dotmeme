// .meme app pages: pair, creators, creator, coin, receipts, console, docs, 404. One module, dispatched on <body data-page>.
import { $, $$, esc, short, clamp, num, usd, sol, ago, solscan, B58, SOL, PL, memeImg, api, post, toast, web3, W, onWallet, connect, signSend, signLaunch, splitText, spots, seg, countTo, burst, boot, crCard } from './core.js?v=1';

$$('.split').forEach(splitText);
boot();
const PAGE = document.body.dataset.page, RMq = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAMES = ['smile', 'laugh', 'shock', 'shades', 'wink', 'sad', 'mad', 'love', 'dazed', 'meh', 'puppy', 'bliss'];
const HANDLE = { x: /^[a-z0-9_]{1,15}$/, instagram: /^[a-z0-9._]{1,30}$/, facebook: /^[a-z0-9.]{3,50}$/ };
const RAIL = { x: 'X Money', instagram: 'Gifts on their Reels', facebook: 'Stars' };
const normH = v => String(v || '').trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').split(/[/?#]/)[0].toLowerCase();
const profile = (p, h) => `https://${PL[p].host}/${h}`;
const isOut = (c, p, h) => !!(c && c.optout || []).map(s => String(s).toLowerCase()).includes(`${p}:${h}`);
const day = t => t ? new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase() : '—';
const human = e => { const m = String((e && e.message) || e || ''); if (/reject|denied|cancel|declin/i.test(m)) return 'you cancelled it in your wallet. nothing was sent.'; if (/timeout|aborted/i.test(m)) return 'that took too long. check your wallet, then try again.'; return m.replace(/\.$/, '') + '.'; };
const offline = e => `<div class="empty"><b>the chain isn't answering right now.</b>${esc(String(e && e.message || 'no answer').replace(/\.$/, ''))}. it retries on its own.</div>`;
const imgOf = i => memeImg(i);
let CF = null; const cfg = () => CF || (CF = api('config').catch(() => ({ ready: false, optout: [], platforms: {}, payout: null, quantumUsd: 25 })));
const xLink = c => !c || !c.x ? null : /^https?:/.test(c.x) ? c.x : 'https://x.com/' + String(c.x).replace(/^@/, '');
const shareX = text => 'https://x.com/intent/tweet?text=' + encodeURIComponent(text);
document.addEventListener('click', e => { if (e.target.closest('[data-act="connect"]')) connect(); });

// ---------------------------------------------------------------- the receipt row, shared by three pages
const head7 = '<div class="row r7 h"><span>creator</span><span>app</span><span>landed as</span><span>arrived</span><span>sent</span><span>when</span><span>proof</span></div>';
const row7 = y => `<div class="row r7"><span class="mono"><a href="/creator#${esc(y.p)}:${esc(y.h)}">@${esc(y.h)}</a></span><span>${esc((PL[y.p] || {}).name || y.p)}</span><span>${esc(RAIL[y.p] || '')}</span><span class="mono">${usd(y.usd)}</span><span class="mono">${y.sol ? sol(y.sol, 3) : '—'}</span><span class="dim">${ago(y.time)}</span><span>${y.proof ? `<a href="${esc(y.proof)}" target="_blank" rel="noopener">post ↗</a> · ` : ''}<a href="${solscan(y.sig)}" target="_blank" rel="noopener">tx ↗</a></span></div>`;
const coinCard = x => `<a class="card cn spot" href="/coin#${esc(x.mint)}"><div class="t"><span class="im" style="background-image:url('${esc(imgOf(x.img))}')"></span><div style="min-width:0"><b>${esc(x.name || 'unnamed')}</b><small>$${esc(x.symbol || '')} · ${ago(x.time)}</small></div></div><div class="meter"><i style="--w:${((x.progress || 0) * 100).toFixed(1)}%"></i></div><div class="kv"><span>${x.graduated ? 'graduated' : 'on the curve'}</span><b>${x.mcapSol != null ? sol(x.mcapSol, 1) : '—'}</b></div><div class="kv"><span>launched by</span><b>${esc(short(x.launcher))}</b></div></a>`;

// ================================================================ /pair: the launcher
function pairPage() {
  const q = new URLSearchParams(location.search);
  let app = PL[q.get('p')] ? q.get('p') : 'x', meme = /^([1-9]|1[0-2])$/.test(q.get('i') || '') ? +q.get('i') : 1, buy = 0, named = false, reg = null, vT = 0, vKey = '';
  const hIn = $('#fH'), nIn = $('#fN'), sIn = $('#fS'), uIn = $('#fUrl'), bIn = $('#fB'), go = $('#fGo'), msg = (t, k = '') => { const m = $('#fMsg'); m.className = 'msg ' + k; m.innerHTML = t; };
  $('#fPres').innerHTML = NAMES.map((n, i) => `<button type="button" data-i="${i + 1}" aria-label="${n}" class="${i + 1 === meme ? 'on' : ''}" style="background-image:url(/memes/${i + 1}.png)"></button>`).join('');
  $$('#fApp button').forEach(b => b.classList.toggle('on', b.dataset.p === app));
  hIn.value = normH(q.get('h') || '');
  const qn = (q.get('n') || '').slice(0, 32), qs = (q.get('s') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  nIn.value = qn || NAMES[meme - 1]; sIn.value = qs || NAMES[meme - 1].toUpperCase(); named = !!qn && qn !== NAMES[meme - 1];
  const urlOk = v => /^https:\/\/[^\s"'<>]{6,140}$/.test(v);
  const state = () => { const h = normH(hIn.value), url = uIn.value.trim(), name = nIn.value.trim(), symbol = sIn.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10); return { h, ok: HANDLE[app].test(h), url, uok: urlOk(url), name, symbol, image: urlOk(url) ? url : String(meme) }; };
  const paint = async () => {
    const c = await cfg(), s = state(), pl = PL[app], out = s.ok && isOut(c, app, s.h);
    const mine = s.ok && reg ? (reg.find(x => x.p === app && x.h === s.h) || { coins: [] }).coins.length : 0;
    $('#fCheck').innerHTML = !s.h ? '' : !s.ok ? `<span class="warn">that doesn't look like a ${pl.name} handle</span>` : out ? `<span class="bad">@${esc(s.h)} asked out. their answer stands.</span>` : `<span>fees to <b>${esc(pl.host)}/${esc(s.h)}</b></span><a href="${profile(app, s.h)}" target="_blank" rel="noopener">check it's them ↗</a>${mine ? `<a href="/creator#${app}:${esc(s.h)}">${mine} meme${mine > 1 ? 's' : ''} already paired</a>` : ''}`;
    $('#fUrlCheck').innerHTML = s.url && !s.uok ? '<span class="warn">use an https link to an image</span>' : s.uok ? '<span>your link replaces the face</span>' : '';
    $('#pIm').style.backgroundImage = `url("${(s.uok ? s.url : `/memes/${meme}.png`).replace(/["\\]/g, '')}")`;
    $('#pName').textContent = s.name || NAMES[meme - 1]; $('#pSym').textContent = '$' + (s.symbol || '…') + ' · on pump.fun';
    $('#pLine').innerHTML = `fees to <b>${esc(pl.host)}/${s.ok ? esc(s.h) : '…'}</b> via .meme`;
    $('#pDesc').textContent = `Paired to ${pl.name} @${s.ok ? s.h : 'handle'} via .meme. This coin's creator fees are sent to them as ${RAIL[app]}. Nobody asked them first; one message from them ends it.`;
    $('#pHandle').textContent = s.ok ? '@' + s.h : '@their handle'; $('#pApp').textContent = pl.name; $('#pRail').textContent = pl.rail.toLowerCase();
    const steps = { app: true, h: s.ok && !out, m: !s.url || s.uok, n: s.name.length >= 2 && s.symbol.length >= 2, w: !!W.pk };
    $$('#prail span').forEach(x => x.classList.toggle('ok', !!steps[x.dataset.k]));
    $('#fSum').innerHTML = `<small>you sign one transaction that</small><div><span>creates <b>$${esc(s.symbol || '…')}</b> on pump.fun, launched from your wallet</span></div><div><span>sets its creator to <b>${s.ok ? '@' + esc(s.h) + "'s" : 'their'}</b> vault, for good</span></div>${buy > 0 ? `<div><span>buys <b>${num(buy, 3)} SOL</b> of it for you, first in line</span></div>` : ''}<div><span>writes the pairing on Solana, so anyone can find it</span></div>`;
    // the vault: the same address for this handle every time, shown before anything is signed
    const key = s.ok ? `${app}:${s.h}` : '';
    if (key !== vKey) {
      vKey = key; clearTimeout(vT); const v = $('#pVault');
      if (!s.ok) v.textContent = 'type a handle';
      else if (!c.ready) v.textContent = 'not set up on this site';
      else { v.textContent = 'deriving…'; vT = setTimeout(async () => { try { const r = await api('vault', `p=${app}&h=${encodeURIComponent(s.h)}`); if (vKey === key) v.innerHTML = `<a href="${solscan(r.vault, 'account')}" target="_blank" rel="noopener">${short(r.vault, 5)} ↗</a>`; } catch (e) { if (vKey === key) v.textContent = 'unavailable right now'; } }, 350); }
    }
  };
  seg($('#fApp'), b => { app = b.dataset.p; paint(); });
  $('#fPres').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; meme = +b.dataset.i; uIn.value = ''; $$('#fPres button').forEach(x => x.classList.toggle('on', x === b)); if (!named) { nIn.value = NAMES[meme - 1]; sIn.value = NAMES[meme - 1].toUpperCase(); } paint(); });
  nIn.addEventListener('input', () => { named = true; if (!sIn.dataset.t) sIn.value = nIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10); paint(); });
  sIn.addEventListener('input', () => { sIn.dataset.t = 1; sIn.value = sIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10); paint(); });
  [hIn, uIn].forEach(i => i.addEventListener('input', paint));
  const setBuy = v => { buy = clamp(+v || 0, 0, 10); $$('#fQuick button').forEach(b => b.classList.toggle('on', +b.dataset.v === buy)); paint(); };
  $('#fQuick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; bIn.value = +b.dataset.v ? b.dataset.v : ''; setBuy(b.dataset.v); });
  bIn.addEventListener('input', () => { const v = parseFloat(bIn.value.replace(',', '.')); if (v > 10) msg('the first buy is capped at 10 SOL here', 'err'); else msg(''); setBuy(v); });
  onWallet(() => paint());
  api('register').then(r => { reg = r.creators; paint(); }).catch(() => { });
  paint();
  // the gift lands on the preview once, when it is first seen
  let seen = false; new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !seen) { seen = true; setTimeout(gift, 900); } }), { threshold: .5 }).observe($('#pPost'));
  function gift() { const g = $('#pGift'), p = $('#pPost'); g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); setTimeout(() => { const r = g.getBoundingClientRect(), pr = p.getBoundingClientRect(); burst(p, r.left - pr.left + r.width / 2, r.top - pr.top + r.height / 2); }, 420); }
  $('#pPost').addEventListener('click', gift);

  const prog = i => { const P = $('#fProg'); P.classList.remove('hide'); $$('div', P).forEach((d, k) => { d.classList.toggle('ok', k < i); d.classList.toggle('on', k === i); }); };
  go.addEventListener('click', async () => {
    const c = await cfg(), s = state();
    if (!s.ok) { hIn.focus(); return msg(`type the creator's ${PL[app].name} handle first`, 'err'); }
    if (isOut(c, app, s.h)) return msg('this creator asked out. their answer stands.', 'err');
    if (s.url && !s.uok) return msg('that image link has to start with https://', 'err');
    if (s.name.length < 2) { nIn.focus(); return msg('give the meme a name', 'err'); }
    if (s.symbol.length < 2) { sIn.focus(); return msg('give it a ticker, 2 to 10 letters', 'err'); }
    if (!c.ready) return msg("this site can't launch yet: its vault key isn't set. nothing was sent.", 'err');
    if (!W.pk) { connect(); return msg('connect a wallet to sign the launch'); }
    go.disabled = true; go.classList.add('busy'); msg('');
    try {
      prog(0); const S = await web3(); const kp = S.Keypair.generate(), mint = kp.publicKey.toBase58();
      prog(1); const r = await post('buildLaunch', { wallet: W.pk, mint, platform: app, handle: s.h, name: s.name, symbol: s.symbol, image: s.image, buySol: buy }, 60000);
      prog(2); const res = await signLaunch(r.tx, kp, t => { if (/sending/.test(t)) prog(3); });
      prog(4); done(mint, res.sigs[0], s);
    } catch (e) { $('#fProg').classList.add('hide'); msg(human(e), 'err'); }
    finally { go.disabled = false; go.classList.remove('busy'); }
  });
  function done(mint, sig, s) {
    const pl = PL[app], img = s.uok ? s.url : `/memes/${meme}.png`, link = `${location.origin}/coin#${mint}`;
    $('#pf').innerHTML = `<div class="done"><div class="big" style="background-image:url('${esc(img)}')"></div><h3>$${esc(s.symbol)} is live.</h3><p>paired to <b class="mono">${esc(pl.host)}/${esc(s.h)}</b>. every trade now drops a fee in their vault.</p><div class="vline"><span>coin</span><b><a href="${solscan(mint, 'token')}" target="_blank" rel="noopener">${short(mint, 6)} ↗</a></b><span>launch</span><b><a href="${solscan(sig)}" target="_blank" rel="noopener">${short(sig, 6)} ↗</a></b></div><div class="acts"><a class="btn btn-p" href="/coin#${mint}">open its page</a><a class="btn btn-g" href="https://pump.fun/coin/${mint}" target="_blank" rel="noopener">pump.fun ↗</a><a class="btn btn-g" href="${shareX(`i just paired $${s.symbol} to ${pl.host}/${s.h} on .meme. every trade sends them fees.\n\n${link}`)}" target="_blank" rel="noopener">share on x</a><button class="btn btn-g" type="button" data-c="${mint}">copy address</button></div></div>`;
    const b = $('.done .big'); setTimeout(() => { const r = b.getBoundingClientRect(), pr = $('#pf').getBoundingClientRect(); burst($('#pf'), r.left - pr.left + r.width / 2, r.top - pr.top + r.height / 2, 28); }, 450);
    scrollTo({ top: $('#pf').getBoundingClientRect().top + scrollY - 100, behavior: 'smooth' });
  }
}

// ================================================================ /creators: the register
function creatorsPage() {
  let all = [], px = null, P = '', S = 'new', Q = '', shown = 24;
  const list = $('#cList'), more = $('#cMore');
  const render = () => {
    const key = { new: c => -c.first, memes: c => -c.coins.length, wait: c => -(c.waitingSol || 0), sent: c => -c.paidUsd };
    const xs = all.filter(c => (!P || c.p === P) && (!Q || c.h.includes(Q))).sort((a, b) => key[S](a) - key[S](b) || b.first - a.first);
    list.innerHTML = xs.length ? xs.slice(0, shown).map(c => crCard(c, px)).join('') : all.length ? '<div class="empty"><b>nobody matches that.</b>try another handle, or look them up below.</div>' : '<div class="empty"><b>no pairings yet.</b>the first meme paired here starts the register. <a class="pink" href="/pair">pair one</a>.</div>';
    more.classList.toggle('hide', xs.length <= shown); spots(list);
  };
  const load = async () => {
    try {
      const r = await api('register'); all = r.creators; px = r.solUsd; render();
      if (all.length) { $('#cStats').classList.remove('hide'); countTo($('#sC'), all.length); countTo($('#sM'), r.coins); countTo($('#sP'), r.payouts); countTo($('#sU'), r.paidUsd, v => usd(v)); }
    } catch (e) { if (!all.length) list.innerHTML = offline(e); setTimeout(load, 20000); }
  };
  seg($('#cP'), b => { P = b.dataset.p; render(); }); seg($('#cSort'), b => { S = b.dataset.s; render(); });
  $('#cQ').addEventListener('input', e => { Q = normH(e.target.value); render(); });
  more.addEventListener('click', () => { shown += 24; render(); });
  lookup($('#lApp'), $('#lH'), $('#lGo'), $('#lMsg'));
  load(); setInterval(load, 45000);
}
function lookup(segEl, inp, btn, out) {
  let p = 'x'; seg(segEl, b => { p = b.dataset.p; });
  const goTo = () => { const h = normH(inp.value); if (!HANDLE[p].test(h)) { out.innerHTML = `<span class="warn">that doesn't look like a ${PL[p].name} handle</span>`; return inp.focus(); } location.href = `/creator#${p}:${h}`; };
  btn.addEventListener('click', goTo); inp.addEventListener('keydown', e => { if (e.key === 'Enter') goTo(); });
}

// ================================================================ /creator#app:handle
function creatorPage() {
  const el = $('#crv');
  const headHtml = (p, h, out) => `<div class="chead"><div class="av" aria-hidden="true">${esc(h[0].toUpperCase())}</div><div style="min-width:0"><div class="eyebrow"><b>${esc(PL[p].name)}</b> creator</div><h1>@${esc(h)}</h1><div class="chips" id="chips"><span class="chip ${out ? 'out' : 'live'}"><i></i>${out ? 'asked out' : 'paid in ' + esc(RAIL[p].toLowerCase())}</span></div></div></div>`;
  const load = async () => {
    const [p0, h0] = decodeURIComponent(location.hash.slice(1)).split(':'); const p = String(p0 || '').toLowerCase(), h = normH(h0);
    if (!PL[p] || !HANDLE[p].test(h)) {
      el.innerHTML = `<div class="phead"><div class="eyebrow"><b>a</b> creator</div><h1>look up <em>a creator.</em></h1><p>what is paired to them, what waits in their vault, what reached them.</p></div><div class="card pane look" style="margin-top:36px"><div class="row2"><div class="seg" id="lApp"><button class="on" data-p="x" type="button">x</button><button data-p="instagram" type="button">instagram</button><button data-p="facebook" type="button">facebook</button></div><div class="inp"><span>@</span><input id="lH" placeholder="their handle" autocomplete="off" spellcheck="false" aria-label="a handle"></div><button class="btn btn-p" id="lGo" type="button">look up</button></div><div class="check" id="lMsg"></div></div>`;
      return lookup($('#lApp'), $('#lH'), $('#lGo'), $('#lMsg'));
    }
    const c0 = await cfg(); el.innerHTML = headHtml(p, h, isOut(c0, p, h)) + '<div class="empty" style="margin-top:36px"><b>reading the chain…</b></div>';
    try { const r = await api('creator', `p=${p}&h=${encodeURIComponent(h)}`); render(p, h, r, c0); }
    catch (e) { el.innerHTML = headHtml(p, h, isOut(c0, p, h)) + `<div style="margin-top:36px">${offline(e)}</div>`; setTimeout(() => { if (location.hash.slice(1).startsWith(p + ':')) load(); }, 20000); }
  };
  function render(p, h, r, c) {
    const cr = r.creator, px = r.solUsd, Q = r.quantumUsd || 25, out = cr.out || isOut(c, p, h), paired = cr.coins.length > 0;
    const wUsd = cr.waitingSol != null && px ? cr.waitingSol * px : null, full = wUsd != null ? Math.floor(wUsd / Q) : 0, prog = wUsd != null ? clamp((wUsd % Q) / Q) * 100 : 0;
    const amount = !paired ? '' : cr.waitingSol == null ? `<div class="amt">—<small>${c.ready ? "can't be read right now" : 'the vault is not set up on this site'}</small></div>` : `<div class="amt" id="vAmt">${sol(cr.waitingSol, 4)}<small>${wUsd != null ? '≈ ' + usd(wUsd) : ''}</small></div>`;
    const last = cr.lastPaid ? ago(cr.lastPaid) : '—';
    el.innerHTML = headHtml(p, h, out)
      + `<div class="acts">${out ? '' : `<a class="btn btn-p" href="/pair?p=${p}&h=${encodeURIComponent(h)}">pair a meme to them</a>`}<a class="btn btn-g" href="${profile(p, h)}" target="_blank" rel="noopener">their profile ↗</a><button class="btn btn-g" type="button" data-c="${esc(location.href)}">copy this page</button></div>`
      + `<div class="lay"><div class="card vault rv"><small>waiting in their vault</small>${paired ? amount + `<div class="meter big"><i style="--w:0%" id="vMeter"></i></div><div class="mlabels"><span>$0</span><span>next gift at $${Q}</span></div><div class="vline"><span>${cr.waitingSol == null ? 'the next $' + Q + ' fills from every trade' : full ? `<b>${full} full $${Q}${full > 1 ? 's' : ''}</b> ready to send` : `the next $${Q} is filling`}</span></div>` : `<p class="dim" style="font-size:15.5px">nobody has paired a meme to @${esc(h)} yet. the first one starts filling this vault.</p>`}<div class="vline"><span>vault</span><b id="vAddr">${c.ready ? 'deriving…' : 'not set up on this site'}</b></div></div>`
      + `<div class="bigs two rv d1"><div class="card"><span>memes</span><b id="kMm">0</b><small>paired to them</small></div><div class="card"><span>gifts</span><b id="kGf">0</b><small>sent, with proof</small></div><div class="card"><span>sent</span><b id="kSt">$0</b><small>arrived in ${esc(PL[p].name)}</small></div><div class="card"><span>last gift</span><b>${esc(last)}</b><small>${cr.lastPaid ? day(cr.lastPaid) : 'none yet'}</small></div></div></div>`
      + `<div class="h3s"><h3>their memes</h3><span class="faint">${paired ? 'newest first' : ''}</span></div>`
      + (paired ? `<div class="coins">${cr.coins.slice().sort((a, b) => b.time - a.time).map(coinCard).join('')}</div>` : `<div class="empty" style="margin-top:22px"><b>no memes yet.</b>${out ? 'they asked out, so none can be paired.' : `<a class="pink" href="/pair?p=${p}&h=${encodeURIComponent(h)}">pair the first one</a>.`}</div>`)
      + `<div class="h3s"><h3>what reached them</h3><span class="faint">every gift, with its proof</span></div>`
      + `<div class="tbl">${head7}${r.receipts.length ? r.receipts.map(row7).join('') : `<div class="row"><span class="dim" style="grid-column:1/-1">no gifts yet. each one will be listed here with its proof.</span></div>`}</div>`
      + `<div class="card outbox ${out ? 'is-out' : ''}"><div><h3>${out ? `@${esc(h)} asked out.` : 'is this you?'}</h3><p>${out ? 'no new meme can pair to them. what was already waiting goes to them only if they want it. otherwise it stays in their vault, published, never re-pointed.' : 'one message ends it, for good: no new meme can pair to you, and what is waiting is yours only if you want it. a gift is not an endorsement, and nothing here says otherwise.'}</p></div>${out ? '' : `<div class="acts">${xLink(c) ? `<a class="btn btn-g" href="${esc(xLink(c))}" target="_blank" rel="noopener">message .meme ↗</a>` : ''}<button class="btn btn-g" type="button" data-c="please take ${p}:${esc(h)} off .meme">copy the opt-out line</button></div>`}</div>`;
    $$('.rv', el).forEach(x => requestAnimationFrame(() => x.classList.add('in'))); spots(el);
    if (paired) $('#chips').insertAdjacentHTML('beforeend', `<span class="chip"><i></i>paired since ${day(cr.first)}</span>`);
    countTo($('#kMm'), cr.coins.length); countTo($('#kGf'), cr.payouts); countTo($('#kSt'), cr.paidUsd, v => usd(v));
    setTimeout(() => { const m = $('#vMeter'); if (m) m.style.setProperty('--w', prog.toFixed(1) + '%'); }, 250);
    if (c.ready) api('vault', `p=${p}&h=${encodeURIComponent(h)}`).then(v => { $('#vAddr').innerHTML = `<a href="${solscan(v.vault, 'account')}" target="_blank" rel="noopener">${short(v.vault, 5)} ↗</a>`; }).catch(() => { $('#vAddr').textContent = 'unavailable right now'; });
  }
  addEventListener('hashchange', load); load();
}

// ================================================================ /coin#mint
function coinPage() {
  const el = $('#cov'); let ws = null, wsT = 0;
  const load = async () => {
    const mint = decodeURIComponent(location.hash.slice(1)).trim(); if (ws) { ws.onclose = null; ws.close(); ws = null; }
    if (!B58.test(mint)) {
      el.innerHTML = `<div class="phead"><div class="eyebrow"><b>a</b> coin</div><h1>open <em>a coin.</em></h1><p>paste a coin's address to see its pairing, its curve and its live trades.</p></div><div class="card pane look" style="margin-top:36px"><div class="row2"><div class="inp"><input id="mIn" placeholder="a coin address" autocomplete="off" spellcheck="false" aria-label="a coin address"></div><button class="btn btn-p" id="mGo" type="button">open</button></div><div class="check" id="mMsg"></div></div>`;
      const go = () => { const v = $('#mIn').value.trim(); if (!B58.test(v)) { $('#mMsg').innerHTML = '<span class="warn">that isn\'t a Solana address</span>'; return; } location.hash = v; };
      $('#mGo').addEventListener('click', go); $('#mIn').addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); return;
    }
    el.innerHTML = '<div class="empty" style="margin-top:40px"><b>reading the chain…</b></div>';
    try { const [r, c] = await Promise.all([api('coin', 'mint=' + mint), cfg()]); render(mint, r, c); }
    catch (e) { el.innerHTML = `<div class="coinhd"><span class="im" style="background-image:url(/memes/9.png)"></span><div style="min-width:0"><div class="eyebrow"><b>coin</b></div><h1 class="mono" style="font-size:clamp(22px,3vw,34px)">${short(mint, 8)}</h1></div></div><div style="margin-top:36px">${offline(e)}</div>`; setTimeout(() => { if (location.hash.includes(mint)) load(); }, 20000); }
  };
  function render(mint, r, c) {
    const pr = r.pair, st = r.stats, px = r.solUsd, pl = pr && PL[pr.p], sym = pr && pr.symbol || '', name = pr && pr.name || short(mint, 6);
    const img = pr ? imgOf(pr.img) : '/memes/9.png', link = `${location.origin}/coin#${mint}`;
    el.innerHTML = `<div class="coinhd"><span class="im" style="background-image:url('${esc(img)}')"></span><div style="min-width:0"><div class="eyebrow"><b>$${esc(sym || 'coin')}</b> on pump.fun</div><h1>${esc(name)}</h1>${pr ? `<div class="pline">fees to <a href="/creator#${esc(pr.p)}:${esc(pr.h)}"><b>${esc(pl.host)}/${esc(pr.h)}</b></a> via .meme</div>` : '<div class="pline">not paired on .meme</div>'}</div></div>`
      + `<div class="acts" style="margin-top:24px"><a class="btn btn-g btn-s" href="https://pump.fun/coin/${mint}" target="_blank" rel="noopener">pump.fun ↗</a><a class="btn btn-g btn-s" href="${solscan(mint, 'token')}" target="_blank" rel="noopener">solscan ↗</a><a class="btn btn-g btn-s" href="https://dexscreener.com/solana/${mint}" target="_blank" rel="noopener">chart ↗</a><button class="btn btn-g btn-s" type="button" data-c="${mint}">copy address</button>${pr ? `<a class="btn btn-g btn-s" href="${shareX(`$${sym} sends its fees to ${pl.host}/${pr.h} on .meme. every trade pays them.\n\n${link}`)}" target="_blank" rel="noopener">share on x</a>` : ''}</div>`
      + `<div class="bigs"><div class="card"><span>market cap</span><b id="kM">${st ? sol(st.mcapSol, 1) : '—'}</b><small id="kMu">${st && px ? '≈ ' + usd(st.mcapSol * px) : ''}</small></div><div class="card"><span>the curve</span><b>${st ? (st.graduated ? 'done' : num(st.progress * 100, 1) + '%') : '—'}</b><small>${st ? (st.graduated ? 'graduated to PumpSwap' : 'toward graduation') : 'no curve found'}</small></div><div class="card"><span>launched</span><b>${pr ? ago(pr.time) : '—'}</b><small>${pr ? `by <a class="pink" href="${solscan(pr.launcher, 'account')}" target="_blank" rel="noopener">${short(pr.launcher)}</a>` : ''}</small></div><div class="card"><span>its creator</span><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pr ? '@' + esc(pr.h) : '—'}</b><small>${pr ? 'paid in ' + esc(RAIL[pr.p]) : 'not paired here'}</small></div></div>`
      + `<div class="lay"><div style="display:grid;gap:22px;min-width:0"><div class="card pane curvec"><div class="tapeh"><h3>the curve</h3><span class="faint" id="cvP" style="font:500 12.5px JB">${st ? (st.graduated ? 'graduated' : num(st.progress * 100, 1) + '% to graduation') : '—'}</span></div><canvas id="curveCv" aria-hidden="true"></canvas><div class="mlabels"><span>launch</span><span>graduation</span></div></div><div class="card pane"><div class="tapeh"><h3>live trades</h3><span class="chip" id="feed"><i></i>connecting</span></div><p class="sub">straight from pump.fun's feed, from the moment you opened this page.</p><div class="tape" id="tape"><div class="wait">waiting for the next trade…</div></div></div></div>`
      + `<div class="stick2"><div class="card tbox"><div class="side" id="tSide"><button class="on" data-s="buy" type="button">buy</button><button class="sell" data-s="sell" type="button">sell</button></div><div class="inp"><input id="tAmt" inputmode="decimal" placeholder="0.1" autocomplete="off" aria-label="amount"><span id="tUnit">SOL</span></div><div class="quick" id="tQuick"></div><div class="vline" id="tBal"></div><div class="out" id="tOut">type an amount for a live quote.</div><button class="btn btn-p" id="tGo" type="button">buy $${esc(sym || 'it')}</button><div class="msg" id="tMsg"></div><small>routed by Jupiter, signed in your own wallet. memecoins are risky; most go to zero.</small></div>`
      + (pr ? `<div class="card vault"><small>where its fees go</small><div class="vline"><span>@${esc(pr.h)}'s vault holds</span><b id="fW">…</b></div><div class="meter"><i id="fM" style="--w:0%"></i></div><div class="mlabels"><span>$0</span><span>next gift at $${c.quantumUsd || 25}</span></div><a class="btn btn-g btn-s" href="/creator#${esc(pr.p)}:${esc(pr.h)}">see @${esc(pr.h)}</a></div>` : '') + `</div></div>`;
    if (pr) api('creator', `p=${pr.p}&h=${encodeURIComponent(pr.h)}`).then(x => { const w = x.creator.waitingSol, u = w != null && x.solUsd ? w * x.solUsd : null; $('#fW').textContent = w == null ? '—' : sol(w, 4) + (u != null ? ' · ' + usd(u) : ''); if (u != null) setTimeout(() => $('#fM').style.setProperty('--w', (clamp((u % 25) / 25) * 100).toFixed(1) + '%'), 200); }).catch(() => { $('#fW').textContent = '—'; });
    tape(mint, px); trade(mint, sym); curve(st);
  }
  // the bonding curve, drawn live: the part already bought fills in, and every trade rings out from the head
  const CV = { p: 0, shown: 0, blips: [] };
  function curve(st) {
    CV.p = st ? (st.graduated ? 1 : st.progress) : 0; CV.shown = 0; CV.blips = []; const cv = $('#curveCv'); if (!cv) return;
    const g = cv.getContext('2d'), D = Math.min(2, devicePixelRatio || 1); let w = 0, h = 0, on = true;
    const size = () => { const r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = Math.max(1, w * D); cv.height = Math.max(1, h * D); g.setTransform(D, 0, 0, D, 0, 0); }; size(); addEventListener('resize', size);
    new IntersectionObserver(es => es.forEach(e => on = e.isIntersecting)).observe(cv);
    const P = x => (1 / Math.pow(1 - .74 * x, 2) - 1) / (1 / Math.pow(.26, 2) - 1), N = 90;
    const fr = now => {
      if (!cv.isConnected) return; requestAnimationFrame(fr); if (!on || document.hidden) return; const t = now / 1000;
      CV.shown += (CV.p - CV.shown) * (RMq ? 1 : .05); const s = clamp(CV.shown);
      const L = 10, R = w - 10, T = 16, B = h - 4, X = x => L + (R - L) * x, Y = y => B - (B - T) * y;
      g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(247,238,243,.06)'; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(L, T + (B - T) * i / 4); g.lineTo(R, T + (B - T) * i / 4); g.stroke(); }
      g.strokeStyle = 'rgba(255,90,168,.28)'; g.lineWidth = 1.5; g.setLineDash([4, 5]); g.beginPath(); for (let i = 0; i <= N; i++) { const x = i / N; i ? g.lineTo(X(x), Y(P(x))) : g.moveTo(X(x), Y(P(x))); } g.stroke(); g.setLineDash([]);
      const gr = g.createLinearGradient(0, T, 0, B); gr.addColorStop(0, 'rgba(255,90,168,.42)'); gr.addColorStop(1, 'rgba(255,90,168,.02)');
      g.beginPath(); g.moveTo(X(0), B); for (let i = 0; i <= N; i++) { const x = s * i / N; g.lineTo(X(x), Y(P(x))); } g.lineTo(X(s), B); g.closePath(); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#ff5aa8'; g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i <= N; i++) { const x = s * i / N; i ? g.lineTo(X(x), Y(P(x))) : g.moveTo(X(x), Y(P(x))); } g.stroke();
      if (!RMq) for (let k = 0; k < 6; k++) { const x = s * ((t * .16 + k / 6) % 1); g.fillStyle = 'rgba(255,194,224,.85)'; g.beginPath(); g.arc(X(x), Y(P(x)), 1.8, 0, 6.29); g.fill(); }
      const hx = X(s), hy = Y(P(s)); g.fillStyle = 'rgba(255,90,168,.2)'; g.beginPath(); g.arc(hx, hy, 10 + Math.sin(t * 3) * 3, 0, 6.29); g.fill(); g.fillStyle = '#ff5aa8'; g.beginPath(); g.arc(hx, hy, 5.5, 0, 6.29); g.fill();
      for (let i = CV.blips.length - 1; i >= 0; i--) { const b = CV.blips[i], u = (now - b.t) / 900; if (u >= 1) { CV.blips.splice(i, 1); continue; } g.strokeStyle = b.buy ? `rgba(94,240,176,${1 - u})` : `rgba(255,107,122,${1 - u})`; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, 6 + u * 28, 0, 6.29); g.stroke(); }
      g.strokeStyle = 'rgba(247,238,243,.32)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(R, T - 8); g.lineTo(R, B); g.stroke(); g.setLineDash([]);
      g.fillStyle = s >= 1 ? '#5ef0b0' : 'rgba(247,238,243,.55)'; g.beginPath(); g.moveTo(R, T - 8); g.lineTo(R - 12, T - 4); g.lineTo(R, T); g.fill();
    };
    requestAnimationFrame(fr);
  }
  function tape(mint, px) {
    const feed = $('#feed'), box = $('#tape'); let n = 0;
    const set = (k, t) => { feed.className = 'chip ' + k; feed.innerHTML = `<i></i>${t}`; };
    const open = () => {
      try { ws = new WebSocket('wss://pumpportal.fun/api/data'); } catch { return set('', 'feed unavailable'); }
      ws.onopen = () => { set('live', 'live'); ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: [mint] })); };
      ws.onmessage = e => {
        let d; try { d = JSON.parse(e.data); } catch { return; } if (d.mint !== mint || !d.txType) return;
        if (!n++) box.innerHTML = ''; const b = d.txType === 'buy', row = document.createElement('div'); row.className = 'tp';
        row.innerHTML = `<span class="faint">${new Date().toTimeString().slice(0, 8)}</span><span class="${b ? 'b' : 's'}">${b ? 'buy' : 'sell'}</span><span>${sol(+d.solAmount, 3)}</span><a href="${solscan(d.signature)}" target="_blank" rel="noopener">${esc(short(d.traderPublicKey))} ↗</a>`;
        box.prepend(row); while (box.children.length > 80) box.lastChild.remove();
        CV.blips.push({ t: performance.now(), buy: b }); const vt = +d.vTokensInBondingCurve; if (vt > 2e8 && vt < 1.1e9) { CV.p = clamp((1073000000 - vt) / 793100000); const cp = $('#cvP'); if (cp) cp.textContent = num(CV.p * 100, 1) + '% to graduation'; }
        if (d.marketCapSol) { $('#kM').textContent = sol(+d.marketCapSol, 1); if (px) $('#kMu').textContent = '≈ ' + usd(d.marketCapSol * px); }
      };
      ws.onclose = () => { set('', 'reconnecting'); clearTimeout(wsT); wsT = setTimeout(open, 4000); };
    };
    open();
  }
  function trade(mint, sym) {
    let side = 'buy', bal = null, dec = 6, qo = null, qn = 0, qt = 0;
    const amt = $('#tAmt'), out = $('#tOut'), go = $('#tGo'), msg = (t, k = '') => { const m = $('#tMsg'); m.className = 'msg ' + k; m.innerHTML = t; };
    const quick = () => { $('#tQuick').innerHTML = side === 'buy' ? ['0.1', '0.25', '0.5', '1'].map(v => `<button type="button" data-v="${v}">${v}</button>`).join('') : ['25', '50', '100'].map(v => `<button type="button" data-p="${v}" ${bal && bal.token && bal.token.ui > 0 ? '' : 'disabled'}>${v}%</button>`).join(''); };
    const showBal = () => { $('#tBal').innerHTML = !W.pk ? '' : !bal ? '<span>reading your wallet…</span>' : `<span>you hold</span><b>${side === 'buy' ? sol(bal.sol, 3) : num(bal.token ? bal.token.ui : 0, 0) + ' $' + esc(sym || 'coin')}</b>`; };
    const loadBal = async () => { bal = null; showBal(); if (!W.pk) return; try { bal = await api('bal', `wallet=${W.pk}&mint=${mint}`); if (bal.token) dec = bal.token.decimals; } catch { bal = { sol: null, token: null }; } showBal(); quick(); };
    const getQuote = async () => {
      const v = parseFloat(String(amt.value).replace(',', '.')); qo = null; clearTimeout(qt);
      if (!(v > 0)) { out.innerHTML = 'type an amount for a live quote.'; return; }
      const raw = side === 'buy' ? String(Math.round(v * 1e9)) : (amt.dataset.raw && amt.dataset.v === amt.value ? amt.dataset.raw : String(BigInt(Math.round(v * 10 ** dec))));
      const my = ++qn; out.innerHTML = 'quoting…';
      try {
        const r = await api('quote', `in=${side === 'buy' ? SOL : mint}&out=${side === 'buy' ? mint : SOL}&amt=${raw}&slip=300`); if (my !== qn) return; qo = r;
        const o = Number(r.outAmount) / (side === 'buy' ? 10 ** dec : 1e9), via = (r.routePlan || []).map(x => x.swapInfo && x.swapInfo.label).filter(Boolean)[0] || 'Jupiter';
        out.innerHTML = `you get about <b>${side === 'buy' ? num(o, 0) + ' $' + esc(sym || 'coin') : sol(o, 4)}</b><br><span class="faint">price impact ${num(+r.priceImpactPct * 100, 2)}% · via ${esc(via)}</span>`;
        qt = setTimeout(getQuote, 15000);
      } catch (e) { if (my === qn) out.innerHTML = `<span class="dim">no route right now: ${esc(String(e.message).replace(/\.$/, ''))}</span>`; }
    };
    let deb = 0; amt.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(getQuote, 380); });
    const sideBtns = $$('#tSide button');
    $('#tSide').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; side = b.dataset.s; sideBtns.forEach(x => x.classList.toggle('on', x === b)); $('#tUnit').textContent = side === 'buy' ? 'SOL' : '$' + (sym || 'coin'); amt.placeholder = side === 'buy' ? '0.1' : '0'; amt.value = ''; go.textContent = `${side} $${sym || 'it'}`; quick(); showBal(); getQuote(); });
    $('#tQuick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; if (b.dataset.v) { amt.value = b.dataset.v; delete amt.dataset.raw; } else if (bal && bal.token) { const raw = BigInt(bal.token.raw) * BigInt(b.dataset.p) / 100n; amt.value = String(Number(raw) / 10 ** dec); amt.dataset.raw = raw.toString(); amt.dataset.v = amt.value; } getQuote(); });
    go.addEventListener('click', async () => {
      if (!W.pk) return connect();
      if (!(parseFloat(amt.value) > 0)) { amt.focus(); return msg('type an amount first'); }
      go.disabled = true; go.classList.add('busy'); msg('');
      try { await getQuote(); if (!qo) throw new Error('no route for that amount right now'); const r = await post('swap', { wallet: W.pk, quote: qo }); const s = await signSend([r.tx], t => msg(esc(t))); msg(`done. <a href="${solscan(s.sigs[0])}" target="_blank" rel="noopener">view it on solscan ↗</a>`, 'ok'); toast(side === 'buy' ? 'bought' : 'sold'); amt.value = ''; out.innerHTML = 'type an amount for a live quote.'; loadBal(); }
      catch (e) { msg(esc(human(e)), 'err'); }
      finally { go.disabled = false; go.classList.remove('busy'); }
    });
    quick(); onWallet(() => loadBal());
  }
  addEventListener('hashchange', load); load();
}

// ================================================================ /receipts
async function receiptsPage() {
  let all = [], P = '';
  const T = $('#rT'), render = () => { const xs = all.filter(y => !P || y.p === P); T.innerHTML = head7 + (xs.length ? xs.map(row7).join('') : `<div class="row"><span class="dim" style="grid-column:1/-1">${all.length ? 'none on this app yet.' : 'no payouts yet. each one will be listed here with its proof.'}</span></div>`); };
  seg($('#rP'), b => { P = b.dataset.p; render(); });
  const c = await cfg();
  $('#rW').innerHTML = c.payout ? `<span>payout wallet · the only signer that counts</span><b><a href="${solscan(c.payout, 'account')}" target="_blank" rel="noopener">${short(c.payout, 6)} ↗</a></b><button class="btn btn-g btn-s" type="button" data-c="${esc(c.payout)}">copy</button>` : '<span>payout wallet</span><b>not set on this site yet, so no receipt can count</b>';
  const load = async () => { try { const r = await api('receipts'); all = r.receipts; render(); } catch (e) { if (!all.length) T.innerHTML = head7 + `<div class="row"><span class="dim" style="grid-column:1/-1">the chain isn't answering right now: ${esc(e.message)}</span></div>`; setTimeout(load, 20000); } };
  load(); setInterval(load, 45000);
}

// ================================================================ /console: the payout desk
async function consolePage() {
  const el = $('#con'), c = await cfg(); let reg = null, err = null;
  el.innerHTML = '<div id="kGate"></div><div class="h3s"><h3>the queue</h3><span class="faint">vaults with fees waiting, fullest first</span></div><div class="tbl" id="kQ"></div>'
    + '<div class="h3s"><h3>record a gift</h3><span class="faint">one memo on Solana, signed by the payout wallet</span></div>'
    + `<div class="card pane" style="margin-top:20px"><div class="fgrid"><div class="field full"><label>the app</label><div><div class="seg" id="kApp"><button class="on" data-p="x" type="button">x money</button><button data-p="instagram" type="button">gifts</button><button data-p="facebook" type="button">stars</button></div></div></div><div class="field"><label for="kH">the creator</label><div class="inp"><span>@</span><input id="kH" placeholder="their handle" autocomplete="off" spellcheck="false"></div></div><div class="field"><label for="kU">what arrived</label><div class="inp"><span>$</span><input id="kU" inputmode="decimal" placeholder="25" autocomplete="off"></div></div><div class="field"><label for="kS">what it took</label><div class="inp"><input id="kS" inputmode="decimal" placeholder="0.000" autocomplete="off"><span>SOL</span></div></div><div class="field"><label for="kP">the proof</label><div class="inp"><input id="kP" placeholder="https:// the gift on their post" autocomplete="off" spellcheck="false"></div></div></div><div class="acts" style="margin-top:20px"><button class="btn btn-p" id="kGo" type="button">sign the receipt</button></div><div class="msg" id="kMsg" style="margin-top:12px"></div></div>`
    + `<div class="h3s"><h3>asked out</h3><span class="faint">set in MEME_OPTOUT as app:handle, comma-separated</span></div><div class="chips" style="margin-top:18px">${(c.optout || []).length ? c.optout.map(s => `<span class="chip out"><i></i>${esc(s)}</span>`).join('') : '<span class="dim">nobody has asked out.</span>'}</div>`;
  const op = () => !!(W.pk && c.payout && W.pk === c.payout);
  const gate = () => {
    $('#kGate').innerHTML = !c.payout ? '<div class="card gate"><p>no payout wallet is set for this site. set <b>MEME_PAYOUT</b>, or <b>payout</b> in api/meme-config.json, to the wallet that sends the gifts.</p></div>'
      : !W.pk ? `<div class="card gate"><p>the payout wallet is <b>${short(c.payout, 6)}</b>. connect it to collect and record. anyone else can watch.</p><button class="btn btn-p" type="button" data-act="connect">connect</button></div>`
        : !op() ? `<div class="card gate"><p>this wallet (<b>${short(W.pk)}</b>) isn't the payout wallet (<b>${short(c.payout)}</b>). nothing here will sign for it.</p><span class="chip"><i></i>watching</span></div>`
          : `<div class="card gate"><p>signed in as the payout wallet, <b>${short(W.pk, 6)}</b>.</p><span class="chip live"><i></i>desk open</span></div>`;
    $('#kGo').disabled = !op();
  };
  const queue = () => {
    const Q = $('#kQ'), hd = '<div class="qrow h"><span>creator</span><span>waiting</span><span>worth</span><span>gifts</span><span></span></div>';
    if (!reg) { Q.innerHTML = hd + `<div class="qrow"><span class="dim" style="grid-column:1/-1">${err ? "the chain isn't answering right now: " + esc(err) : 'reading the chain…'}</span></div>`; return; }
    const px = reg.solUsd, xs = reg.creators.filter(x => x.waitingSol > 0 && !x.out).sort((a, b) => b.waitingSol - a.waitingSol);
    Q.innerHTML = hd + (xs.length ? xs.map(x => { const u = px ? x.waitingSol * px : null; return `<div class="qrow"><span><a href="/creator#${esc(x.p)}:${esc(x.h)}">@${esc(x.h)}</a> <span class="faint">· ${esc(PL[x.p].name)}</span></span><span class="mono">${sol(x.waitingSol, 4)}</span><span class="mono">${usd(u)}</span><span class="mono">${u != null ? Math.floor(u / (c.quantumUsd || 25)) + ' × $' + (c.quantumUsd || 25) : '—'}</span><button class="btn btn-g btn-s" type="button" data-col="${esc(x.p)}:${esc(x.h)}" ${op() ? '' : 'disabled'}>collect</button></div>`; }).join('') : `<div class="qrow"><span class="dim" style="grid-column:1/-1">${c.ready ? 'no vault has fees waiting right now.' : 'vaults can\'t be read until the vault key is set.'}</span></div>`);
  };
  $('#kQ').addEventListener('click', async e => {
    const b = e.target.closest('[data-col]'); if (!b || b.disabled) return; const [p, h] = b.dataset.col.split(':');
    b.disabled = true; b.classList.add('busy');
    try { const r = await post('buildCollect', { wallet: W.pk, platform: p, handle: h }); const s = await signSend([r.tx]); toast(`collected ${sol(r.sol, 4)} from @${esc(h)} · <a class="pink" href="${solscan(s.sigs[0])}" target="_blank" rel="noopener">tx ↗</a>`); $('#kH').value = h; $$('#kApp button').forEach(x => x.classList.toggle('on', x.dataset.p === p)); kApp = p; placeK && placeK(); load(); }
    catch (er) { toast(esc(human(er))); } finally { b.disabled = false; b.classList.remove('busy'); }
  });
  let kApp = 'x'; const placeK = seg($('#kApp'), b => { kApp = b.dataset.p; });
  $('#kGo').addEventListener('click', async () => {
    const m = $('#kMsg'), say = (t, k = '') => { m.className = 'msg ' + k; m.innerHTML = t; };
    const h = normH($('#kH').value), u = parseFloat(($('#kU').value || '25').replace(',', '.')), s = parseFloat(($('#kS').value || '0').replace(',', '.')), proof = $('#kP').value.trim();
    if (!HANDLE[kApp].test(h)) return say(`that doesn't look like a ${PL[kApp].name} handle`, 'err');
    if (!(u > 0)) return say('enter the dollars that arrived', 'err');
    if (proof && !/^https:\/\/[^\s"'<>]{6,120}$/.test(proof)) return say('the proof has to be an https link', 'err');
    const go = $('#kGo'); go.disabled = true; go.classList.add('busy'); say('');
    try { const r = await post('buildPaid', { wallet: W.pk, platform: kApp, handle: h, usd: u, sol: s, proof }); const x = await signSend([r.tx], t => say(esc(t))); say(`recorded. <a href="${solscan(x.sigs[0])}" target="_blank" rel="noopener">the receipt on solscan ↗</a>`, 'ok'); ['#kH', '#kU', '#kS', '#kP'].forEach(k => $(k).value = ''); }
    catch (e) { say(esc(human(e)), 'err'); } finally { go.classList.remove('busy'); gate(); }
  });
  const load = async () => { try { reg = await api('register'); err = null; } catch (e) { err = e.message; } queue(); };
  onWallet(() => { gate(); queue(); }); load(); setInterval(load, 40000);
}

// ================================================================ /docs: the contents follow the reader
function docsPage() {
  const links = $$('.toc a'), map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { links.forEach(a => a.classList.remove('on')); const a = map.get(e.target.id); a && a.classList.add('on'); } }), { rootMargin: '-15% 0px -75% 0px' });
  $$('.doc h2[id]').forEach(h => io.observe(h)); spots();
  cfg().then(c => { if (c.tag) $('#dTag').textContent = c.tag; });
}

// ================================================================ 404: the sad face looks at you
function nfPage() { const f = $('.nf .face'); if (!f) return; addEventListener('pointermove', e => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; f.style.translate = `${x * 18}px ${y * 12}px`; }, { passive: true }); }

({ pair: pairPage, creators: creatorsPage, creator: creatorPage, coin: coinPage, receipts: receiptsPage, console: consolePage, docs: docsPage, 404: nfPage })[PAGE]?.();
