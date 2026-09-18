// Jitter Jackpot — pure slot logic. MUST mirror contract/JitterJackpot.sol exactly.
export type SlotOutcome = {
  stops: [number, number, number];
  syms: [number, number, number];
  mult: number;
  kind: 'triple' | 'pair' | 'none';
  sym: number;
};

export const SYMBOLS = [
  { id: 0, label: 'Mesh',    glyph: '🕸️', weight: 30, m3: 4,   m2: 0 },
  { id: 1, label: 'Pioneer', glyph: '🎖️', weight: 25, m3: 6,   m2: 0 },
  { id: 2, label: 'Circle',  glyph: '⭕', weight: 20, m3: 10,  m2: 2 },
  { id: 3, label: 'Bunker',  glyph: '🏛️', weight: 13, m3: 20,  m2: 3 },
  { id: 4, label: 'Coin',    glyph: '🪙', weight: 8,  m3: 50,  m2: 8 },
  { id: 5, label: 'Z2',      glyph: '🔷', weight: 4,  m3: 400, m2: 25 },
] as const;

export function stopToSymbol(stop: number): number {
  if (stop < 30) return 0;
  if (stop < 55) return 1;
  if (stop < 75) return 2;
  if (stop < 88) return 3;
  if (stop < 96) return 4;
  return 5;
}

// Same derivation as on-chain: seed % 100, /100 % 100, /10000 % 100
export function stopsFromRandomness(seed: bigint): [number, number, number] {
  return [
    Number(seed % 100n),
    Number((seed / 100n) % 100n),
    Number((seed / 10000n) % 100n),
  ];
}

export function evalSyms(s: [number, number, number]): { mult: number; kind: 'triple' | 'pair' | 'none'; sym: number } {
  if (s[0] === s[1] && s[1] === s[2]) return { mult: SYMBOLS[s[0]].m3, kind: 'triple', sym: s[0] };
  const pairSym = s[0] === s[1] && s[0] !== s[2] ? s[0] : s[0] === s[2] && s[0] !== s[1] ? s[0] : s[1] === s[2] && s[1] !== s[0] ? s[1] : -1;
  if (pairSym >= 0) {
    const m = SYMBOLS[pairSym].m2;
    if (m > 0) return { mult: m, kind: 'pair', sym: pairSym };
  }
  return { mult: 0, kind: 'none', sym: -1 };
}

export function outcomeFromRandomness(seed: bigint): SlotOutcome {
  const stops = stopsFromRandomness(seed);
  const syms = stops.map(stopToSymbol) as [number, number, number];
  const { mult, kind, sym } = evalSyms(syms);
  return { stops, syms, mult, kind, sym };
}

export const GAME_DATA_EMPTY = '0x';
export const RTP_BPS = 9577;