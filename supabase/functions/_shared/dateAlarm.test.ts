import { alarmText, smsName } from './dateAlarm';

describe('date alarm SMS', () => {
  it('keeps normal names', () => {
    expect(smsName('Lea-Marie')).toBe('Lea-Marie');
    expect(smsName('Zoë')).toBe('Zoë');
  });

  it('strips links, numbers and symbols from the name', () => {
    expect(smsName('Lea: gewinn.de/x 0151 1234')).toBe('Lea gewinndex');
    expect(alarmText('help', 'Lea https://böse.de', 'https://echt/check/t')).not.toContain('https://böse');
  });

  it('falls back when nothing is left', () => {
    expect(smsName('1234 !!')).toBe('Deine Begleitung');
  });
});
