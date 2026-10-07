// Titel zu einem Spotify-Link über den öffentlichen oEmbed-Endpunkt, ohne Konto.
// Apple Music hat keinen solchen Endpunkt; dort reicht der Vorschlag aus der Adresse.
export async function lookupMusicTitle(url: string): Promise<string | null> {
  if (!url.startsWith('https://open.spotify.com/')) return null;
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const { title } = (await res.json()) as { title?: string };
    return title?.trim() || null;
  } catch {
    return null;
  }
}
