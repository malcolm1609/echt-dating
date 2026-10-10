import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileView, MyProfile } from './ProfileView';

const me: MyProfile = { displayName: 'Anna', age: 28, bio: 'Läuft gern am Kanal.', gender: 'f', seeking: ['m'], phone: '+4915123456789', paused: false,
  goal: 'fest',
  prompts: [
    { promptId: 'alltag-1', answer: 'Lange frühstücken, dann raus an den See.' },
    { promptId: 'anknuepfen-1', answer: 'Der Kiosk an der Admiralbrücke.' },
    { promptId: 'werte-1', answer: 'Wenn wir zusammen schweigen können.' },
  ],
  interests: ['Kochen', 'Lesen'],
  preferences: { ageMin: 22, ageMax: 36, maxDistanceKm: 30 },
  photos: [],
};

const setup = (over: Partial<Parameters<typeof ProfileView>[0]> = {}) => {
  const props = { profile: me, onSaveBio: jest.fn().mockResolvedValue(undefined), onSaveContent: jest.fn().mockResolvedValue(undefined), onUploadPhoto: jest.fn().mockResolvedValue('u-1/neu.jpg'), onSavePhotos: jest.fn().mockResolvedValue(undefined), ...over };
  render(<ProfileView {...props} />);
  return props;
};

describe('ProfileView', () => {
  it('shows how others see you', () => {
    setup();
    expect(screen.getByText('So sehen dich andere')).toBeTruthy();
    expect(screen.getByText('Anna, 28')).toBeTruthy();
    expect(screen.getAllByText('Läuft gern am Kanal.').length).toBeGreaterThan(0);
  });

  it('saves a new bio only after it changed', async () => {
    const { onSaveBio } = setup();
    expect(screen.queryByText('Speichern')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Über mich'), 'Backt Brot. Hört Jazz.');
    expect(screen.getByText('22 / 160')).toBeTruthy();
    fireEvent.press(screen.getByText('Speichern'));
    await act(async () => {});
    expect(onSaveBio).toHaveBeenCalledWith('Backt Brot. Hört Jazz.');
    expect(screen.getByText('Anna, 28')).toBeTruthy();
    expect(screen.getAllByText('Backt Brot. Hört Jazz.').length).toBeGreaterThan(0);
  });

  it('shows a paused profile clearly', () => {
    setup({ profile: { ...me, paused: true } });
    expect(screen.getByText(/Pausiert/)).toBeTruthy();
  });

  it('shows the answered questions, goal and interests in the preview', () => {
    setup();
    expect(screen.getByText('Der Kiosk an der Admiralbrücke.')).toBeTruthy();
    expect(screen.getByText('Sucht: Feste Beziehung')).toBeTruthy();
    expect(screen.getByLabelText('Lesen')).toBeTruthy();
  });

  it('lets people change questions, goal and interests', async () => {
    const { onSaveContent } = setup();
    fireEvent.press(screen.getByText('Fragen, Ziel, Interessen und Songs ändern'));
    fireEvent.press(screen.getByLabelText('Erstmal Freundschaft'));
    fireEvent.press(screen.getByText('Änderungen speichern'));
    await act(async () => {});
    expect(onSaveContent).toHaveBeenCalledWith({ prompts: me.prompts, interests: me.interests, goal: 'freundschaft' });
    expect(screen.getByText('Sucht: Erstmal Freundschaft')).toBeTruthy();
  });

});
