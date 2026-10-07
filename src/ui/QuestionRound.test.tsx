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
});
