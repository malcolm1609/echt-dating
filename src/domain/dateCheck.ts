// Date-Check (Regeln wie supabase/migrations/20261009220000_date_checks.sql): Vor einem Date wählt man eine
// Vertrauensperson. Sie bekommt einen privaten Link mit Ort, Zeit, Match und dem Standort während des Dates.
// Nach einer Stunde fragt die App „Alles okay?“. Bittet man um Hilfe oder meldet sich 15 Minuten nach der
// Frage nicht, bekommt die Vertrauensperson eine SMS.

export type DateCheckStatus = 'active' | 'help';
export type DateCheckAnswer = 'ok' | 'later' | 'help';

export interface DateCheck {
  token: string;
  checkAt: Date;
  status: DateCheckStatus;
  contactName: string;
  /** Länger als 15 Minuten nach der Frage ohne Antwort: Die SMS ist unterwegs. */
  overdue: boolean;
}

/** Was die Vertrauensperson auf ihrer Seite sieht. */
export interface DateCheckView {
  name: string;
  photo: string | null;
  match: { name: string; age: number; photo: string | null };
  place: string | null;
  when: string | null;
  status: 'active' | 'overdue' | 'help' | 'ended';
  checkAt: Date;
  location: { lat: number; lng: number; at: Date } | null;
}

export const ANSWER_WAIT_MINUTES = 15;
/** Wie oft der Standort während des Dates höchstens gesendet wird. */
export const LOCATION_EVERY_MS = 2 * 60 * 1000;

export const MAX_CONTACT_NAME = 40;

/** Die App fragt, sobald die Stunde um ist. */
export const isDue = (check: Pick<DateCheck, 'checkAt' | 'status'>, now: Date) => check.status === 'active' && now >= check.checkAt;

export function clock(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function checkLink(base: string, token: string) {
  return `${base.replace(/\/+$/, '')}/check/${token}`;
}

/** Nachricht, die man der Vertrauensperson selbst schickt (WhatsApp, SMS, …). */
export function shareText(contactName: string, matchName: string, link: string) {
  return (
    `Hey ${contactName}, ich habe gleich ein Date mit ${matchName}. Über diesen Link siehst du, wo wir uns treffen und wo ich gerade bin: ${link}\n` +
    'Wenn ich um Hilfe bitte oder mich nicht melde, bekommst du eine SMS von Echt.'
  );
}

/** Seit wann der Standort bekannt ist, in Worten. */
export function sinceText(at: Date, now: Date) {
  const min = Math.max(0, Math.round((now.getTime() - at.getTime()) / 60000));
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} ${min === 1 ? 'Minute' : 'Minuten'}`;
  return `um ${clock(at)}`;
}

/** Fehler vom Server in einen Satz für die App. */
export function dateCheckErrorText(message: string) {
  if (/too many date checks/.test(message)) return 'Du kannst höchstens 3 Date-Checks am Tag starten.';
  if (/no date/.test(message)) return 'Der Date-Check geht erst, wenn ihr ein Date ausgemacht habt.';
  if (/contact_phone/.test(message)) return 'Bitte gib eine Handynummer ein, die SMS empfangen kann.';
  return 'Das hat nicht geklappt. Bitte versuch es gleich noch einmal.';
}
