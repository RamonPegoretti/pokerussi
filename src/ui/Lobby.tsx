import { useState } from 'react';
import { GAMES } from '../games/registry';
import type { GameInfo } from '../games/types';
import { BuyInDialog } from './BuyInDialog';

interface Props {
  balance: number;
  canRefill: boolean;
  onRefill: () => void;
  onPlay: (game: GameInfo, buyIn: number) => void;
}

export function Lobby({ balance, canRefill, onRefill, onPlay }: Props) {
  const [choosing, setChoosing] = useState<GameInfo | null>(null);

  return (
    <div className="app lobby">
      <header className="lobby-header">
        <h1>pokerussi</h1>
        <div className="balance">
          <span className="label">Your chips</span>
          <span className="amount">{balance.toLocaleString()}</span>
        </div>
      </header>

      {canRefill && (
        <div className="refill">
          <span>You're almost out of chips.</span>
          <button className="primary" onClick={onRefill}>Get 10,000 free chips</button>
        </div>
      )}

      <div className="game-grid">
        {GAMES.map((game) => {
          const affordable = balance >= game.minBuyIn;
          return (
            <button
              key={game.id}
              className="game-tile"
              disabled={!affordable}
              onClick={() => setChoosing(game)}
            >
              <span className={`tile-icon ${game.id}`}>{game.icon}</span>
              <span className="tile-name">{game.name}</span>
              <span className="tile-blurb">{game.blurb}</span>
              <span className="tile-stakes">
                {game.stakes} · buy-in from {game.minBuyIn.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      <p className="fine-print">Play money only. Chips are saved in this browser.</p>

      {choosing && (
        <BuyInDialog
          game={choosing}
          balance={balance}
          onCancel={() => setChoosing(null)}
          onConfirm={(amount) => {
            setChoosing(null);
            onPlay(choosing, amount);
          }}
        />
      )}
    </div>
  );
}
