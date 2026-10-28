import { useState } from 'react';
import { GAMES } from '../games/registry';
import type { GameInfo } from '../games/types';
import { BuyInDialog } from './BuyInDialog';
import { SymbolIcon } from '../games/slots/SymbolIcon';
import { CardView } from './CardView';

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
      <header className="masthead">
        <span className="wordmark">pokerussi</span>
        <span className="masthead-note">Play money only</span>
      </header>

      <section className="purse">
        <span className="eyebrow">Your chips</span>
        <span className="purse-amount">{balance.toLocaleString()}</span>
        <span className="purse-note">Saved in this browser. Pick a table and choose how much to bring.</span>
      </section>

      {canRefill && (
        <div className="refill">
          <span>You're almost out of chips. The house will spot you a fresh stack.</span>
          <button className="primary" onClick={onRefill}>Get 10,000 free chips</button>
        </div>
      )}

      <section className="tables">
        <h2 className="eyebrow">Tables</h2>
        <ul className="game-list">
          {GAMES.map((game, i) => {
            const affordable = balance >= game.minBuyIn;
            return (
              <li key={game.id}>
                <button
                  className="game-row"
                  disabled={!affordable}
                  onClick={() => setChoosing(game)}
                >
                  <span className="game-index">{String(i + 1).padStart(2, '0')}</span>
                  <GameArt id={game.id} />
                  <span className="game-text">
                    <span className="game-name">{game.name}</span>
                    <span className="game-blurb">{game.blurb}</span>
                  </span>
                  <span className="game-meta">
                    <span>{game.stakes}</span>
                    <span>Buy-in from {game.minBuyIn.toLocaleString()}</span>
                  </span>
                  <span className="game-go" aria-hidden>{affordable ? 'Sit down →' : 'Not enough chips'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

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

/** A small picture of each game, drawn with the same cards and reels used at the tables. */
function GameArt({ id }: { id: string }) {
  if (id === 'poker') {
    return (
      <span className="game-art fan" aria-hidden>
        <CardView small card={{ rank: 14, suit: 's' }} />
        <CardView small card={{ rank: 13, suit: 's' }} />
      </span>
    );
  }
  if (id === 'blackjack') {
    return (
      <span className="game-art fan" aria-hidden>
        <CardView small card={{ rank: 14, suit: 'h' }} />
        <CardView small card={{ rank: 11, suit: 'c' }} />
      </span>
    );
  }
  if (id === 'slots') {
    return (
      <span className="game-art mini-reels" aria-hidden>
        <SymbolIcon symbol="seven" /><SymbolIcon symbol="seven" /><SymbolIcon symbol="seven" />
      </span>
    );
  }
  return <span className="game-art" aria-hidden />;
}
