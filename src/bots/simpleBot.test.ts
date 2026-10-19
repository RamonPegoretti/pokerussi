import { describe, expect, it } from 'vitest';
import { parseCards } from '../engine/cards';
import { Table } from '../engine/table';
import { chooseAction, postflopStrength, preflopStrength } from './simpleBot';

describe('simple bot', () => {
  it('rates aces above seven-deuce', () => {
    expect(preflopStrength(parseCards('As Ah'))).toBeGreaterThan(preflopStrength(parseCards('7c 2d')));
  });

  it('rates a set above a missed hand', () => {
    const board = parseCards('9s 9d 4c');
    expect(postflopStrength(parseCards('9h Kc'), board)).toBeGreaterThan(postflopStrength(parseCards('2h 3c'), board));
  });

  it('only makes legal moves over many all-bot hands', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const t = new Table({ smallBlind: 10, bigBlind: 20, rng });
    for (let i = 0; i < 6; i++) t.addPlayer(`b${i}`, `Bot ${i}`, 1000);
    let hands = 0;
    while (hands < 300 && t.players.filter((p) => p.stack > 0).length >= 2) {
      t.startHand();
      let guard = 0;
      while (t.phase !== 'complete') {
        if (guard++ > 200) throw new Error('Hand did not finish');
        t.act(chooseAction(t, rng)); // act() throws on an illegal move
      }
      hands++;
    }
    expect(hands).toBeGreaterThan(10);
    expect(t.players.reduce((s, p) => s + p.stack, 0)).toBe(6000);
  });
});
