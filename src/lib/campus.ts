import { useSyncExternalStore } from 'react';
import { uniFromEmail } from '../domain/campus.ts';

export interface CampusState { uni: string | null }

/** Prototyp: Die Uni-Mail gilt sofort als bestätigt. Echt schickt später einen Code an die Adresse. */
export function createCampusStore() {
  let state: CampusState = { uni: null };
  const listeners = new Set<() => void>();
  const set = (next: CampusState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  return {
    get: () => state,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Gibt die erkannte Hochschule zurück oder null, wenn die Adresse keine bekannte Uni-Mail ist. */
    verify(email: string) {
      const uni = uniFromEmail(email);
      if (uni) set({ uni });
      return uni;
    },
    reset: () => set({ uni: null }),
  };
}

export const campusStore = createCampusStore();

export const useCampus = () => useSyncExternalStore(campusStore.subscribe, campusStore.get);
