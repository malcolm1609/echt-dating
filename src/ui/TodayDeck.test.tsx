import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TodayDeck, Pick } from './TodayDeck';

const picks: Pick[] = [
  { id: 'a', displayName: 'Ben', age: 30, bio: 'Kocht gern.', distanceKm: 3 },
  { id: 'b', displayName: 'Kai', age: 28, bio: '', distanceKm: 12, goal: 'fest', interests: ['Kochen', 'Kino'],
    prompts: [{ question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Das Kino am Hermannplatz.' }] },
];

describe('TodayDeck', () => {
  it('shows one person at a time with age and distance', () => {
    render(<TodayDeck picks={picks} usedBefore={0} onDecide={jest.fn()} />);
    expect(screen.getByText('Ben, 30')).toBeTruthy();
    expect(screen.getByText('3 km entfernt')).toBeTruthy();
    expect(screen.queryByText('Kai, 28')).toBeNull();
  });

  it('records the decision and moves on to the next person', async () => {
    const onDecide = jest.fn().mockResolvedValue({ matched: false });
    render(<TodayDeck picks={picks} usedBefore={0} onDecide={onDecide} />);
    fireEvent.press(screen.getByText('Weiter'));
    expect(onDecide).toHaveBeenCalledWith('a', 'pass');
    expect(await screen.findByText('Kai, 28')).toBeTruthy();
  });

  it('celebrates a mutual like before continuing', async () => {
    const onDecide = jest.fn().mockResolvedValue({ matched: true });
    render(<TodayDeck picks={picks} usedBefore={0} onDecide={onDecide} />);
    fireEvent.press(screen.getByText('Gefällt mir'));
    expect(await screen.findByText(/Ihr mögt euch beide/)).toBeTruthy();
    fireEvent.press(screen.getByText('Später schreiben'));
    expect(await screen.findByText('Kai, 28')).toBeTruthy();
  });

  it('ends the day calmly when all suggestions are used', async () => {
    const onDecide = jest.fn().mockResolvedValue({ matched: false });
    render(<TodayDeck picks={picks.slice(0, 1)} usedBefore={5} onDecide={onDecide} />);
    expect(screen.getByLabelText('6 von 6 Vorschlägen')).toBeTruthy();
    fireEvent.press(screen.getByText('Weiter'));
    expect(await screen.findByText(/Das war’s für heute/)).toBeTruthy();
  });

  it('starts at the first suggestion again when the list is reloaded', async () => {
    const onDecide = jest.fn().mockResolvedValue({ matched: false });
    const { rerender } = render(<TodayDeck picks={picks} usedBefore={0} onDecide={onDecide} />);
    fireEvent.press(screen.getByText('Weiter'));
    await screen.findByText('Kai, 28');
    // Nach dem Neuladen liefert der Server nur noch die offenen Vorschläge.
    rerender(<TodayDeck picks={picks.slice(1)} usedBefore={1} onDecide={onDecide} />);
    expect(screen.getByText('Kai, 28')).toBeTruthy();
    expect(screen.getByLabelText('2 von 6 Vorschlägen')).toBeTruthy();
  });

  it('keeps the person on screen if saving fails', async () => {
    const onDecide = jest.fn().mockRejectedValue(new Error('offline'));
    render(<TodayDeck picks={picks} usedBefore={0} onDecide={onDecide} />);
    fireEvent.press(screen.getByText('Gefällt mir'));
    await waitFor(() => expect(screen.getByText('Das hat nicht geklappt. Bitte versuch es noch einmal.')).toBeTruthy());
    expect(screen.getByText('Ben, 30')).toBeTruthy();
  });

  it('shows answers, goal and shared interests of the person', async () => {
    const onDecide = jest.fn().mockResolvedValue({ matched: false });
    render(<TodayDeck picks={picks} usedBefore={0} myInterests={['Kino']} onDecide={onDecide} />);
    fireEvent.press(screen.getByText('Weiter'));
    expect(await screen.findByText('Das Kino am Hermannplatz.')).toBeTruthy();
    expect(screen.getByText('Sucht: Feste Beziehung')).toBeTruthy();
    expect(screen.getByLabelText('Kino, gemeinsam')).toBeTruthy();
  });

  it('says in one line why this person was suggested', () => {
    render(<TodayDeck picks={[picks[1]]} usedBefore={0} onDecide={jest.fn()} myGoal="fest" myInterests={['Kino']} />);
    expect(screen.getByText('Ihr sucht beide eine feste Beziehung und mögt Kino.')).toBeTruthy();
  });
});
