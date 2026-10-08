import { defaultPreferences, fitsEachOther, preferencesSummary, validatePreferences } from './preferences.ts';

describe('defaultPreferences', () => {
  it('starts wide: eight years either side, never below 18, 50 km around', () => {
    expect(defaultPreferences(30)).toEqual({ ageMin: 22, ageMax: 38, maxDistanceKm: 50 });
    expect(defaultPreferences(20)).toEqual({ ageMin: 18, ageMax: 28, maxDistanceKm: 50 });
  });
});

describe('validatePreferences', () => {
  it('accepts an adult age range and 5 to 100 km in steps of 5', () => {
    expect(validatePreferences({ ageMin: 25, ageMax: 35, maxDistanceKm: 10 })).toBeNull();
    expect(validatePreferences({ ageMin: 25, ageMax: 35, maxDistanceKm: 100 })).toBeNull();
    expect(validatePreferences({ ageMin: 25, ageMax: 35, maxDistanceKm: 105 })).toBe('Bitte wähle 5 bis 100 km.');
  });

  it('rejects ranges below 18, upside down ranges and odd distances', () => {
    expect(validatePreferences({ ageMin: 17, ageMax: 30, maxDistanceKm: 30 })).toBe('Echt ist erst ab 18.');
    expect(validatePreferences({ ageMin: 40, ageMax: 30, maxDistanceKm: 30 })).toBe('Das Mindestalter ist höher als das Höchstalter.');
    expect(validatePreferences({ ageMin: 25, ageMax: 35, maxDistanceKm: 12 })).toBe('Bitte wähle 5 bis 100 km.');
  });
});

describe('fitsEachOther', () => {
  const anna = { age: 28, prefs: { ageMin: 25, ageMax: 35, maxDistanceKm: 20 } };
  const jonas = { age: 31, prefs: { ageMin: 26, ageMax: 34, maxDistanceKm: 10 } };

  it('needs both people inside each other’s age range', () => {
    expect(fitsEachOther(anna, jonas, 4)).toBe(true);
    expect(fitsEachOther(anna, { ...jonas, prefs: { ...jonas.prefs, ageMin: 30 } }, 4)).toBe(false);
    expect(fitsEachOther(anna, { ...jonas, age: 36 }, 4)).toBe(false);
  });

  it('uses the shorter of both distances', () => {
    expect(fitsEachOther(anna, jonas, 10)).toBe(true);
    expect(fitsEachOther(anna, jonas, 11)).toBe(false);
  });
});

describe('preferencesSummary', () => {
  it('reads as one plain line', () => {
    expect(preferencesSummary({ ageMin: 25, ageMax: 35, maxDistanceKm: 10 })).toBe('25 bis 35 Jahre, bis 10 km');
  });
});
