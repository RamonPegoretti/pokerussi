import { describe, expect, it } from 'vitest';
import { parseCards } from '../../engine/cards';
import { Blackjack } from './engine';
import { perfectPairs, twentyOnePlusThree } from './sideBets';

describe('Perfect Pairs', () => {
  it.each([
    ['8h 8h', 'Perfect pair', 25],
    ['8h 8d', 'Colored pair', 12],
    ['8h 8s', 'Mixed pair', 6],
  ])('%s is a %s', (cards, name, pays) => {
    expect(perfectPairs(parseCards(cards))).toEqual([name, pays]);
  });

  it('loses without a pair', () => {
    expect(perfectPairs(parseCards('8h 9h'))).toBeNull();
  });
});

describe('21+3', () => {
  it.each([
    ['7h 7h 7h', 'Suited three of a kind', 100],
    ['5s 6s 7s', 'Straight flush', 40],
    ['7h 7c 7s', 'Three of a kind', 30],
    ['Ah 2c 3s', 'Straight', 10],
    ['Qh Kc As', 'Straight', 10],
    ['2d 9d Kd', 'Flush', 5],
  ])('%s is a %s', (cards, name, pays) => {
    expect(twentyOnePlusThree(parseCards(cards))).toEqual([name, pays]);
  });

  it('does not wrap around from King to 2', () => {
    expect(twentyOnePlusThree(parseCards('Kh Ac 2s'))).toBeNull();
  });
});

describe('side bets at the table', () => {
  it('takes the stakes and pays wins as soon as the cards are dealt', () => {
    // Player 8h 8d (colored pair), dealer up 9c. 8 8 9 is not a 21+3 hand.
    const g = new Blackjack(1000, { shoe: parseCards('8h 9c 8d 7s Ts') });
    g.deal(100, { perfectPairs: 10, twentyOnePlusThree: 10 });
    expect(g.sideBets.map((s) => [s.id, s.win, s.payout])).toEqual([
      ['perfectPairs', 'Colored pair', 130],
      ['twentyOnePlusThree', null, 0],
    ]);
    expect(g.stack).toBe(1000 - 120 + 130);
  });

  it('refuses side bets the stack cannot cover', () => {
    const g = new Blackjack(100, { shoe: parseCards('8h 9c 8d 7s') });
    expect(() => g.deal(100, { perfectPairs: 10 })).toThrow();
  });

  it('ignores side bets set to zero', () => {
    const g = new Blackjack(100, { shoe: parseCards('8h 9c 8d 7s') });
    g.deal(100, { perfectPairs: 0 });
    expect(g.sideBets).toEqual([]);
  });
});
