import { activityStatus } from './activity';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-07T12:00:00Z');
const ago = (days: number) => new Date(now.getTime() - days * DAY);

describe('activityStatus', () => {
  it('is active within 3 days', () => {
    expect(activityStatus({ lastActiveAt: ago(2), openReports: 0 }, now)).toBe('active');
  });

  it('asks for a sign of life after 3 days', () => {
    expect(activityStatus({ lastActiveAt: ago(4), openReports: 0 }, now)).toBe('reminder');
  });

  it('hides the profile from suggestions after 7 days', () => {
    expect(activityStatus({ lastActiveAt: ago(8), openReports: 0 }, now)).toBe('hidden');
  });

  it('pauses the account and frees the slot after 14 days', () => {
    expect(activityStatus({ lastActiveAt: ago(15), openReports: 0 }, now)).toBe('paused');
  });

  it('suspends accounts with 3 or more open spam reports regardless of activity', () => {
    expect(activityStatus({ lastActiveAt: ago(0), openReports: 3 }, now)).toBe('suspended');
  });
});
