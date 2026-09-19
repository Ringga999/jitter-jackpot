import { useEffect, useMemo, useState } from 'react';

type Props = { mult: number; netText: string; onDismiss: () => void };

/** Center-stage win card: multiplier count-up + coin burst particles. */
export function WinBurst({ mult, netText, onDismiss }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setShown(mult * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mult]);

  useEffect(() => {
    const t = setTimeout(onDismiss, 2600);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const coins = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
        const d = 90 + Math.random() * 90;
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 40, delay: Math.random() * 0.25 };
      }),
    [],
  );

  return (
    <div className="jj-burst" onClick={onDismiss}>
      {coins.map((c, i) => (
        <i
          key={i}
          className="jj-burst__coin"
          style={{
            ['--dx' as string]: `${c.dx}px`,
            ['--dy' as string]: `${c.dy}px`,
            ['--delay' as string]: `${c.delay}s`,
          }}
        />
      ))}
      <div className="jj-burst__card">
        <span className="jj-burst__label">WIN</span>
        <span className="jj-burst__mult">{shown.toFixed(2)}x</span>
        <span className="jj-burst__net">{netText}</span>
      </div>
    </div>
  );
}