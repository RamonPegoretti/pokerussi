export type SlotSymbol = 'cherry' | 'lemon' | 'bell' | 'star' | 'seven' | 'diamond';

export const SYMBOL_GLYPHS: Record<SlotSymbol, string> = {
  cherry: '🍒',
  lemon: '🍋',
  bell: '🔔',
  star: '⭐',
  seven: '7',
  diamond: '💎',
};

/** How often each symbol lands on a reel. Every reel uses the same weights. */
export const REEL_WEIGHTS: Record<SlotSymbol, number> = {
  cherry: 10,
  lemon: 9,
  bell: 6,
  star: 4,
  seven: 2,
  diamond: 1,
};

/** Payout multipliers for three of a kind. */
export const THREE_OF_A_KIND: Record<SlotSymbol, number> = {
  cherry: 5,
  lemon: 7,
  bell: 14,
  star: 40,
  seven: 200,
  diamond: 1000,
};

/** Payout multiplier for exactly two cherries anywhere on the line. */
export const TWO_CHERRIES = 2;

export const SYMBOLS = Object.keys(REEL_WEIGHTS) as SlotSymbol[];
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + REEL_WEIGHTS[s], 0);

export function spinReel(rng: () => number): SlotSymbol {
  let roll = rng() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    roll -= REEL_WEIGHTS[s];
    if (roll < 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1]!;
}

/** Multiplier of the bet that a finished line pays (0 for a loss). */
export function lineMultiplier(line: SlotSymbol[]): number {
  const [a, b, c] = line;
  if (a === b && b === c) return THREE_OF_A_KIND[a!];
  const cherries = line.filter((s) => s === 'cherry').length;
  return cherries === 2 ? TWO_CHERRIES : 0;
}

export interface SpinResult {
  line: SlotSymbol[];
  multiplier: number;
  payout: number;
}

export function spin(bet: number, rng: () => number = Math.random): SpinResult {
  const line = [spinReel(rng), spinReel(rng), spinReel(rng)];
  const multiplier = lineMultiplier(line);
  return { line, multiplier, payout: bet * multiplier };
}

/** Exact expected return per chip bet, from the reel weights and paytable. */
export function returnToPlayer(): number {
  let total = 0;
  for (const a of SYMBOLS) for (const b of SYMBOLS) for (const c of SYMBOLS) {
    const p = (REEL_WEIGHTS[a] * REEL_WEIGHTS[b] * REEL_WEIGHTS[c]) / TOTAL_WEIGHT ** 3;
    total += p * lineMultiplier([a, b, c]);
  }
  return total;
}
