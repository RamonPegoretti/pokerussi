import type { Card } from './cards';

export enum HandCategory {
  HighCard,
  OnePair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush,
}

export const CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'High card',
  [HandCategory.OnePair]: 'One pair',
  [HandCategory.TwoPair]: 'Two pair',
  [HandCategory.ThreeOfAKind]: 'Three of a kind',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full house',
  [HandCategory.FourOfAKind]: 'Four of a kind',
  [HandCategory.StraightFlush]: 'Straight flush',
};

export interface HandValue {
  category: HandCategory;
  /** Tiebreak ranks, most significant first. */
  kickers: number[];
  /** The five cards that make the hand. */
  cards: Card[];
}

/** Positive if a beats b, negative if b beats a, 0 for a tie. */
export function compareHands(a: HandValue, b: HandValue): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const diff = (a.kickers[i] ?? 0) - (b.kickers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Returns the high card of a straight in `ranks` (sorted desc, unique), or 0. */
function straightHigh(uniqueDesc: number[]): number {
  if (uniqueDesc.length !== 5) return 0;
  if (uniqueDesc[0]! - uniqueDesc[4]! === 4) return uniqueDesc[0]!;
  // Wheel: A-2-3-4-5.
  if (uniqueDesc.join(',') === '14,5,4,3,2') return 5;
  return 0;
}

export function evaluateFive(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error('evaluateFive needs exactly 5 cards');
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  // Group ranks by count, then by rank, both descending.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map(([rank]) => rank);
  const shape = groups.map(([, n]) => n).join('');

  const isFlush = cards.every((c) => c.suit === cards[0]!.suit);
  const high = straightHigh(groups.length === 5 ? byGroup : []);

  let category: HandCategory;
  let kickers = byGroup;
  if (high && isFlush) {
    category = HandCategory.StraightFlush;
    kickers = [high];
  } else if (shape === '41') category = HandCategory.FourOfAKind;
  else if (shape === '32') category = HandCategory.FullHouse;
  else if (isFlush) category = HandCategory.Flush;
  else if (high) {
    category = HandCategory.Straight;
    kickers = [high];
  } else if (shape === '311') category = HandCategory.ThreeOfAKind;
  else if (shape === '221') category = HandCategory.TwoPair;
  else if (shape === '2111') category = HandCategory.OnePair;
  else category = HandCategory.HighCard;

  return { category, kickers, cards };
}

/** Best five-card hand from 5 to 7 cards. */
export function evaluateHand(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('evaluateHand needs 5 to 7 cards');
  }
  let best: HandValue | undefined;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const value = evaluateFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (!best || compareHands(value, best) > 0) best = value;
          }
  return best!;
}

export function describeHand(value: HandValue): string {
  return CATEGORY_NAMES[value.category];
}
