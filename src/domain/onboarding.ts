import { decideAdmission, Admission, CheckResult, Gender } from './admission.ts';

export interface Area {
  id: number;
  lat: number;
  lng: number;
  radiusKm: number;
  capacity: number;
  counts: Record<Gender, number>;
}

export interface ProfileDraft {
  displayName: string;
  birthdate: string;
  gender?: Gender;
  seeking: readonly Gender[];
}

export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

export interface VerifiedApplicant {
  idCheck: CheckResult;
  selfieMatch: CheckResult;
  /** Geburtsdatum laut Ausweis */
  birthdate: string;
  gender: Gender;
  lat: number;
  lng: number;
}

export type VerificationOutcome = Admission & { areaId: number | null } | { status: 'waitlisted'; reason: 'no_area'; areaId: null };

function parseDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toISOString().startsWith(iso) ? d : null;
}

export function ageOn(birthdate: string, today: Date): number {
  const [y, m, d] = birthdate.split('-').map(Number);
  const beforeBirthday = today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  return today.getUTCFullYear() - y - (beforeBirthday ? 1 : 0);
}

export function validateProfileDraft(draft: ProfileDraft, today: Date): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!draft.displayName.trim()) errors.displayName = 'Bitte gib deinen Vornamen an.';
  if (!parseDate(draft.birthdate)) errors.birthdate = 'Bitte gib ein gültiges Datum an, z. B. 12.04.1998.';
  else if (ageOn(draft.birthdate, today) < 18) errors.birthdate = 'Du musst mindestens 18 Jahre alt sein.';
  if (!draft.gender) errors.gender = 'Bitte wähle dein Geschlecht.';
  if (draft.seeking.length === 0) errors.seeking = 'Bitte wähle, wen du kennenlernen möchtest.';
  return errors;
}

/** Gleiche Formel wie distance_km() in der Datenbank. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function assignArea(lat: number, lng: number, areas: Area[]): Area | null {
  return areas
    .map((area) => ({ area, km: distanceKm(lat, lng, area.lat, area.lng) }))
    .filter(({ area, km }) => km <= area.radiusKm)
    .sort((a, b) => a.km - b.km)[0]?.area ?? null;
}

export function processVerification(a: VerifiedApplicant, areas: Area[], today: Date): VerificationOutcome {
  const area = assignArea(a.lat, a.lng, areas);
  const admission = decideAdmission(
    { idCheck: a.idCheck, selfieMatch: a.selfieMatch, age: ageOn(a.birthdate, today), gender: a.gender },
    area ? { counts: area.counts, capacity: area.capacity } : { counts: { f: 0, m: 0 }, capacity: Infinity },
  );
  if (!area && admission.status === 'admitted') return { status: 'waitlisted', reason: 'no_area', areaId: null };
  return { ...admission, areaId: area?.id ?? null };
}
