import { useEffect, useRef, useState } from 'react';
import { chooseAction } from '../../bots/simpleBot';
import { CATEGORY_NAMES } from '../../engine/evaluator';
import { type Action, type Phase, Table } from '../../engine/table';
import { CardView } from '../../ui/CardView';
import { GameHeader } from '../../ui/GameHeader';
import type { GameProps } from '../types';

const YOU = 'you';
const BOT_STACK = 1000;
const BOT_DELAY_MS = 700;
const BOT_NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa'];

/** Seat positions around the table, as percentages. Seat 0 (you) is at the bottom. */
const SEAT_POSITIONS = [
  { left: 50, top: 86 },
  { left: 10, top: 66 },
  { left: 10, top: 22 },
  { left: 50, top: 4 },
  { left: 90, top: 22 },
  { left: 90, top: 66 },
];

function createTable(buyIn: number): Table {
  const table = new Table({ smallBlind: 10, bigBlind: 20 });
  table.addPlayer(YOU, 'You', buyIn);
  BOT_NAMES.forEach((name, i) => table.addPlayer(`bot${i}`, name, BOT_STACK));
  table.startHand();
  return table;
}

export function PokerGame({ buyIn, onStackChange, onLeave }: GameProps) {
  const tableRef = useRef<Table | null>(null);
  if (!tableRef.current) tableRef.current = createTable(buyIn);
  const table = tableRef.current;

  // The table is mutable, so bump this to re-render after each change.
  const [tick, setTick] = useState(0);
  const [handNumber, setHandNumber] = useState(1);
  const [lastActions, setLastActions] = useState<Record<string, string>>({});
  const [raiseTo, setRaiseTo] = useState(0);

  const me = table.players.find((p) => p.id === YOU)!;
  const current = table.currentPlayer;
  const myTurn = current?.id === YOU;
  const legal = table.legalActions();
  const handOver = table.phase === 'complete';

  function act(action: Action) {
    const actor = table.currentPlayer!;
    const phaseBefore: Phase = table.phase;
    const label = action.type === 'raise'
      ? (table.currentBet === 0 ? `Bet ${action.to}` : `Raise to ${action.to}`)
      : action.type === 'call' ? `Call ${Math.min(table.currentBet, actor.bet + actor.stack)}`
      : action.type === 'fold' ? 'Fold' : 'Check';
    table.act(action);
    const streetChanged = table.phase !== phaseBefore && table.phase !== 'complete';
    setLastActions((prev) => (streetChanged ? {} : { ...prev, [actor.id]: label }));
    setTick((t) => t + 1);
  }

  // Bots take their turns after a short pause.
  useEffect(() => {
    if (!current || current.id === YOU) return;
    const timer = setTimeout(() => act(chooseAction(table)), BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the wallet in step with your stack, so closing the tab keeps your chips.
  useEffect(() => {
    onStackChange(me.stack);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the raise slider when it becomes your turn.
  useEffect(() => {
    if (myTurn) setRaiseTo(legal.minRaiseTo);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  function nextHand() {
    for (const p of table.players) {
      if (p.id !== YOU && p.stack === 0) p.stack = BOT_STACK; // bots rebuy
    }
    if (me.stack === 0) return;
    table.startHand();
    setLastActions({});
    setHandNumber((n) => n + 1);
    setTick((t) => t + 1);
  }

  const winners = new Set(table.result?.pots.flatMap((pot) => pot.winners.map((w) => w.playerId)) ?? []);
  const showdown = handOver && Object.keys(table.result?.hands ?? {}).length > 0;
  // Leaving mid-hand is fine once you've folded: the chips you put in are gone either way.
  const canLeave = handOver || me.folded || !me.inHand;

  return (
    <div className="app">
      <GameHeader
        title="Texas Hold'em"
        detail={`Blinds 10/20 · hand #${handNumber}`}
        tableChips={me.stack}
        canLeave={canLeave}
        onLeave={onLeave}
      />

      <div className="table-area">
        <div className="felt">
          <div className="board">
            {Array.from({ length: 5 }, (_, i) => (
              <CardView key={i} card={table.board[i]} empty={!table.board[i]} />
            ))}
          </div>
          {!handOver && <div className="pot"><span>Pot</span> {table.potTotal.toLocaleString()}</div>}
          {handOver && <ResultText table={table} />}
          <div className="felt-mark" aria-hidden>pokerussi</div>
        </div>

        {table.players.map((p, seat) => {
          const pos = SEAT_POSITIONS[seat]!;
          const reveal = p.id === YOU || (showdown && p.inHand && !p.folded);
          const classes = [
            'seat',
            current === p ? 'to-act' : '',
            p.folded || !p.inHand ? 'out' : '',
            winners.has(p.id) ? 'winner' : '',
          ].join(' ');
          return (
            <div key={p.id} className={classes} style={{ left: `${pos.left}%`, top: `${pos.top}%` }}>
              <div className="hole">
                {!p.folded && p.holeCards.map((c, i) => <CardView key={i} card={reveal ? c : undefined} small={p.id !== YOU} />)}
              </div>
              <div className="plate">
                <div className="name">
                  {p.name}
                  {table.button === seat && <span className="dealer">D</span>}
                </div>
                <div className="stack">{p.stack.toLocaleString()}</div>
              </div>
              <div className="action-label">
                {p.stack === 0 && p.inHand && !p.folded ? 'All-in' : lastActions[p.id] ?? ''}
              </div>
              {p.bet > 0 && <div className="bet">{p.bet}</div>}
            </div>
          );
        })}
      </div>

      <div className="controls">
        {handOver ? (
          me.stack > 0
            ? <button className="primary" onClick={nextHand}>Deal next hand</button>
            : <button className="primary" onClick={onLeave}>You're out of chips. Back to the lobby</button>
        ) : myTurn ? (
          <>
            {legal.canFold && <button onClick={() => act({ type: 'fold' })}>Fold</button>}
            {legal.canCheck
              ? <button onClick={() => act({ type: 'check' })}>Check</button>
              : <button onClick={() => act({ type: 'call' })}>Call {legal.callAmount}</button>}
            {legal.canRaise && (
              <div className="raise">
                <div className="presets">
                  <button onClick={() => setRaiseTo(legal.minRaiseTo)}>Min</button>
                  <button onClick={() => setRaiseTo(clamp(table.currentBet + Math.round(table.potTotal / 2)))}>½ pot</button>
                  <button onClick={() => setRaiseTo(clamp(table.currentBet + table.potTotal))}>Pot</button>
                  <button onClick={() => setRaiseTo(legal.maxRaiseTo)}>All-in</button>
                </div>
                <input
                  type="range"
                  min={legal.minRaiseTo}
                  max={legal.maxRaiseTo}
                  step={1}
                  value={raiseTo}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                />
                <button className="primary" onClick={() => act({ type: 'raise', to: clamp(raiseTo) })}>
                  {table.currentBet === 0 ? 'Bet' : 'Raise to'} {clamp(raiseTo)}
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="waiting">{current ? `${current.name} is thinking…` : ''}</span>
        )}
      </div>
    </div>
  );

  function clamp(value: number): number {
    return Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, value));
  }
}

function ResultText({ table }: { table: Table }) {
  const result = table.result;
  if (!result) return null;
  const name = (id: string) => table.players.find((p) => p.id === id)!.name;
  const lines = result.pots.map((pot, i) => {
    const who = pot.winners.map((w) => name(w.playerId)).join(' and ');
    const verb = pot.winners.length > 1 ? 'split' : 'wins';
    const hand = result.hands[pot.winners[0]!.playerId];
    const potName = result.pots.length > 1 ? (i === 0 ? ' the main pot' : ' a side pot') : '';
    return `${who} ${verb}${potName} ${pot.amount.toLocaleString()}${hand ? ` with ${CATEGORY_NAMES[hand.category].toLowerCase()}` : ''}`;
  });
  return <div className="result">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>;
}

