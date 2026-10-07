/** Harte Filter: gelten immer für beide Seiten. Alles andere ändert nur die Reihenfolge (ranking.ts). */
export interface Preferences {
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
}

export const ADULT = 18;
export const AGE_LIMIT = 99;
export const DEFAULT_AGE_SPAN = 8;
/** Höchstens der Gebietsradius (30 km), sonst wäre der Filter wirkungslos. */
export const DISTANCE_OPTIONS = [5, 10, 20, 30];

export const defaultPreferences = (age: number): Preferences => ({
  ageMin: Math.max(ADULT, age - DEFAULT_AGE_SPAN),
  ageMax: Math.min(AGE_LIMIT, age + DEFAULT_AGE_SPAN),
  maxDistanceKm: DISTANCE_OPTIONS[DISTANCE_OPTIONS.length - 1],
});

export function validatePreferences(p: Preferences): string | null {
  if (p.ageMin < ADULT) return 'Echt ist erst ab 18.';
  if (p.ageMax > AGE_LIMIT) return `Höchstens ${AGE_LIMIT} Jahre.`;
  if (p.ageMin > p.ageMax) return 'Das Mindestalter ist höher als das Höchstalter.';
  if (!DISTANCE_OPTIONS.includes(p.maxDistanceKm)) return 'Bitte wähle eine der Entfernungen.';
  return null;
}

interface Person { age: number; prefs: Preferences }

const accepts = (p: Preferences, age: number) => age >= p.ageMin && age <= p.ageMax;

export const fitsEachOther = (a: Person, b: Person, distanceKm: number) =>
  accepts(a.prefs, b.age) && accepts(b.prefs, a.age) && distanceKm <= Math.min(a.prefs.maxDistanceKm, b.prefs.maxDistanceKm);

export const preferencesSummary = (p: Preferences) => `${p.ageMin} bis ${p.ageMax} Jahre, bis ${p.maxDistanceKm} km`;
