import { useSyncExternalStore } from 'react';
import { Wallet } from './wallet';

/** The one wallet for this browser. */
export const wallet = new Wallet();

/** Re-renders when the wallet changes. */
export function useWallet() {
  return useSyncExternalStore(wallet.subscribe, wallet.getSnapshot);
}
