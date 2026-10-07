import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProfileForm } from './ProfileForm';

const today = new Date('2026-10-07T12:00:00Z');

describe('ProfileForm', () => {
  it('shows what is missing instead of submitting', () => {
    const onSubmit = jest.fn();
    render(<ProfileForm today={today} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText('Weiter'));
    expect(screen.getByText('Bitte gib deinen Vornamen an.')).toBeTruthy();
    expect(screen.getByText('Bitte wähle dein Geschlecht.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hides a field error as soon as the field is fixed', () => {
    render(<ProfileForm today={today} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('Weiter'));
    fireEvent.changeText(screen.getByLabelText('Vorname'), 'Anna');
    fireEvent.press(screen.getByLabelText('Ich bin Frau'));
    expect(screen.queryByText('Bitte gib deinen Vornamen an.')).toBeNull();
    expect(screen.queryByText('Bitte wähle dein Geschlecht.')).toBeNull();
    expect(screen.getByText('Bitte wähle, wen du kennenlernen möchtest.')).toBeTruthy();
  });

  it('submits a complete profile', () => {
    const onSubmit = jest.fn();
    render(<ProfileForm today={today} onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByLabelText('Vorname'), 'Anna');
    fireEvent.changeText(screen.getByLabelText('Geburtsdatum'), '1998-04-12');
    fireEvent.press(screen.getByLabelText('Ich bin Frau'));
    fireEvent.press(screen.getByLabelText('Ich suche Männer'));
    fireEvent.press(screen.getByText('Weiter'));
    expect(onSubmit).toHaveBeenCalledWith({ displayName: 'Anna', birthdate: '1998-04-12', gender: 'f', seeking: ['m'] });
  });

  it('lets people select more than one group they are looking for', () => {
    const onSubmit = jest.fn();
    render(<ProfileForm today={today} onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByLabelText('Vorname'), 'Kim');
    fireEvent.changeText(screen.getByLabelText('Geburtsdatum'), '1995-01-01');
    fireEvent.press(screen.getByLabelText('Ich bin Mann'));
    fireEvent.press(screen.getByLabelText('Ich suche Frauen'));
    fireEvent.press(screen.getByLabelText('Ich suche Männer'));
    fireEvent.press(screen.getByText('Weiter'));
    expect(onSubmit.mock.calls[0][0].seeking).toEqual(['f', 'm']);
  });
});
