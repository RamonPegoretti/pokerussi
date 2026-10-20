import { useState } from 'react';
import { useWallet, wallet } from '../casino/useWallet';
import { findGame } from '../games/registry';
import type { GameInfo } from '../games/types';
import { Lobby } from './Lobby';

export function App() {
  const { balance, session } = useWallet();
  // Remember the buy-in for the game being played; the wallet tracks the rest.
  const [buyIn, setBuyIn] = useState(0);
  const game = session ? findGame(session.game) : undefined;

  function play(info: GameInfo, amount: number) {
    wallet.buyIn(info.id, amount);
    setBuyIn(amount);
  }

  if (session && game) {
    const Game = game.component;
    return (
      <Game
        key={game.id}
        buyIn={buyIn || session.amount}
        onStackChange={(chips) => wallet.updateSession(chips)}
        onLeave={() => wallet.cashOut()}
      />
    );
  }

  return (
    <Lobby
      balance={balance}
      canRefill={wallet.canRefill()}
      onRefill={() => wallet.refill()}
      onPlay={play}
    />
  );
}
