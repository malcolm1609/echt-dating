import { ageOn, validateProfileDraft, assignArea, processVerification, Area } from './onboarding';

const today = new Date('2026-10-07T12:00:00Z');
const berlin: Area = { id: 1, lat: 52.52, lng: 13.405, radiusKm: 30, capacity: 1000, counts: { f: 10, m: 10 } };
const hamburg: Area = { id: 2, lat: 53.55, lng: 9.99, radiusKm: 30, capacity: 1000, counts: { f: 0, m: 0 } };

describe('ageOn', () => {
  it('counts full years only', () => {
    expect(ageOn('2008-10-07', today)).toBe(18);
    expect(ageOn('2008-10-08', today)).toBe(17);
  });
});

describe('validateProfileDraft', () => {
  const ok = { displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] } as const;

  it('accepts a complete adult profile', () => {
    expect(validateProfileDraft(ok, today)).toEqual({});
  });

  it('reports every missing or invalid field', () => {
    expect(validateProfileDraft({ displayName: ' ', birthdate: '12.04.1998', gender: undefined, seeking: [] }, today)).toEqual({
      displayName: 'Bitte gib deinen Vornamen an.',
      birthdate: 'Bitte gib ein gültiges Datum an, z. B. 12.04.1998.',
      gender: 'Bitte wähle dein Geschlecht.',
      seeking: 'Bitte wähle, wen du kennenlernen möchtest.',
    });
  });

  it('rejects people under 18 and impossible dates', () => {
    expect(validateProfileDraft({ ...ok, birthdate: '2010-01-01' }, today).birthdate).toBe('Du musst mindestens 18 Jahre alt sein.');
    expect(validateProfileDraft({ ...ok, birthdate: '1998-02-31' }, today).birthdate).toBe('Bitte gib ein gültiges Datum an, z. B. 12.04.1998.');
  });
});

describe('assignArea', () => {
  it('picks the nearest area whose radius contains the location', () => {
    expect(assignArea(52.4, 13.5, [hamburg, berlin])?.id).toBe(1);
  });

  it('returns null outside every area', () => {
    expect(assignArea(48.14, 11.58, [hamburg, berlin])).toBeNull();
  });
});

describe('processVerification', () => {
  const applicant = { idCheck: 'passed', selfieMatch: 'passed', birthdate: '1998-04-12', gender: 'f', lat: 52.5, lng: 13.4 } as const;

  it('admits and assigns the area when everything fits', () => {
    expect(processVerification(applicant, [berlin, hamburg], today)).toEqual({ status: 'admitted', areaId: 1 });
  });

  it('uses the age from the ID check, not a typed one', () => {
    expect(processVerification({ ...applicant, birthdate: '2010-01-01' }, [berlin], today)).toEqual({ status: 'rejected', reason: 'underage', areaId: 1 });
  });

  it('waitlists people outside every open area', () => {
    expect(processVerification({ ...applicant, lat: 48.14, lng: 11.58 }, [berlin, hamburg], today)).toEqual({ status: 'waitlisted', reason: 'no_area', areaId: null });
  });

  it('passes ratio decisions through from decideAdmission', () => {
    const crowded = { ...berlin, counts: { f: 60, m: 40 } };
    expect(processVerification(applicant, [crowded], today)).toEqual({ status: 'waitlisted', reason: 'gender_ratio', areaId: 1 });
  });
});
