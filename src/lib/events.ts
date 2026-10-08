import { useSyncExternalStore } from 'react';
import type { Gender } from '../domain/admission.ts';
import { joinState, MeetupEvent } from '../domain/events.ts';

const DEMO_EVENTS: MeetupEvent[] = [
  { id: 'quiz', title: 'Pub-Quiz mit Fremden', kind: 'Quiz', when: 'Donnerstag, 19:30', place: 'Kiezkneipe Lotte, Friedrichshain', seats: 12, joined: { f: 4, m: 6 }, price: 0, plusFirst: false },
  { id: 'kochen', title: 'Pasta-Kochabend', kind: 'Kochen', when: 'Freitag, 19 Uhr', place: 'Kochschule Tafelrunde, Mitte', seats: 10, joined: { f: 3, m: 3 }, price: 25, plusFirst: false },
  { id: 'bouldern', title: 'Bouldern für Anfänger', kind: 'Sport', when: 'Samstag, 14 Uhr', place: 'Boulderhalle Kegel, Friedrichshain', seats: 8, joined: { f: 2, m: 1 }, price: 15, plusFirst: true },
  { id: 'spiele', title: 'Brettspielabend', kind: 'Spiele', when: 'Sonntag, 17 Uhr', place: 'Spielecafé Würfelglück, Neukölln', seats: 12, joined: { f: 6, m: 5 }, price: 5, plusFirst: false },
];

/** Prototyp: Events im Speicher. Wer sich anmeldet, belegt einen Platz seiner Hälfte. */
export function createEventStore() {
  let events = DEMO_EVENTS;
  let mine = new Set<string>();
  let snapshot = { events, mine };
  const listeners = new Set<() => void>();
  const emit = () => {
    snapshot = { events, mine };
    listeners.forEach((l) => l());
  };
  return {
    get: () => snapshot,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    join(id: string, g: Gender, plus: boolean) {
      const e = events.find((x) => x.id === id);
      if (!e || joinState(e, g, { joined: mine.has(id), plus }) !== 'open') return;
      events = events.map((x) => (x.id === id ? { ...x, joined: { ...x.joined, [g]: x.joined[g] + 1 } } : x));
      mine = new Set(mine).add(id);
      emit();
    },
    leave(id: string, g: Gender) {
      if (!mine.has(id)) return;
      events = events.map((x) => (x.id === id ? { ...x, joined: { ...x.joined, [g]: x.joined[g] - 1 } } : x));
      mine = new Set([...mine].filter((x) => x !== id));
      emit();
    },
    reset() {
      events = DEMO_EVENTS;
      mine = new Set();
      emit();
    },
  };
}

export const eventStore = createEventStore();

export const useEvents = () => useSyncExternalStore(eventStore.subscribe, eventStore.get);
