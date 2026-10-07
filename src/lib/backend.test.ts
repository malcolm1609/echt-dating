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
});
