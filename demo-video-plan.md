# AutoSave demo video plan (<3 min, English narration)

Target: DoraHacks Reactive Omni Buildathon submission, track "Set It and Forget It".
Deadline: Dec 5, 2026 20:00 UTC (Dec 6, 04:00 Beijing). Video must be <3 min.

## Evidence (all verified on-chain, 2026-11-25 00:53)
- DepositBox (Unichain Sepolia 1301): 0x8D1414a4Bd3edFFB1255e63a5da60306309CE535
  deploy tx 0x7fb6c355af7403768e90c2c2bc1271711774cb113308a18da1b944a2853b7d57
- AutoSaveReactive (Reactive Lasna 5318007): 0xf809473498EE1c66f5BD7f91cc36B09faE36E2e3
  deploy tx 0x5dec668553c0230cce4962b7a3ad0ba3dd3a4234414bff6bcae73590001647ae
- SavingsBoard (Unichain Sepolia 1301): 0x4d6BeFd50076c8eb2A26B74Be2ba0359238819E7
  deploy tx 0xab8f3d5e3daedc5c1cb323d2e58c6657162c8b5500987bdc8678bbd801547bb5
- setRecipient tx: 0xf8a2dbd4815944555af1ef833c9cae6036e9c404a3698a6662f98babe7de5494
- Smoke deposit: 0.0105 ETH, tx 0x7297d2aa458c25faf7e6ef34da6008c86b6e4b7f0c1a2a18e77d1b8e80ca7707
- Loop check (check-loop.js): Lasna reactions 1, callbacks requested 1,
  board callbacks received 1, total auto-saved 0.0105 ETH — LOOP CLOSED.
- Explorers: Unichain https://sepolia.uniscan.xyz, Lasna https://lasna.reactscan.net

## Shots (target ~2:00–2:30 total)
1. (0:00–0:20) Title + the idea: a personal auto-save rule that lives on-chain.
   No bot, no server, no polling. Show the 3-step loop diagram from frontend/index.html.
2. (0:20–0:50) The three contracts + deployed addresses (frontend page, filled in).
   DepositBox on Unichain Sepolia → AutoSaveReactive on Reactive Lasna → SavingsBoard.
3. (0:50–1:30) The live loop: refresh the frontend status — reactions 1, callbacks 1,
   total auto-saved 0.0105 ETH, "LOOP CLOSED". Show the smoke-deposit tx on the
   Unichain explorer and the reactive tx on Lasna explorer.
4. (1:30–2:10) Why it matters: threshold-gated (dust below 0.01 ETH is seen but
   ignored, no callback gas wasted); runs itself while contracts stay funded.
5. (2:10–2:30) Close: repo link + "Set It and Forget It".

## Build method
- Stills: headless Chromium screenshots of frontend/index.html (1080p) + explorer pages.
- Narration: English TTS (spoken_audio skill), ~300 words for ~2:15.
- Assemble: ffmpeg — stills with slow zoom, narration track, on-screen captions
  with the contract addresses and tx hashes. ffmpeg 8.1.2 is installed.
- Verify before submitting: duration <3:00, audio present, addresses legible,
  all tx hashes match deployments.json exactly.

## Blockers (as of 2026-11-25 01:25)
- Public GitHub repo autosave-reactive not yet created (needs user's approval on
  the GitHub write card; timed out 00:54 while user asleep). Video can be built
  before the repo exists; the repo link goes in the closing shot once it exists.
- DoraHacks registration (Set It and Forget It track) still to do after repo + video.
