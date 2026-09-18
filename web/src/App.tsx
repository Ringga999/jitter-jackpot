import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';

import { useCasinoHost } from './lib/useCasinoHost';
import { useDemoHost } from './lib/demoHost';
import { GAME_DATA_EMPTY, SYMBOLS, outcomeFromRandomness } from './lib/jitter';
import { GateCircle, type GateTrace } from './components/GateCircle';
import './styles/jitter.css';

type Round = {
  sessionKey: string;
  wager: bigint;
  status: 'opening' | 'waiting' | 'landing' | 'done';
  sessionId?: string;
  syms?: [number, number, number];
  mult?: number;
  payout?: bigint;
};

export function App() {
  const real = useCasinoHost();
  const [demoOn, setDemoOn] = useState(false);

  // Standalone fallback: no parent iframe after 2.5s → demo mode.
  useEffect(() => {
    if (real.hostApi) return;
    if (window.parent !== window) return;
    const t = setTimeout(() => setDemoOn(true), 2500);
    return () => clearTimeout(t);
  }, [real.hostApi]);

  const demo = useDemoHost(demoOn);
  const hostApi = (real.hostApi ?? demo.hostApi) as any;
  const snapshot = (real.snapshot ?? demo.snapshot) as any;

  const [trace, setTrace] = useState<GateTrace | null>(null);
  const [wagerInput, setWagerInput] = useState('1.00');
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [faces, setFaces] = useState<[number, number, number]>([5, 4, 3]);

  const decimals = snapshot?.token.decimals ?? 18;
  const symbol = snapshot?.token.symbol ?? '';
  const balance = useMemo(() => {
    const raw = snapshot?.balances.smartVaultBalance;
    return raw !== undefined ? BigInt(raw) : undefined;
  }, [snapshot?.balances.smartVaultBalance]);

  // Settle watcher: mirror of the coinflip lifecycle, slot-flavoured.
  useEffect(() => {
    if (!round || round.status !== 'waiting' || !snapshot) return;
    const row = snapshot.sessions.items.find((item: any) => item.sessionKey === round.sessionKey);
    if (!row) return;
    const settled = row.isSettled === true || row.phase === 3;
    if (!settled) return;
    const rawRandomness = row.raw?.randomness !== undefined ? BigInt(row.raw.randomness) : 0n;
    if (rawRandomness === 0n) return;
    const outcome = outcomeFromRandomness(rawRandomness);
    const payout = row.payout !== undefined ? BigInt(row.payout) : 0n;
    setRound(cur =>
      cur && cur.sessionKey === round.sessionKey
        ? { ...cur, status: 'landing', sessionId: row.sessionId, syms: outcome.syms, mult: outcome.mult, payout }
        : cur,
    );

    // Reveal dijadwal langsung di sini — kebal terhadap cleanup effect.
    const syms = outcome.syms;
    const sid = row.sessionId;
    [0, 200, 400].forEach((d, i) =>
      setTimeout(() => {
        setFaces(f => {
          const n = [...f] as [number, number, number];
          n[i] = syms[i];
          return n;
        });
      }, d),
    );
    setTimeout(() => {
      setSpinning(false);
      setRound(cur => (cur && cur.sessionKey === round.sessionKey ? { ...cur, status: 'done' } : cur));
      if (sid && hostApi) void hostApi.revealOutcome({ sessionId: sid }).catch(() => {});
    }, 900);
  }, [snapshot, round]);

  const openRound = useCallback(
    async (wager: bigint) => {
      if (!hostApi) return;
      setError(null);
      const pendingKey = `pending:${Date.now()}`;
      setRound({ sessionKey: pendingKey, wager, status: 'opening' });
      setSpinning(true);
      try {
        const { sessionKey } = await hostApi.openSession({ wager: wager.toString(), gameData: GAME_DATA_EMPTY });
        setRound(cur => (cur && cur.sessionKey === pendingKey ? { ...cur, sessionKey, status: 'waiting' } : cur));
      } catch (cause) {
        setRound(null);
        setSpinning(false);
        setError(cause instanceof Error ? cause.message : 'Failed to open the round.');
      }
    },
    [hostApi],
  );

  const wager = useMemo(() => {
    if (!wagerInput.trim()) return null;
    try {
      const parsed = parseUnits(wagerInput.trim(), decimals);
      return parsed > 0n ? parsed : null;
    } catch {
      return null;
    }
  }, [wagerInput, decimals]);

  if (!hostApi || !snapshot) {
    return (
      <div className="jj-shell">
        <div className="jj-gate" style={{ margin: 'auto' }}>
          <div className="jj-gate__circle">
            <span className="jj-gate__mark">Z2</span>
          </div>
          <p className="jj-gate__msg">Connecting to host…</p>
        </div>
      </div>
    );
  }

  const walletReady = snapshot.wallet.status === 'ready';
  const roundInFlight = round !== null && round.status !== 'done';
  const roundDone = round?.status === 'done';
  const insufficient = wager !== null && balance !== undefined && wager > balance;
  const canSpin = walletReady && !roundInFlight && wager !== null && !insufficient && trace !== null;

  const handleMain = () => {
    if (roundDone) {
      setRound(null);
      setTrace(null); // every spin earns its gate
      return;
    }
    if (wager !== null) void openRound(wager);
  };

  const winReels = (i: number): boolean => {
    if (!roundDone || !round?.syms || (round.mult ?? 0) <= 0) return false;
    const s = round.syms;
    if (s[0] === s[1] && s[1] === s[2]) return true;
    if (s[0] === s[1] && s[0] !== s[2]) return i === 0 || i === 1;
    if (s[0] === s[2] && s[0] !== s[1]) return i === 0 || i === 2;
    if (s[1] === s[2] && s[1] !== s[0]) return i === 1 || i === 2;
    return false;
  };

  const resultText = roundDone
    ? (round.mult ?? 0) > 0 && round.payout !== undefined
      ? `WIN ${round.mult}.00x · +${Number(formatUnits(round.payout - round.wager, decimals)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
      : 'LOSE — the house keeps this one.'
    : '';

  const ctaLabel = roundInFlight ? 'Spinning…' : roundDone ? 'Spin again' : 'Spin';

  return (
    <div className="jj-shell">
      {demoOn && <div className="jj-demo">DEMO MODE — local randomness · no chain · play the real thing on chain.wtf</div>}
      <div className="jj-top">
        <span>Jitter Jackpot</span>
        <span>
          {balance !== undefined ? `${Number(formatUnits(balance, decimals)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}` : '—'}
        </span>
      </div>
      <div className="jj-main">
        {trace === null && !round ? (
          <GateCircle onPassed={setTrace} />
        ) : (
          <>
            <div className="jj-reels">
              {[0, 1, 2].map(i => (
                <div key={i} className={`jj-reel${spinning ? ' jj-reel--spinning' : ''}${winReels(i) ? ' jj-reel--win' : ''}`}>
                  <span className="jj-reel__face">{SYMBOLS[faces[i]].glyph}</span>
                </div>
              ))}
            </div>
            <div className="jj-panel">
              <label>Wager ({symbol})</label>
              <input value={wagerInput} onChange={e => setWagerInput(e.target.value)} inputMode="decimal" />
              <button className="jj-btn jj-btn--spin" disabled={!canSpin} onClick={handleMain}>
                {ctaLabel}
              </button>
              <div className={`jj-result${roundDone && (round.mult ?? 0) <= 0 ? ' jj-result--lose' : ''}`}>
                {error ?? resultText}
              </div>
              {!walletReady && <div className="jj-result">Wallet not ready in host.</div>}
              {insufficient && <div className="jj-result jj-result--lose">Insufficient balance.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}