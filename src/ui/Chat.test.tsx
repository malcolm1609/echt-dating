import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
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

  it('shows the date check only for an accepted, upcoming date', () => {
    const date = { place: 'Café am Kirchenplatz', when: 'Samstag', accepted: true, past: false };
    const check = <Text>Date-Check hier</Text>;
    const { rerender } = render(<Chat match={{ ...base, date }} now={now} {...actions()} dateCheck={check} />);
    expect(screen.getByText('Date-Check hier')).toBeTruthy();
    rerender(<Chat match={{ ...base, date: { ...date, accepted: false } }} now={now} {...actions()} dateCheck={check} />);
    expect(screen.queryByText('Date-Check hier')).toBeNull();
    rerender(<Chat match={{ ...base, date: { ...date, past: true } }} now={now} {...actions()} dateCheck={check} />);
    expect(screen.queryByText('Date-Check hier')).toBeNull();
  });

  it('lets the invited person accept a date, but not the one who proposed it', () => {
    const acceptDate = jest.fn();
    const date = { place: 'Café', when: 'Samstag, 15 Uhr', accepted: false, past: false };
    const { rerender } = render(<Chat match={{ ...base, date: { ...date, mine: false } }} now={now} {...actions()} acceptDate={acceptDate} />);
    fireEvent.press(screen.getByText('Zusagen'));
    expect(acceptDate).toHaveBeenCalled();
    rerender(<Chat match={{ ...base, date: { ...date, mine: true } }} now={now} {...actions()} acceptDate={acceptDate} />);
    expect(screen.queryByText('Zusagen')).toBeNull();
    expect(screen.getByText('Wartet auf Mara')).toBeTruthy();
  });

  it('records a voice memo when the text field is empty and sends it', async () => {
    const sendVoice = jest.fn(async () => {});
    render(<Chat match={base} now={now} {...actions()} sendVoice={sendVoice} />);
    await act(async () => fireEvent.press(screen.getByLabelText('Sprachmemo aufnehmen')));
    expect(screen.getByText('0:04 / 1:00')).toBeTruthy();
    expect(screen.queryByLabelText('Nachricht')).toBeNull();
    await act(async () => fireEvent.press(screen.getByLabelText('Sprachmemo senden')));
    expect(sendVoice).toHaveBeenCalledWith('file:///memo.m4a', 4200);
    expect(screen.getByLabelText('Nachricht')).toBeTruthy();
  });

  it('shows the send button instead of the microphone while typing', () => {
    render(<Chat match={base} now={now} {...actions()} sendVoice={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Nachricht'), 'Hallo');
    expect(screen.queryByLabelText('Sprachmemo aufnehmen')).toBeNull();
    expect(screen.getByLabelText('Senden')).toBeTruthy();
  });

  it('plays a voice memo from a private link', async () => {
    const voiceUrl = jest.fn(async () => 'https://signed/memo');
    const memo: Match = { ...base, messages: [{ id: 'v', from: 'them', text: '', at: now, audio: { path: 'u/memo.m4a', durationMs: 7000 } }] };
    render(<Chat match={memo} now={now} {...actions()} voiceUrl={voiceUrl} />);
    expect(screen.getByText('0:07')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByLabelText('Sprachmemo, 0:07, abspielen')));
    expect(voiceUrl).toHaveBeenCalledWith('u/memo.m4a');
  });
});
