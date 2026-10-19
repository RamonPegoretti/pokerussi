import { describe, expect, it } from 'vitest';
import { parseCards } from './cards';
import { compareHands, evaluateHand, HandCategory } from './evaluator';

const ev = (s: string) => evaluateHand(parseCards(s));
const beats = (a: string, b: string) => compareHands(ev(a), ev(b));

describe('evaluateHand', () => {
  it.each([
    ['As Ks Qs Js Ts 2d 3c', HandCategory.StraightFlush],
    ['Ah 2h 3h 4h 5h Kd Kc', HandCategory.StraightFlush],
    ['9c 9d 9h 9s 2d 3c 4h', HandCategory.FourOfAKind],
    ['9c 9d 9h 2s 2d 3c 4h', HandCategory.FullHouse],
    ['9c 9d 9h 2s 2d 2c 4h', HandCategory.FullHouse],
    ['Ac Tc 7c 4c 2c Kd Kh', HandCategory.Flush],
    ['5d 6c 7h 8s 9d Kd Kh', HandCategory.Straight],
    ['Ad 2c 3h 4s 5d Kd Kh', HandCategory.Straight],
    ['7d 7c 7h Ks 2d 4c 9h', HandCategory.ThreeOfAKind],
    ['7d 7c 9h 9s 2d 4c Kh', HandCategory.TwoPair],
    ['7d 7c 9h Qs 2d 4c Kh', HandCategory.OnePair],
    ['7d 3c 9h Qs 2d 4c Kh', HandCategory.HighCard],
  ])('%s is category %i', (cards, category) => {
    expect(ev(cards).category).toBe(category);
  });

  it('picks the higher straight on a six-card run', () => {
    expect(ev('4d 5c 6h 7s 8d 9c 2h').kickers).toEqual([9]);
  });

  it('wheel loses to a six-high straight', () => {
    expect(beats('Ad 2c 3h 4s 5d', '2c 3h 4s 5d 6c')).toBeLessThan(0);
  });

  it('compares kickers', () => {
    expect(beats('As Ad Kc 7h 3d 2c 9s', 'Ah Ac Qc 7d 3h 2d 9h')).toBeGreaterThan(0);
    expect(beats('Ks Kd 5c 5h Ad', 'Kh Kc 5d 5s Qd')).toBeGreaterThan(0);
    expect(beats('Ks Qs 9s 5s 3s', 'Kh Qh 9h 5h 2h')).toBeGreaterThan(0);
  });

  it('full house is ranked by trips first', () => {
    expect(beats('3s 3d 3c 2h 2d', '2s 2c 2h Ad Ac')).toBeGreaterThan(0);
  });

  it('detects a tie when the board plays', () => {
    expect(beats('2c 3d As Ks Qs Js Ts', '4c 5d As Ks Qs Js Ts')).toBe(0);
  });
});
