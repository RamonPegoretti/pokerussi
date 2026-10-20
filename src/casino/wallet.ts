/** Chips a new player starts with, and what a refill tops the balance back up to. */
export const STARTING_BALANCE = 10_000;
/** A refill is offered once the player has less than this in total. */
export const REFILL_THRESHOLD = 100;

const STORAGE_KEY = 'pokerussi.wallet';

export interface TableSession {
  game: string;
  /** Chips currently at the table, kept up to date while playing. */
  amount: number;
}

interface WalletState {
  balance: number;
  session: TableSession | null;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/**
 * One chip balance shared by every game. Chips taken to a table move into a
 * session; leaving the table moves what is left back. The state is saved in
 * the browser, and a session left open by closing the tab is cashed out on
 * the next load.
 */
export class Wallet {
  private state: WalletState;
  private listeners = new Set<() => void>();

  constructor(private store: KeyValueStore | undefined = browserStore()) {
    this.state = this.load();
    if (this.state.session) this.cashOut();
  }

  get balance(): number {
    return this.state.balance;
  }

  get session(): TableSession | null {
    return this.state.session;
  }

  canRefill(): boolean {
    return !this.state.session && this.state.balance < REFILL_THRESHOLD;
  }

  refill(): void {
    if (!this.canRefill()) throw new Error('Refill is only for an empty wallet');
    this.update({ balance: STARTING_BALANCE, session: null });
  }

  /** Moves `amount` chips from the balance to a table for `game`. */
  buyIn(game: string, amount: number): void {
    if (this.state.session) throw new Error(`Already sitting at ${this.state.session.game}`);
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Buy-in must be a positive whole number');
    if (amount > this.state.balance) throw new Error('Not enough chips');
    this.update({ balance: this.state.balance - amount, session: { game, amount } });
  }

  /** Records how many chips are at the table now, so a closed tab doesn't lose them. */
  updateSession(amount: number): void {
    const session = this.state.session;
    if (!session) throw new Error('No table session');
    if (amount < 0) throw new Error('Table chips cannot be negative');
    this.update({ ...this.state, session: { ...session, amount } });
  }

  /** Ends the table session and returns its chips to the balance. */
  cashOut(): number {
    const session = this.state.session;
    if (!session) return 0;
    this.update({ balance: this.state.balance + session.amount, session: null });
    return session.amount;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Snapshot for React's useSyncExternalStore; a new object after every change. */
  getSnapshot = (): WalletState => this.state;

  private load(): WalletState {
    try {
      const raw = this.store?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WalletState>;
        if (typeof parsed.balance === 'number' && parsed.balance >= 0) {
          const s = parsed.session;
          const session = s && typeof s.game === 'string' && typeof s.amount === 'number' && s.amount >= 0
            ? { game: s.game, amount: s.amount } : null;
          return { balance: Math.floor(parsed.balance), session };
        }
      }
    } catch {
      // Unreadable or blocked storage: start fresh.
    }
    return { balance: STARTING_BALANCE, session: null };
  }

  private update(next: WalletState): void {
    this.state = next;
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be full or blocked; the in-memory balance still works.
    }
    for (const l of this.listeners) l();
  }
}
