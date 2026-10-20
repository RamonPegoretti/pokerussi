import { useRef, useState } from 'react';
import { CardView } from '../../ui/CardView';
import { GameHeader } from '../../ui/GameHeader';
import type { GameProps } from '../types';
import { Blackjack, handValue, type Outcome, type PlayerHand } from './engine';

const CHIPS = [10, 25, 100, 500];
const MIN_BET = 10;

const OUTCOME_TEXT: Record<Outcome, string> = {
  blackjack: 'Blackjack!',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
};

function totalLabel(hand: PlayerHand['cards']): string {
  const { total, soft } = handValue(hand);
  return soft && total < 21 ? `${total - 10} / ${total}` : String(total);
}

export function BlackjackGame({ buyIn, onStackChange, onLeave }: GameProps) {
  const gameRef = useRef<Blackjack | null>(null);
  if (!gameRef.current) gameRef.current = new Blackjack(buyIn);
  const game = gameRef.current;

  const [, setTick] = useState(0);
  const [bet, setBet] = useState(Math.min(MIN_BET * 5, buyIn));

  function run(action: () => void) {
    action();
    onStackChange(game.stack);
    setTick((t) => t + 1);
  }

  const playing = game.phase === 'player';
  // Chips in front of you during a round count as yours for the "at the table" figure.
  const atTable = game.stack + (playing ? game.hands.reduce((s, h) => s + h.bet, 0) : 0);
  const effectiveBet = Math.min(bet, game.stack);
  const net = game.phase === 'settled'
    ? game.hands.reduce((s, h) => s + (h.payout ?? 0) - h.bet, 0)
    : 0;

  return (
    <div className="app">
      <GameHeader
        title="Blackjack"
        detail="Dealer stands on 17 · blackjack pays 3:2"
        tableChips={atTable}
        canLeave={!playing}
        leaveHint="Finish this round first"
        onLeave={onLeave}
      />

      <div className="bj-felt">
        <section className="bj-row">
          <div className="bj-label">
            Dealer {game.dealer.length > 0 && (
              <span className="bj-total">{game.dealerRevealed ? totalLabel(game.dealer) : '?'}</span>
            )}
          </div>
          <div className="bj-cards">
            {game.dealer.length === 0
              ? <CardView empty />
              : game.dealer.map((c, i) => (
                <CardView key={i} card={i === 1 && !game.dealerRevealed ? undefined : c} />
              ))}
          </div>
        </section>

        <div className="bj-message">
          {game.phase === 'settled'
            ? net > 0 ? `You win ${net}` : net < 0 ? `You lose ${-net}` : 'Push, your bet comes back'
            : playing ? 'Your move' : 'Place your bet'}
        </div>

        <section className="bj-hands">
          {game.hands.length === 0 && <div className="bj-cards"><CardView empty /></div>}
          {game.hands.map((hand, i) => (
            <div key={i} className={`bj-hand${playing && i === game.active ? ' active' : ''}`}>
              <div className="bj-cards">
                {hand.cards.map((c, j) => <CardView key={j} card={c} />)}
              </div>
              <div className="bj-label">
                <span className="bj-total">{totalLabel(hand.cards)}</span>
                <span className="bet">{hand.bet}</span>
                {hand.outcome && <span className={`bj-outcome ${hand.outcome}`}>{OUTCOME_TEXT[hand.outcome]}</span>}
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="controls">
        {playing ? (
          <>
            <button onClick={() => run(() => game.hit())}>Hit</button>
            <button onClick={() => run(() => game.stand())}>Stand</button>
            {game.canDouble() && <button onClick={() => run(() => game.double())}>Double</button>}
            {game.canSplit() && <button onClick={() => run(() => game.split())}>Split</button>}
          </>
        ) : game.stack < MIN_BET ? (
          <button className="primary" onClick={onLeave}>You're out of chips. Back to the lobby</button>
        ) : (
          <>
            <div className="chip-picker">
              {CHIPS.map((c) => (
                <button key={c} className="chip" disabled={bet + c > game.stack} onClick={() => setBet(bet + c)}>
                  +{c}
                </button>
              ))}
              <button onClick={() => setBet(MIN_BET)}>Reset</button>
            </div>
            <button className="primary" onClick={() => run(() => game.deal(Math.max(MIN_BET, effectiveBet)))}>
              Deal · bet {Math.max(MIN_BET, effectiveBet)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
