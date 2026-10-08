import { REPORT_REASONS, unreadCount } from './safety.ts';

describe('safety', () => {
  it('offers the reasons the database accepts', () => {
    expect(REPORT_REASONS.map((r) => r.id)).toEqual(['fake', 'harassment', 'inappropriate', 'spam', 'underage', 'other']);
  });

  it('counts matches with something new, but not ended ones', () => {
    expect(unreadCount([{ unread: true, ended: false }, { unread: true, ended: true }, { unread: false, ended: false }, { ended: false }])).toBe(1);
  });
});
