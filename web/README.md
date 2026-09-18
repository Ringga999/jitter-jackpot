# Jitter Jackpot — web client

Casino-noir 3-reel slot (ICasinoGameV2) gated by an on-device human-proof hold.

## Run locally (with the Chain casino SDK simulator)
1. `npm install`
2. Link the local SDK bridge: `npm install "<path-to-casino-sdk-root>"`
3. Dev server: `npx vite --port 3200`
4. At the SDK root run `npm start`; in the harness set Game URL to
   `http://localhost:3200` and pick the JitterJackpot contract.

## Build & host
`npm run build` → static `dist/` (iframe-friendly; jam widget tag in index.html).

## Modes
- Inside a host iframe: real on-chain sessions via the SDK guest bridge.
- Opened directly: DEMO MODE (local randomness, same paytable), clearly labelled.

Math: ../MATH.md (RTP 95.77%, frozen v1.0). Contract: ../JitterJackpot.sol.
