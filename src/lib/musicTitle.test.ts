import { lookupMusicTitle } from './musicTitle';

describe('lookupMusicTitle', () => {
  afterEach(() => jest.restoreAllMocks());

  it('asks Spotify for the title of a link', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ title: 'Bohemian Rhapsody' }) } as Response);
    expect(await lookupMusicTitle('https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv')).toBe('Bohemian Rhapsody');
    expect(fetchMock.mock.calls[0][0]).toBe('https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F4u7EnebtmKWzUH433cf5Qv');
  });

  it('gives up quietly when offline or for Apple Music', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await lookupMusicTitle('https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv')).toBeNull();
    expect(await lookupMusicTitle('https://music.apple.com/de/album/kid-a/1097863576')).toBeNull();
  });
});
