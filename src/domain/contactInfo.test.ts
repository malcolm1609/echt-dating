import { hasContactInfo } from './contactInfo';

describe('contact info in profiles', () => {
  it.each([
    'Folgt mir auf @lea.giessen',
    'insta: lea_gi',
    'Insta lea.mueller',
    'Snapchat lea2003',
    'ig=leaaa',
    'mehr auf linktr.ee/lea',
    'www.lea-fotografie.de',
    'https://instagram.com/lea',
    'meinblog.de',
    'Schreib mir: 0151 2345 6789',
    '+49 151 23456789',
    'lea@gmail.com',
    'follow me',
    'adde mich',
  ])('blocks %s', (text) => expect(hasContactInfo(text)).toBe(true));

  it.each([
    'Ich bin kaum auf Instagram unterwegs',
    'Kaffee um 10 Uhr, z. B. am Kirchenplatz',
    'Ich mag Tiktok-Tänze nicht',
    'Seit 2019 in Gießen, 3 WG-Mitbewohner',
    'Ich studiere Medizin an der JLU.',
    'Lieblingszahl 42',
  ])('allows %s', (text) => expect(hasContactInfo(text)).toBe(false));
});
