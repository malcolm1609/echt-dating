import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PROMPTS } from '../domain/profileContent.ts';
import { ProfileContentForm } from './ProfileContentForm';

const first = (c: string) => PROMPTS.find((p) => p.category === c)!;

const fillAll = () => {
  for (const c of ['alltag', 'anknuepfen', 'werte']) {
    fireEvent.press(screen.getByLabelText(`Frage wählen: ${c}`));
    fireEvent.press(screen.getByText(first(c).text));
    fireEvent.changeText(screen.getByLabelText(`Antwort auf: ${first(c).text}`), 'Der Kiosk an der Admiralbrücke um sieben.');
  }
};

describe('ProfileContentForm', () => {
  it('lets people pick a question per category, answer it and choose a goal', () => {
    const onSubmit = jest.fn();
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={onSubmit} />);
    fillAll();
    fireEvent.press(screen.getByLabelText('Feste Beziehung'));
    fireEvent.press(screen.getByLabelText('Interesse Kochen'));
    fireEvent.press(screen.getByText('Weiter'));
    expect(onSubmit).toHaveBeenCalledWith({
      prompts: ['alltag', 'anknuepfen', 'werte'].map((c) => ({ promptId: first(c).id, answer: 'Der Kiosk an der Admiralbrücke um sieben.' })),
      goal: 'fest',
      interests: ['Kochen'],
    });
  });

  it('shows what is missing instead of submitting', () => {
    const onSubmit = jest.fn();
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText('Weiter'));
    expect(screen.getAllByText('Bitte wähle eine Frage und beantworte sie.')).toHaveLength(3);
    expect(screen.getByText('Bitte wähle, was du suchst.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gives a gentle hint for empty phrases without blocking', () => {
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Frage wählen: alltag'));
    fireEvent.press(screen.getByText(first('alltag').text));
    fireEvent.changeText(screen.getByLabelText(`Antwort auf: ${first('alltag').text}`), 'Spontan und ehrlich sein.');
    expect(screen.getByText('Magst du ein konkretes Beispiel nennen?')).toBeTruthy();
  });

  it('stops at five interests', () => {
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={jest.fn()} />);
    for (const i of ['Kochen', 'Backen', 'Kaffee', 'Wein', 'Laufen', 'Yoga']) fireEvent.press(screen.getByLabelText(`Interesse ${i}`));
    expect(screen.getByText('5 / 5')).toBeTruthy();
    expect(screen.getByLabelText('Interesse Yoga').props.accessibilityState.checked).toBe(false);
  });

  it('starts from existing content when editing', () => {
    const onSubmit = jest.fn();
    const initial = { prompts: ['alltag', 'anknuepfen', 'werte'].map((c) => ({ promptId: first(c).id, answer: 'Eine schon gespeicherte Antwort.' })), goal: 'offen' as const, interests: ['Kino'] };
    render(<ProfileContentForm initial={initial} submitLabel="Speichern" onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText('Speichern'));
    expect(onSubmit).toHaveBeenCalledWith(initial);
  });

  it('adds a favourite song from a Spotify link and fills in the title', async () => {
    const onSubmit = jest.fn();
    const lookupTitle = jest.fn().mockResolvedValue('Bohemian Rhapsody – Queen');
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={onSubmit} lookupTitle={lookupTitle} />);
    fillAll();
    fireEvent.press(screen.getByLabelText('Feste Beziehung'));
    fireEvent.changeText(screen.getByLabelText('Link zu Spotify oder Apple Music'), 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv?si=x');
    expect(screen.getByText('Spotify · Song erkannt')).toBeTruthy();
    await act(async () => {});
    expect(lookupTitle).toHaveBeenCalledWith('https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv');
    expect(screen.getByDisplayValue('Bohemian Rhapsody – Queen')).toBeTruthy();
    fireEvent.press(screen.getByText('Weiter'));
    expect(onSubmit.mock.calls[0][0].music).toEqual([{ provider: 'spotify', kind: 'track', url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody – Queen' }]);
  });

  it('takes up to three songs', async () => {
    const onSubmit = jest.fn();
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={onSubmit} lookupTitle={jest.fn().mockResolvedValue('Titel')} />);
    fillAll();
    fireEvent.press(screen.getByLabelText('Feste Beziehung'));
    for (const n of [1, 2, 3]) {
      if (n > 1) fireEvent.press(screen.getByText('Weiteren Song hinzufügen'));
      fireEvent.changeText(screen.getByLabelText(n > 1 ? `Link zu Spotify oder Apple Music, Song ${n}` : 'Link zu Spotify oder Apple Music'), `https://open.spotify.com/track/abc${n}`);
      await act(async () => {});
    }
    expect(screen.queryByText('Weiteren Song hinzufügen')).toBeNull();
    fireEvent.press(screen.getAllByText('Song entfernen')[1]);
    fireEvent.press(screen.getByText('Weiter'));
    expect(onSubmit.mock.calls[0][0].music.map((m: { url: string }) => m.url)).toEqual(['https://open.spotify.com/track/abc1', 'https://open.spotify.com/track/abc3']);
  });

  it('says when a link is not from Spotify or Apple Music', () => {
    render(<ProfileContentForm submitLabel="Weiter" onSubmit={jest.fn()} lookupTitle={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Link zu Spotify oder Apple Music'), 'https://youtube.com/watch?v=1');
    expect(screen.getByText(/kein Link von Spotify oder Apple Music/)).toBeTruthy();
  });

  it('lets people leave the song out or remove it', () => {
    const onSubmit = jest.fn();
    const music = { provider: 'spotify' as const, kind: 'track' as const, url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody' };
    const initial = { prompts: ['alltag', 'anknuepfen', 'werte'].map((c) => ({ promptId: first(c).id, answer: 'Eine schon gespeicherte Antwort.' })), goal: 'offen' as const, interests: [], music: [music] };
    render(<ProfileContentForm initial={initial} submitLabel="Speichern" onSubmit={onSubmit} lookupTitle={jest.fn()} />);
    fireEvent.press(screen.getByText('Song entfernen'));
    fireEvent.press(screen.getByText('Speichern'));
    expect(onSubmit.mock.calls[0][0].music).toBeUndefined();
  });
});
