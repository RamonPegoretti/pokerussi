export type Suit = 's' | 'h' | 'd' | 'c';
/** 2..14, where 11 = J, 12 = Q, 13 = K, 14 = A. */
export type Rank = number;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];
const RANK_CHARS = '23456789TJQKA';

export function parseCard(text: string): Card {
  const rank = RANK_CHARS.indexOf(text[0]?.toUpperCase() ?? '') + 2;
  const suit = text[1]?.toLowerCase() as Suit;
  if (rank < 2 || !SUITS.includes(suit) || text.length !== 2) {
    throw new Error(`Invalid card: ${text}`);
  }
  return { rank, suit };
}

/** Parses a space-separated list like "As Kd 7c". */
export function parseCards(text: string): Card[] {
  return text.trim().split(/\s+/).filter(Boolean).map(parseCard);
}

export function cardToString(card: Card): string {
  return `${RANK_CHARS[card.rank - 2]}${card.suit}`;
}

export function newDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  }
  return deck;
}

/** Fisher-Yates shuffle. `rng` returns a float in [0, 1). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
