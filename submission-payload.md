# AutoSave — DoraHacks submission payload (ready to fill the form)

Hackathon: Reactive Omni Buildathon — https://dorahacks.io/hackathon/reactive-omni-buildathon/detail
Track: Set It and Forget It (personal automations)
Prize pool: $5,500 paid in REACT. Deadline: Dec 5, 2026 20:00 UTC (Dec 6, 04:00 Beijing).
Status 2026-11-25 01:36: contracts deployed, loop closed, demo video draft built.
Still needed before submitting: public GitHub repo URL (repo creation awaits user's
approval on the GitHub card) + final video with closing shot.

## Project name
AutoSave

## Short description (use in the form)
A personal auto-save rule that lives on-chain. Deposit test ETH into a DepositBox
on Unichain Sepolia; a reactive contract on Reactive Lasna watches the Deposit
event and, when the deposit is at or above the 0.01 ETH threshold, triggers a
callback that records the auto-save on the SavingsBoard. No bot, no server, no
polling. Dust deposits below the threshold are seen but ignored, so no callback
gas is wasted on the destination chain.

## Links
- Public repo: TBD — https://github.com/bisonglin-droid/autosave-reactive (after creation)
- Demo video: video/demo-video-draft.mp4 now; final video/demo-video-final.mp4 after
  the closing shot is added (see video/CLOSING-SHOT.md)
- Live demo page: frontend/index.html (addresses filled in, loop status readable)

## Deployed contracts (from deployments.json)
- DepositBox — Unichain Sepolia (1301): 0x8D1414a4Bd3edFFB1255e63a5da60306309CE535
  deploy tx 0x7fb6c355af7403768e90c2c2bc1271711774cb113308a18da1b944a2853b7d57
- AutoSaveReactive — Reactive Lasna (5318007): 0xf809473498EE1c66f5BD7f91cc36B09faE36E2e3
  deploy tx 0x5dec668553c0230cce4962b7a3ad0ba3dd3a4234414bff6bcae73590001647ae
- SavingsBoard — Unichain Sepolia (1301): 0x4d6BeFd50076c8eb2A26B74Be2ba0359238819E7
  deploy tx 0xab8f3d5e3daedc5c1cb323d2e58c6657162c8b5500987bdc8678bbd801547bb5
- setRecipient tx: 0xf8a2dbd4815944555af1ef833c9cae6036e9c404a3698a6662f98babe7de5494

## Loop evidence (origin event → react → callback)
- Origin deposit: 0x7297d2aa458c25faf7e6ef34da6008c86b6e4b7f0c1a2a18e77d1b8e80ca7707
  (Unichain block 68686610, 0.0105 ETH)
- React on Lasna: 0xb4723507d1fa8864ccb3e8078f75865f24bb8049386798922b2be52b90a54689
  (Lasna block 9151735)
- Callback landed on board: 0xa38e6c091bf1816d1127f817fd1c980564c2b78baeca193eb87aefec026e9185
  (Unichain block 68686612 — 2 blocks after the deposit)
- Loop check: Lasna reactions 1, callbacks requested 1, board callbacks received 1,
  total auto-saved 0.0105 ETH — LOOP CLOSED.
- Explorers: https://sepolia.uniscan.xyz · https://lasna.reactscan.net

## Contact (same as the Anna BUIDL the user gave)
- Telegram: @finance_wisdom
- WeChat: bsl4118

## Deployer wallet (for the record; never share the private key)
0x67CA1fff1AF32d2ABf385b16B94c72060ABb3C7E
