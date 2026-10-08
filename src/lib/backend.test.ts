
import { demoBackend } from './backend';
import type { ProfileContent } from '../domain/profileContent.ts';

const content: ProfileContent = {
  prompts: [
    { promptId: 'alltag-1', answer: 'Ausschlafen, Markt, abends Freunde.' },
    { promptId: 'anknuepfen-1', answer: 'Der Kiosk an der Admiralbrücke.' },
    { promptId: 'werte-1', answer: 'Wenn wir zusammen schweigen können.' },
  ],
  goal: 'fest',
  interests: ['Kochen'],
};

describe('demoBackend', () => {
  it('remembers decisions, so reloading brings no new suggestions', async () => {
    const b = demoBackend(0);
    const first = await b.todaysPicks();
    await b.decide(first.picks[0].id, 'pass');
    const again = await b.todaysPicks();
    expect(again.used).toBe(1);
    expect(again.picks.map((p) => p.id)).toEqual(first.picks.slice(1).map((p) => p.id));
  });

  it('shows no suggestions while paused', async () => {
    const b = demoBackend(0);
    await b.setPaused(true);
    expect(await b.isPaused()).toBe(true);
    expect((await b.todaysPicks()).picks).toEqual([]);
  });

  it('starts over after a reset', async () => {
    const b = demoBackend(0);
    await b.startVerification();
    await b.decide('demo-1', 'pass');
    await b.setPaused(true);
    b.reset?.();
    expect(await b.myStatus()).toEqual({ status: 'pending_verification' });
    expect((await b.todaysPicks()).used).toBe(0);
    expect(await b.isPaused()).toBe(false);
  });

  it('shows the saved profile with the confirmed phone number and a new bio', async () => {
    const b = demoBackend(0);
    await b.sendPhoneCode('+4915123456789');
    await b.verifyPhoneCode('+4915123456789', '123456');
    await b.saveProfile({ displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] }, { lat: 52.5, lng: 13.4 }, content);
    await b.saveBio('Backt Brot.');
    const me = await b.myProfile();
    expect(me).toMatchObject({ displayName: 'Anna', bio: 'Backt Brot.', phone: '+4915123456789', seeking: ['m'], paused: false });
    expect(me.age).toBeGreaterThanOrEqual(28);
  });

  it('keeps the profile questions, goal and interests and lets people change them', async () => {
    const b = demoBackend(0);
    await b.saveProfile({ displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] }, { lat: 52.5, lng: 13.4 }, content);
    expect(await b.myProfile()).toMatchObject({ goal: 'fest', interests: ['Kochen'], prompts: content.prompts });
    const music = { provider: 'spotify' as const, kind: 'track' as const, url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody' };
    await b.saveContent({ ...content, goal: 'offen', music });
    expect(await b.myProfile()).toMatchObject({ goal: 'offen', music });
  });

  it('shows suggestions with their answers, goal and interests', async () => {
    const { picks } = await demoBackend(0).todaysPicks();
    for (const p of picks) {
      expect(p.prompts).toHaveLength(3);
      expect(p.goal).toBeDefined();
    }
  });

  it('starts with wide wishes and hides who is farther away than wanted', async () => {
    const b = demoBackend(0);
    const { preferences } = await b.myProfile();
    expect(preferences.maxDistanceKm).toBe(30);
    expect(preferences.ageMax - preferences.ageMin).toBe(16);
    await b.savePreferences({ ...preferences, maxDistanceKm: 5 });
    const { picks } = await b.todaysPicks();
    expect(picks.every((p) => p.distanceKm <= 5)).toBe(true);
    expect((await b.myProfile()).preferences.maxDistanceKm).toBe(5);
  });

  it('puts the same goal and shared interests first', async () => {
    const { picks } = await demoBackend(0).todaysPicks();
    expect(picks.map((p) => p.displayName)).toEqual(['Jonas', 'Elif', 'Sam']);
  });
});
