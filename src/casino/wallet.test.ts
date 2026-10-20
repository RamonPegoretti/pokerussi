import { describe, expect, it } from 'vitest';
import { type KeyValueStore, STARTING_BALANCE, Wallet } from './wallet';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('Wallet', () => {
  it('starts new players with the starting balance', () => {
    expect(new Wallet(memoryStore()).balance).toBe(STARTING_BALANCE);
  });

  it('moves chips to a table and back', () => {
    const w = new Wallet(memoryStore());
    w.buyIn('poker', 2000);
    expect(w.balance).toBe(8000);
    w.updateSession(3500);
    expect(w.cashOut()).toBe(3500);
    expect(w.balance).toBe(11_500);
    expect(w.session).toBeNull();
  });

  it('rejects buy-ins it cannot cover, or a second table', () => {
    const w = new Wallet(memoryStore());
    expect(() => w.buyIn('poker', 20_000)).toThrow();
    expect(() => w.buyIn('poker', 0)).toThrow();
    w.buyIn('poker', 100);
    expect(() => w.buyIn('slots', 100)).toThrow();
  });

  it('persists the balance between visits', () => {
    const store = memoryStore();
    const w = new Wallet(store);
    w.buyIn('slots', 500);
    w.updateSession(0);
    w.cashOut();
    expect(new Wallet(store).balance).toBe(9500);
  });

  it('cashes out a table left open when the tab closed', () => {
    const store = memoryStore();
    const w = new Wallet(store);
    w.buyIn('blackjack', 1000);
    w.updateSession(1300);
    const reopened = new Wallet(store);
    expect(reopened.session).toBeNull();
    expect(reopened.balance).toBe(10_300);
  });

  it('offers a refill only when nearly broke and not at a table', () => {
    const w = new Wallet(memoryStore());
    expect(w.canRefill()).toBe(false);
    w.buyIn('slots', 9950);
    expect(w.canRefill()).toBe(false);
    w.updateSession(0);
    w.cashOut();
    expect(w.canRefill()).toBe(true);
    w.refill();
    expect(w.balance).toBe(STARTING_BALANCE);
  });

  it('ignores corrupted storage', () => {
    const store = memoryStore();
    store.data.set('pokerussi.wallet', '{not json');
    expect(new Wallet(store).balance).toBe(STARTING_BALANCE);
  });

  it('works without storage', () => {
    const w = new Wallet(undefined);
    w.buyIn('poker', 10);
    expect(w.balance).toBe(STARTING_BALANCE - 10);
  });
});
