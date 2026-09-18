import { useCallback, useRef, useState } from 'react';
import { outcomeFromRandomness } from './jitter';

export type DemoSessionRow = {
  sessionKey: string;
  sessionId: string;
  isSettled: boolean;
  phase: number;
  payout?: string;
  raw: { randomness?: string; gameState?: string };
};

export type DemoSnapshot = {
  token: { decimals: number; symbol: string; iconUrl?: string };
  balances: { smartVaultBalance?: string };
  wallet: { status: 'ready' | 'disconnected' | 'setup-required' };
  sessions: { items: DemoSessionRow[] };
  casino: { maxAllowedReservedProfit?: string };
  ui: { viewport?: { availableHeight?: number } };
  integration: { gameAddress: string };
};

const START = 1_000_000n * 10n ** 18n;

/** Standalone demo host: same paytable, local randomness, clearly labelled. */
export function useDemoHost(active: boolean) {
  const [snapshot, setSnapshot] = useState<DemoSnapshot>(() => ({
    token: { decimals: 18, symbol: 'chUSD' },
    balances: { smartVaultBalance: START.toString() },
    wallet: { status: 'ready' },
    sessions: { items: [] },
    casino: {},
    ui: {},
    integration: { gameAddress: '0x0000000000000000000000000000000000000000' },
  }));
  const balanceRef = useRef(START);

  const openSession = useCallback(async ({ wager }: { wager: string; gameData: string }) => {
    const wagerBig = BigInt(wager);
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let seed = 0n;
    for (const b of bytes) seed = (seed << 8n) | BigInt(b);
    const { mult } = outcomeFromRandomness(seed);
    const payout = wagerBig * BigInt(mult);
    balanceRef.current = balanceRef.current - wagerBig + payout;
    const sessionKey = `demo:${Date.now()}`;
    const row: DemoSessionRow = {
      sessionKey,
      sessionId: sessionKey,
      isSettled: true,
      phase: 3,
      payout: payout.toString(),
      raw: { randomness: seed.toString(), gameState: '0x' },
    };
    setSnapshot(s => ({
      ...s,
      balances: { smartVaultBalance: balanceRef.current.toString() },
      sessions: { items: [row, ...s.sessions.items] },
    }));
    return { sessionKey };
  }, []);

  const revealOutcome = useCallback(async (_a?: { sessionId?: string }) => {}, []);

  return { hostApi: active ? { openSession, revealOutcome } : null, snapshot: active ? snapshot : null };
}