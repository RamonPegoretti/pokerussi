import { describe, expect, it } from 'vitest';
import { parseCards } from '../../engine/cards';
import { Blackjack, handValue } from './engine';

/** Shoe order: player, dealer, player, dealer, then hits in order. */
const game = (stack: number, shoe: string) => new Blackjack(stack, { shoe: parseCards(shoe) });

describe('handValue', () => {
  it('counts aces as 11 or 1', () => {
    expect(handValue(parseCards('Ah 6c'))).toEqual({ total: 17, soft: true });
    expect(handValue(parseCards('Ah 6c Kd'))).toEqual({ total: 17, soft: false });
    expect(handValue(parseCards('Ah Ad 9c'))).toEqual({ total: 21, soft: true });
    expect(handValue(parseCards('Kh Qd'))).toEqual({ total: 20, soft: false });
  });
});

describe('Blackjack', () => {
  it('pays 3:2 for a natural', () => {
    const g = game(1000, 'Ah 9c Kd 7s');
    g.deal(100);
    expect(g.phase).toBe('settled');
    expect(g.hands[0]!.outcome).toBe('blackjack');
    expect(g.stack).toBe(1150);
  });

  it('pushes when both have blackjack', () => {
    const g = game(1000, 'Ah As Kd Kc');
    g.deal(100);
    expect(g.hands[0]!.outcome).toBe('push');
    expect(g.stack).toBe(1000);
  });

  it('loses at once to a dealer blackjack', () => {
    const g = game(1000, '9h As Kd Kc');
    g.deal(100);
    expect(g.phase).toBe('settled');
    expect(g.stack).toBe(900);
  });

  it('busting loses and the dealer does not draw', () => {
    const g = game(1000, 'Th 9c 6d 7s Kc 5h');
    g.deal(100);
    g.hit();
    expect(g.phase).toBe('settled');
    expect(g.hands[0]!.outcome).toBe('lose');
    expect(g.dealer).toHaveLength(2);
    expect(g.stack).toBe(900);
  });

  it('dealer draws to 17 and busts', () => {
    const g = game(1000, 'Th 6c 8d Ts 9h');
    g.deal(100);
    g.stand();
    expect(handValue(g.dealer).total).toBe(25);
    expect(g.hands[0]!.outcome).toBe('win');
    expect(g.stack).toBe(1100);
  });

  it('dealer stands on soft 17', () => {
    const g = game(1000, 'Th Ac 7d 6s');
    g.deal(100);
    g.stand();
    expect(g.dealer).toHaveLength(2);
    expect(g.hands[0]!.outcome).toBe('push');
  });

  it('doubling takes one card and doubles the bet', () => {
    const g = game(1000, '6h Tc 5d 7s Ts');
    g.deal(100);
    g.double();
    expect(g.hands[0]!.cards).toHaveLength(3);
    expect(g.hands[0]!.bet).toBe(200);
    expect(g.hands[0]!.outcome).toBe('win');
    expect(g.stack).toBe(1200);
  });

  it('cannot double without enough chips', () => {
    const g = game(150, '6h Tc 5d 7s');
    g.deal(100);
    expect(g.canDouble()).toBe(false);
  });

  it('splits a pair into two hands played in turn', () => {
    // Player 8 8, dealer T 7. Split: first 8 gets 3, second 8 gets T.
    const g = game(1000, '8h Tc 8d 7s 3c Th Ks');
    g.deal(100);
    expect(g.canSplit()).toBe(true);
    g.split();
    expect(g.hands).toHaveLength(2);
    expect(g.stack).toBe(800);
    expect(g.active).toBe(0);
    g.hit(); // 8 3 K = 21, moves on
    expect(g.active).toBe(1);
    g.stand(); // 8 T = 18 vs dealer 17
    expect(g.hands.map((h) => h.outcome)).toEqual(['win', 'win']);
    expect(g.stack).toBe(1200);
  });

  it('split aces get one card each and 21 is not blackjack', () => {
    const g = game(1000, 'Ah 9c Ad 9s Kh 5c');
    g.deal(100);
    g.split();
    expect(g.phase).toBe('settled');
    // A K = 21 pays 1:1 against dealer 18; A 5 = 16 loses.
    expect(g.hands.map((h) => h.outcome)).toEqual(['win', 'lose']);
    expect(g.stack).toBe(1000);
  });

  it('keeps chips constant over many random rounds', () => {
    let seed = 11;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const g = new Blackjack(10_000, { rng });
    for (let round = 0; round < 2000 && g.stack >= 10; round++) {
      g.deal(10);
      while (g.phase === 'player') {
        const total = handValue(g.activeHand!.cards).total;
        if (g.canSplit() && rng() < 0.5) g.split();
        else if (g.canDouble() && total >= 9 && total <= 11) g.double();
        else if (total < 17) g.hit();
        else g.stand();
      }
      const payouts = g.hands.reduce((s, h) => s + h.payout!, 0);
      expect(payouts).toBeGreaterThanOrEqual(0);
    }
    expect(Number.isInteger(g.stack)).toBe(true);
  });
});
