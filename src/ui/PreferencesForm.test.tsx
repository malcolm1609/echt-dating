import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesForm } from './PreferencesForm';

const initial = { ageMin: 19, ageMax: 30, maxDistanceKm: 30 };

describe('PreferencesForm', () => {
  it('changes age range and distance and saves them', () => {
    const onSubmit = jest.fn();
    render(<PreferencesForm initial={initial} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByLabelText('Ab: ein Jahr mehr'));
    fireEvent.press(screen.getByLabelText('Bis: ein Jahr weniger'));
    fireEvent.press(screen.getByLabelText('Bis 10 km'));
    fireEvent.press(screen.getByText('Wünsche speichern'));
    expect(onSubmit).toHaveBeenCalledWith({ ageMin: 20, ageMax: 29, maxDistanceKm: 10 });
  });

  it('does not go below 18 or past the other end of the range', () => {
    render(<PreferencesForm initial={{ ...initial, ageMin: 18, ageMax: 18 }} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Ab: ein Jahr weniger')).toBeDisabled();
    expect(screen.getByLabelText('Ab: ein Jahr mehr')).toBeDisabled();
    expect(screen.getByLabelText('Bis: ein Jahr weniger')).toBeDisabled();
  });

  it('explains that the wishes work both ways', () => {
    render(<PreferencesForm initial={initial} onSubmit={jest.fn()} />);
    expect(screen.getByText(/Gilt in beide Richtungen/)).toBeTruthy();
  });
});
