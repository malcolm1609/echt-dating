import { ringSize, toDistricts } from './districts';

const square = (x: number, y: number, s: number) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];

describe('districts', () => {
  it('turns BKG features into districts with outlines', () => {
    const [d] = toDistricts({
      features: [
        { properties: { AGS: '06531', GEN: 'Gießen', BEZ: 'Landkreis' }, geometry: { type: 'Polygon', coordinates: [square(8.5, 50.4, 0.4), square(8.6, 50.5, 0.1)] } },
      ],
    });
    expect(d).toMatchObject({ code: '06531', name: 'Gießen (Landkreis)' });
    expect(d.lat).toBeCloseTo(50.6);
    expect(d.lng).toBeCloseTo(8.7);
    expect(d.shapes).toHaveLength(1);
    expect(d.shapes[0].points).toBe('((8.5,50.4),(8.9,50.4),(8.9,50.8),(8.5,50.8),(8.5,50.4))');
    expect(d.shapes[0].size).toBeCloseTo(0.16);
  });

  it('merges multi-part districts, keeps city names and swaps lat/lng order', () => {
    const latFirst = square(8.6, 50.0, 0.2).map(([x, y]) => [y, x]);
    const districts = toDistricts({
      features: [
        { properties: { 'vg1000:ags': '06412', 'vg1000:gen': 'Frankfurt am Main', 'vg1000:bez': 'Kreisfreie Stadt' }, geometry: { type: 'MultiPolygon', coordinates: [[latFirst], [square(8.9, 50.1, 0.01)]] } },
        { properties: { ags: '06412', gen: 'Frankfurt am Main', bez: 'Kreisfreie Stadt' }, geometry: { type: 'Polygon', coordinates: [square(8.4, 50.0, 0.05)] } },
        { properties: { ags: '', gen: 'ohne' }, geometry: null },
      ],
    });
    expect(districts).toHaveLength(1);
    expect(districts[0].name).toBe('Frankfurt am Main');
    expect(districts[0].lat).toBeCloseTo(50.1);
    expect(districts[0].lng).toBeCloseTo(8.7);
    expect(districts[0].shapes).toHaveLength(3);
    expect(districts[0].shapes[0].points.startsWith('((8.6,50)')).toBe(true);
  });

  it('measures ring sizes', () => {
    expect(ringSize(square(0, 0, 2))).toBe(4);
  });
});
