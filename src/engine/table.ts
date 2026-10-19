import { type Card, newDeck, shuffle } from './cards';
import { compareHands, evaluateHand, type HandValue } from './evaluator';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Phase = 'waiting' | Street | 'complete';

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Bet or raise so this player's total bet on the street becomes `to`. */
  | { type: 'raise'; to: number };

export interface Player {
  id: string;
  name: string;
  stack: number;
  holeCards: Card[];
  /** Chips put in on the current street. */
  bet: number;
  /** Chips put in over the whole hand. */
  committed: number;
  folded: boolean;
  /** True while this player is dealt into the current hand. */
  inHand: boolean;
  /** Still has to act before the street can end. */
  needsToAct: boolean;
  /** False after acting, until someone makes a full raise. */
  mayRaise: boolean;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  /** Chips needed to call; 0 when calling is not an option. */
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
}

export interface Pot {
  amount: number;
  eligible: string[];
}

export interface PotResult {
  amount: number;
  winners: { playerId: string; amount: number }[];
}

export interface HandResult {
  pots: PotResult[];
  /** Best hand per player who reached showdown; empty if everyone else folded. */
  hands: Record<string, HandValue>;
}

export interface TableConfig {
  smallBlind: number;
  bigBlind: number;
  rng?: () => number;
}

export class Table {
  readonly smallBlind: number;
  readonly bigBlind: number;
  private rng: () => number;

  players: Player[] = [];
  board: Card[] = [];
  phase: Phase = 'waiting';
  /** Seat index of the dealer button; -1 before the first hand. */
  button = -1;
  /** Seat index of the player to act, or -1. */
  toAct = -1;
  currentBet = 0;
  /** Size of the last full bet or raise on this street. */
  minRaise = 0;
  result: HandResult | null = null;

  private deck: Card[] = [];

  constructor(config: TableConfig) {
    if (config.smallBlind <= 0 || config.bigBlind < config.smallBlind) {
      throw new Error('Invalid blinds');
    }
    this.smallBlind = config.smallBlind;
    this.bigBlind = config.bigBlind;
    this.rng = config.rng ?? Math.random;
  }

  addPlayer(id: string, name: string, stack: number): Player {
    if (this.players.some((p) => p.id === id)) throw new Error(`Duplicate player ${id}`);
    if (this.phase !== 'waiting' && this.phase !== 'complete') {
      throw new Error('Cannot add players during a hand');
    }
    const player: Player = {
      id, name, stack,
      holeCards: [], bet: 0, committed: 0,
      folded: false, inHand: false, needsToAct: false, mayRaise: false,
    };
    this.players.push(player);
    return player;
  }

  get currentPlayer(): Player | undefined {
    return this.toAct >= 0 ? this.players[this.toAct] : undefined;
  }

  /** Total chips in the middle, including bets on the current street. */
  get potTotal(): number {
    return this.players.reduce((sum, p) => sum + p.committed, 0);
  }

  /**
   * Starts a new hand. `deck` fixes the deal order for tests: cards are dealt
   * from the front, one hole card at a time starting left of the button, with
   * a burn card before each street.
   */
  startHand(deck?: Card[]): void {
    if (this.phase !== 'waiting' && this.phase !== 'complete') {
      throw new Error('Hand already in progress');
    }
    const seated = this.players.filter((p) => p.stack > 0);
    if (seated.length < 2) throw new Error('Need at least two players with chips');

    for (const p of this.players) {
      Object.assign(p, {
        holeCards: [], bet: 0, committed: 0, folded: false,
        inHand: p.stack > 0, needsToAct: false, mayRaise: false,
      });
    }
    this.board = [];
    this.result = null;
    this.deck = deck ? deck.slice() : shuffle(newDeck(), this.rng);
    this.button = this.nextInHand(this.button);

    const headsUp = seated.length === 2;
    const sb = headsUp ? this.button : this.nextInHand(this.button);
    const bb = this.nextInHand(sb);
    this.putIn(this.players[sb]!, Math.min(this.smallBlind, this.players[sb]!.stack));
    this.putIn(this.players[bb]!, Math.min(this.bigBlind, this.players[bb]!.stack));

    for (let round = 0; round < 2; round++) {
      let seat = this.button;
      for (let i = 0; i < seated.length; i++) {
        seat = this.nextInHand(seat);
        this.players[seat]!.holeCards.push(this.draw());
      }
    }

    this.phase = 'preflop';
    this.beginStreet(this.nextInHand(bb), this.bigBlind);
  }

  legalActions(): LegalActions {
    const p = this.currentPlayer;
    if (!p) {
      return { canFold: false, canCheck: false, callAmount: 0, canRaise: false, minRaiseTo: 0, maxRaiseTo: 0 };
    }
    const toCall = this.currentBet - p.bet;
    const maxRaiseTo = p.bet + p.stack;
    const opponentsCanAct = this.players.some((o) => o !== p && this.canAct(o));
    const canRaise = p.mayRaise && p.stack > toCall && opponentsCanAct;
    return {
      canFold: toCall > 0,
      canCheck: toCall === 0,
      callAmount: toCall > 0 ? Math.min(toCall, p.stack) : 0,
      canRaise,
      minRaiseTo: canRaise ? Math.min(this.currentBet + this.minRaise, maxRaiseTo) : 0,
      maxRaiseTo: canRaise ? maxRaiseTo : 0,
    };
  }

  act(action: Action): void {
    const p = this.currentPlayer;
    if (!p) throw new Error('No player to act');
    const legal = this.legalActions();

    switch (action.type) {
      case 'fold':
        if (!legal.canFold) throw new Error('Cannot fold when checking is free');
        p.folded = true;
        break;
      case 'check':
        if (!legal.canCheck) throw new Error('Cannot check facing a bet');
        break;
      case 'call':
        if (legal.callAmount === 0) throw new Error('Nothing to call');
        this.putIn(p, legal.callAmount);
        break;
      case 'raise': {
        const { to } = action;
        if (!legal.canRaise) throw new Error('Raising is not allowed');
        if (!Number.isInteger(to) || to < legal.minRaiseTo || to > legal.maxRaiseTo) {
          throw new Error(`Raise must be to between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`);
        }
        const raiseSize = to - this.currentBet;
        this.putIn(p, to - p.bet);
        this.currentBet = to;
        const fullRaise = raiseSize >= this.minRaise;
        if (fullRaise) this.minRaise = raiseSize;
        for (const o of this.players) {
          if (o === p || !this.canAct(o)) continue;
          o.needsToAct = true;
          // An all-in for less than a full raise does not reopen the betting.
          if (fullRaise) o.mayRaise = true;
        }
        break;
      }
    }
    p.needsToAct = false;
    p.mayRaise = false;
    this.advance();
  }

  private advance(): void {
    const live = this.players.filter((p) => p.inHand && !p.folded);
    if (live.length === 1) {
      this.returnUncalledBet();
      this.finish({ pots: [{ amount: this.potTotal, winners: [{ playerId: live[0]!.id, amount: this.potTotal }] }], hands: {} });
      return;
    }

    const next = this.findNextToAct(this.toAct);
    if (next >= 0) {
      this.toAct = next;
      return;
    }

    // Betting on this street is over.
    this.returnUncalledBet();
    for (const p of this.players) p.bet = 0;

    if (this.phase === 'river') {
      this.showdown();
      return;
    }
    this.dealNextStreet();
    this.beginStreet(this.nextInHand(this.button), 0);
  }

  private dealNextStreet(): void {
    this.draw(); // burn
    if (this.phase === 'preflop') {
      this.board.push(this.draw(), this.draw(), this.draw());
      this.phase = 'flop';
    } else if (this.phase === 'flop') {
      this.board.push(this.draw());
      this.phase = 'turn';
    } else {
      this.board.push(this.draw());
      this.phase = 'river';
    }
  }

  /** Sets up a betting round; `firstSeat` is where the search for the first actor starts. */
  private beginStreet(firstSeat: number, currentBet: number): void {
    this.currentBet = currentBet;
    this.minRaise = this.bigBlind;
    for (const p of this.players) {
      p.needsToAct = this.canAct(p);
      p.mayRaise = p.needsToAct;
    }
    this.toAct = -1;
    const first = this.findNextToAct(firstSeat - 1);
    if (first >= 0) {
      this.toAct = first;
    } else {
      // Nobody can bet (everyone is all-in): run the board out.
      this.advance();
    }
  }

  /** First seat after `from` that still has a decision to make, or -1. */
  private findNextToAct(from: number): number {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const seat = (((from + i) % n) + n) % n;
      const p = this.players[seat]!;
      if (!this.canAct(p) || !p.needsToAct) continue;
      const facingBet = p.bet < this.currentBet;
      const othersCanAct = this.players.some((o) => o !== p && this.canAct(o));
      // With nothing to call and no one left to bet against, there is no decision.
      if (!facingBet && !othersCanAct) continue;
      return seat;
    }
    return -1;
  }

  private canAct(p: Player): boolean {
    return p.inHand && !p.folded && p.stack > 0;
  }

  private nextInHand(from: number): number {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const seat = (((from + i) % n) + n) % n;
      if (this.players[seat]!.inHand) return seat;
    }
    throw new Error('No players');
  }

  private putIn(p: Player, amount: number): void {
    const chips = Math.min(amount, p.stack);
    p.stack -= chips;
    p.bet += chips;
    p.committed += chips;
  }

  /** Gives back the part of the biggest bet that nobody matched. */
  private returnUncalledBet(): void {
    const sorted = this.players.filter((p) => p.inHand).sort((a, b) => b.bet - a.bet);
    const [top, second] = sorted;
    if (!top || !second || top.bet <= second.bet) return;
    const excess = top.bet - second.bet;
    top.bet -= excess;
    top.committed -= excess;
    top.stack += excess;
  }

  private draw(): Card {
    const card = this.deck.shift();
    if (!card) throw new Error('Deck is empty');
    return card;
  }

  /** Main pot first, then side pots, built from what each player committed. */
  computePots(): Pot[] {
    const contributors = this.players.filter((p) => p.committed > 0);
    const live = this.players.filter((p) => p.inHand && !p.folded);
    const levels = [...new Set(live.map((p) => p.committed))].sort((a, b) => a - b);
    const pots: Pot[] = [];
    let prev = 0;
    for (const level of levels) {
      const amount = contributors.reduce(
        (sum, p) => sum + Math.max(0, Math.min(p.committed, level) - prev), 0);
      const eligible = live.filter((p) => p.committed >= level).map((p) => p.id);
      const last = pots[pots.length - 1];
      // Merge levels with the same eligible players into one pot.
      if (last && last.eligible.length === eligible.length) last.amount += amount;
      else if (amount > 0) pots.push({ amount, eligible });
      prev = level;
    }
    // Folded chips above the highest live commitment go to the last pot.
    const leftover = contributors.reduce((sum, p) => sum + Math.max(0, p.committed - prev), 0);
    if (leftover > 0 && pots.length > 0) pots[pots.length - 1]!.amount += leftover;
    return pots;
  }

  private showdown(): void {
    const hands: Record<string, HandValue> = {};
    for (const p of this.players) {
      if (p.inHand && !p.folded) hands[p.id] = evaluateHand([...p.holeCards, ...this.board]);
    }
    const results: PotResult[] = [];
    for (const pot of this.computePots()) {
      let best: string[] = [];
      for (const id of pot.eligible) {
        const cmp = best.length ? compareHands(hands[id]!, hands[best[0]!]!) : 1;
        if (cmp > 0) best = [id];
        else if (cmp === 0) best.push(id);
      }
      // Odd chips go to the winners closest to the left of the button.
      const ordered = this.seatsFromButton().filter((id) => best.includes(id));
      const share = Math.floor(pot.amount / ordered.length);
      let remainder = pot.amount - share * ordered.length;
      results.push({
        amount: pot.amount,
        winners: ordered.map((playerId) => {
          const extra = remainder > 0 ? 1 : 0;
          remainder -= extra;
          return { playerId, amount: share + extra };
        }),
      });
    }
    this.finish({ pots: results, hands });
  }

  private seatsFromButton(): string[] {
    const n = this.players.length;
    return Array.from({ length: n }, (_, i) => this.players[(this.button + 1 + i) % n]!.id);
  }

  private finish(result: HandResult): void {
    for (const pot of result.pots) {
      for (const w of pot.winners) this.players.find((p) => p.id === w.playerId)!.stack += w.amount;
    }
    for (const p of this.players) {
      p.bet = 0;
      p.committed = 0;
      p.needsToAct = false;
    }
    this.result = result;
    this.toAct = -1;
    this.phase = 'complete';
  }
}
