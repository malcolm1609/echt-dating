// Lädt die Grenzen aller Landkreise und kreisfreien Städte vom Bundesamt für Kartographie und Geodäsie (BKG)
// in die Datenbank (load_districts). Daten: VG1000, © GeoBasis-DE / BKG, Datenlizenz Deutschland 2.0 (dl-de/by-2-0).
// Aufruf: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node --experimental-strip-types scripts/load-districts.mjs
import { createClient } from '@supabase/supabase-js';
import { toDistricts } from '../src/domain/districts.ts';

const WFS = 'https://sgx.geodatenzentrum.de/wfs_vg1000';
/** Mitglieder je Landkreis, bevor die Warteliste greift; vorhandene Gebiete behalten ihre Zahl. */
const CAPACITY = 2000;

const caps = await (await fetch(`${WFS}?service=WFS&request=GetCapabilities`)).text();
const typeName = [...caps.matchAll(/<(?:wfs:)?Name>([^<]*_krs)<\/(?:wfs:)?Name>/gi)].map((m) => m[1])[0];
if (!typeName) throw new Error('Keine Kreis-Ebene im BKG-Dienst gefunden');
const formats = [...caps.matchAll(/<(?:ows:)?Value>([^<]*json[^<]*)<\/(?:ows:)?Value>/gi)].map((m) => m[1]);

let geojson;
for (const format of [...new Set([...formats, 'application/json', 'application/geo+json'])]) {
  const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(typeName)}` +
    `&srsName=EPSG:4326&outputFormat=${encodeURIComponent(format)}`;
  const res = await fetch(url);
  if (!res.ok) continue;
  try {
    geojson = JSON.parse(await res.text());
    if (Array.isArray(geojson.features)) break;
  } catch {}
  geojson = undefined;
}
if (!geojson) throw new Error(`Keine GeoJSON-Antwort für ${typeName} (Formate: ${formats.join(', ') || 'keine'})`);

const districts = toDistricts(geojson);
if (districts.length < 350) throw new Error(`Nur ${districts.length} Landkreise erkannt, erwartet rund 400`);
const outside = districts.filter((d) => d.lat < 47 || d.lat > 55.2 || d.lng < 5.8 || d.lng > 15.1);
if (outside.length) throw new Error(`Koordinaten außerhalb Deutschlands, z. B. ${outside[0].name}: ${outside[0].lat}, ${outside[0].lng}`);

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let loaded = 0;
for (let i = 0; i < districts.length; i += 25) {
  const { data, error } = await db.rpc('load_districts', { districts: districts.slice(i, i + 25), capacity: CAPACITY });
  if (error) throw new Error(error.message);
  loaded += data;
}
console.log(`${loaded} Landkreise und kreisfreie Städte geladen (${typeName}).`);
