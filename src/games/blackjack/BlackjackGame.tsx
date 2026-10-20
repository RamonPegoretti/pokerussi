import { useEffect, useRef, useState } from 'react';
import { CardView } from '../../ui/CardView';
import { GameHeader } from '../../ui/GameHeader';
import type { GameProps } from '../types';
import { Blackjack, handValue, type Outcome, type PlayerHand } from './engine';

const CHIPS = [10, 25, 100, 500];
const MIN_BET = 10;
/** Pause before the dealer flips the hole card, then between each card drawn. */
const REVEAL_MS = 650;

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
  // While the round's end is being shown, how many dealer cards are visible.
  // The hole card counts as hidden until this reaches 2.
  const [dealerShown, setDealerShown] = useState<number | null>(null);

  function run(action: () => void) {
    action();
    onStackChange(game.stack);
    if (game.phase === 'settled') setDealerShown(1);
    setTick((t) => t + 1);
  }

  // The dealer turns the hole card over, then draws one card at a time.
  useEffect(() => {
    if (dealerShown === null) return;
    const done = dealerShown >= game.dealer.length;
    const timer = setTimeout(() => setDealerShown(done ? null : dealerShown + 1), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [dealerShown, game]);

  const revealing = dealerShown !== null;
  const playing = game.phase === 'player';
  const visibleDealer = revealing ? game.dealer.slice(0, Math.max(2, dealerShown)) : game.dealer;
  const holeHidden = playing || (revealing && dealerShown < 2);
  const finished = game.phase === 'settled' && !revealing;
  // Chips in front of you during a round count as yours for the "at the table" figure.
  // Until the dealer has finished, don't give away the result.
  const bets = game.hands.reduce((s, h) => s + h.bet, 0);
  const payouts = game.hands.reduce((s, h) => s + (h.payout ?? 0), 0);
  const atTable = playing ? game.stack + bets : revealing ? game.stack - payouts + bets : game.stack;
  const effectiveBet = Math.min(bet, game.stack);
  const net = finished
    ? game.hands.reduce((s, h) => s + (h.payout ?? 0) - h.bet, 0)
    : 0;

  return (
    <div className="app">
      <GameHeader
        title="Blackjack"
        detail={`Dealer stands on 17 · blackjack pays 3:2 · 6 decks, ${game.cardsLeft} cards left`}
        tableChips={atTable}
        canLeave={!playing && !revealing}
        leaveHint="Finish this round first"
        onLeave={onLeave}
      />

      <div className="bj-felt">
        <section className="bj-row">
          <div className="bj-label">
            Dealer {visibleDealer.length > 0 && (
              <span className="bj-total">{holeHidden ? '?' : totalLabel(visibleDealer)}</span>
            )}
          </div>
          <div className="bj-cards">
            {visibleDealer.length === 0
              ? <CardView empty />
              : visibleDealer.map((c, i) => (
                <CardView key={i} card={i === 1 && holeHidden ? undefined : c} />
              ))}
          </div>
        </section>

        <div className="bj-message">
          {revealing ? 'Dealer plays…'
            : finished
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
                {hand.outcome && finished && <span className={`bj-outcome ${hand.outcome}`}>{OUTCOME_TEXT[hand.outcome]}</span>}
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="controls">
        {revealing ? (
          <span className="waiting">Dealer plays…</span>
        ) : playing ? (
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
