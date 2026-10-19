import type { Card } from '../engine/cards';

const RANKS = '23456789TJQKA';
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;

interface Props {
  /** Leave undefined to show the card face down. */
  card?: Card;
  /** Shows an empty slot instead of a card. */
  empty?: boolean;
  small?: boolean;
}

export function CardView({ card, empty, small }: Props) {
  const size = small ? ' small' : '';
  if (empty) return <div className={`card slot${size}`} />;
  if (!card) return <div className={`card back${size}`} />;
  const red = card.suit === 'h' || card.suit === 'd';
  const rank = RANKS[card.rank - 2] === 'T' ? '10' : RANKS[card.rank - 2];
  return (
    <div className={`card face${red ? ' red' : ''}${size}`}>
      <span className="rank">{rank}</span>
      <span className="suit">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}
