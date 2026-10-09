import { checkLink, clock, dateCheckErrorText, isDue, shareText, sinceText } from './dateCheck';

describe('date check', () => {
  const checkAt = new Date(2026, 9, 10, 16, 5);

  it('asks once the hour is over, but not after a call for help', () => {
    expect(isDue({ checkAt, status: 'active' }, new Date(2026, 9, 10, 16, 4))).toBe(false);
    expect(isDue({ checkAt, status: 'active' }, checkAt)).toBe(true);
    expect(isDue({ checkAt, status: 'help' }, new Date(2026, 9, 10, 17, 0))).toBe(false);
  });

  it('builds the private link without double slashes', () => {
    expect(checkLink('https://malcolm1609.github.io/echt-dating/', 'abc')).toBe('https://malcolm1609.github.io/echt-dating/check/abc');
  });

  it('writes a message for the trusted person with the link', () => {
    const text = shareText('Mama', 'Tom', 'https://x/check/abc');
    expect(text).toContain('Hey Mama');
    expect(text).toContain('Date mit Tom');
    expect(text).toContain('https://x/check/abc');
  });

  it('says how old the location is', () => {
    const now = new Date(2026, 9, 10, 16, 5);
    expect(sinceText(new Date(2026, 9, 10, 16, 5), now)).toBe('gerade eben');
    expect(sinceText(new Date(2026, 9, 10, 16, 4), now)).toBe('vor 1 Minute');
    expect(sinceText(new Date(2026, 9, 10, 15, 50), now)).toBe('vor 15 Minuten');
    expect(sinceText(new Date(2026, 9, 10, 14, 0), now)).toBe('um 14:00');
    expect(clock(checkAt)).toBe('16:05');
  });

  it('explains server errors in plain words', () => {
    expect(dateCheckErrorText('too many date checks')).toMatch(/3 Date-Checks/);
    expect(dateCheckErrorText('no date')).toMatch(/Date ausgemacht/);
    expect(dateCheckErrorText('violates check constraint "date_checks_contact_phone_check"')).toMatch(/Handynummer/);
  });
});
