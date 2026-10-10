import { musicKindLabel, parseMusicLink, toSongs, validateMusic } from './music.ts';

describe('parseMusicLink', () => {
  it('recognizes Spotify songs, playlists and albums and drops tracking parameters', () => {
    expect(parseMusicLink('https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv?si=abc123')).toEqual({
      provider: 'spotify', kind: 'track', url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
    });
    expect(parseMusicLink('https://open.spotify.com/intl-de/playlist/37i9dQZF1DXcBWIGoYBM5M')?.kind).toBe('playlist');
    expect(parseMusicLink('  spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE ')?.url).toBe('https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE');
  });

  it('recognizes Apple Music links and suggests a title from the address', () => {
    expect(parseMusicLink('https://music.apple.com/de/album/la-vie-en-rose/1440830215?i=1440830538&l=en')).toEqual({
      provider: 'apple', kind: 'track', url: 'https://music.apple.com/de/album/la-vie-en-rose/1440830215?i=1440830538', suggestedTitle: 'La vie en rose',
    });
    expect(parseMusicLink('https://music.apple.com/de/playlist/sonntag-morgen/pl.u-abc')?.kind).toBe('playlist');
    expect(parseMusicLink('https://music.apple.com/de/album/kid-a/1097863576')?.kind).toBe('album');
  });

  it('rejects anything else', () => {
    expect(parseMusicLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseMusicLink('https://open.spotify.com.evil.example/track/abc')).toBeNull();
    expect(parseMusicLink('http://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv')?.url).toBe('https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv');
    expect(parseMusicLink('Bohemian Rhapsody')).toBeNull();
  });
});

describe('validateMusic', () => {
  const ok = { provider: 'spotify' as const, kind: 'track' as const, url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody – Queen' };
  it('needs a recognized link and a short title', () => {
    expect(validateMusic(ok)).toBeNull();
    expect(validateMusic({ ...ok, title: ' ' })).toBe('Wie heißt der Song oder die Playlist?');
    expect(validateMusic({ ...ok, title: 'x'.repeat(81) })).toBe('Höchstens 80 Zeichen.');
    expect(validateMusic({ ...ok, url: 'https://example.com' })).toBe('Das ist kein Link von Spotify oder Apple Music.');
  });
});

describe('musicKindLabel', () => {
  it('names the kind in German', () => {
    expect(musicKindLabel('track')).toBe('Song');
    expect(musicKindLabel('playlist')).toBe('Playlist');
  });
});

describe('toSongs', () => {
  const song = { provider: 'spotify' as const, kind: 'track' as const, url: 'https://open.spotify.com/track/1', title: 'Eins' };
  it('reads both the old single song and the new list', () => {
    expect(toSongs(null)).toEqual([]);
    expect(toSongs(song)).toEqual([song]);
    expect(toSongs([song, song, song, song])).toHaveLength(3);
  });
});
