# pokerussi

A play-money Texas Hold'em game for the browser.

## Status

Steps 1 and 2 of the plan are done: the game engine and a table where you
play against five bots in the browser.

- `cards.ts`: cards, deck, shuffle
- `evaluator.ts`: best five-card hand from seven, with tiebreaks
- `table.ts`: a hand from blinds to payout: betting rounds, min-raise rules,
  short all-ins, uncalled bets, side pots and split pots

- `src/bots/simpleBot.ts`: bots that bet on hand strength and pot odds
- `src/ui`: the table screen (React)

Next: rooms to play with friends online.

## Develop

```sh
npm install
npm run dev     # open the URL it prints to play
npm test
npm run typecheck
```
