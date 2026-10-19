# pokerussi

A play-money Texas Hold'em game for the browser.

## Status

Step 1 of the plan is done: the game engine in `src/engine`.

- `cards.ts`: cards, deck, shuffle
- `evaluator.ts`: best five-card hand from seven, with tiebreaks
- `table.ts`: a hand from blinds to payout: betting rounds, min-raise rules,
  short all-ins, uncalled bets, side pots and split pots

Next: a table screen where you play against bots.

## Develop

```sh
npm install
npm test
npm run typecheck
```
