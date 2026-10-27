import { useEffect, useRef, useState } from 'react';
import { GameHeader } from '../../ui/GameHeader';
import type { GameProps } from '../types';
import {
  spin, spinReel, SYMBOLS, THREE_OF_A_KIND, type SlotSymbol, type SpinResult,
} from './engine';
import { SymbolIcon } from './SymbolIcon';

const BETS = [1, 5, 10, 50, 100, 500];
const REEL_STOP_MS = [700, 1000, 1300];
const FLICKER_MS = 70;

export function SlotsGame({ buyIn, onStackChange, onLeave }: GameProps) {
  const [stack, setStack] = useState(buyIn);
  const [bet, setBet] = useState(Math.min(10, buyIn));
  const [reels, setReels] = useState<SlotSymbol[]>(['seven', 'seven', 'seven']);
  const [stopped, setStopped] = useState([true, true, true]);
  const [result, setResult] = useState<SpinResult | null>(null);
  const timers = useRef<number[]>([]);

  const spinning = stopped.some((s) => !s);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  // Reels that are still turning flicker through random symbols.
  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => {
      setReels((current) => current.map((s, i) => (stopped[i] ? s : spinReel(Math.random))));
    }, FLICKER_MS);
    return () => clearInterval(id);
  }, [spinning, stopped]);

  function play() {
    const stake = Math.min(bet, stack);
    if (spinning || stake <= 0) return;
    const outcome = spin(stake);
    const finalStack = stack - stake + outcome.payout;
    // Report the settled amount at once, so closing the tab mid-spin loses nothing.
    onStackChange(finalStack);
    setStack(stack - stake);
    setResult(null);
    setStopped([false, false, false]);
    timers.current = REEL_STOP_MS.map((ms, i) => window.setTimeout(() => {
      setReels((current) => current.map((s, j) => (j === i ? outcome.line[i]! : s)));
      setStopped((current) => current.map((s, j) => (j === i ? true : s)));
      if (i === REEL_STOP_MS.length - 1) {
        setStack(finalStack);
        setResult(outcome);
      }
    }, ms));
  }

  const won = result && result.payout > 0;

  return (
    <div className="app">
      <GameHeader
        title="Slots"
        detail="Three reels · one line"
        tableChips={stack}
        canLeave={!spinning}
        leaveHint="Wait for the reels to stop"
        onLeave={onLeave}
      />

      <div className="slots">
        <div className="cabinet">
          <div className={`slot-window${won ? ' win' : ''}`}>
            {reels.map((s, i) => (
              <div key={i} className={`reel${stopped[i] ? '' : ' spinning'}`}>
                <SymbolIcon symbol={s} />
              </div>
            ))}
          </div>

          <div className={`slot-message${won ? ' won' : ''}`} aria-live="polite">
            {spinning ? 'Spinning…'
              : result ? (won ? `You win ${result.payout.toLocaleString()}` : 'No win this time')
              : 'Pick a bet and spin'}
          </div>
        </div>

        <table className="paytable">
          <caption>Three in a row pays</caption>
          <tbody>
            {[...SYMBOLS].reverse().map((s) => (
              <tr key={s} className={won && result?.line[0] === s ? 'hit' : undefined}>
                <td className="paytable-line">
                  <span><SymbolIcon symbol={s} /><SymbolIcon symbol={s} /><SymbolIcon symbol={s} /></span>
                </td>
                <td>{THREE_OF_A_KIND[s]}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="controls">
        {stack === 0 && !spinning ? (
          <button className="primary" onClick={onLeave}>You're out of chips. Back to the lobby</button>
        ) : (
          <>
            <div className="chip-picker">
              {BETS.map((b) => (
                <button
                  key={b}
                  className={`chip chip-${b}${b === bet ? ' selected' : ''}`}
                  disabled={b > stack || spinning}
                  onClick={() => setBet(b)}
                >
                  {b}
                </button>
              ))}
            </div>
            <button className="primary" disabled={spinning} onClick={play}>
              Spin · {Math.min(bet, stack)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
