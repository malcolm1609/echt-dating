import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuestionRound } from './QuestionRound';

describe('QuestionRound', () => {
  it('hides the other answer until you answered and locks later rounds', () => {
    render(<QuestionRound name="Elif" answers={{ '0-0': { theirs: 'Ausschlafen' } }} onAnswer={jest.fn()} />);
    expect(screen.queryByText(/Ausschlafen/)).toBeNull();
    expect(screen.getByText('Elif hat schon geantwortet. Antworte, um es zu sehen.')).toBeTruthy();
    expect(screen.getByText('Wird frei, wenn ihr beide Runde 1 beantwortet habt.')).toBeTruthy();
  });

  it('sends your answer and then reveals theirs', () => {
    const onAnswer = jest.fn();
    const { rerender } = render(<QuestionRound name="Elif" answers={{ '0-0': { theirs: 'Ausschlafen' } }} onAnswer={onAnswer} />);
    fireEvent.changeText(screen.getAllByLabelText('Deine Antwort')[0], 'Lange frühstücken');
    fireEvent.press(screen.getAllByText('Antworten')[0]);
    expect(onAnswer).toHaveBeenCalledWith('0-0', 'Lange frühstücken');
    rerender(<QuestionRound name="Elif" answers={{ '0-0': { mine: 'Lange frühstücken', theirs: 'Ausschlafen' } }} onAnswer={onAnswer} />);
    expect(screen.getByText(/Ausschlafen/)).toBeTruthy();
  });

  it('opens with a reaction to one of their profile answers instead of a generic question', () => {
    const opener = { question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Der Flohmarkt am Mauerpark.' };
    render(<QuestionRound name="Elif" opener={opener} answers={{}} onAnswer={jest.fn()} />);
    expect(screen.getByText('Zum Einstieg')).toBeTruthy();
    expect(screen.getByText('„Der Flohmarkt am Mauerpark.“')).toBeTruthy();
    expect(screen.getByText('Was fällt dir zu Elifs Antwort ein?')).toBeTruthy();
    expect(screen.queryByText('Wie sähe für dich ein perfekter Tag aus?')).toBeNull();
  });
});
