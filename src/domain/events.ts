// Kleine Treffen für verifizierte Mitglieder: 8 bis 12 Leute, die Plätze sind je zur Hälfte für Frauen und Männer.
// Jedes Mitglied kann Gastgeber werden; Bewertungen geben nur Leute ab, die wirklich da waren.
import type { Gender } from './admission.ts';

export interface Host { name: string; events: number; ratings: number[]; reviews: string[] }

export interface MeetupEvent {
  id: string;
  title: string;
  kind: string;
  when: string;
  place: string;
  seats: number;
  joined: Record<Gender, number>;
  /** Preis in Euro, 0 = kostenlos. */
  price: number;
  /** Neue Events sind zuerst einen Tag lang nur für Plus offen. */
  plusFirst: boolean;
  access: 'open' | 'invite';
  host: Host;
  /** Namen der Eingeladenen, nur für den Gastgeber sichtbar. */
  invitees?: string[];
}

export type JoinState = 'joined' | 'open' | 'full' | 'plus_first' | 'invite_only' | 'blocked';

export const PLUS_EVENT_DISCOUNT = 0.2;
export const SEAT_OPTIONS = [8, 10, 12];
export const EVENT_KINDS = ['Essen & Trinken', 'Sport', 'Spiele', 'Kultur', 'Draußen'];
export const MAX_PRICE = 50;
/** Wer so oft ohne Absage fehlt, kann eine Zeit lang nicht buchen. */
export const NO_SHOW_LIMIT = 2;

export const seatsLeft = (e: MeetupEvent, g: Gender) => Math.max(0, Math.floor(e.seats / 2) - e.joined[g]);

export function joinState(e: MeetupEvent, g: Gender, me: { joined: boolean; plus: boolean; invited?: boolean; noShows?: number }): JoinState {
  if (me.joined) return 'joined';
  if ((me.noShows ?? 0) >= NO_SHOW_LIMIT) return 'blocked';
  if (e.access === 'invite' && !me.invited) return 'invite_only';
  if (e.plusFirst && !me.plus) return 'plus_first';
  return seatsLeft(e, g) > 0 ? 'open' : 'full';
}

export const eventPrice = (e: MeetupEvent, plus: boolean) => (plus ? Math.round(e.price * (1 - PLUS_EVENT_DISCOUNT) * 100) / 100 : e.price);

export const euro = (n: number) => (n === 0 ? 'Kostenlos' : `${n.toFixed(2).replace('.', ',')} €`);

export const averageRating = (h: Host) => (h.ratings.length ? Math.round((h.ratings.reduce((a, b) => a + b, 0) / h.ratings.length) * 10) / 10 : null);

export interface EventDraft { title: string; kind: string; place: string; when: string; seats: number; price: number; access: 'open' | 'invite' }

export function validateEvent(d: EventDraft): Partial<Record<keyof EventDraft, string>> {
  const errors: Partial<Record<keyof EventDraft, string>> = {};
  if (d.title.trim().length < 3) errors.title = 'Gib dem Event einen kurzen Namen.';
  if (!EVENT_KINDS.includes(d.kind)) errors.kind = 'Wähle eine Art.';
  if (!d.place.trim()) errors.place = 'Wo trefft ihr euch? Nur öffentliche Orte, keine Privatwohnung.';
  if (!d.when.trim()) errors.when = 'Wann findet es statt?';
  if (!SEAT_OPTIONS.includes(d.seats)) errors.seats = 'Wähle 8, 10 oder 12 Plätze.';
  if (!(d.price >= 0 && d.price <= MAX_PRICE)) errors.price = `Der Preis liegt zwischen 0 und ${MAX_PRICE} €.`;
  return errors;
}

/** Nach dem Event: ein Wiedersehen gibt es nur, wenn beide sich gewählt haben. */
export const mutualPicks = (mine: string[], wantMe: string[]) => mine.filter((id) => wantMe.includes(id));
