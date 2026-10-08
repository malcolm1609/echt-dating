import { render, screen, fireEvent } from '@testing-library/react-native';
import { Chat } from './Chat';
import type { Match } from '../lib/matches';

const now = new Date('2026-10-07T12:00:00Z');
const base: Match = {
  id: 'mara', name: 'Mara', age: 29, answers: {}, afterDate: {}, ended: false,
  messages: [{ id: '1', from: 'them', text: 'Kaffee am Wochenende?', at: new Date('2026-10-04T12:00:00Z') }],
};
const actions = () => ({ send: jest.fn(), proposeDate: jest.fn(), markDatePast: jest.fn(), answerAfterDate: jest.fn(), endKindly: jest.fn() });

describe('Chat', () => {
  it('gently reminds you when someone waits for your answer', () => {
    render(<Chat match={base} now={now} {...actions()} />);
    expect(screen.getByText('Mara wartet seit 3 Tagen auf deine Antwort.')).toBeTruthy();
  });

  it('offers a kind goodbye instead of ghosting', () => {
    const a = actions();
    render(<Chat match={base} now={now} {...a} />);
    fireEvent.press(screen.getByText('Freundlich beenden'));
    fireEvent.press(screen.getByText('Nachricht senden und beenden'));
    expect(a.endKindly).toHaveBeenCalledWith(expect.stringContaining('danke für die schönen Gespräche'));
  });

  it('proposes a date with an idea from shared interests, meeting at a partner café', () => {
    const a = actions();
    render(<Chat match={{ ...base, shared: ['Flohmärkte'] }} now={now} {...a} />);
    fireEvent.press(screen.getByText('Date vorschlagen'));
    expect(screen.getByText('Ideen aus euren Gemeinsamkeiten')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Über den Flohmarkt schlendern'));
    fireEvent.press(screen.getByText('Vorschlag senden'));
    expect(a.proposeDate).toHaveBeenCalledWith('Über den Flohmarkt schlendern', expect.any(String), expect.any(String), false);
  });

  it('suggests easy classics when nothing is shared', () => {
    render(<Chat match={base} now={now} {...actions()} />);
    fireEvent.press(screen.getByText('Date vorschlagen'));
    expect(screen.getByLabelText('Kaffee trinken')).toBeTruthy();
  });

  it('asks after the date and keeps a one-sided no private', () => {
    const past = { ...base, date: { place: 'Café', when: 'Samstag', accepted: true, past: true } };
    const { rerender } = render(<Chat match={past} now={now} {...actions()} />);
    expect(screen.getByText('Möchtest du Mara wiedersehen?')).toBeTruthy();
    rerender(<Chat match={{ ...past, afterDate: { mine: 'yes', theirs: 'no' } }} now={now} {...actions()} />);
    expect(screen.getByText('Danke für deine Antwort. Wenn ihr beide Ja sagt, erfahrt ihr es hier.')).toBeTruthy();
    rerender(<Chat match={{ ...past, afterDate: { mine: 'yes', theirs: 'yes' } }} now={now} {...actions()} />);
    expect(screen.getByText('Ihr wollt euch beide wiedersehen 🎉')).toBeTruthy();
  });

  it('lets Plus members reserve a table, others see the upgrade', () => {
    const a = actions();
    const onUpgrade = jest.fn();
    const { rerender } = render(<Chat match={base} now={now} {...a} onUpgrade={onUpgrade} />);
    fireEvent.press(screen.getByText('Date vorschlagen'));
    fireEvent.press(screen.getByText('Tisch gleich mitreservieren mit Echt Plus ›'));
    expect(onUpgrade).toHaveBeenCalled();
    rerender(<Chat match={base} now={now} {...a} plus={{ active: true, readReceipts: false }} />);
    fireEvent.press(screen.getByLabelText('Tisch reservieren'));
    fireEvent.press(screen.getByText('Vorschlag senden'));
    expect(a.proposeDate).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(String), true);
  });

  it('shows "Gelesen" only when both turned it on', () => {
    const mine = { ...base, messages: [{ id: '2', from: 'me' as const, text: 'Gern!', at: now }] };
    const { rerender } = render(<Chat match={mine} now={now} {...actions()} plus={{ active: true, readReceipts: true }} />);
    expect(screen.queryByText('Gelesen')).toBeNull();
    rerender(<Chat match={{ ...mine, readReceipts: true }} now={now} {...actions()} plus={{ active: true, readReceipts: true }} />);
    expect(screen.getByText('Gelesen')).toBeTruthy();
  });

  it('offers a free safety check-in for an upcoming date', () => {
    const upcoming = { ...base, date: { place: 'Café Lindner, Kreuzberg', when: 'Samstag', accepted: true, past: false } };
    render(<Chat match={upcoming} now={now} {...actions()} />);
    fireEvent.press(screen.getByText('Date-Check-in einschalten (kostenlos)'));
    expect(screen.getByText(/Check-in aktiv/)).toBeTruthy();
  });
});
