interface Props {
  title: string;
  detail?: string;
  tableChips: number;
  canLeave: boolean;
  onLeave: () => void;
  /** Shown as a tooltip when leaving isn't allowed yet. */
  leaveHint?: string;
}

export function GameHeader({ title, detail, tableChips, canLeave, onLeave, leaveHint }: Props) {
  return (
    <header className="game-header">
      <button className="back" onClick={onLeave} disabled={!canLeave} title={canLeave ? undefined : leaveHint ?? 'Finish this hand first'}>
        <span aria-hidden>←</span> Lobby
      </button>
      <div className="game-title">
        <h1>{title}</h1>
        {detail && <span>{detail}</span>}
      </div>
      <div className="table-chips">
        <span className="label">At the table</span>
        <span className="amount">{tableChips.toLocaleString()}</span>
      </div>
    </header>
  );
}
