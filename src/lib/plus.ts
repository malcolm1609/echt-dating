import { useSyncExternalStore } from 'react';

export interface PlusState { active: boolean; readReceipts: boolean }

/** Prototyp: Plus wird nur im Speicher ein- und ausgeschaltet, ohne Zahlung. */
export function createPlusStore() {
  let state: PlusState = { active: false, readReceipts: false };
  const listeners = new Set<() => void>();
  const set = (next: PlusState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  return {
    get: () => state,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    setActive: (active: boolean) => set({ active, readReceipts: active && state.readReceipts }),
    setReadReceipts: (on: boolean) => set({ ...state, readReceipts: state.active && on }),
    reset: () => set({ active: false, readReceipts: false }),
  };
}

export const plusStore = createPlusStore();

export const usePlus = () => useSyncExternalStore(plusStore.subscribe, plusStore.get);
