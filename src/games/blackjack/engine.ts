import { type Card, newDeck, shuffle } from '../../engine/cards';

export type Phase = 'betting' | 'player' | 'settled';
export type Outcome = 'blackjack' | 'win' | 'push' | 'lose';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  /** No more cards for this hand: stood, busted, doubled, or split aces. */
  done: boolean;
  doubled: boolean;
  /** Hands made by splitting can't count as blackjack. */
  fromSplit: boolean;
  outcome?: Outcome;
  /** Chips returned to the stack when the round settles, including the bet. */
  payout?: number;
}

export interface BlackjackConfig {
  decks?: number;
  rng?: () => number;
  /** Fixed card order for tests; drawn from the front. */
  shoe?: Card[];
}

export const MAX_HANDS = 4;

/** Best total for a hand, counting aces as 11 where that doesn't bust. */
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 14) {
      aces++;
      total += 11;
    } else {
      total += Math.min(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

function cardValue(card: Card): number {
  return card.rank === 14 ? 11 : Math.min(card.rank, 10);
}

/**
 * One player against the dealer. Dealer stands on all 17s, blackjack pays
 * 3:2, double on any first two cards (also after a split), split up to
 * four hands, split aces get one card each.
 */
export class Blackjack {
  stack: number;
  phase: Phase = 'betting';
  hands: PlayerHand[] = [];
  dealer: Card[] = [];
  /** Index of the hand being played. */
  active = 0;

  private readonly decks: number;
  private readonly rng: () => number;
  private shoe: Card[];
  private readonly fixedShoe: boolean;

  constructor(stack: number, config: BlackjackConfig = {}) {
    this.stack = stack;
    this.decks = config.decks ?? 6;
    this.rng = config.rng ?? Math.random;
    this.fixedShoe = Boolean(config.shoe);
    this.shoe = config.shoe ? config.shoe.slice() : this.freshShoe();
  }

  get activeHand(): PlayerHand | undefined {
    return this.phase === 'player' ? this.hands[this.active] : undefined;
  }

  /** Cards left before the shoe is reshuffled from all decks. */
  get cardsLeft(): number {
    return this.shoe.length;
  }

  /** Whether the dealer's hole card should be shown. */
  get dealerRevealed(): boolean {
    return this.phase === 'settled';
  }

  deal(bet: number): void {
    if (this.phase === 'player') throw new Error('Round in progress');
    if (!Number.isInteger(bet) || bet <= 0) throw new Error('Bet must be a positive whole number');
    if (bet > this.stack) throw new Error('Not enough chips');
    if (!this.fixedShoe && this.shoe.length < this.decks * 52 * 0.25) this.shoe = this.freshShoe();

    this.stack -= bet;
    const hand: PlayerHand = { cards: [], bet, done: false, doubled: false, fromSplit: false };
    this.hands = [hand];
    this.dealer = [];
    this.active = 0;
    hand.cards.push(this.draw());
    this.dealer.push(this.draw());
    hand.cards.push(this.draw());
    this.dealer.push(this.draw());
    this.phase = 'player';

    // Dealer peeks: a dealer blackjack, or a player blackjack, ends the round at once.
    if (isBlackjack(this.dealer) || isBlackjack(hand.cards)) {
      hand.done = true;
      this.settle();
    }
  }

  canHit(): boolean {
    return Boolean(this.activeHand);
  }

  canDouble(): boolean {
    const hand = this.activeHand;
    return Boolean(hand && hand.cards.length === 2 && this.stack >= hand.bet);
  }

  canSplit(): boolean {
    const hand = this.activeHand;
    return Boolean(
      hand &&
      hand.cards.length === 2 &&
      cardValue(hand.cards[0]!) === cardValue(hand.cards[1]!) &&
      this.hands.length < MAX_HANDS &&
      this.stack >= hand.bet,
    );
  }

  hit(): void {
    const hand = this.requireHand();
    hand.cards.push(this.draw());
    if (handValue(hand.cards).total >= 21) this.finishHand();
  }

  stand(): void {
    this.requireHand();
    this.finishHand();
  }

  double(): void {
    if (!this.canDouble()) throw new Error('Cannot double now');
    const hand = this.activeHand!;
    this.stack -= hand.bet;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(this.draw());
    this.finishHand();
  }

  split(): void {
    if (!this.canSplit()) throw new Error('Cannot split now');
    const hand = this.activeHand!;
    this.stack -= hand.bet;
    const second: PlayerHand = {
      cards: [hand.cards.pop()!], bet: hand.bet, done: false, doubled: false, fromSplit: true,
    };
    hand.fromSplit = true;
    this.hands.splice(this.active + 1, 0, second);
    const aces = hand.cards[0]!.rank === 14;
    for (const h of [hand, second]) {
      h.cards.push(this.draw());
      if (aces) h.done = true;
    }
    if (aces) {
      this.advance();
    } else if (handValue(hand.cards).total === 21) {
      this.finishHand();
    }
  }

  private requireHand(): PlayerHand {
    const hand = this.activeHand;
    if (!hand) throw new Error('No hand to play');
    return hand;
  }

  private finishHand(): void {
    this.hands[this.active]!.done = true;
    this.advance();
  }

  /** Moves to the next unfinished hand, or plays the dealer when none are left. */
  private advance(): void {
    const next = this.hands.findIndex((h) => !h.done);
    if (next >= 0) {
      this.active = next;
      const hand = this.hands[next]!;
      // A split hand that lands on 21 needs no decision.
      if (handValue(hand.cards).total === 21) this.finishHand();
      return;
    }
    const allBust = this.hands.every((h) => handValue(h.cards).total > 21);
    if (!allBust) {
      while (handValue(this.dealer).total < 17) this.dealer.push(this.draw());
    }
    this.settle();
  }

  private settle(): void {
    const dealerTotal = handValue(this.dealer).total;
    const dealerBj = isBlackjack(this.dealer);
    for (const hand of this.hands) {
      const total = handValue(hand.cards).total;
      const playerBj = !hand.fromSplit && isBlackjack(hand.cards);
      let outcome: Outcome;
      if (playerBj && !dealerBj) outcome = 'blackjack';
      else if (playerBj && dealerBj) outcome = 'push';
      else if (dealerBj) outcome = 'lose';
      else if (total > 21) outcome = 'lose';
      else if (dealerTotal > 21 || total > dealerTotal) outcome = 'win';
      else if (total === dealerTotal) outcome = 'push';
      else outcome = 'lose';

      const payout =
        outcome === 'blackjack' ? hand.bet + Math.floor(hand.bet * 1.5)
        : outcome === 'win' ? hand.bet * 2
        : outcome === 'push' ? hand.bet
        : 0;
      hand.outcome = outcome;
      hand.payout = payout;
      hand.done = true;
      this.stack += payout;
    }
    this.phase = 'settled';
  }

  private freshShoe(): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < this.decks; i++) cards.push(...newDeck());
    return shuffle(cards, this.rng);
  }

  private draw(): Card {
    const card = this.shoe.shift();
    if (!card) throw new Error('Shoe is empty');
    return card;
  }
}
