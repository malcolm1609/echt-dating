import type { SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import type { Gender } from '../domain/admission.ts';
import { EventDraft, EventMessage, EventPerson, joinState, MeetupEvent, mutualPicks } from '../domain/events.ts';
import { matchStore } from './matches';
import { supabase } from './supabase';

export type Attendee = EventPerson;
export interface PastEvent {
  id: string;
  title: string;
  when: string;
  place: string;
  address?: string;
  host: string;
  attendees: Attendee[];
  /** Demo: wer mich wiedersehen möchte (bleibt verborgen, bis es gegenseitig ist). */
  wantMe?: string[];
  review?: { stars: number; text: string; mutual: string[] };
}

export interface EventSnapshot { events: MeetupEvent[]; past: PastEvent[]; mine: Set<string>; invited: Set<string>; noShows: number }

export interface EventStore {
  get(): EventSnapshot;
  subscribe(listener: () => void): () => void;
  /** Neu vom Server laden (Demo: nichts zu tun). */
  refresh(): void;
  join(id: string, g: Gender, plus: boolean, campus?: string | null): Promise<void>;
  leave(id: string, g: Gender): Promise<void>;
  /** Gastgeber belegt selbst einen Platz seiner Hälfte. Einladen kann man eigene Matches. */
  create(d: EventDraft, host: { name: string; gender: Gender }, invitees?: { id: string; name: string }[]): Promise<string>;
  /** Nachricht in den Gruppenchat; nur für Teilnehmende. */
  send(id: string, text: string): void;
  /** Bewertung und Wiedersehen-Wunsch; gibt die gegenseitigen Wünsche zurück, daraus werden Matches. */
  review(id: string, stars: number, text: string, picks: string[]): Promise<string[]>;
  reset(): void;
}

const jonas = { name: 'Jonas', events: 6, ratings: [5, 5, 4, 5], reviews: ['Lockere Runde, Jonas hat alle gut eingebunden.', 'Schwere Fragen, aber super Stimmung.'] };
const DEMO_EVENTS: MeetupEvent[] = [
  { id: 'quiz', title: 'Pub-Quiz mit Fremden', kind: 'Spiele', when: 'Donnerstag, 19:30 Uhr', place: 'Irish Pub am Kirchenplatz', address: 'Kirchenplatz, 35390 Gießen', seats: 12, joined: { f: 4, m: 6 }, price: 0, plusFirst: false, access: 'open', host: jonas },
  { id: 'kochen', title: 'Pasta-Kochabend', kind: 'Essen & Trinken', when: 'Freitag, 19:00 Uhr', place: 'Kochschule in der Innenstadt', address: 'Neustadt, 35390 Gießen', seats: 10, joined: { f: 3, m: 3 }, price: 25, plusFirst: false, access: 'open', host: { name: 'Kochschule', events: 14, ratings: [5, 4, 5, 5, 4], reviews: ['Man kocht in Zweierteams, da kommt man sofort ins Gespräch.'] } },
  { id: 'bouldern', title: 'Bouldern für Anfänger', kind: 'Sport', when: 'Samstag, 14:00 Uhr', place: 'Boulderhalle in der Weststadt', address: 'Rodheimer Straße, 35398 Gießen', seats: 8, joined: { f: 2, m: 1 }, price: 15, plusFirst: true, access: 'open', host: { name: 'Selin', events: 2, ratings: [5, 5], reviews: ['Selin erklärt super geduldig.'] } },
  { id: 'semesterparty', title: 'Zusammen zur Semesterparty', kind: 'Feiern', when: 'Heute, 22:30 Uhr', place: 'Treffpunkt Marktplatz, dann zusammen weiter', address: 'Marktplatz, 35390 Gießen', seats: 6, joined: { f: 1, m: 2 }, price: 0, plusFirst: false, access: 'open', tonight: true, campus: 'JLU Gießen', host: { name: 'Lena', events: 3, ratings: [5, 5, 4], reviews: ['Mit Lena war man nie allein auf der Tanzfläche.'] } },
  { id: 'kneipentour', title: 'Kneipentour, wer kommt mit?', kind: 'Feiern', when: 'Heute, 21:00 Uhr', place: 'Treffpunkt am Elefantenklo', address: 'Selterstor, 35390 Gießen', seats: 8, joined: { f: 2, m: 2 }, price: 0, plusFirst: false, access: 'open', tonight: true, host: { name: 'Tom', events: 1, ratings: [4], reviews: ['Entspannt, keiner musste trinken.'] } },
  { id: 'mensa', title: 'Mittag in der Mensa mit Fremden', kind: 'Essen & Trinken', when: 'Morgen, 12:30 Uhr', place: 'Mensa Philosophikum', address: 'Otto-Behaghel-Straße 29, 35394 Gießen', seats: 8, joined: { f: 2, m: 3 }, price: 0, plusFirst: false, access: 'open', campus: 'JLU Gießen', host: { name: 'Studierendenwerk', events: 9, ratings: [5, 4, 5], reviews: ['Fester Tisch mit Schild, man findet sich sofort.'] } },
  { id: 'picknick', title: 'Picknick an der Lahn', kind: 'Draußen', when: 'Sonntag, 13:00 Uhr', place: 'Lahnwiesen beim Bootshaus', address: 'Uferweg, 35398 Gießen', seats: 10, joined: { f: 2, m: 3 }, price: 0, plusFirst: false, access: 'invite', host: { name: 'Mara', events: 1, ratings: [], reviews: [] } },
];
// Wer bei einem Demo-Event schon dabei ist; ich sehe sie, sobald ich mich anmelde.
const DEMO_PEOPLE: Record<string, EventPerson[]> = {
  kneipentour: [{ id: 'tom', name: 'Tom', age: 24, gender: 'm' }, { id: 'nele', name: 'Nele', age: 22, gender: 'f' }, { id: 'jan', name: 'Jan', age: 23, gender: 'm' }, { id: 'sara', name: 'Sara', age: 21, gender: 'f' }],
  semesterparty: [{ id: 'lena', name: 'Lena', age: 22, gender: 'f' }, { id: 'paul', name: 'Paul', age: 23, gender: 'm' }, { id: 'finn', name: 'Finn', age: 21, gender: 'm' }],
};
const DEMO_PAST: PastEvent[] = [
  {
    id: 'spiele', title: 'Brettspielabend', when: 'Letzten Sonntag', place: 'Spielecafé in der Innenstadt', address: 'Seltersweg, 35390 Gießen', host: 'Jonas',
    attendees: [
      { id: 'lena', name: 'Lena', age: 27, gender: 'f' }, { id: 'sophie', name: 'Sophie', age: 30, gender: 'f' }, { id: 'jule', name: 'Jule', age: 28, gender: 'f' },
      { id: 'kai', name: 'Kai', age: 31, gender: 'm' }, { id: 'tom', name: 'Tom', age: 29, gender: 'm' }, { id: 'ben', name: 'Ben', age: 33, gender: 'm' },
    ],
    wantMe: ['lena', 'kai', 'tom'],
  },
];
/** Demo: zu diesen Events wurde ich eingeladen. */
const DEMO_INVITED = ['picknick'];

const demoMessage = (mine: boolean, name: string, text: string): EventMessage => ({ id: `${Date.now()}-${Math.random()}`, mine, name, text, at: new Date() });

/** Prototyp: Events im Speicher. Wer sich anmeldet, belegt einen Platz seiner Hälfte. */
export function createEventStore(delayMs = 1200): EventStore {
  let events = DEMO_EVENTS;
  let past = DEMO_PAST;
  let mine = new Set<string>();
  let invited = new Set(DEMO_INVITED);
  let noShows = 0;
  // Demo: Gastgeber antworten einmal im Gruppenchat.
  const greeted = new Set<string>();
  let snapshot: EventSnapshot = { events, past, mine, invited, noShows };
  const listeners = new Set<() => void>();
  const emit = () => {
    snapshot = { events, past, mine, invited, noShows };
    listeners.forEach((l) => l());
  };
  const update = (id: string, fn: (e: MeetupEvent) => MeetupEvent) => {
    events = events.map((x) => (x.id === id ? fn(x) : x));
  };
  const seat = (id: string, g: Gender, by: number) => update(id, (x) => ({ ...x, joined: { ...x.joined, [g]: x.joined[g] + by } }));
  return {
    get: () => snapshot,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    refresh() {},
    async join(id, g, plus, campus = null) {
      const e = events.find((x) => x.id === id);
      if (!e || joinState(e, g, { joined: mine.has(id), plus, invited: invited.has(id), noShows, campus }) !== 'open') return;
      seat(id, g, 1);
      update(id, (x) => ({ ...x, people: x.people ?? DEMO_PEOPLE[id] ?? [], messages: x.messages ?? [] }));
      mine = new Set(mine).add(id);
      emit();
    },
    async leave(id, g) {
      if (!mine.has(id)) return;
      seat(id, g, -1);
      update(id, (x) => ({ ...x, people: undefined, messages: undefined }));
      mine = new Set([...mine].filter((x) => x !== id));
      emit();
    },
    async create(d, host, invitees = []) {
      const id = `eigen-${Date.now()}`;
      const e: MeetupEvent = {
        ...d, id, title: d.title.trim(), place: d.place.trim(), address: d.address?.trim(), when: d.when.trim(), plusFirst: false, joined: { f: 0, m: 0, [host.gender]: 1 },
        host: { name: host.name, events: 0, ratings: [], reviews: [] }, isHost: true, people: [], messages: [],
        invitees: d.access === 'invite' ? invitees.map((i) => i.name) : undefined,
      };
      events = [e, ...events];
      mine = new Set(mine).add(id);
      emit();
      return id;
    },
    send(id, text) {
      const e = events.find((x) => x.id === id);
      if (!e || !mine.has(id)) return;
      update(id, (x) => ({ ...x, messages: [...(x.messages ?? []), demoMessage(true, 'Ich', text)] }));
      emit();
      if (!greeted.has(id) && !e.isHost) {
        greeted.add(id);
        setTimeout(() => {
          update(id, (x) => ({ ...x, messages: [...(x.messages ?? []), demoMessage(false, e.host.name, 'Schön, dass du dabei bist! Ich warte am Treffpunkt, ihr erkennt mich an der roten Jacke 🙂')] }));
          emit();
        }, delayMs);
      }
    },
    async review(id, stars, text, picks) {
      const p = past.find((x) => x.id === id);
      if (!p || p.review) return [];
      const mutual = mutualPicks(picks, p.wantMe ?? []);
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
      greeted.clear();
      emit();
    },
  };
}

interface ServerEvent {
  id: string; title: string; kind: string; when: string; starts_at: string; place: string; address: string; seats: number; price: number | string;
  access: 'open' | 'invite'; campus: string | null; tonight: boolean; joined: Record<Gender, number>;
  host: { name: string; events: number; ratings: number[]; reviews: string[] };
  is_host: boolean; mine: boolean; invited: boolean; invitees: string[] | null; people: EventPerson[] | null;
  messages: { id: number; mine: boolean; name: string; text: string; at: string }[] | null;
}
interface ServerPast { id: string; title: string; when: string; place: string; address: string; host: string; attendees: EventPerson[]; review: PastEvent['review'] | null }

export function eventFromServer(e: ServerEvent): MeetupEvent {
  return {
    id: e.id, title: e.title, kind: e.kind, when: e.when, place: e.place, address: e.address || undefined, seats: e.seats, joined: e.joined, price: Number(e.price),
    plusFirst: false, access: e.access, host: e.host, campus: e.campus ?? undefined, tonight: e.tonight, isHost: e.is_host,
    invitees: e.invitees ?? undefined, people: e.people ?? undefined,
    messages: e.messages?.map((m) => ({ id: String(m.id), mine: m.mine, name: m.name, text: m.text, at: new Date(m.at) })),
  };
}

/** Mit Server: Lesen über my_events(), Schreiben über die Funktionen der Datenbank. */
export function createServerEventStore(db: SupabaseClient): EventStore {
  let snapshot: EventSnapshot = { events: [], past: [], mine: new Set(), invited: new Set(), noShows: 0 };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const load = async () => {
    const { data, error } = await db.rpc('my_events');
    if (error) throw error;
    const { events, past } = data as { events: ServerEvent[]; past: ServerPast[] };
    snapshot = {
      events: events.map(eventFromServer),
      past: past.map((p) => ({ ...p, review: p.review ?? undefined })),
      mine: new Set(events.filter((e) => e.mine).map((e) => e.id)),
      invited: new Set(events.filter((e) => e.invited).map((e) => e.id)),
      noShows: 0,
    };
    emit();
  };
  const sync = () => load().catch(() => {});
  // Fehler (z. B. Hälfte inzwischen voll) zeigen einfach den aktuellen Stand vom Server.
  const call = async (fn: string, args: object) => {
    const { data, error } = await db.rpc(fn, args);
    await sync();
    if (error) throw error;
    return data;
  };

  return {
    get: () => snapshot,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    refresh: sync,
    async join(id) {
      await call('join_event', { event_id: id });
    },
    async leave(id) {
      await call('leave_event', { event_id: id });
    },
    async create(d, _host, invitees = []) {
      return (await call('create_event', {
        title: d.title, kind: d.kind, place: d.place, address: d.address ?? '', when_text: d.when, starts_at: (d.startsAt ?? new Date()).toISOString(), seats: d.seats,
        price: d.tonight ? 0 : d.price, access: d.access, campus: d.campus ?? null, tonight: !!d.tonight,
        invitees: d.access === 'invite' ? invitees.map((i) => i.id) : [],
      })) as string;
    },
    send(id, text) {
      const local: EventMessage = { id: `local-${Date.now()}`, mine: true, name: 'Ich', text, at: new Date() };
      snapshot = { ...snapshot, events: snapshot.events.map((e) => (e.id === id ? { ...e, messages: [...(e.messages ?? []), local] } : e)) };
      emit();
      call('send_event_message', { event_id: id, body: text }).catch(() => {});
    },
    async review(id, stars, text, picks) {
      const mutual = (await call('review_event', { event_id: id, stars, body: text, picks })) as string[];
      matchStore.refresh();
      return mutual;
    },
    reset() {
      snapshot = { events: [], past: [], mine: new Set(), invited: new Set(), noShows: 0 };
      emit();
    },
  };
}

export const eventStore = supabase ? createServerEventStore(supabase) : createEventStore();

export const useEvents = () => useSyncExternalStore(eventStore.subscribe, eventStore.get);

export const useEvent = (id: string) => useSyncExternalStore(eventStore.subscribe, () => eventStore.get().events.find((e) => e.id === id));
