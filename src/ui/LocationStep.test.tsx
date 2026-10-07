import { render, screen, fireEvent } from '@testing-library/react-native';
import { LocationStep } from './LocationStep';

describe('LocationStep', () => {
  it('explains why before the system asks', () => {
    render(<LocationStep onLocate={jest.fn()} onDone={jest.fn()} onOpenSettings={jest.fn()} />);
    expect(screen.getByText(/Niemand sieht, wo du genau bist/)).toBeTruthy();
    expect(screen.getByText('Standort freigeben')).toBeTruthy();
  });

  it('continues once the position is known', async () => {
    const onDone = jest.fn().mockResolvedValue(undefined);
    render(<LocationStep onLocate={jest.fn().mockResolvedValue({ ok: true, coords: { lat: 1, lng: 2 } })} onDone={onDone} onOpenSettings={jest.fn()} />);
    fireEvent.press(screen.getByText('Standort freigeben'));
    await screen.findByText('Standort freigeben');
    expect(onDone).toHaveBeenCalledWith({ lat: 1, lng: 2 });
  });

  it('asks only once even when tapped twice', async () => {
    const onLocate = jest.fn(() => new Promise<never>(() => {}));
    render(<LocationStep onLocate={onLocate} onDone={jest.fn()} onOpenSettings={jest.fn()} />);
    fireEvent.press(screen.getByText('Standort freigeben'));
    fireEvent.press(await screen.findByText('Standort wird bestimmt …'));
    expect(onLocate).toHaveBeenCalledTimes(1);
  });

  it('offers another try after a refusal', async () => {
    render(<LocationStep onLocate={jest.fn().mockResolvedValue({ ok: false, reason: 'denied' })} onDone={jest.fn()} onOpenSettings={jest.fn()} />);
    fireEvent.press(screen.getByText('Standort freigeben'));
    expect(await screen.findByText('Nochmal fragen')).toBeTruthy();
  });

  it('leads to the settings when access is blocked', async () => {
    const onOpenSettings = jest.fn();
    render(<LocationStep onLocate={jest.fn().mockResolvedValue({ ok: false, reason: 'blocked' })} onDone={jest.fn()} onOpenSettings={onOpenSettings} />);
    fireEvent.press(screen.getByText('Standort freigeben'));
    fireEvent.press(await screen.findByText('Einstellungen öffnen'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('says when GPS is switched off', async () => {
    render(<LocationStep onLocate={jest.fn().mockResolvedValue({ ok: false, reason: 'unavailable' })} onDone={jest.fn()} onOpenSettings={jest.fn()} />);
    fireEvent.press(screen.getByText('Standort freigeben'));
    expect(await screen.findByText(/Schalte die Ortungsdienste ein/)).toBeTruthy();
  });

  it('shows a saving problem and lets people retry', async () => {
    const onDone = jest.fn().mockRejectedValue(new Error('offline'));
    render(<LocationStep onLocate={jest.fn().mockResolvedValue({ ok: true, coords: { lat: 1, lng: 2 } })} onDone={onDone} onOpenSettings={jest.fn()} />);
    fireEvent.press(screen.getByText('Standort freigeben'));
    expect(await screen.findByText(/Speichern hat nicht geklappt/)).toBeTruthy();
  });
});
