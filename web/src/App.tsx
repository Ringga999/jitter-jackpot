import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';

import { useCasinoHost } from './lib/useCasinoHost';
import { useDemoHost } from './lib/demoHost';
import { GAME_DATA_EMPTY, outcomeFromRandomness } from './lib/jitter';
import { SymbolFace } from './components/SymbolFace';
import { WinBurst } from './components/WinBurst';
import { GateCircle, type GateTrace } from './components/GateCircle';
import './styles/jitter.css';

const STRIP: number[] = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1];
const PROOF_SESSION_SPINS = 10;

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
  const [stopped, setStopped] = useState<[boolean, boolean, boolean]>([true, true, true]);
  const [burstHidden, setBurstHidden] = useState(false);
  const [proofBudget, setProofBudget] = useState(0);
  const [history, setHistory] = useState<{ syms: [number, number, number]; mult: number }[]>([]);

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
        setStopped(s => {
          const n = [...s] as [boolean, boolean, boolean];
          n[i] = true;
          return n;
        });
      }, d),
    );
    setHistory(h => [{ syms, mult: outcome.mult }, ...h].slice(0, 8));
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
      setStopped([false, false, false]);
      setBurstHidden(false);
      setProofBudget(b => b - 1);
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
      if (proofBudget <= 0) setTrace(null); // proof session exhausted → re-gate
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
      <div className="jj-marquee" aria-hidden>
        {Array.from({ length: 24 }, (_, k) => (
          <i key={k} />
        ))}
      </div>
      {demoOn && <div className="jj-demo">DEMO MODE — local randomness · no chain · play the real thing on chain.wtf</div>}
      <div className="jj-top">
        <span>Jitter Jackpot</span>
        <span>
          {balance !== undefined ? `${Number(formatUnits(balance, decimals)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}` : '—'}
        </span>
      </div>
      <div className="jj-main">
        {trace === null && !round ? (
          <GateCircle
            onPassed={t => {
              setTrace(t);
              setProofBudget(PROOF_SESSION_SPINS);
            }}
          />
        ) : (
          <>
            <div className="jj-stage">
            <div className={`jj-reels${roundDone && (round.mult ?? 0) > 0 ? ' jj-reels--win' : ''}`}>
              {[0, 1, 2].map(i => (
                <div key={i} className={`jj-reel${stopped[i] ? '' : ' jj-reel--spinning'}${winReels(i) ? ' jj-reel--win' : ''}`}>
                  {stopped[i] ? (
                    <span className="jj-reel__face jj-reel__face--land">
                      <SymbolFace sym={faces[i]} />
                    </span>
                  ) : (
                    <div className={`jj-reel__strip jj-reel__strip--r${i}`}>
                      {STRIP.map((s, k) => (
                        <span key={k} className="jj-reel__cell">
                          <SymbolFace sym={s} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {roundDone && (round.mult ?? 0) > 0 && <div className="jj-winline" aria-hidden />}
            </div>
            <div className="jj-history">
              {history.length === 0 ? (
                <span className="jj-history__empty">your last eight rounds land here</span>
              ) : (
                history.map((h, k) => (
                  <span key={k} className={`jj-history__chip${h.mult > 0 ? ' jj-history__chip--win' : ''}`}>
                    {h.syms.map((s, j) => (
                      <em key={j} className="jj-history__sym">
                        <SymbolFace sym={s} />
                      </em>
                    ))}
                    <b>{h.mult > 0 ? `${h.mult}x` : '—'}</b>
                  </span>
                ))
              )}
            </div>
            </div>
            <div className="jj-panel">
              {trace !== null && (
                <div className="jj-proof">
                  human proof active · {proofBudget} spin{proofBudget === 1 ? '' : 's'} left
                </div>
              )}
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
      {roundDone && (round.mult ?? 0) > 0 && !burstHidden && (
        <WinBurst
          mult={round.mult ?? 0}
          netText={`+${Number(formatUnits((round.payout ?? 0n) - round.wager, decimals)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`}
          onDismiss={() => setBurstHidden(true)}
        />
      )}
    </div>
  );
}