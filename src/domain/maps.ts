// Orte öffnen sich in der Karten-App der Wahl. Gesucht wird nach Name und Adresse, das finden alle Apps
// ohne eigene Koordinaten. Die https-Adressen öffnen die App, wenn sie installiert ist, sonst die Webseite.

export type MapApp = 'apple' | 'google' | 'waze';

export const MAP_APPS: { id: MapApp; label: string }[] = [
  { id: 'google', label: 'Google Maps' },
  { id: 'apple', label: 'Apple Karten' },
  { id: 'waze', label: 'Waze' },
];

/** Suchbegriff für die Karte; ohne Stadt in der Adresse wird die eigene Stadt ergänzt. */
export function placeQuery(place: string, address = '', city = 'Gießen') {
  const parts = [place.trim(), address.trim()].filter(Boolean);
  const text = parts.join(', ');
  return text.toLowerCase().includes(city.toLowerCase()) ? text : `${text}, ${city}`;
}

export function mapUrl(app: MapApp, query: string) {
  const q = encodeURIComponent(query);
  switch (app) {
    case 'apple': return `https://maps.apple.com/?q=${q}`;
    case 'google': return `https://www.google.com/maps/search/?api=1&query=${q}`;
    case 'waze': return `https://waze.com/ul?q=${q}&navigate=yes`;
  }
}

/** Apple Karten gibt es nur auf dem iPhone (und im Browser); auf Android bleibt die Wahl Google Maps oder Waze. */
export const mapAppsFor = (os: string) => MAP_APPS.filter((a) => a.id !== 'apple' || os !== 'android');
