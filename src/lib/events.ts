import { useSyncExternalStore } from 'react';
import type { Gender } from '../domain/admission.ts';
import { EventDraft, joinState, MeetupEvent, mutualPicks } from '../domain/events.ts';
import { matchStore } from './matches';

export interface Attendee { id: string; name: string; age: number; gender: Gender }
export interface PastEvent {
  id: string;
  title: string;
  when: string;
  place: string;
  host: string;
  attendees: Attendee[];
  /** Demo: wer mich wiedersehen möchte (bleibt verborgen, bis es gegenseitig ist). */
  wantMe: string[];
  review?: { stars: number; text: string; mutual: string[] };
}

const jonas = { name: 'Jonas', events: 6, ratings: [5, 5, 4, 5], reviews: ['Lockere Runde, Jonas hat alle gut eingebunden.', 'Schwere Fragen, aber super Stimmung.'] };
const DEMO_EVENTS: MeetupEvent[] = [
  { id: 'quiz', title: 'Pub-Quiz mit Fremden', kind: 'Spiele', when: 'Donnerstag, 19:30', place: 'Kiezkneipe Lotte, Friedrichshain', seats: 12, joined: { f: 4, m: 6 }, price: 0, plusFirst: false, access: 'open', host: jonas },
  { id: 'kochen', title: 'Pasta-Kochabend', kind: 'Essen & Trinken', when: 'Freitag, 19 Uhr', place: 'Kochschule Tafelrunde, Mitte', seats: 10, joined: { f: 3, m: 3 }, price: 25, plusFirst: false, access: 'open', host: { name: 'Kochschule Tafelrunde', events: 14, ratings: [5, 4, 5, 5, 4], reviews: ['Man kocht in Zweierteams, da kommt man sofort ins Gespräch.'] } },
  { id: 'bouldern', title: 'Bouldern für Anfänger', kind: 'Sport', when: 'Samstag, 14 Uhr', place: 'Boulderhalle Kegel, Friedrichshain', seats: 8, joined: { f: 2, m: 1 }, price: 15, plusFirst: true, access: 'open', host: { name: 'Selin', events: 2, ratings: [5, 5], reviews: ['Selin erklärt super geduldig.'] } },
  { id: 'picknick', title: 'Picknick am Kanal', kind: 'Draußen', when: 'Sonntag, 13 Uhr', place: 'Maybachufer, Neukölln', seats: 10, joined: { f: 2, m: 3 }, price: 0, plusFirst: false, access: 'invite', host: { name: 'Mara', events: 1, ratings: [], reviews: [] } },
];
const DEMO_PAST: PastEvent[] = [
  {
    id: 'spiele', title: 'Brettspielabend', when: 'Letzten Sonntag', place: 'Spielecafé Würfelglück, Neukölln', host: 'Jonas',
    attendees: [
      { id: 'lena', name: 'Lena', age: 27, gender: 'f' }, { id: 'sophie', name: 'Sophie', age: 30, gender: 'f' }, { id: 'jule', name: 'Jule', age: 28, gender: 'f' },
      { id: 'kai', name: 'Kai', age: 31, gender: 'm' }, { id: 'tom', name: 'Tom', age: 29, gender: 'm' }, { id: 'ben', name: 'Ben', age: 33, gender: 'm' },
    ],
    wantMe: ['lena', 'kai', 'tom'],
  },
];
/** Demo: zu diesen Events wurde ich eingeladen. */
const DEMO_INVITED = ['picknick'];

/** Prototyp: Events im Speicher. Wer sich anmeldet, belegt einen Platz seiner Hälfte. */
export function createEventStore() {
  let events = DEMO_EVENTS;
  let past = DEMO_PAST;
  let mine = new Set<string>();
  let invited = new Set(DEMO_INVITED);
  let noShows = 0;
  let snapshot = { events, past, mine, invited, noShows };
  const listeners = new Set<() => void>();
  const emit = () => {
    snapshot = { events, past, mine, invited, noShows };
    listeners.forEach((l) => l());
  };
  const seat = (id: string, g: Gender, by: number) => {
    events = events.map((x) => (x.id === id ? { ...x, joined: { ...x.joined, [g]: x.joined[g] + by } } : x));
  };
  return {
    get: () => snapshot,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    join(id: string, g: Gender, plus: boolean) {
      const e = events.find((x) => x.id === id);
      if (!e || joinState(e, g, { joined: mine.has(id), plus, invited: invited.has(id), noShows }) !== 'open') return;
      seat(id, g, 1);
      mine = new Set(mine).add(id);
      emit();
    },
    leave(id: string, g: Gender) {
      if (!mine.has(id)) return;
      seat(id, g, -1);
      mine = new Set([...mine].filter((x) => x !== id));
      emit();
    },
    /** Gastgeber belegt selbst einen Platz seiner Hälfte. */
    create(d: EventDraft, host: { name: string; gender: Gender }, invitees: string[] = []) {
      const id = `eigen-${Date.now()}`;
      const e: MeetupEvent = { ...d, id, title: d.title.trim(), place: d.place.trim(), when: d.when.trim(), plusFirst: false, joined: { f: 0, m: 0, [host.gender]: 1 }, host: { name: host.name, events: 0, ratings: [], reviews: [] }, invitees: d.access === 'invite' ? invitees : undefined };
      events = [e, ...events];
      mine = new Set(mine).add(id);
      emit();
      return id;
    },
    /** Bewertung und Wiedersehen-Wunsch; gegenseitige Wünsche werden zu Matches. */
    review(id: string, stars: number, text: string, picks: string[]) {
      const p = past.find((x) => x.id === id);
      if (!p || p.review) return [];
      const mutual = mutualPicks(picks, p.wantMe);
      past = past.map((x) => (x.id === id ? { ...x, review: { stars, text: text.trim(), mutual } } : x));
      for (const a of p.attendees.filter((x) => mutual.includes(x.id))) matchStore.add({ id: a.id, name: a.name, age: a.age });
      emit();
      return mutual;
    },
    reset() {
      events = DEMO_EVENTS;
      past = DEMO_PAST;
      mine = new Set();
      invited = new Set(DEMO_INVITED);
      noShows = 0;
      emit();
    },
  };
}

export const eventStore = createEventStore();

export const useEvents = () => useSyncExternalStore(eventStore.subscribe, eventStore.get);
