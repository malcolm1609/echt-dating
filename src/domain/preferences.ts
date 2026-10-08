/** Harte Filter: gelten immer für beide Seiten. Alles andere ändert nur die Reihenfolge (ranking.ts). */
export interface Preferences {
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
}

export const ADULT = 18;
export const AGE_LIMIT = 99;
export const DEFAULT_AGE_SPAN = 8;
/** Umkreis per Schieberegler in 5-km-Schritten. Bis 100 km, damit z. B. Gießen, Marburg und Wetzlar
 *  sich sehen können und auch in kleineren Unistädten genug Auswahl bleibt. */
export const DISTANCE_MIN = 5;
export const DISTANCE_MAX = 100;
export const DISTANCE_STEP = 5;
export const DEFAULT_DISTANCE = 50;

export const defaultPreferences = (age: number): Preferences => ({
  ageMin: Math.max(ADULT, age - DEFAULT_AGE_SPAN),
  ageMax: Math.min(AGE_LIMIT, age + DEFAULT_AGE_SPAN),
  maxDistanceKm: DEFAULT_DISTANCE,
});

export function validatePreferences(p: Preferences): string | null {
  if (p.ageMin < ADULT) return 'Echt ist erst ab 18.';
  if (p.ageMax > AGE_LIMIT) return `Höchstens ${AGE_LIMIT} Jahre.`;
  if (p.ageMin > p.ageMax) return 'Das Mindestalter ist höher als das Höchstalter.';
  if (p.maxDistanceKm < DISTANCE_MIN || p.maxDistanceKm > DISTANCE_MAX || p.maxDistanceKm % DISTANCE_STEP) return `Bitte wähle ${DISTANCE_MIN} bis ${DISTANCE_MAX} km.`;
  return null;
}

interface Person { age: number; prefs: Preferences }

const accepts = (p: Preferences, age: number) => age >= p.ageMin && age <= p.ageMax;

export const fitsEachOther = (a: Person, b: Person, distanceKm: number) =>
  accepts(a.prefs, b.age) && accepts(b.prefs, a.age) && distanceKm <= Math.min(a.prefs.maxDistanceKm, b.prefs.maxDistanceKm);

export const preferencesSummary = (p: Preferences) => `${p.ageMin} bis ${p.ageMax} Jahre, bis ${p.maxDistanceKm} km`;
