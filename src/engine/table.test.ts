import { describe, expect, it } from 'vitest';
import { type Card, cardToString, newDeck, parseCards } from './cards';
import { Table } from './table';

/**
 * Builds a deck that deals the given hole cards and board. `holes` lists each
 * player's two cards in deal order (starting left of the button).
 */
function riggedDeck(holes: string[], board: string): Card[] {
  const hands = holes.map(parseCards);
  const b = parseCards(board);
  const used = new Set([...hands.flat(), ...b].map(cardToString));
  const filler = newDeck().filter((c) => !used.has(cardToString(c)));
  const burn = () => filler.shift()!;
  return [
    ...hands.map((h) => h[0]!), ...hands.map((h) => h[1]!),
    burn(), b[0]!, b[1]!, b[2]!, burn(), b[3]!, burn(), b[4]!,
    ...filler,
  ];
}

function table(stacks: number[], sb = 5, bb = 10): Table {
  const t = new Table({ smallBlind: sb, bigBlind: bb, rng: () => 0.5 });
  stacks.forEach((s, i) => t.addPlayer(`p${i}`, `P${i}`, s));
  return t;
}

const stacks = (t: Table) => t.players.map((p) => p.stack);
const total = (t: Table) => t.players.reduce((s, p) => s + p.stack + p.committed, 0);

describe('Table: blinds and order', () => {
  it('posts blinds and starts left of the big blind (3 players)', () => {
    const t = table([100, 100, 100]);
    t.startHand();
    expect(t.button).toBe(0);
    expect(t.players.map((p) => p.bet)).toEqual([0, 5, 10]);
    expect(t.toAct).toBe(0);
    expect(t.players.every((p) => p.holeCards.length === 2)).toBe(true);
  });

  it('heads-up: button posts the small blind and acts first preflop, last after', () => {
    const t = table([100, 100]);
    t.startHand();
    expect(t.button).toBe(0);
    expect(t.players.map((p) => p.bet)).toEqual([5, 10]);
    expect(t.toAct).toBe(0);
    t.act({ type: 'call' });
    expect(t.toAct).toBe(1); // big blind option
    t.act({ type: 'check' });
    expect(t.phase).toBe('flop');
    expect(t.board).toHaveLength(3);
    expect(t.toAct).toBe(1);
  });

  it('moves the button each hand and skips busted players', () => {
    const t = table([100, 0, 100, 100]);
    t.startHand();
    expect(t.button).toBe(0);
    expect(t.players[1]!.holeCards).toHaveLength(0);
    expect(t.players.map((p) => p.bet)).toEqual([0, 0, 5, 10]);
    t.act({ type: 'fold' });
    t.act({ type: 'fold' });
    expect(t.phase).toBe('complete');
    t.startHand();
    expect(t.button).toBe(2);
  });
});

describe('Table: betting', () => {
  it('everyone folds to the big blind, who wins the blinds back', () => {
    const t = table([100, 100, 100]);
    t.startHand();
    t.act({ type: 'fold' });
    t.act({ type: 'fold' });
    expect(t.phase).toBe('complete');
    expect(stacks(t)).toEqual([100, 95, 105]);
  });

  it('rejects illegal actions', () => {
    const t = table([100, 100, 100]);
    t.startHand();
    expect(() => t.act({ type: 'check' })).toThrow();
    expect(() => t.act({ type: 'raise', to: 15 })).toThrow(); // min raise is to 20
    t.act({ type: 'raise', to: 20 });
    expect(t.legalActions().minRaiseTo).toBe(30);
  });

  it('a raise reopens action for players who already acted', () => {
    const t = table([100, 100, 100]);
    t.startHand();
    t.act({ type: 'call' }); // p0
    t.act({ type: 'call' }); // p1 SB
    t.act({ type: 'raise', to: 40 }); // p2 BB
    expect(t.toAct).toBe(0);
    t.act({ type: 'call' });
    t.act({ type: 'call' });
    expect(t.phase).toBe('flop');
    expect(t.potTotal).toBe(120);
  });

  it('a short all-in raise does not let earlier callers re-raise', () => {
    const t = table([100, 100, 25]);
    t.startHand();
    t.act({ type: 'raise', to: 20 }); // p0
    t.act({ type: 'call' }); // p1
    t.act({ type: 'raise', to: 25 }); // p2 all-in, only +5
    expect(t.toAct).toBe(0);
    const legal = t.legalActions();
    expect(legal.callAmount).toBe(5);
    expect(legal.canRaise).toBe(false);
  });

  it('returns an uncalled bet', () => {
    const t = table([100, 100]);
    t.startHand();
    t.act({ type: 'raise', to: 60 });
    t.act({ type: 'fold' });
    expect(stacks(t)).toEqual([110, 90]);
  });
});

describe('Table: showdown and side pots', () => {
  it('plays a hand to showdown and pays the best hand', () => {
    const t = table([100, 100]);
    // Deal order heads-up starts left of button: p1 then p0.
    t.startHand(riggedDeck(['2c 7d', 'As Ah'], 'Kd 9s 4h 3c Jd'));
    t.act({ type: 'call' });
    t.act({ type: 'check' });
    for (const street of ['flop', 'turn', 'river']) {
      expect(t.phase).toBe(street);
      t.act({ type: 'check' });
      t.act({ type: 'check' });
    }
    expect(t.phase).toBe('complete');
    expect(t.result!.pots[0]!.winners).toEqual([{ playerId: 'p0', amount: 20 }]);
    expect(stacks(t)).toEqual([110, 90]);
  });

  it('splits a tied pot, odd chip to the first seat left of the button', () => {
    const t = table([100, 100, 100], 1, 2);
    // Board is a royal flush, so everyone ties.
    t.startHand(riggedDeck(['2c 3d', '4c 5d', '6c 7d'], 'As Ks Qs Js Ts'));
    t.act({ type: 'call' }); // p0
    t.act({ type: 'fold' }); // p1 folds its small blind: pot = 2 + 2 + 1 = 5
    t.act({ type: 'check' }); // p2
    for (let i = 0; i < 3; i++) {
      t.act({ type: 'check' });
      t.act({ type: 'check' });
    }
    const winners = t.result!.pots[0]!.winners;
    expect(winners).toEqual([
      { playerId: 'p2', amount: 3 },
      { playerId: 'p0', amount: 2 },
    ]);
    expect(stacks(t)).toEqual([100, 99, 101]);
  });

  it('builds side pots when players are all-in for different amounts', () => {
    const t = table([300, 50, 100]);
    // Deal order: p1, p2, p0. p1 has the best hand, p2 second, p0 worst.
    t.startHand(riggedDeck(['As Ah', 'Ks Kh', '2c 7d'], 'Qd 9s 4h 3c Jd'));
    t.act({ type: 'raise', to: 300 }); // p0 all-in
    t.act({ type: 'call' }); // p1 all-in for 50
    t.act({ type: 'call' }); // p2 all-in for 100
    expect(t.phase).toBe('complete');
    expect(t.board).toHaveLength(5);
    const pots = t.result!.pots;
    expect(pots.map((p) => p.amount)).toEqual([150, 100]);
    expect(pots[0]!.winners).toEqual([{ playerId: 'p1', amount: 150 }]);
    expect(pots[1]!.winners).toEqual([{ playerId: 'p2', amount: 100 }]);
    // p0's unmatched 200 comes back.
    expect(stacks(t)).toEqual([200, 150, 100]);
  });

  it('folded chips stay in the pot but folded players cannot win', () => {
    const t = table([100, 100, 100]);
    t.startHand(riggedDeck(['As Ah', 'Ks Kh', '2c 7d'], 'Qd 9s 4h 3c Jd'));
    t.act({ type: 'raise', to: 30 }); // p0
    t.act({ type: 'call' }); // p1
    t.act({ type: 'call' }); // p2
    t.act({ type: 'raise', to: 20 }); // p1 bets flop
    t.act({ type: 'fold' }); // p2 has kings but folds
    t.act({ type: 'call' }); // p0
    t.act({ type: 'check' });
    t.act({ type: 'check' });
    t.act({ type: 'check' });
    t.act({ type: 'check' });
    expect(t.result!.pots).toHaveLength(1);
    expect(t.result!.pots[0]).toEqual({ amount: 130, winners: [{ playerId: 'p1', amount: 130 }] });
  });

  it('runs out the board when all but one player is all-in and called', () => {
    const t = table([100, 40]);
    t.startHand(riggedDeck(['As Ah', '2c 7d'], 'Qd 9s 4h 3c Jd'));
    t.act({ type: 'raise', to: 40 }); // p0 bets p1's whole stack
    t.act({ type: 'call' }); // p1 calls all-in with aces
    expect(t.phase).toBe('complete');
    expect(stacks(t)).toEqual([60, 80]);
  });
});

describe('Table: chip conservation', () => {
  it('never creates or loses chips over many random hands', () => {
    let seed = 42;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const t = new Table({ smallBlind: 5, bigBlind: 10, rng });
    for (let i = 0; i < 6; i++) t.addPlayer(`p${i}`, `P${i}`, 200);
    const start = total(t);
    for (let hand = 0; hand < 500; hand++) {
      if (t.players.filter((p) => p.stack > 0).length < 2) break;
      t.startHand();
      let guard = 0;
      while (t.phase !== 'complete') {
        if (guard++ > 200) throw new Error('Hand did not finish');
        const legal = t.legalActions();
        const r = rng();
        if (legal.canRaise && r < 0.25) {
          const to = legal.minRaiseTo + Math.floor(rng() * (legal.maxRaiseTo - legal.minRaiseTo + 1));
          t.act({ type: 'raise', to });
        } else if (legal.canFold && r < 0.4) t.act({ type: 'fold' });
        else if (legal.canCheck) t.act({ type: 'check' });
        else t.act({ type: 'call' });
        expect(total(t)).toBe(start);
      }
      expect(stacks(t).reduce((a, b) => a + b, 0)).toBe(start);
      expect(t.players.every((p) => p.stack >= 0)).toBe(true);
    }
  });
});
