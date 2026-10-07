import { formatPhone, maskPhone, normalizePhone } from './phone.ts';

describe('normalizePhone', () => {
  it('turns German mobile numbers into the international format', () => {
    expect(normalizePhone('0151 2345 6789')).toBe('+4915123456789');
    expect(normalizePhone('+49 (151) 234-56789')).toBe('+4915123456789');
    expect(normalizePhone('0049 151 23456789')).toBe('+4915123456789');
    expect(normalizePhone('151 23456789')).toBe('+4915123456789');
  });

  it('accepts numbers from other countries when they start with +', () => {
    expect(normalizePhone('+43 664 1234567')).toBe('+436641234567');
  });

  it('rejects landlines and incomplete numbers', () => {
    expect(normalizePhone('030 1234567')).toBeNull();
    expect(normalizePhone('0151 23')).toBeNull();
    expect(normalizePhone('hallo')).toBeNull();
  });
});

describe('maskPhone', () => {
  it('shows only the start and the last two digits', () => {
    expect(maskPhone('+4915123456789')).toBe('+49 151 ••• ••89');
  });
});

describe('formatPhone', () => {
  it('groups German numbers so they are easy to check', () => {
    expect(formatPhone('+4915123456789')).toBe('+49 151 23456789');
    expect(formatPhone('+436641234567')).toBe('+436641234567');
  });
});
