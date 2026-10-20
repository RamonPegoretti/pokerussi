# pokerussi

A play-money casino for the browser. It has a lobby with Texas Hold'em, blackjack and slots, all sharing one chip balance.

Live at https://pokerussi.vercel.app/. Every merge to `main` updates the site.

## How it works

- **Lobby:** shows your chips. Pick a game and choose how many chips to bring to the table. When you leave, whatever is left goes back to your balance. If you run out, you can claim 10,000 free chips.
- **Chips** are saved in your browser (`src/casino/wallet.ts`). If you close the tab while sitting at a table, those chips are returned to your balance the next time you visit.

## Code

- `src/engine`: poker cards, hand evaluator and table rules
- `src/bots`: poker bots
- `src/games/<game>`: each game's rules (`engine.ts`) and screen
- `src/games/registry.ts`: the games listed in the lobby. Add a new game here.
- `src/casino`: the shared wallet
- `src/ui`: the lobby, buy-in dialog and shared pieces

## Develop

```sh
npm install
npm run dev     # open the URL it prints to play
npm test
npm run typecheck
```
