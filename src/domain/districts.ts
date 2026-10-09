// Gebiete für Zulassung und Geschlechterbalance sind Landkreise und kreisfreie Städte (Malcolm, 2026-10-09).
// Wandelt die Grenzen aus dem BKG-Dienst (GeoJSON) in Gebiete mit Umrissen für die Datenbank (load_districts).
// Löcher in Umrissen fallen weg: Liegt ein Punkt in mehreren Umrissen (kreisfreie Stadt in einem Landkreis),
// gilt der kleinste. Deshalb trägt jeder Umriss seine Fläche.

type Position = number[];
interface Feature { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } | null }

export interface District {
  code: string;
  name: string;
  lat: number;
  lng: number;
  shapes: { points: string; size: number }[];
}

const prop = (p: Record<string, unknown>, key: string) => {
  const hit = Object.keys(p).find((k) => k.toLowerCase() === key || k.toLowerCase().endsWith(`:${key}`));
  return hit === undefined ? undefined : String(p[hit] ?? '');
};

/** Fläche in Quadratgrad (nur zum Vergleichen). */
export function ringSize(ring: Position[]) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(s / 2);
}

/** Je nach Dienst kommen Koordinaten als Breite/Länge statt Länge/Breite. In Europa ist die Breite immer größer. */
const lngLat = ([a, b]: Position): Position => (a > b ? [b, a] : [a, b]);

const outerRings = (g: Feature['geometry']): Position[][] => {
  if (!g) return [];
  if (g.type === 'Polygon') return [(g.coordinates as Position[][])[0]];
  if (g.type === 'MultiPolygon') return (g.coordinates as Position[][][]).map((p) => p[0]);
  return [];
};

export function toDistricts(geojson: { features: Feature[] }): District[] {
  const byCode = new Map<string, District & { biggest: Position[]; biggestSize: number }>();
  for (const f of geojson.features) {
    const code = prop(f.properties, 'ags');
    const gen = prop(f.properties, 'gen');
    if (!code || !gen) continue;
    const bez = prop(f.properties, 'bez') ?? '';
    const name = /stadt/i.test(bez) || /landkreis|kreis/i.test(gen) ? gen : `${gen} (${bez || 'Kreis'})`;
    const d = byCode.get(code) ?? { code, name, lat: 0, lng: 0, shapes: [], biggest: [], biggestSize: 0 };
    for (const raw of outerRings(f.geometry)) {
      const ring = raw.map(lngLat);
      if (ring.length < 4) continue;
      const size = ringSize(ring);
      d.shapes.push({ points: `(${ring.map(([x, y]) => `(${x},${y})`).join(',')})`, size });
      if (size > d.biggestSize) Object.assign(d, { biggest: ring, biggestSize: size });
    }
    byCode.set(code, d);
  }
  return [...byCode.values()].filter((d) => d.shapes.length).map(({ biggest, biggestSize: _, ...d }) => {
    const xs = biggest.map((p) => p[0]);
    const ys = biggest.map((p) => p[1]);
    return { ...d, lng: (Math.min(...xs) + Math.max(...xs)) / 2, lat: (Math.min(...ys) + Math.max(...ys)) / 2 };
  });
}
