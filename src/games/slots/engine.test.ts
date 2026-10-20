import { describe, expect, it } from 'vitest';
import { lineMultiplier, returnToPlayer, spin, SYMBOLS, threeOfAKindOdds } from './engine';

describe('slots', () => {
  it('pays three of a kind only', () => {
    expect(lineMultiplier(['seven', 'seven', 'seven'])).toBe(20);
    expect(lineMultiplier(['cherry', 'lemon', 'cherry'])).toBe(0);
    expect(lineMultiplier(['cherry', 'lemon', 'bell'])).toBe(0);
  });

  it('lands three of a kind about one spin in five', () => {
    const odds = threeOfAKindOdds();
    const total = SYMBOLS.reduce((s, sym) => s + odds[sym], 0);
    expect(total).toBeGreaterThan(0.18);
    expect(total).toBeLessThan(0.21);
  });

  it('matches the exact odds over many spins', () => {
    let seed = 5;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    let paid = 0;
    const spins = 200_000;
    for (let i = 0; i < spins; i++) paid += spin(1, rng).payout;
    expect(paid / spins).toBeCloseTo(returnToPlayer(), 1);
  });

  it('returns a little under 100% over time', () => {
    const rtp = returnToPlayer();
    expect(rtp).toBeGreaterThan(0.9);
    expect(rtp).toBeLessThan(1);
  });

  it('spin pays bet times multiplier', () => {
    const fixed = () => 0; // lines up, on the first symbol: cherry
    expect(spin(10, fixed)).toEqual({ line: ['cherry', 'cherry', 'cherry'], multiplier: 2, payout: 20 });
  });
});
