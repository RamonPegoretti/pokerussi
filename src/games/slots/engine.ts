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

/** Payout multipliers for three of a kind. Nothing else pays. */
export const THREE_OF_A_KIND: Record<SlotSymbol, number> = {
  cherry: 2,
  lemon: 3,
  bell: 5,
  star: 10,
  seven: 20,
  diamond: 150,
};

/**
 * Chance that a spin lines the reels up on purpose. Independent reels alone
 * make three of a kind rare (about 1 spin in 16) and leave lots of near
 * misses, so this lifts it to about 1 in 5.
 */
export const LINE_UP_CHANCE = 0.14;

/** Which symbol a lined-up spin lands on. */
export const LINE_UP_WEIGHTS: Record<SlotSymbol, number> = {
  cherry: 40,
  lemon: 30,
  bell: 16,
  star: 8,
  seven: 4,
  diamond: 1,
};

export const SYMBOLS = Object.keys(REEL_WEIGHTS) as SlotSymbol[];
const totalWeight = (weights: Record<SlotSymbol, number>) =>
  SYMBOLS.reduce((sum, s) => sum + weights[s], 0);

function pick(weights: Record<SlotSymbol, number>, rng: () => number): SlotSymbol {
  let roll = rng() * totalWeight(weights);
  for (const s of SYMBOLS) {
    roll -= weights[s];
    if (roll < 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1]!;
}

/** One reel on its own, also used for the spinning animation. */
export function spinReel(rng: () => number): SlotSymbol {
  return pick(REEL_WEIGHTS, rng);
}

/** Multiplier of the bet that a finished line pays (0 for a loss). */
export function lineMultiplier(line: SlotSymbol[]): number {
  const [a, b, c] = line;
  return a === b && b === c ? THREE_OF_A_KIND[a!] : 0;
}

export interface SpinResult {
  line: SlotSymbol[];
  multiplier: number;
  payout: number;
}

export function spin(bet: number, rng: () => number = Math.random): SpinResult {
  let line: SlotSymbol[];
  if (rng() < LINE_UP_CHANCE) {
    const s = pick(LINE_UP_WEIGHTS, rng);
    line = [s, s, s];
  } else {
    line = [spinReel(rng), spinReel(rng), spinReel(rng)];
  }
  const multiplier = lineMultiplier(line);
  return { line, multiplier, payout: bet * multiplier };
}

/** Exact chance of three of a kind for each symbol on one spin. */
export function threeOfAKindOdds(): Record<SlotSymbol, number> {
  const reelTotal = totalWeight(REEL_WEIGHTS);
  const lineUpTotal = totalWeight(LINE_UP_WEIGHTS);
  const odds = {} as Record<SlotSymbol, number>;
  for (const s of SYMBOLS) {
    odds[s] = LINE_UP_CHANCE * (LINE_UP_WEIGHTS[s] / lineUpTotal)
      + (1 - LINE_UP_CHANCE) * (REEL_WEIGHTS[s] / reelTotal) ** 3;
  }
  return odds;
}

/** Exact expected return per chip bet. */
export function returnToPlayer(): number {
  const odds = threeOfAKindOdds();
  return SYMBOLS.reduce((sum, s) => sum + odds[s] * THREE_OF_A_KIND[s], 0);
}
