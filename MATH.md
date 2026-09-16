# 🧮 Jitter Jackpot — Declared Mathematics

**Status:** FROZEN v1.0 · ratified 2026-09-16
**Compliance:** Chain Jam Vol. 1 — theoretical RTP within 93–98%; declared math matches the implemented paytable.

## Game Shape
- 3 reels · 1 payline · 6 symbols
- Each reel = independent 100-stop strip; stop chosen by chain VRF seed
- Win categories: 3-of-a-kind (all symbols), 2-of-a-kind (Circle, Bunker, Coin, Z2 only)
- Multiplier convention: **total return including stake** (net profit = multiplier − 1)
- The human-proof gate is an eligibility/anti-bot layer; it **does not alter outcome probabilities**

## Reel Strip (per reel, 100 stops)
| Symbol | Stops | Probability |
|---|---:|---:|
| 🕸️ Mesh Node | 30 | 0.30 |
| 🎖️ Pioneer Badge | 25 | 0.25 |
| ⭕ Hold Circle | 20 | 0.20 |
| 🏛️ Bunker | 13 | 0.13 |
| 🪙 Coin | 8 | 0.08 |
| 🔷 Z2 Mark | 4 | 0.04 |

## Paytable (multiplier of bet, total return)
| Symbol | 2-of-a-kind | 3-of-a-kind |
|---|---:|---:|
| 🕸️ Mesh Node | — | 4x |
| 🎖️ Pioneer Badge | — | 6x |
| ⭕ Hold Circle | 2x | 10x |
| 🏛️ Bunker | 3x | 20x |
| 🪙 Coin | 8x | 50x |
| 🔷 Z2 Mark | 25x | 400x |

## RTP Derivation
P(3-of-a-kind) = p³ · P(exactly 2-of-a-kind) = 3·p²·(1−p)

| Outcome | Probability | Mult | Contribution |
|---|---:|---:|---:|
| Mesh ×3 | 0.027000 | 4 | 0.108000 |
| Pioneer ×3 | 0.015625 | 6 | 0.093750 |
| Circle ×3 | 0.008000 | 10 | 0.080000 |
| Bunker ×3 | 0.002197 | 20 | 0.043940 |
| Coin ×3 | 0.000512 | 50 | 0.025600 |
| Z2 ×3 | 0.000064 | 400 | 0.025600 |
| Circle ×2 | 0.096000 | 2 | 0.192000 |
| Bunker ×2 | 0.044109 | 3 | 0.132327 |
| Coin ×2 | 0.017664 | 8 | 0.141312 |
| Z2 ×2 | 0.004608 | 25 | 0.115200 |
| **Total** | **0.215779** | — | **0.957729** |

**Theoretical RTP = 95.7729% → declared 95.77%** (band 93–98% ✅)
**House edge = 4.2271%**
**Hit frequency = 21.5779%** (≈ 1 win per 4.63 spins)

## Verification
- `tools/rtp-verify.js` (ships Phase 4): headless 1,000,000-spin simulation against this paytable; measured RTP must land within ±0.2% of declared.
- Reel strip weights are implemented verbatim in `contract/JitterJackpot.sol` — auditors may cross-check stops against the table above.

## Notes for Auditors
- VRF seed supplied by the Chain casino host (commit–reveal); contract maps seed → 3 independent reel stops via the strip above.
- Bet size (1–5 coins) scales stake and payout linearly; RTP invariant.
- No other win paths exist in v1.0: no scatters, no side bets, no bonus rounds.

— Ratified: Ringga999 · 2026-09-16 · ZCP2O Studios