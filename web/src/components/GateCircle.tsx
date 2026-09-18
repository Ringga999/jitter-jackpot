import { useEffect, useRef, useState } from 'react';

export type GateTrace = { jitter: number; ms: number };

type Props = { onPassed: (trace: GateTrace) => void; holdMs?: number };

/**
 * ZCP2O human-proof gate (jam edition): hold the circle for holdMs while your
 * pointer's micro-jitter is sampled. A perfectly still hold is rejected —
 * bots do not tremble; humans do.
 */
export function GateCircle({ onPassed, holdMs = 3000 }: Props) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [message, setMessage] = useState('Hold the circle. Let your hand breathe.');
  const samplesRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const passedRef = useRef(false);

  useEffect(() => {
    if (!holding) return;
    const onMove = (e: PointerEvent) => {
      samplesRef.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [holding]);

  const jitterOf = () => {
    const s = samplesRef.current;
    let dist = 0;
    for (let i = 1; i < s.length; i++) dist += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    return s.length > 1 ? dist / (s[s.length - 1].t - s[0].t || 1) : 0;
  };

  const loop = () => {
    const elapsed = performance.now() - startRef.current;
    const p = Math.min(1, elapsed / holdMs);
    setProgress(p);
    if (p >= 1) {
      if (!passedRef.current) {
        passedRef.current = true;
        const jitter = jitterOf();
        setHolding(false);
        onPassed({ jitter, ms: elapsed });
      }
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    passedRef.current = false;
    samplesRef.current = [];
    startRef.current = performance.now();
    setHolding(true);
    setMessage('Proving humanity…');
    rafRef.current = requestAnimationFrame(loop);
  };

  const up = () => {
    if (!holding) return;
    cancelAnimationFrame(rafRef.current);
    const elapsed = performance.now() - startRef.current;
    setHolding(false);
    setProgress(0);
    const jitter = jitterOf();
    if (elapsed > 500 && jitter < 0.01) {
      setMessage('Too still. Bots do not tremble — humans do. Hold again, naturally.');
    } else {
      setMessage('Released early. Hold for the full ring.');
    }
  };

  return (
    <div className="jj-gate">
      <div
        className={`jj-gate__circle${holding ? ' jj-gate__circle--holding' : ''}`}
        style={{ ['--jj-progress' as string]: `${progress}` }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
      >
        <span className="jj-gate__mark">Z2</span>
      </div>
      <p className="jj-gate__msg">{message}</p>
    </div>
  );
}