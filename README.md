# AutoSave — Reactive Omni Buildathon

**Track:** Set It and Forget It (personal automations)
**Hackathon:** [Reactive Omni Buildathon](https://dorahacks.io/hackathon/reactive-omni-buildathon/detail)
on DoraHacks · **Prize pool $5,500, paid in REACT** · **Deadline Dec 5, 2026 20:00 UTC
(Dec 6, 04:00 Beijing)**

## What it is

A personal auto-save rule that lives on-chain. You deposit test ETH into a
`DepositBox` on Unichain Sepolia. A reactive contract on Reactive Lasna watches
for the `Deposit` event; when a deposit is at or above the threshold
(default 0.01 ETH) it requests a callback, and `SavingsBoard` on Unichain
Sepolia records the auto-save (per-user total + count, `AutoSaved` event).
No bot, no server, no polling — the rule runs itself while the contracts stay
funded. Dust deposits below the threshold are seen but ignored, so no callback
gas is wasted on the destination chain.

Full loop: origin event → `react()` → callback → destination state change.
That loop is exactly what the judges score under **Execution** (entries without
on-chain reactive transactions and callbacks are not scored further).

## Contracts

| Contract | Chain | Role |
|---|---|---|
| `DepositBox` | Unichain Sepolia (1301) | Origin: `deposit()` emits `Deposit(address,uint256,uint256)` |
| `AutoSaveReactive` | Reactive Lasna (5318007) | Subscribes to `Deposit`; threshold-gated `requestCallbackV_1_0` |
| `SavingsBoard` | Unichain Sepolia (1301) | Callback: `onDeposit()` authenticated by proxy + reactive sender |

Key parameters (official docs, `dev.reactive.network`, verified 2026-11-24):

- System contract (both Reactive networks): `0x8888888888888888888888888888888888888888`
- Callback proxy, Unichain Sepolia (Omni docs): `0x775c9B990ADe401060B78D0e98684eEf8d2466C1`
  (the `0x9299…` address in older posts is the legacy network — do not use it)
- Lasna RPC `https://lasna-rpc.rnk.dev/`, chain 5318007, explorer
  `https://lasna.reactscan.net` · Unichain Sepolia RPC
  `https://sepolia.unichain.org`, chain 1301
- Reactive library: `Reactive-Network/reactive-lib-omni` (cloned under `lib/`)

Honest scope note: this MVP records the auto-save instruction on-chain. Moving
real funds would be a follow-up (a vault with custody). The event-driven loop
itself is fully real.

## Setup

```bash
node scripts/compile.js   # solc-js, writes build/*.json (bytecode + ABI)
node scripts/deploy.js    # deploys in order, wires setRecipient, smoke-test deposit
node scripts/check-loop.js  # polls Lasna + Unichain until the loop closes
```

Deployer key: `credentials-wallet.json` (600 permissions, fresh EVM wallet
created for this project only — never reuse another platform's wallet).
Never print or paste the private key anywhere.

## Funding (testnet only, $0)

The deployer needs ~0.08 Unichain Sepolia ETH and ~1 lREACT. Both are free
test tokens, but every no-signup route needs a browser step:

1. **Sepolia ETH** — Google Cloud Web3 faucet (0.05/day, Google sign-in) or
   Chainlink faucet (0.5, wallet connect) or QuickNode faucet (1 drip/12h).
   Paste the deployer address, claim, wait for the drip.
2. **lREACT** — send 0.1 Sepolia ETH to the Reactive faucet contract on
   Ethereum Sepolia `0x9b9BB25f1A81078C544C829c5EB7822d747Cf434`
   (1 ETH → 100 lREACT; never send more than 5 ETH per tx) or call
   `request(address)` on it. 0.1 ETH → 10 lREACT, more than enough.
3. **Unichain Sepolia ETH** — Uniswap faucet (`uniswap.org/faucet`) or bridge
   Sepolia ETH to Unichain Sepolia.

Then re-run `node scripts/deploy.js` — it refuses to proceed while balances
are insufficient and never buys gas.

## Submission checklist (DoraHacks page)

- [ ] Register on DoraHacks + pick track **Set It and Forget It** (browser step)
- [ ] Public repo link (this project; needs a public GitHub repo)
- [ ] Deployed contract addresses (`deployments.json` after deploy)
- [ ] Tx hashes showing the full loop: deposit → reactive tx → callback tx
- [ ] Demo video under 3 minutes (record after the loop closes)
- [ ] Submit before **Dec 5, 2026 20:00 UTC**

## Status (2026-11-24)

Contracts written and compiling clean (`node scripts/compile.js` → OK).
Deployment is **blocked on testnet gas**: the fresh deployer wallet holds 0 on
all chains. No money spent, nothing submitted yet. See `REPORT.md` for the
full record and the exact browser/user steps still needed.
