# .meme: notes before it goes live

Pair any meme to any creator. The coin launches on pump.fun from the visitor's wallet. Its on-chain creator is a vault that belongs to one handle on one app. The operator sends each $25 from that vault as a gift inside the creator's app.

## Environment variables (you set these in Vercel, never in chat)

| name | what it does |
|---|---|
| `MEME_SECRET` | **Required to launch.** Use at least 24 random characters. Every vault is derived from it. Back it up: if it is lost, every vault's fees are lost. If it changes, every handle gets a new vault. |
| `MEME_PAYOUT` | The payout wallet's address. You can put it in `payout` in `api/meme-config.json` instead. This is the only wallet that can collect or record receipts. |
| `MEME_HOST` | Optional. The public URL written into every coin's metadata. Without it, the project's production domain is used. Set it before the first launch if you'll use a custom domain. |
| `RPC_URL` | A paid Solana RPC. The public ones rate-limit the register scan. |
| `MEME_OPTOUT` | Creators who asked out, written as `x:handle,instagram:handle`, comma-separated. |
| `MEME_CA` | Optional: the $MEME contract address, once it exists. |

## Deploy, when you say so

1. Create a new GitHub repo and upload the contents of this folder.
2. Import the repo in Vercel and deploy.
3. Set the variables above, then redeploy.
4. Open the live site: check `/api/meme?a=config` (it should say `ready: true`) and `/pair`.

## Not proven on mainnet yet

- **Real launch.** No real launch has gone through yet. The transaction is built with pump.fun's SDK 4.2.0 (`create_v2` with `creator` set to the vault, which doesn't sign) and is simulated before the wallet sees it.
- **Fees after graduation.** Once a coin graduates to PumpSwap, its creator fees may arrive as wrapped SOL. The collect step is built for this but untested.
- **Trade box.** It goes through Jupiter. Routing for brand-new `create_v2` (Token-2022) curve coins hasn't been confirmed; the coin page also links to pump.fun.
- **Live trades.** They come from the PumpPortal websocket, which this sandbox blocks, so they need checking on the live site.

## Choices to confirm

- The docs say **.meme takes nothing from a vault**: everything collected goes to that creator's gifts. Change `/docs#cut` if you want a cut.
- **Opt-out contact.** Creators reach you through the X account in `x` in `api/meme-config.json`. Until that is set, creator pages offer only a "copy the opt-out line" button.

## Files

- `index.html`: the home page.
- `pair`, `creators`, `creator`, `coin`, `receipts`, `console`, `docs`, `404`: the app pages.
- `assets/js/core.js`, `home.js`, `app.js`: the page scripts.
- `api/meme.js` and `api/_chain.js`: the server.
- No database: the register and the receipts are rebuilt from memos on Solana.
