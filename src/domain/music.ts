// Lieblingssong oder Playlist: nur ein öffentlicher Link, keine Kontoverbindung.

export type MusicProvider = 'spotify' | 'apple';
export type MusicKind = 'track' | 'album' | 'playlist' | 'artist';

export interface MusicLink {
  provider: MusicProvider;
  kind: MusicKind;
  url: string;
  title: string;
}

export const MUSIC_TITLE_MAX = 80;

const KIND_LABELS: Record<MusicKind, string> = { track: 'Song', album: 'Album', playlist: 'Playlist', artist: 'Künstler:in' };
export const musicKindLabel = (k: MusicKind) => KIND_LABELS[k];
export const providerName = (p: MusicProvider) => (p === 'spotify' ? 'Spotify' : 'Apple Music');

export function parseMusicLink(input: string): (Omit<MusicLink, 'title'> & { suggestedTitle?: string }) | null {
  const raw = input.trim();
  const uri = /^spotify:(track|album|playlist|artist):([A-Za-z0-9]+)$/.exec(raw);
  if (uri) return { provider: 'spotify', kind: uri[1] as MusicKind, url: `https://open.spotify.com/${uri[1]}/${uri[2]}` };

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(u.protocol)) return null;

  if (u.hostname === 'open.spotify.com') {
    const m = /^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)\/?$/.exec(u.pathname);
    return m ? { provider: 'spotify', kind: m[1] as MusicKind, url: `https://open.spotify.com/${m[1]}/${m[2]}` } : null;
  }

  if (u.hostname === 'music.apple.com') {
    const m = /^\/([a-z]{2})\/(album|playlist|artist|song)\/([^/]+)\/([^/]+)\/?$/.exec(u.pathname);
    if (!m) return null;
    const track = u.searchParams.get('i');
    const kind: MusicKind = m[2] === 'song' || (m[2] === 'album' && track) ? 'track' : (m[2] as MusicKind);
    const slug = decodeURIComponent(m[3]).replace(/-/g, ' ').trim();
    const path = `https://music.apple.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
    return { provider: 'apple', kind, url: track ? `${path}?i=${encodeURIComponent(track)}` : path, suggestedTitle: slug && slug[0].toUpperCase() + slug.slice(1) };
  }
  return null;
}

export function validateMusic(m: MusicLink): string | null {
  if (parseMusicLink(m.url)?.url !== m.url) return 'Das ist kein Link von Spotify oder Apple Music.';
  const title = m.title.trim();
  if (!title) return 'Wie heißt der Song oder die Playlist?';
  if (title.length > MUSIC_TITLE_MAX) return `Höchstens ${MUSIC_TITLE_MAX} Zeichen.`;
  return null;
}
