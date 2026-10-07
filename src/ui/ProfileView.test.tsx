import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileView, MyProfile } from './ProfileView';

const me: MyProfile = { displayName: 'Anna', age: 28, bio: 'Läuft gern am Kanal.', gender: 'f', seeking: ['m'], phone: '+4915123456789', paused: false };

const setup = (over: Partial<Parameters<typeof ProfileView>[0]> = {}) => {
  const props = { profile: me, onSaveBio: jest.fn().mockResolvedValue(undefined), onTogglePause: jest.fn().mockResolvedValue(undefined), ...over };
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

  it('lists everything that was checked, with a masked phone number', () => {
    setup();
    expect(screen.getByText('E-Mail')).toBeTruthy();
    expect(screen.getByText('+49 151 ••• ••89')).toBeTruthy();
    expect(screen.getByText('Ausweis und Live-Selfie')).toBeTruthy();
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
    expect(screen.getByText('Wieder aktiv werden')).toBeTruthy();
  });
});
