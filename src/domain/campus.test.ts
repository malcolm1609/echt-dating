import { uniFromEmail } from './campus.ts';

describe('uniFromEmail', () => {
  it('recognises a university and its student subdomains', () => {
    expect(uniFromEmail('lena.m@uni-giessen.de')).toBe('JLU Gießen');
    expect(uniFromEmail(' Lena.M@Students.Uni-Giessen.de ')).toBe('JLU Gießen');
    expect(uniFromEmail('max@mni.thm.de')).toBe('THM');
  });

  it('rejects private mail and look-alike domains', () => {
    expect(uniFromEmail('lena@gmail.com')).toBeNull();
    expect(uniFromEmail('lena@fake-uni-giessen.de')).toBeNull();
    expect(uniFromEmail('keine-mail')).toBeNull();
  });
});
