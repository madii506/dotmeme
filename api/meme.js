// .meme API. Pair any meme to any creator: the coin launches on pump.fun from the visitor's wallet, its creator fees
// collect in a vault for the paired creator, and the operator sends them to the creator inside their own app.
// GET  a=config · a=t (token metadata) · a=register · a=creator&p=&h= · a=coin&mint= · a=receipts · a=vault&p=&h= · a=quote · a=bal&wallet=&mint=
// POST a=buildLaunch · a=send · a=swap · a=buildCollect · a=buildPaid
const C = require('./_chain');
const JUP = 'https://lite-api.jup.ag';
const SOL = 'So11111111111111111111111111111111111111112';

const out = (res, code, body, cache) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', cache || 'no-store'); res.end(JSON.stringify(body)); };
// the public address written into every coin's metadata: MEME_HOST if set, else the project's production domain, so a coin
// launched from a preview or deployment URL still points at the live site
const host = req => process.env.MEME_HOST || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'https://' + (req.headers['x-forwarded-host'] || req.headers.host));
const body = req => new Promise(ok => { if (req.body) return ok(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); let d = ''; req.on('data', c => d += c); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
const b64u = s => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
const getJ = async (url, ms = 8000, opt = {}) => { const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { accept: 'application/json', ...(opt.headers || {}) }, method: opt.method || 'GET', body: opt.body }); if (!r.ok) throw new Error(url.split('/')[2] + ' answered ' + r.status); return r.json(); };

let solPx = null;
async function solUsd() { return C.cached('solusd', 60000, async () => { const j = await getJ(`${JUP}/price/v3?ids=${SOL}`, 5000); const v = j && j[SOL] && j[SOL].usdPrice; if (!v) throw new Error('no price'); return v; }).catch(() => solPx); }

function config() {
  return { name: '.meme', ready: C.ready(), tag: C.TAG, payout: C.CFG.payout || process.env.MEME_PAYOUT || null, quantumUsd: C.CFG.quantumUsd, ca: process.env.MEME_CA || C.CFG.ca || null, x: C.CFG.x || null,
    platforms: Object.fromEntries(Object.entries(C.PLATFORMS).map(([k, v]) => [k, { name: v.name, rail: v.rail }])), optout: [...(C.CFG.optout || []), ...String(process.env.MEME_OPTOUT || '').split(',').map(s => s.trim()).filter(Boolean)] };
}
function tokenMeta(req, q) {
  const name = clean(q.get('n'), 32), symbol = clean(q.get('s'), 10), i = String(q.get('i') || '1'), p = String(q.get('p') || ''), h = clean(q.get('h'), 50);
  const pl = C.PLATFORMS[p];
  const image = /^[1-9]$|^1[0-2]$/.test(i) ? host(req) + '/memes/' + i + '.png' : i[0] === 'u' ? unb64u(i.slice(1)) : host(req) + '/memes/1.png';
  return { name, symbol, image, description: pl ? `Paired to ${pl.name} @${h} via .meme. This coin's creator fees are sent to them as ${pl.rail}. Nobody asked them first; one message from them ends it.` : 'Launched on .meme.', external_url: host(req), ...(pl ? { pairing: `fees to ${pl.url(h).replace('https://', '')} via .meme` } : {}), createdOn: host(req) };
}
async function register() {
  const { pairs, paid } = await C.scan();
  const mints = pairs.map(x => x.mint), stats = await C.coinStats(mints).catch(() => ({}));
  const by = {};
  for (const x of pairs) { const k = `${x.p}:${x.h}`; const c = by[k] || (by[k] = { p: x.p, h: x.h, coins: [], first: x.time, paidUsd: 0, paidSol: 0, payouts: 0, out: C.optedOut(x.p, x.h) }); c.coins.push({ ...x, ...(stats[x.mint] || {}) }); c.first = Math.min(c.first, x.time); }
  for (const y of paid) { const c = by[`${y.p}:${y.h}`]; if (c) { c.paidUsd += y.usd; c.paidSol += y.sol; c.payouts++; c.lastPaid = Math.max(c.lastPaid || 0, y.time); } }
  const list = Object.values(by);
  const vb = await C.vaultBalances(list).catch(() => ({}));
  list.forEach(c => { c.waitingSol = vb[`${c.p}:${c.h}`] ?? null; });
  return { creators: list.sort((a, b) => b.first - a.first), coins: pairs.length, payouts: paid.length, paidUsd: paid.reduce((a, y) => a + y.usd, 0), solUsd: await solUsd() };
}
async function quote(q) {
  const inM = q.get('in'), outM = q.get('out'), amt = String(q.get('amt') || '').replace(/[^0-9]/g, ''), slip = Math.max(10, Math.min(5000, +q.get('slip') || 300));
  if (!C.isAddr(inM) || !C.isAddr(outM)) throw C.err(400, 'bad mint'); if (!amt || amt === '0') throw C.err(400, 'enter an amount');
  return getJ(`${JUP}/swap/v1/quote?inputMint=${inM}&outputMint=${outM}&amount=${amt}&slippageBps=${slip}`);
}

module.exports = async (req, res) => {
  const q = new URL(req.url, 'http://x').searchParams, a = q.get('a');
  try {
    if (a === 'config') return out(res, 200, config(), 's-maxage=30');
    if (a === 't') return out(res, 200, tokenMeta(req, q), 'public, max-age=31536000, immutable');
    if (a === 'register') return out(res, 200, await register(), 's-maxage=20, stale-while-revalidate=60');
    if (a === 'receipts') { const { paid } = await C.scan(); return out(res, 200, { receipts: paid.slice(0, 100), solUsd: await solUsd() }, 's-maxage=20'); }
    if (a === 'creator') { const { p, h } = C.norm(q.get('p'), q.get('h')); const r = await register(); const c = r.creators.find(x => x.p === p && x.h === h) || { p, h, coins: [], paidUsd: 0, paidSol: 0, payouts: 0, out: C.optedOut(p, h), waitingSol: null }; const { paid } = await C.scan(); return out(res, 200, { creator: c, receipts: paid.filter(y => y.p === p && y.h === h), solUsd: r.solUsd, quantumUsd: C.CFG.quantumUsd }, 's-maxage=20'); }
    if (a === 'coin') { const mint = q.get('mint'); if (!C.isAddr(mint)) throw C.err(400, 'bad mint'); const { pairs } = await C.scan(); const pair = pairs.find(x => x.mint === mint) || null; const st = (await C.coinStats([mint]))[mint] || null; return out(res, 200, { mint, pair, stats: st, solUsd: await solUsd() }, 's-maxage=10'); }
    if (a === 'vault') { const { p, h } = C.norm(q.get('p'), q.get('h')); return out(res, 200, { p, h, vault: C.vaultKey(p, h).publicKey.toBase58(), out: C.optedOut(p, h) }, 's-maxage=300'); }
    if (a === 'quote') return out(res, 200, await quote(q));
    if (a === 'bal') { const w = q.get('wallet'), mint = q.get('mint'); if (!C.isAddr(w)) throw C.err(400, 'bad wallet'); return out(res, 200, await C.balances(w, C.isAddr(mint) ? mint : null)); }
    if (req.method !== 'POST') return out(res, 404, { error: 'unknown action' });
    const b = await body(req);
    if (a === 'buildLaunch') {
      if (!C.isAddr(b.wallet)) throw C.err(400, 'connect a wallet first'); if (!C.isAddr(b.mint)) throw C.err(400, 'bad coin key');
      const { p, h } = C.norm(b.platform, b.handle); if (C.optedOut(p, h)) throw C.err(403, 'this creator asked not to be paired. their answer stands.');
      const name = clean(b.name, 32), symbol = String(b.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      if (name.length < 2) throw C.err(400, 'give the meme a name'); if (symbol.length < 2) throw C.err(400, 'give it a ticker, 2 to 10 letters');
      let img = String(b.image || '1'); if (/^([1-9]|1[0-2])$/.test(img)) { } else if (/^https:\/\/[^\s"'<>]{6,140}$/.test(img)) img = 'u' + b64u(img); else throw C.err(400, 'pick a meme, or paste an https image link');
      const query = new URLSearchParams({ n: name, s: symbol, i: img, p, h }).toString();
      const uri = host(req) + '/api/meme?a=t&' + query; if (uri.length > 200) throw C.err(400, 'that name or image link is too long for on-chain metadata');
      const buy = Math.max(0, +b.buySol || 0); if (buy > 10) throw C.err(400, 'the first buy is capped at 10 SOL here');
      const r = await C.buildLaunch({ wallet: b.wallet, mint: b.mint, p, h, name, symbol, uri, query, buyLamports: Math.round(buy * 1e9) });
      return out(res, 200, { ...r, uri, p, h });
    }
    if (a === 'send') { if (!Array.isArray(b.txs) || !b.txs.length || b.txs.length > 4) throw C.err(400, 'nothing to send'); return out(res, 200, { sigs: await C.send(b.txs) }); }
    if (a === 'swap') { if (!C.isAddr(b.wallet)) throw C.err(400, 'connect a wallet first'); if (!b.quote) throw C.err(400, 'get a quote first'); const j = await getJ(`${JUP}/swap/v1/swap`, 12000, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quoteResponse: b.quote, userPublicKey: b.wallet, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: 'auto' }) }); return out(res, 200, { tx: j.swapTransaction }); }
    if (a === 'buildCollect') { const { p, h } = C.norm(b.platform, b.handle); return out(res, 200, await C.buildCollect(b.wallet, p, h)); }
    if (a === 'buildPaid') { const { p, h } = C.norm(b.platform, b.handle); const usd = Math.round(+b.usd * 100) / 100, sol = Math.round(+b.sol * 1e6) / 1e6; if (!(usd > 0)) throw C.err(400, 'enter the dollar amount that arrived'); const proof = /^https:\/\/[^\s"'<>]{6,120}$/.test(b.proof || '') ? b.proof : null; return out(res, 200, await C.buildPaid(b.wallet, p, h, usd, sol > 0 ? sol : 0, proof)); }
    return out(res, 404, { error: 'unknown action' });
  } catch (e) { return out(res, e.code && e.code >= 400 && e.code < 600 ? e.code : 400, { error: e.message || String(e), ...(e.extra && e.extra.detail ? { detail: e.extra.detail } : {}) }); }
};
