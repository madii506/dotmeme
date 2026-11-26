// .meme chain side. Every coin is launched on pump.fun by the visitor's own wallet, with one change: the coin's
// on-chain creator is a vault derived for the paired creator (platform + handle), so its creator fees collect there
// and nowhere else. The official pump SDK builds every pump instruction; web3.js compiles and sends.
const crypto = require('crypto');
let W3, P;
const w3 = () => W3 || (W3 = require('@solana/web3.js'));
const pump = () => P || (P = require('@pump-fun/pump-sdk'));
const CFG = require('./meme-config.json');

const RPCS = [process.env.RPC_URL, 'https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'].filter(Boolean);
const MEMO = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const TAG = process.env.MEME_TAG || CFG.tag;
const INITIAL_REAL_TOKENS = 793100000000000n;

function err(code, msg, extra) { const e = new Error(msg); e.code = code; e.extra = extra; return e; }
const mem = new Map();
async function cached(key, ms, fn) {
  const c = mem.get(key); if (c && c.has && Date.now() - c.t < ms) return c.v; if (c && c.p) return c.p;
  const p = (async () => { try { const v = await fn(); mem.set(key, { t: Date.now(), v, has: true }); return v; } catch (e) { if (c && c.has) { mem.set(key, { t: c.t, v: c.v, has: true }); return c.v; } mem.delete(key); throw e; } })();
  mem.set(key, { ...(c || {}), p }); return p;
}
let conns = null;
function connections() { if (!conns) { const { Connection } = w3(); conns = RPCS.map(u => new Connection(u, { commitment: 'confirmed', disableRetryOnRateLimit: true, fetch: (url, o = {}) => fetch(url, { ...o, signal: AbortSignal.timeout(10000) }) })); } return conns; }
async function rpc(fn) { let last; for (const c of connections()) { try { return await fn(c); } catch (e) { last = e; } } throw err(502, 'Solana is not answering right now. Try again in a moment.', { detail: String(last && last.message || last).slice(0, 160) }); }

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58enc(buf) { let n = 0n; for (const b of buf) n = n * 256n + BigInt(b); let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of buf) { if (b === 0) s = '1' + s; else break; } return s; }
function b58dec(str) { let n = 0n; for (const c of str) { const i = B58.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); } const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; } for (const c of str) { if (c === '1') out.unshift(0); else break; } return Buffer.from(out); }
function isAddr(s) { if (typeof s !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false; try { return b58dec(s).length === 32; } catch { return false; } }
function edVerify(pub32, msg, sig64) { try { const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pub32)]), format: 'der', type: 'spki' }); return crypto.verify(null, Buffer.from(msg), key, Buffer.from(sig64)); } catch { return false; } }

// ---------- creators: one vault per platform + handle, derived from the operator's secret ----------
const PLATFORMS = { x: { name: 'X', rail: 'X Money', url: h => 'https://x.com/' + h }, instagram: { name: 'Instagram', rail: 'Gifts on their Reels', url: h => 'https://instagram.com/' + h }, facebook: { name: 'Facebook', rail: 'Stars', url: h => 'https://facebook.com/' + h } };
function norm(platform, handle) {
  const p = String(platform || '').toLowerCase(); if (!PLATFORMS[p]) throw err(400, 'pick X, Instagram or Facebook');
  const h = String(handle || '').trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').split(/[/?#]/)[0].toLowerCase();
  const ok = p === 'x' ? /^[a-z0-9_]{1,15}$/ : p === 'instagram' ? /^[a-z0-9._]{1,30}$/ : /^[a-z0-9.]{3,50}$/;
  if (!ok.test(h)) throw err(400, `that doesn't look like a ${PLATFORMS[p].name} handle`);
  return { p, h };
}
const secret = () => process.env.MEME_SECRET || '';
const ready = () => secret().length >= 24;
function vaultKey(p, h) {
  if (!ready()) throw err(503, 'launching isn’t switched on yet');
  const seed = crypto.createHmac('sha256', secret()).update(`meme:vault:${p}:${h}`).digest();
  return w3().Keypair.fromSeed(seed);
}
function optedOut(p, h) { const list = [...(CFG.optout || []), ...String(process.env.MEME_OPTOUT || '').split(',')].map(s => s.trim().toLowerCase()).filter(Boolean); return list.includes(`${p}:${h}`); }

async function priorityFee() {
  return cached('prio', 20000, async () => { const r = await rpc(c => c.getRecentPrioritizationFees()); const v = r.map(x => x.prioritizationFee).filter(x => x > 0).sort((a, b) => a - b); const p = v.length ? v[Math.floor(v.length * .75)] : 50000; return Math.max(25000, Math.min(400000, p)); }).catch(() => 60000);
}
function compile(payer, ixs, blockhash) { const { TransactionMessage, VersionedTransaction } = w3(); return new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message()); }
function memoIx(signer, text) { const { TransactionInstruction, PublicKey } = w3(); return new TransactionInstruction({ programId: new PublicKey(MEMO), keys: [{ pubkey: signer, isSigner: true, isWritable: false }], data: Buffer.from(text, 'utf8') }); }
function tagIx(from) { const { SystemProgram, PublicKey } = w3(); return SystemProgram.transfer({ fromPubkey: from, toPubkey: new PublicKey(TAG), lamports: 0 }); }

// ---------- the launch: the visitor's wallet pays and signs, the mint key (made in the browser) signs last ----------
async function buildLaunch({ wallet, mint, p, h, name, symbol, uri, query, buyLamports }) {
  const { PublicKey, ComputeBudgetProgram } = w3(); const S = pump();
  const user = new PublicKey(wallet), mintPk = new PublicKey(mint), creator = vaultKey(p, h).publicKey;
  let ixs;
  if (buyLamports > 0) {
    const BN = require('bn.js'); const { NATIVE_MINT } = require('@solana/spl-token');
    const [global, feeConfig] = await Promise.all([rpc(c => new S.OnlinePumpSdk(c).fetchGlobal()), rpc(c => new S.OnlinePumpSdk(c).fetchFeeConfig())]);
    const solAmount = new BN(String(buyLamports));
    const amount = S.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount, quoteMint: NATIVE_MINT });
    ixs = await S.PUMP_SDK.createV2AndBuyInstructions({ global, mint: mintPk, name, symbol, uri, creator, user, amount, solAmount, mayhemMode: false });
  } else ixs = [await S.PUMP_SDK.createV2Instruction({ mint: mintPk, name, symbol, uri, creator, user, mayhemMode: false })];
  // the pairing, written next to the launch so anyone can rebuild the register from the chain
  ixs.push(memoIx(user, `meme:pair:1:${query}&m=${mint}`), tagIx(user));
  const price = await priorityFee(); const { blockhash } = await rpc(c => c.getLatestBlockhash('confirmed'));
  const probe = compile(user, [ComputeBudgetProgram.setComputeUnitLimit({ units: 800000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price }), ...ixs], blockhash);
  const sim = await rpc(c => c.simulateTransaction(probe, { sigVerify: false, replaceRecentBlockhash: true, commitment: 'processed' }));
  if (sim.value.err) {
    const txt = JSON.stringify(sim.value.err) + ' ' + (sim.value.logs || []).join(' ');
    if (/AccountNotFound|insufficient lamports|InsufficientFunds|0x1\b/i.test(txt)) throw err(402, `your wallet needs about ${(0.025 + buyLamports / 1e9).toFixed(3)} SOL for this launch`);
    throw err(400, 'pump.fun would reject this launch right now', { detail: JSON.stringify(sim.value.err), logs: (sim.value.logs || []).slice(-6) });
  }
  const cu = Math.min(1000000, Math.ceil((sim.value.unitsConsumed || 300000) * 1.2) + 10000);
  const tx = compile(user, [ComputeBudgetProgram.setComputeUnitLimit({ units: cu }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price }), ...ixs], blockhash);
  const keys = tx.message.staticAccountKeys.map(k => k.toBase58()), n = tx.message.header.numRequiredSignatures;
  if (keys[0] !== wallet || keys.indexOf(mint) < 0 || keys.indexOf(mint) >= n) throw err(500, 'unexpected launch layout');
  return { tx: Buffer.from(tx.serialize()).toString('base64'), vault: creator.toBase58() };
}
// relay signed transactions: every required signature must be valid, then send in order and wait for each
async function send(txs) {
  const { VersionedTransaction, Transaction } = w3(); const sigs = [];
  for (const b of txs) {
    const raw = Buffer.from(String(b || ''), 'base64'); let sig;
    try { const t = VersionedTransaction.deserialize(raw); const msg = Buffer.from(t.message.serialize()), keys = t.message.staticAccountKeys, n = t.message.header.numRequiredSignatures; for (let i = 0; i < n; i++) if (!edVerify(keys[i].toBytes(), msg, t.signatures[i])) throw err(400, 'a signature is missing'); sig = b58enc(t.signatures[0]); }
    catch (e) { if (e.code) throw e; const t = Transaction.from(raw); if (!t.verifySignatures()) throw err(400, 'a signature is missing'); sig = b58enc(t.signature); }
    await rpc(c => c.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: 'processed', maxRetries: 3 }));
    for (let k = 0; k < 30; k++) { const s = (await rpc(c => c.getSignatureStatuses([sig]))).value[0]; if (s && s.err) throw err(400, 'transaction failed: ' + JSON.stringify(s.err)); if (s && /confirmed|finalized/.test(s.confirmationStatus || '')) break; await new Promise(r => setTimeout(r, 800)); }
    sigs.push(sig);
  }
  return sigs;
}

// ---------- the register and the receipts, rebuilt from the chain: every pairing and payout carries a memo and the tag ----------
async function scan() {
  return cached('scan', 40000, async () => {
    const { PublicKey } = w3();
    const sigs = (await rpc(c => c.getSignaturesForAddress(new PublicKey(TAG), { limit: 1000 }))).filter(s => !s.err);
    const pairs = [], paid = [];
    for (let i = 0; i < sigs.length; i += 50) {
      const part = sigs.slice(i, i + 50);
      const txs = await rpc(c => c.getParsedTransactions(part.map(s => s.signature), { maxSupportedTransactionVersion: 0 })).catch(() => []);
      txs.forEach((t, k) => {
        if (!t) return; const ins = t.transaction.message.instructions, time = t.blockTime, sig = part[k].signature, from = t.transaction.message.accountKeys[0].pubkey.toBase58();
        for (const ix of ins) {
          if (ix.program !== 'spl-memo' || typeof ix.parsed !== 'string') continue;
          if (ix.parsed.startsWith('meme:pair:1:')) { const q = new URLSearchParams(ix.parsed.slice(12)); const m = q.get('m'); if (m && isAddr(m)) pairs.push({ mint: m, p: q.get('p'), h: q.get('h'), name: q.get('n'), symbol: q.get('s'), img: q.get('i'), time, sig, launcher: from }); }
          if (ix.parsed.startsWith('meme:paid:1:') && from === CFG.payout) { const q = new URLSearchParams(ix.parsed.slice(12)); paid.push({ p: q.get('p'), h: q.get('h'), usd: +q.get('usd') || 0, sol: +q.get('sol') || 0, proof: q.get('proof') || null, time, sig }); }
        }
      });
    }
    return { pairs: pairs.sort((a, b) => b.time - a.time), paid: paid.sort((a, b) => b.time - a.time) };
  });
}
async function vaultBalances(list) {
  // claimable creator fees for each paired creator, on the curve and in PumpSwap
  const out = {}; if (!ready()) return out; const S = pump();
  await Promise.all(list.slice(0, 60).map(async ({ p, h }) => { const k = `${p}:${h}`; try { const v = await cached('v:' + k, 30000, () => rpc(c => new S.OnlinePumpSdk(c).getCreatorVaultBalanceBothPrograms(vaultKey(p, h).publicKey))); out[k] = Number(v.toString()) / 1e9; } catch { } }));
  return out;
}
async function coinStats(mints) {
  if (!mints.length) return {};
  return cached('stats:' + mints.join(','), 25000, async () => {
    const { PublicKey } = w3(); const S = pump(), out = {};
    for (let i = 0; i < mints.length; i += 100) {
      const part = mints.slice(i, i + 100);
      const infos = await rpc(c => c.getMultipleAccountsInfo(part.map(m => S.bondingCurvePda(new PublicKey(m))), 'confirmed'));
      infos.forEach((info, j) => { if (!info) return; try { const bc = S.PUMP_SDK.decodeBondingCurve(info); const mcap = S.bondingCurveMarketCap({ mintSupply: bc.tokenTotalSupply, virtualQuoteReserves: bc.virtualQuoteReserves, virtualTokenReserves: bc.virtualTokenReserves }); const real = BigInt(bc.realTokenReserves.toString()); out[part[j]] = { mcapSol: Number(mcap.toString()) / 1e9, progress: bc.complete ? 1 : Math.max(0, Math.min(1, Number(INITIAL_REAL_TOKENS - real) / Number(INITIAL_REAL_TOKENS))), graduated: !!bc.complete }; } catch { } });
    }
    return out;
  });
}

async function balances(wallet, mint) {
  const { PublicKey } = w3(); const owner = new PublicKey(wallet);
  const lamports = await rpc(c => c.getBalance(owner, 'confirmed')); let token = null;
  if (mint) { const r = await rpc(c => c.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(mint) }, 'confirmed')); let raw = 0n, dec = 6; for (const a of r.value) { const t = a.account.data.parsed.info.tokenAmount; raw += BigInt(t.amount); dec = t.decimals; } token = { raw: raw.toString(), decimals: dec, ui: Number(raw) / 10 ** dec }; }
  return { sol: lamports / 1e9, token };
}

// ---------- the operator: move a creator's fees out of their vault, and record each payout on-chain ----------
async function buildCollect(wallet, p, h) {
  if (wallet !== CFG.payout && wallet !== process.env.MEME_PAYOUT) throw err(403, 'only the payout wallet can do this');
  const { PublicKey, ComputeBudgetProgram, SystemProgram } = w3(); const S = pump();
  const op = new PublicKey(wallet), vk = vaultKey(p, h);
  const bal = Number((await rpc(c => new S.OnlinePumpSdk(c).getCreatorVaultBalanceBothPrograms(vk.publicKey))).toString());
  if (bal < 1000000) throw err(400, 'less than 0.001 SOL is waiting for this creator');
  const ixs = await rpc(c => new S.OnlinePumpSdk(c).collectCoinCreatorFeeInstructions(vk.publicKey, op));
  if (!ixs.length) throw err(400, 'nothing to collect yet');
  const { blockhash } = await rpc(c => c.getLatestBlockhash('confirmed'));
  const tx = compile(op, [ComputeBudgetProgram.setComputeUnitLimit({ units: 260000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await priorityFee() }), ...ixs,
    SystemProgram.transfer({ fromPubkey: vk.publicKey, toPubkey: op, lamports: bal }), memoIx(op, `meme:collect:1:p=${p}&h=${h}&lamports=${bal}`), tagIx(op)], blockhash);
  tx.sign([vk]);
  return { tx: Buffer.from(tx.serialize()).toString('base64'), sol: bal / 1e9 };
}
async function buildPaid(wallet, p, h, usd, sol, proof) {
  if (wallet !== CFG.payout && wallet !== process.env.MEME_PAYOUT) throw err(403, 'only the payout wallet can do this');
  const { PublicKey } = w3(); const op = new PublicKey(wallet);
  const q = new URLSearchParams({ p, h, usd: String(usd), sol: String(sol) }); if (proof) q.set('proof', proof);
  const { blockhash } = await rpc(c => c.getLatestBlockhash('confirmed'));
  const tx = compile(op, [memoIx(op, `meme:paid:1:${q}`), tagIx(op)], blockhash);
  return { tx: Buffer.from(tx.serialize()).toString('base64') };
}

module.exports = { CFG, TAG, PLATFORMS, err, cached, rpc, isAddr, norm, ready, vaultKey, optedOut, buildLaunch, send, scan, vaultBalances, coinStats, balances, buildCollect, buildPaid };
