type Props = { sym: number };

/** Six hand-drawn noir faces — no emoji, no assets, pure SVG. */
export function SymbolFace({ sym }: Props) {
  switch (sym) {
    case 0: // Mesh — silver web
      return (
        <svg viewBox="0 0 64 64" className="jj-sym">
          <g stroke="#c9d1dc" strokeWidth="1.6" fill="none" opacity="0.92">
            {[0, 45, 90, 135].map(a => (
              <line key={a} x1="32" y1="32" x2={32 + 28 * Math.cos((a * Math.PI) / 180)} y2={32 + 28 * Math.sin((a * Math.PI) / 180)} />
            ))}
            {[0, 45, 90, 135].map(a => (
              <line key={'b' + a} x1="32" y1="32" x2={32 - 28 * Math.cos((a * Math.PI) / 180)} y2={32 - 28 * Math.sin((a * Math.PI) / 180)} />
            ))}
            <circle cx="32" cy="32" r="10" />
            <circle cx="32" cy="32" r="18" strokeDasharray="3 4" />
            <circle cx="32" cy="32" r="26" />
          </g>
        </svg>
      );
    case 1: // Pioneer — star medal
      return (
        <svg viewBox="0 0 64 64" className="jj-sym">
          <path d="M22 4h9l4 14-9 3z" fill="#b3402f" />
          <path d="M42 4h-9l-4 14 9 3z" fill="#7d2c20" />
          <circle cx="32" cy="38" r="16" fill="#d9a441" stroke="#8a6a1f" strokeWidth="2" />
          <circle cx="32" cy="38" r="11" fill="#f0c56a" />
          <path d="M32 30l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#8a6a1f" />
        </svg>
      );
    case 2: // Circle — seal ring
      return (
        <svg viewBox="0 0 64 64" className="jj-sym">
          <circle cx="32" cy="32" r="24" fill="none" stroke="#b7bfd0" strokeWidth="5" />
          <circle cx="32" cy="32" r="24" fill="none" stroke="#5b6472" strokeWidth="5" strokeDasharray="2 9" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#8f98a8" strokeWidth="2" />
        </svg>
      );
    case 3: // Bunker — pillars
      return (
        <svg viewBox="0 0 64 64" className="jj-sym">
          <path d="M8 22L32 8l24 14z" fill="#aeb6c6" />
          <rect x="10" y="24" width="44" height="5" fill="#8f98a8" />
          {[14, 26, 38, 50].map(x => (
            <rect key={x} x={x - 3} y="31" width="6" height="20" fill="#c3cad8" />
          ))}
          <rect x="8" y="53" width="48" height="5" fill="#8f98a8" />
        </svg>
      );
    case 4: // Coin — gold Z2
      return (
        <svg viewBox="0 0 64 64" className="jj-sym">
          <defs>
            <radialGradient id="jj-coin-g" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffe9a8" />
              <stop offset="55%" stopColor="#d9a441" />
              <stop offset="100%" stopColor="#8a6a1f" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="26" fill="url(#jj-coin-g)" stroke="#6d5316" strokeWidth="2" />
          <circle cx="32" cy="32" r="19" fill="none" stroke="#6d5316" strokeWidth="1.4" opacity="0.7" />
          <path d="M25 24h14l-9 8h9l-14 12 4-9h-7z" fill="#4a370f" />
        </svg>
      );
    default: // 5 — Z2 diamond
      return (
        <svg viewBox="0 0 64 64" className="jj-sym">
          <defs>
            <linearGradient id="jj-z2-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b18cff" />
              <stop offset="55%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
          <path d="M32 6l20 16-20 36L12 22z" fill="url(#jj-z2-g)" stroke="#2e1065" strokeWidth="2" />
          <path d="M12 22h40M32 6l-8 16 8 34 8-34-8-16" fill="none" stroke="#e9d5ff" strokeWidth="1.4" opacity="0.8" />
        </svg>
      );
  }
}