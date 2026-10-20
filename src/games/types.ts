import type { ComponentType } from 'react';

export interface GameProps {
  /** Chips brought to the table from the wallet. */
  buyIn: number;
  /** Call whenever the chips at the table change. */
  onStackChange: (chips: number) => void;
  /** Leave the table; whatever was last reported goes back to the wallet. */
  onLeave: () => void;
}

export interface GameInfo {
  id: string;
  name: string;
  blurb: string;
  /** Short line about stakes, shown on the lobby tile. */
  stakes: string;
  minBuyIn: number;
  /** Upper limit for a buy-in, or undefined for no limit beyond the balance. */
  maxBuyIn?: number;
  defaultBuyIn: number;
  /** A big glyph for the lobby tile. */
  icon: string;
  component: ComponentType<GameProps>;
}
