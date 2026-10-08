import data from '../../supabase/seed/beta-profiles.json';
import { ageOn } from '../domain/onboarding.ts';
import { GoalId, validateProfileContent } from '../domain/profileContent.ts';

const people = [...data.testers, ...data.samples];
const km = (lat: number, lng: number) => Math.hypot((lat - data.area.lat) * 111, (lng - data.area.lng) * 71);

describe('beta seed profiles', () => {
  it.each(people.map((p) => [p.display_name, p] as const))('%s has a complete, valid profile', (_, p) => {
    const content = { prompts: p.prompts.map((x) => ({ promptId: x.prompt_id, answer: x.answer })), goal: p.goal as GoalId, interests: p.interests };
    expect(validateProfileContent(content)).toEqual({});
    expect(ageOn(p.birthdate, new Date())).toBeGreaterThanOrEqual(18);
    expect(km(p.lat, p.lng)).toBeLessThan(5);
    expect(p.email).toMatch(/@example\.com$/);
  });

  it('has enough people on both sides for each test account', () => {
    for (const t of data.testers) {
      const fits = data.samples.filter((s) => t.seeking.includes(s.gender) && s.seeking.includes(t.gender));
      expect(fits.length).toBeGreaterThanOrEqual(8);
    }
    expect(new Set(people.map((p) => p.email)).size).toBe(people.length);
  });
});
