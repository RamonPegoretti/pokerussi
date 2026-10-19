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

/** Rough postflop strength in [0, 1], based on the made hand. */
export function postflopStrength(hole: Card[], board: Card[]): number {
  const hand = evaluateHand([...hole, ...board]);
  // When the board alone is as good as our hand, our cards add nothing.
  if (board.length === 5 && compareHands(hand, evaluateHand(board)) === 0) return 0.15;
  const topBoard = Math.max(...board.map((c) => c.rank));
  switch (hand.category) {
    case HandCategory.HighCard: return 0.1;
    case HandCategory.OnePair: {
      const pairRank = hand.kickers[0]!;
      const usesHole = hole.some((c) => c.rank === pairRank);
      if (!usesHole) return 0.2;
      return pairRank >= topBoard ? 0.6 : 0.4;
    }
    case HandCategory.TwoPair: return 0.7;
    case HandCategory.ThreeOfAKind: return 0.8;
    case HandCategory.Straight: return 0.85;
    case HandCategory.Flush: return 0.88;
    case HandCategory.FullHouse: return 0.93;
    default: return 0.98;
  }
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

  const potOdds = legal.callAmount / (pot + legal.callAmount);
  if (strength >= potOdds + 0.15 || rng() < 0.05) return { type: 'call' };
  return { type: 'fold' };
}
