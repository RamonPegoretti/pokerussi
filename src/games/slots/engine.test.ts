import { describe, expect, it } from 'vitest';
import { lineMultiplier, returnToPlayer, spin } from './engine';

describe('slots', () => {
  it('pays three of a kind and two cherries', () => {
    expect(lineMultiplier(['seven', 'seven', 'seven'])).toBe(200);
    expect(lineMultiplier(['cherry', 'lemon', 'cherry'])).toBe(2);
    expect(lineMultiplier(['cherry', 'lemon', 'bell'])).toBe(0);
  });

  it('returns a little under 100% over time', () => {
    const rtp = returnToPlayer();
    expect(rtp).toBeGreaterThan(0.9);
    expect(rtp).toBeLessThan(1);
  });

  it('spin pays bet times multiplier', () => {
    const fixed = () => 0; // always the first symbol: cherry
    expect(spin(10, fixed)).toEqual({ line: ['cherry', 'cherry', 'cherry'], multiplier: 5, payout: 50 });
  });
});
