import { mapAppsFor, mapUrl, placeQuery } from './maps.ts';

describe('maps', () => {
  it('searches by name and street and adds the city when missing', () => {
    expect(placeQuery('Irish Pub', 'Kirchenplatz')).toBe('Irish Pub, Kirchenplatz, Gießen');
    expect(placeQuery('Mensa', 'Otto-Behaghel-Straße 29, 35394 Gießen')).toBe('Mensa, Otto-Behaghel-Straße 29, 35394 Gießen');
    expect(placeQuery('Lahnwiesen')).toBe('Lahnwiesen, Gießen');
  });

  it('builds links that open the app or its website', () => {
    expect(mapUrl('google', 'Pub, Gießen')).toBe('https://www.google.com/maps/search/?api=1&query=Pub%2C%20Gie%C3%9Fen');
    expect(mapUrl('apple', 'Pub')).toBe('https://maps.apple.com/?q=Pub');
    expect(mapUrl('waze', 'Pub')).toBe('https://waze.com/ul?q=Pub&navigate=yes');
  });

  it('offers Apple Maps everywhere but on Android', () => {
    expect(mapAppsFor('android').map((a) => a.id)).toEqual(['google', 'waze']);
    expect(mapAppsFor('ios').map((a) => a.id)).toEqual(['google', 'apple', 'waze']);
  });
});
