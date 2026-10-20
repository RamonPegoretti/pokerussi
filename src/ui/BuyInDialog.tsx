import { useState } from 'react';
import type { GameInfo } from '../games/types';

interface Props {
  game: GameInfo;
  balance: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export function BuyInDialog({ game, balance, onConfirm, onCancel }: Props) {
  const max = Math.min(game.maxBuyIn ?? balance, balance);
  const [amount, setAmount] = useState(Math.min(game.defaultBuyIn, max));
  const valid = amount >= game.minBuyIn && amount <= max;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onConfirm(amount);
        }}
      >
        <h2>{game.name}</h2>
        <p>How many chips do you want to bring to the table?</p>
        <div className="buyin-amount">{amount.toLocaleString()}</div>
        <input
          id="buyin-range"
          type="range"
          min={game.minBuyIn}
          max={max}
          step={game.minBuyIn >= 100 ? 50 : 10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="buyin-limits">
          <span>Min {game.minBuyIn.toLocaleString()}</span>
          <span>Max {max.toLocaleString()}</span>
        </div>
        <div className="buyin-presets">
          {[0.25, 0.5, 1].map((f) => {
            const value = Math.max(game.minBuyIn, Math.floor(max * f));
            return (
              <button type="button" key={f} onClick={() => setAmount(value)}>
                {f === 1 ? 'Max' : `${f * 100}%`}
              </button>
            );
          })}
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={!valid}>Sit down</button>
        </div>
      </form>
    </div>
  );
}
