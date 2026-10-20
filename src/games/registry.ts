import { BlackjackGame } from './blackjack/BlackjackGame';
import { PokerGame } from './poker/PokerGame';
import { SlotsGame } from './slots/SlotsGame';
import type { GameInfo } from './types';

/** Every game in the lobby. Add a new game by adding an entry here. */
export const GAMES: GameInfo[] = [
  {
    id: 'poker',
    name: "Texas Hold'em",
    blurb: 'Six-handed table against five bots.',
    stakes: 'Blinds 10/20',
    minBuyIn: 200,
    maxBuyIn: 5000,
    defaultBuyIn: 1000,
    icon: '♠',
    component: PokerGame,
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    blurb: 'Beat the dealer to 21. Double and split allowed.',
    stakes: 'Bets from 10',
    minBuyIn: 100,
    defaultBuyIn: 1000,
    icon: '♥',
    component: BlackjackGame,
  },
  {
    id: 'slots',
    name: 'Slots',
    blurb: 'Three reels, one line. Three of a kind about every fifth spin.',
    stakes: 'Spins from 1',
    minBuyIn: 10,
    defaultBuyIn: 500,
    icon: '7',
    component: SlotsGame,
  },
];

export function findGame(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}
