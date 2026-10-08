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
  /** Nur für bestätigte Studierende dieser Hochschule. */
  campus?: string;
  /** Spontan für heute Abend, z. B. zusammen feiern gehen. Kleine Gruppe, verschwindet am nächsten Morgen. */
  tonight?: boolean;
  isHost?: boolean;
  /** Wer außer mir dabei ist; nur sichtbar, wenn ich selbst dabei bin. */
  people?: EventPerson[];
  /** Gruppenchat; nur sichtbar, wenn ich selbst dabei bin. */
  messages?: EventMessage[];
}

export interface EventPerson { id: string; name: string; age: number; gender: Gender }
export interface EventMessage { id: string; mine: boolean; name: string; text: string; at: Date }

export type JoinState = 'joined' | 'open' | 'full' | 'plus_first' | 'invite_only' | 'campus_only' | 'blocked';

export const PLUS_EVENT_DISCOUNT = 0.2;
export const SEAT_OPTIONS = [8, 10, 12];
/** Wer spontan feiern geht, ist in kleiner Runde unterwegs. */
export const TONIGHT_SEAT_OPTIONS = [4, 6, 8];
export const seatOptions = (tonight?: boolean) => (tonight ? TONIGHT_SEAT_OPTIONS : SEAT_OPTIONS);
export const EVENT_KINDS = ['Feiern', 'Essen & Trinken', 'Sport', 'Spiele', 'Kultur', 'Draußen'];
export const MAX_PRICE = 50;
/** Wer so oft ohne Absage fehlt, kann eine Zeit lang nicht buchen. */
export const NO_SHOW_LIMIT = 2;

export const seatsLeft = (e: MeetupEvent, g: Gender) => Math.max(0, Math.floor(e.seats / 2) - e.joined[g]);

export function joinState(e: MeetupEvent, g: Gender, me: { joined: boolean; plus: boolean; invited?: boolean; noShows?: number; campus?: string | null }): JoinState {
  if (me.joined) return 'joined';
  if ((me.noShows ?? 0) >= NO_SHOW_LIMIT) return 'blocked';
  if (e.campus && e.campus !== me.campus) return 'campus_only';
  if (e.access === 'invite' && !me.invited) return 'invite_only';
  if (e.plusFirst && !me.plus) return 'plus_first';
  return seatsLeft(e, g) > 0 ? 'open' : 'full';
}

export const eventPrice = (e: MeetupEvent, plus: boolean) => (plus ? Math.round(e.price * (1 - PLUS_EVENT_DISCOUNT) * 100) / 100 : e.price);

export const euro = (n: number) => (n === 0 ? 'Kostenlos' : `${n.toFixed(2).replace('.', ',')} €`);

export const averageRating = (h: Host) => (h.ratings.length ? Math.round((h.ratings.reduce((a, b) => a + b, 0) / h.ratings.length) * 10) / 10 : null);

export interface EventDraft { title: string; kind: string; place: string; when: string; startsAt?: Date; seats: number; price: number; access: 'open' | 'invite'; campus?: string; tonight?: boolean }

export function validateEvent(d: EventDraft): Partial<Record<keyof EventDraft, string>> {
  const errors: Partial<Record<keyof EventDraft, string>> = {};
  if (d.title.trim().length < 3) errors.title = 'Gib dem Event einen kurzen Namen.';
  if (!EVENT_KINDS.includes(d.kind)) errors.kind = 'Wähle eine Art.';
  if (!d.place.trim()) errors.place = 'Wo trefft ihr euch? Nur öffentliche Orte, keine Privatwohnung.';
  if (!d.when.trim()) errors.when = 'Wann findet es statt?';
  else if (d.startsAt && d.startsAt.getTime() < Date.now()) errors.when = 'Der Zeitpunkt ist schon vorbei.';
  const seats = seatOptions(d.tonight);
  if (!seats.includes(d.seats)) errors.seats = `Wähle ${seats.slice(0, -1).join(', ')} oder ${seats.at(-1)} Plätze.`;
  if (!(d.price >= 0 && d.price <= MAX_PRICE)) errors.price = `Der Preis liegt zwischen 0 und ${MAX_PRICE} €.`;
  return errors;
}

/** Nach dem Event: ein Wiedersehen gibt es nur, wenn beide sich gewählt haben. */
export const mutualPicks = (mine: string[], wantMe: string[]) => mine.filter((id) => wantMe.includes(id));

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const dayDiff = (a: Date, b: Date) =>
  Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() - new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()) / 86_400_000);

/** „Heute“, „Morgen“ oder der Wochentag, wie in der Datenbank (event_when_label). */
export const dayLabel = (d: Date, now = new Date()) => {
  const diff = dayDiff(d, now);
  return diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : WEEKDAYS[d.getDay()];
};

export const whenLabel = (d: Date, now = new Date()) =>
  `${dayLabel(d, now)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;

/** Die nächsten 7 Tage zur Auswahl, heute zuerst. */
export const dayOptions = (now = new Date()) =>
  Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));

export const TIME_OPTIONS = ['12:00', '14:00', '17:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
export const TONIGHT_TIME_OPTIONS = ['20:00', '21:00', '22:00', '22:30', '23:00', '23:30'];

export function startsAt(day: Date, time: string) {
  const [h, m] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}
