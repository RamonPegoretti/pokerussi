import type { Card } from '../engine/cards';
import { compareHands, evaluateHand, HandCategory } from '../engine/evaluator';
import type { Action, Table } from '../engine/table';

/** Rough preflop strength in [0, 1]. */
export function preflopStrength(hole: Card[]): number {
  const [a, b] = hole as [Card, Card];
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  if (high === low) return 0.5 + high / 28;
  let score = ((high + low) / 28) * 0.7;
  if (a.suit === b.suit) score += 0.05;
  if (high - low <= 2) score += 0.05;
  if (high === 14) score += 0.05;
  return Math.min(score, 0.95);
}

/** True if the cards hold four to a flush or four to an open-ended straight. */
export function hasDraw(cards: Card[]): boolean {
  const suits = new Map<string, number>();
  for (const c of cards) suits.set(c.suit, (suits.get(c.suit) ?? 0) + 1);
  if ([...suits.values()].some((n) => n === 4)) return true;
  const ranks = new Set(cards.map((c) => c.rank));
  for (let low = 2; low <= 10; low++) {
    if ([0, 1, 2, 3].every((i) => ranks.has(low + i))) return true;
  }
  return false;
}

/** Rough postflop strength in [0, 1], based on the made hand and draws. */
export function postflopStrength(hole: Card[], board: Card[]): number {
  const all = [...hole, ...board];
  const hand = evaluateHand(all);
  // When the board alone is as good as our hand, our cards add nothing.
  if (board.length === 5 && compareHands(hand, evaluateHand(board)) === 0) return 0.15;
  const topBoard = Math.max(...board.map((c) => c.rank));
  // Draws only count while there are cards to come.
  const draw = board.length < 5 && hasDraw(all) ? 0.4 : 0;
  const madeStrength = (() => {
    switch (hand.category) {
    case HandCategory.HighCard: {
      const best = Math.max(...hole.map((c) => c.rank));
      return best === 14 ? 0.3 : best === 13 ? 0.22 : 0.12;
    }
    case HandCategory.OnePair: {
      const pairRank = hand.kickers[0]!;
      const usesHole = hole.some((c) => c.rank === pairRank);
      if (!usesHole) return 0.2;
      return pairRank >= topBoard ? 0.6 : 0.45;
    }
    case HandCategory.TwoPair: return 0.7;
    case HandCategory.ThreeOfAKind: return 0.8;
    case HandCategory.Straight: return 0.85;
    case HandCategory.Flush: return 0.88;
    case HandCategory.FullHouse: return 0.93;
    default: return 0.98;
    }
  })();
  return Math.max(madeStrength, draw);
}

/** Picks a legal action for the player whose turn it is. */
export function chooseAction(table: Table, rng: () => number = Math.random): Action {
  const me = table.currentPlayer;
  if (!me) throw new Error('No player to act');
  const legal = table.legalActions();
  const strength = table.board.length === 0
    ? preflopStrength(me.holeCards)
    : postflopStrength(me.holeCards, table.board);
  const pot = table.potTotal;

  const raiseTo = (fraction: number): Action => {
    const target = Math.round(table.currentBet + Math.max(pot, table.bigBlind) * fraction);
    return { type: 'raise', to: Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, target)) };
  };

  if (legal.canRaise && strength > 0.75 && rng() < 0.7) return raiseTo(0.75);

  if (legal.canCheck) {
    if (legal.canRaise && (strength > 0.55 || rng() < 0.1)) return raiseTo(0.5);
    return { type: 'check' };
  }

  // Call when the hand is worth the price, plus some loose calls so bots
  // don't give up every pot to a single bet.
  const potOdds = legal.callAmount / (pot + legal.callAmount);
  const margin = table.board.length === 0 ? 0.08 : 0;
  if (strength >= potOdds + margin || rng() < 0.12) return { type: 'call' };
  return { type: 'fold' };
}
