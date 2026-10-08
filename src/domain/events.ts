// Kleine Treffen für verifizierte Mitglieder: 8 bis 12 Leute, die Plätze sind je zur Hälfte für Frauen und Männer.
import type { Gender } from './admission.ts';

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
}

export type JoinState = 'joined' | 'open' | 'full' | 'plus_first';

export const PLUS_EVENT_DISCOUNT = 0.2;

export const seatsLeft = (e: MeetupEvent, g: Gender) => Math.max(0, Math.floor(e.seats / 2) - e.joined[g]);

export function joinState(e: MeetupEvent, g: Gender, me: { joined: boolean; plus: boolean }): JoinState {
  if (me.joined) return 'joined';
  if (e.plusFirst && !me.plus) return 'plus_first';
  return seatsLeft(e, g) > 0 ? 'open' : 'full';
}

export const eventPrice = (e: MeetupEvent, plus: boolean) => (plus ? Math.round(e.price * (1 - PLUS_EVENT_DISCOUNT) * 100) / 100 : e.price);

export const euro = (n: number) => (n === 0 ? 'Kostenlos' : `${n.toFixed(2).replace('.', ',')} €`);
