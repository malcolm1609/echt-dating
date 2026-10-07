jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { demoBackend } from './backend';

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
    await b.saveProfile({ displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] }, { lat: 52.5, lng: 13.4 });
    await b.saveBio('Backt Brot.');
    const me = await b.myProfile();
    expect(me).toMatchObject({ displayName: 'Anna', bio: 'Backt Brot.', phone: '+4915123456789', seeking: ['m'], paused: false });
    expect(me.age).toBeGreaterThanOrEqual(28);
  });
});
