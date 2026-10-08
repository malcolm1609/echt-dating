import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { MyProfile } from './ProfileView';
import { SettingsView } from './SettingsView';

const me: MyProfile = { displayName: 'Anna', age: 28, bio: '', gender: 'f', seeking: ['m'], phone: '+4915123456789', paused: false,
  prompts: [], interests: [], preferences: { ageMin: 22, ageMax: 36, maxDistanceKm: 30 }, photos: [] };

const setup = (over: Partial<Parameters<typeof SettingsView>[0]> = {}) => {
  const props = { profile: me, onSavePreferences: jest.fn().mockResolvedValue(undefined), onTogglePause: jest.fn().mockResolvedValue(undefined), ...over };
  render(<SettingsView {...props} />);
  return props;
};

describe('SettingsView', () => {
  it('lists everything that was checked, with a masked phone number', () => {
    setup();
    expect(screen.getByText('E-Mail')).toBeTruthy();
    expect(screen.getByText('+49 151 ••• ••89')).toBeTruthy();
    expect(screen.getByText('Ausweis und Live-Selfie')).toBeTruthy();
  });

  it('shows and changes who you want to see', async () => {
    const { onSavePreferences } = setup();
    expect(screen.getByText('Männer, 22 bis 36 Jahre, bis 30 km')).toBeTruthy();
    fireEvent.press(screen.getByText('Alter und Entfernung ändern'));
    fireEvent.press(screen.getByLabelText('Bis 20 km'));
    await act(async () => fireEvent.press(screen.getByText('Wünsche speichern')));
    expect(onSavePreferences).toHaveBeenCalledWith({ ageMin: 22, ageMax: 36, maxDistanceKm: 20 });
    expect(screen.getByText('Männer, 22 bis 36 Jahre, bis 20 km')).toBeTruthy();
  });

  it('pauses the profile with the switch', async () => {
    const { onTogglePause } = setup();
    await act(async () => fireEvent(screen.getByLabelText('Profil pausieren'), 'valueChange', true));
    expect(onTogglePause).toHaveBeenCalled();
  });

  it('shows a paused profile clearly', () => {
    setup({ profile: { ...me, paused: true } });
    expect(screen.getByText(/Pausiert/)).toBeTruthy();
  });
});
