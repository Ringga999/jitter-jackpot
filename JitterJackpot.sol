// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./ICasinoGameV2.sol";

/// @title JitterJackpot
/// @notice Casino-noir slot gated by ZCP2O human-proof. 6 lore symbols, 3 reels, 1 payline.
///         RTP 95.77% declared in MATH.md of github.com/Ringga999/jitter-jackpot
contract JitterJackpot is ICasinoGameV2 {

    uint256 internal constant WAD = 1e18;

    // --- Paytable constants (mirror MATH.md) ---
    uint256 internal constant TOP_MULTIPLIER = 400;    // Z2 triple
    uint16  internal constant RTP_BPS        = 9577;   // 95.77%

    // p(Z2 triple) = 0.04^3 = 0.000064  =>  in WAD: 64 * 1e12
    uint256 internal constant JACKPOT_PROB_WAD = 64_000_000_000_000;

    // --- ICasinoGameV2: caps ---

    function quoteCaps(uint256 wager, bytes calldata /*gameData*/)
        external pure override
        returns (uint256 maxEscrowStake, uint256 maxReservedProfit)
    {
        maxEscrowStake    = wager;
        maxReservedProfit = wager * (TOP_MULTIPLIER - 1); // 399 * wager
    }

    // --- ICasinoGameV2: risk params (heavy-tail regime) ---

    function quoteRiskParams(uint256 wager, bytes calldata /*gameData*/)
        external pure override
        returns (
            uint256 maxPayout,
            uint256 probabilityWad,
            uint256 expectedPayout,
            uint256 subJackpotVarianceScaled
        )
    {
        maxPayout                = wager * TOP_MULTIPLIER;   // 400 * wager
        probabilityWad           = JACKPOT_PROB_WAD;         // top-tier only
        expectedPayout           = (wager * RTP_BPS) / 10_000;
        subJackpotVarianceScaled = 0;
    }

    // --- ICasinoGameV2: session lifecycle ---

    function onSessionStart(SessionContext calldata ctx)
        external pure override
        returns (StepResult memory)
    {
        // Reserve worst-case jackpot liability up-front.
        uint256 reserve = ctx.wagerBase * (TOP_MULTIPLIER - 1);
        return StepResult({
            newGameState:           "",
            escrowDelta:            0,
            reservedProfitDelta:    int256(reserve),
            nextPhase:              SessionPhase.WAITING_RANDOMNESS,
            requestRandomnessNow:   true,
            payout:                 0
        });
    }

    function onPlayerAction(SessionContext calldata, bytes calldata)
        external pure override
        returns (StepResult memory)
    {
        revert("JitterJackpot: no mid-round actions");
    }

    function onRandomness(SessionContext calldata ctx, bytes32 randomness)
        external pure override
        returns (StepResult memory)
    {
        // Map seed -> 3 independent reel stops (0..99)
        uint256 seed  = uint256(randomness);
        uint256 stop1 = seed % 100;
        uint256 stop2 = (seed / 100) % 100;
        uint256 stop3 = (seed / 10000) % 100;

        uint256 sym1 = stopToSymbol(stop1);
        uint256 sym2 = stopToSymbol(stop2);
        uint256 sym3 = stopToSymbol(stop3);

        uint256 payout = computePayout(ctx.wagerBase, sym1, sym2, sym3);

        // Reserved profit we booked at start = 399 * wager.
        // Vault liability above escrow = max(0, payout - wager).
        // Return the unused portion of the reserve.
        uint256 reserveBooked     = ctx.wagerBase * (TOP_MULTIPLIER - 1);
        uint256 vaultLiability    = payout > ctx.wagerBase ? payout - ctx.wagerBase : 0;
        int256  reservedDelta     = -int256(reserveBooked - vaultLiability);

        return StepResult({
            newGameState:         "",
            escrowDelta:          0,
            reservedProfitDelta:  reservedDelta,
            nextPhase:            SessionPhase.SETTLED,
            requestRandomnessNow: false,
            payout:               payout
        });
    }

    function quoteForfeitPayout(SessionContext calldata)
        external pure override
        returns (uint256 cashoutValue)
    {
        return 0;
    }

    // --- Internal: reel strip + paytable ---

    /// @dev Reel strip of 100 stops, MATH.md order:
    ///      [0..29]   Mesh (30)
    ///      [30..54]  Pioneer (25)
    ///      [55..74]  Circle (20)
    ///      [75..87]  Bunker (13)
    ///      [88..95]  Coin (8)
    ///      [96..99]  Z2 (4)
    function stopToSymbol(uint256 stop) internal pure returns (uint256) {
        if (stop < 30) return 0;  // Mesh
        if (stop < 55) return 1;  // Pioneer
        if (stop < 75) return 2;  // Circle
        if (stop < 88) return 3;  // Bunker
        if (stop < 96) return 4;  // Coin
        return 5;                 // Z2
    }

    function computePayout(uint256 wager, uint256 s1, uint256 s2, uint256 s3)
        internal pure returns (uint256)
    {
        // 3-of-a-kind (all symbols)
        if (s1 == s2 && s2 == s3) {
            if (s1 == 0) return wager * 4;    // Mesh
            if (s1 == 1) return wager * 6;    // Pioneer
            if (s1 == 2) return wager * 10;   // Circle
            if (s1 == 3) return wager * 20;   // Bunker
            if (s1 == 4) return wager * 50;   // Coin
            return wager * 400;               // Z2
        }
        // 2-of-a-kind (only Circle, Bunker, Coin, Z2 pay)
        if (s1 == s2 && s1 != s3) return _m2(wager, s1);
        if (s1 == s3 && s1 != s2) return _m2(wager, s1);
        if (s2 == s3 && s2 != s1) return _m2(wager, s2);
        return 0;
    }

    function _m2(uint256 wager, uint256 sym) internal pure returns (uint256) {
        if (sym == 2) return wager * 2;    // Circle
        if (sym == 3) return wager * 3;    // Bunker
        if (sym == 4) return wager * 8;    // Coin
        if (sym == 5) return wager * 25;   // Z2
        return 0;                          // Mesh & Pioneer: no 2-of-a-kind pay
    }
}