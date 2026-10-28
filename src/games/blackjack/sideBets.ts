import type { Card } from '../../engine/cards';

export type SideBetId = 'perfectPairs' | 'twentyOnePlusThree';

export interface SideBetResult {
  id: SideBetId;
  bet: number;
  /** Winning combination, or null for a loss. */
  win: string | null;
  /** Payout multiplier (0 for a loss). */
  multiplier: number;
  /** Chips returned, including the stake on a win. */
  payout: number;
}

export const SIDE_BET_NAMES: Record<SideBetId, string> = {
  perfectPairs: 'Perfect Pairs',
  twentyOnePlusThree: '21+3',
};

/** Paytables, best first, as shown at the table. */
export const SIDE_BET_PAYTABLES: Record<SideBetId, [string, number][]> = {
  perfectPairs: [
    ['Perfect pair', 25],
    ['Colored pair', 12],
    ['Mixed pair', 6],
  ],
  twentyOnePlusThree: [
    ['Suited three of a kind', 100],
    ['Straight flush', 40],
    ['Three of a kind', 30],
    ['Straight', 10],
    ['Flush', 5],
  ],
};

const isRed = (c: Card) => c.suit === 'h' || c.suit === 'd';

/** Your first two cards: a pair of the same suit, same color, or mixed colors. */
export function perfectPairs(hole: Card[]): [string, number] | null {
  const [a, b] = hole as [Card, Card];
  if (a.rank !== b.rank) return null;
  if (a.suit === b.suit) return ['Perfect pair', 25];
  if (isRed(a) === isRed(b)) return ['Colored pair', 12];
  return ['Mixed pair', 6];
}

/** Your first two cards plus the dealer's up card, read as a three-card poker hand. */
export function twentyOnePlusThree(cards: Card[]): [string, number] | null {
  const ranks = cards.map((c) => c.rank).sort((x, y) => x - y);
  const flush = cards.every((c) => c.suit === cards[0]!.suit);
  const trips = ranks[0] === ranks[2];
  const consecutive = ranks[1] === ranks[0]! + 1 && ranks[2] === ranks[1]! + 1;
  const wheel = ranks.join(',') === '2,3,14'; // A-2-3; Q-K-A is covered by consecutive
  const straight = consecutive || wheel;
  if (trips && flush) return ['Suited three of a kind', 100];
  if (straight && flush) return ['Straight flush', 40];
  if (trips) return ['Three of a kind', 30];
  if (straight) return ['Straight', 10];
  if (flush) return ['Flush', 5];
  return null;
}

export function settleSideBet(id: SideBetId, bet: number, hole: Card[], dealerUp: Card): SideBetResult {
  const hit = id === 'perfectPairs' ? perfectPairs(hole) : twentyOnePlusThree([...hole, dealerUp]);
  const multiplier = hit ? hit[1] : 0;
  return { id, bet, win: hit ? hit[0] : null, multiplier, payout: hit ? bet * (multiplier + 1) : 0 };
}
