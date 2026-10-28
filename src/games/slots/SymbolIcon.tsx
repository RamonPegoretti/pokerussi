import type { SlotSymbol } from './engine';

const LABELS: Record<SlotSymbol, string> = {
  cherry: 'Cherry',
  lemon: 'Lemon',
  bell: 'Bell',
  star: 'Star',
  seven: 'Seven',
  diamond: 'Diamond',
};

/** Reel symbols drawn as flat shapes, so they look the same on every device. */
export function SymbolIcon({ symbol }: { symbol: SlotSymbol }) {
  return (
    <svg className={`symbol ${symbol}`} viewBox="0 0 64 64" role="img" aria-label={LABELS[symbol]}>
      {SHAPES[symbol]}
    </svg>
  );
}

const SHAPES: Record<SlotSymbol, JSX.Element> = {
  cherry: (
    <>
      <path d="M22 40 C26 26 32 16 44 10 M44 40 C42 28 42 18 44 10" fill="none" stroke="#3f6b3a" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 10 C50 8 56 12 58 18 C52 20 46 16 44 10 Z" fill="#4f8a45" />
      <circle cx="21" cy="45" r="11" fill="#b3262e" />
      <circle cx="44" cy="46" r="11" fill="#9c1f27" />
      <circle cx="17" cy="41" r="3" fill="#fff" opacity="0.45" />
      <circle cx="40" cy="42" r="3" fill="#fff" opacity="0.45" />
    </>
  ),
  lemon: (
    <>
      <path d="M8 34 C10 20 24 12 36 14 C46 15 54 22 57 30 C55 44 42 52 30 51 C18 50 9 44 8 34 Z" fill="#e2b93b" />
      <path d="M57 30 L61 28 M8 34 L4 36" stroke="#c99a1f" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 26 C24 22 30 20 34 21" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" fill="none" />
    </>
  ),
  bell: (
    <>
      <path d="M32 8 C20 8 16 18 16 30 C16 40 12 44 8 48 L56 48 C52 44 48 40 48 30 C48 18 44 8 32 8 Z" fill="#c9973a" />
      <rect x="8" y="46" width="48" height="5" rx="2.5" fill="#a87a26" />
      <circle cx="32" cy="55" r="5" fill="#a87a26" />
      <path d="M24 16 C21 20 20 26 20 32" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.45" fill="none" />
    </>
  ),
  star: (
    <path
      d="M32 5 L39.6 22.5 L58.6 24.3 L44.3 36.9 L48.5 55.5 L32 45.8 L15.5 55.5 L19.7 36.9 L5.4 24.3 L24.4 22.5 Z"
      fill="#d9a521"
      stroke="#b8861a"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  seven: (
    <text x="32" y="52" textAnchor="middle" fontFamily="'Fraunces Variable', Georgia, serif" fontWeight="800" fontSize="56" fill="#b3262e">
      7
    </text>
  ),
  diamond: (
    <>
      <path d="M14 22 L22 10 L42 10 L50 22 L32 56 Z" fill="#3d7fb8" />
      <path d="M14 22 L50 22 L32 56 Z" fill="#2c6596" />
      <path d="M22 10 L27 22 L32 10 L37 22 L42 10" fill="none" stroke="#9cc8ee" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M27 22 L32 56 L37 22" fill="none" stroke="#9cc8ee" strokeWidth="1.5" opacity="0.6" />
    </>
  ),
};
