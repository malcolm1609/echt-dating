import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { DateCheck } from '../domain/dateCheck';
import { demoDateCheckApi, DateCheckDevice } from '../lib/dateCheck';
import { DateCheckPanel } from './DateCheckPanel';

const device = (): jest.Mocked<DateCheckDevice> => ({
  share: jest.fn(async (_message: string) => true),
  track: jest.fn(async (_send: (lat: number, lng: number) => void) => ({ allowed: true, stop: jest.fn() as () => void })),
  remind: jest.fn(async (_at: Date): Promise<string | null> => 'n1'),
  cancelReminder: jest.fn(async (_id: string) => {}),
});

describe('DateCheckPanel', () => {
  it('starts a check with a German mobile number and shares the link', async () => {
    const api = demoDateCheckApi();
    const start = jest.spyOn(api, 'start');
    const d = device();
    render(<DateCheckPanel other="tom" name="Tom" api={api} device={d} />);
    fireEvent.press(await screen.findByText('Date-Check einschalten (kostenlos)'));
    fireEvent.changeText(screen.getByLabelText('Name der Vertrauensperson'), 'Mama');
    fireEvent.changeText(screen.getByLabelText('Handynummer der Vertrauensperson'), '0151 2345 6789');
    fireEvent.press(screen.getByText('Check starten und Link teilen'));
    expect(await screen.findByText(/Date-Check läuft. Mama sieht, wo du bist/)).toBeTruthy();
    expect(start).toHaveBeenCalledWith('tom', 'Mama', '+4915123456789');
    expect(d.share).toHaveBeenCalledWith(expect.stringContaining('/check/demo'));
    expect(d.track).toHaveBeenCalled();
    expect(d.remind).toHaveBeenCalled();
  });

  it('rejects a landline number', async () => {
    render(<DateCheckPanel other="tom" name="Tom" api={demoDateCheckApi()} device={device()} />);
    fireEvent.press(await screen.findByText('Date-Check einschalten (kostenlos)'));
    fireEvent.changeText(screen.getByLabelText('Name der Vertrauensperson'), 'Mama');
    fireEvent.changeText(screen.getByLabelText('Handynummer der Vertrauensperson'), '0641 12345');
    fireEvent.press(screen.getByText('Check starten und Link teilen'));
    expect(await screen.findByText(/Handynummer ein, die SMS empfangen kann/)).toBeTruthy();
  });

  it('asks after the hour and lets you call for help or end the check', async () => {
    const api = demoDateCheckApi();
    const due: DateCheck = { token: 't', checkAt: new Date(Date.now() - 60000), status: 'active', contactName: 'Mama', overdue: false };
    api.current = jest.fn(async () => due);
    api.answer = jest.fn(async (_t, a) => (a === 'help' ? { ...due, status: 'help' as const } : null));
    const d = device();
    render(<DateCheckPanel other="tom" name="Tom" api={api} device={d} />);
    expect(await screen.findByText('Alles okay?')).toBeTruthy();
    expect(screen.getByText(/in 15 Minuten nicht antwortest/)).toBeTruthy();
    fireEvent.press(screen.getByText('Ich brauche Hilfe'));
    expect(await screen.findByText(/Hilferuf gesendet/)).toBeTruthy();
    expect(screen.getByText('Notruf 110 anrufen')).toBeTruthy();
    expect(screen.queryByText('Noch eine Stunde')).toBeNull();
    fireEvent.press(screen.getByText('Alles gut, Check beenden'));
    expect(await screen.findByText(/Dein Standort ist gelöscht/)).toBeTruthy();
  });

  it('sends the location while the check runs and stops afterwards', async () => {
    const api = demoDateCheckApi();
    const stop = jest.fn();
    let send: (lat: number, lng: number) => void = () => {};
    const d = device();
    d.track.mockImplementation(async (fn) => { send = fn; return { allowed: true, stop }; });
    const c = await api.start('tom', 'Mama', '+4915123456789');
    const sendLocation = jest.spyOn(api, 'sendLocation');
    const view = render(<DateCheckPanel other="tom" name="Tom" api={api} device={d} />);
    await screen.findByText(/Date-Check läuft/);
    await act(async () => send(50.58, 8.67));
    expect(sendLocation).toHaveBeenCalledWith(c.token, 50.58, 8.67);
    view.unmount();
    expect(stop).toHaveBeenCalled();
  });
});
