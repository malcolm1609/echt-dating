import { maskBirthdate, toIsoDate } from './birthdate';

describe('maskBirthdate', () => {
  it('adds the dots while typing', () => {
    expect(maskBirthdate('1')).toBe('1');
    expect(maskBirthdate('12')).toBe('12');
    expect(maskBirthdate('120')).toBe('12.0');
    expect(maskBirthdate('1204')).toBe('12.04');
    expect(maskBirthdate('12041998')).toBe('12.04.1998');
  });

  it('ignores anything that is not a digit and stops at eight digits', () => {
    expect(maskBirthdate('12.04.1998')).toBe('12.04.1998');
    expect(maskBirthdate('12/04/199812')).toBe('12.04.1998');
  });

  it('lets people delete a dot without getting stuck', () => {
    expect(maskBirthdate('12.')).toBe('12');
  });
});

describe('toIsoDate', () => {
  it('turns a German date into ISO', () => {
    expect(toIsoDate('12.04.1998')).toBe('1998-04-12');
  });

  it('keeps incomplete input so validation can complain', () => {
    expect(toIsoDate('12.04.19')).toBe('12.04.19');
  });
});
