import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreferencesForm } from './PreferencesForm';
import { pickThumb, valueAt } from './RangeSlider';

const initial = { ageMin: 19, ageMax: 30, maxDistanceKm: 30 };
const step = (label: string, actionName: 'increment' | 'decrement') =>
  fireEvent(screen.getByLabelText(label), 'accessibilityAction', { nativeEvent: { actionName } });

describe('PreferencesForm', () => {
  it('changes age range and distance and saves them', () => {
    const onSubmit = jest.fn();
    render(<PreferencesForm initial={initial} onSubmit={onSubmit} />);
    step('Ab 19 Jahre', 'increment');
    step('Bis 30 Jahre', 'decrement');
    step('Umkreis bis 30 km', 'increment');
    expect(screen.getByText('20 bis 29 Jahre')).toBeTruthy();
    expect(screen.getByText('bis 35 km')).toBeTruthy();
    fireEvent.press(screen.getByText('Wünsche speichern'));
    expect(onSubmit).toHaveBeenCalledWith({ ageMin: 20, ageMax: 29, maxDistanceKm: 35 });
  });

  it('does not go below 18 or past the other end of the range', () => {
    render(<PreferencesForm initial={{ ...initial, ageMin: 18, ageMax: 18 }} onSubmit={jest.fn()} />);
    step('Ab 18 Jahre', 'decrement');
    step('Ab 18 Jahre', 'increment');
    step('Bis 18 Jahre', 'decrement');
    expect(screen.getByText('18 bis 18 Jahre')).toBeTruthy();
  });

  it('explains that the wishes work both ways', () => {
    render(<PreferencesForm initial={initial} onSubmit={jest.fn()} />);
    expect(screen.getByText(/Gilt in beide Richtungen/)).toBeTruthy();
  });
});

describe('valueAt', () => {
  it('maps a finger position on the track to the nearest step', () => {
    expect(valueAt(0, 200, 5, 100, 5)).toBe(5);
    expect(valueAt(200, 200, 5, 100, 5)).toBe(100);
    expect(valueAt(100, 200, 5, 100, 5)).toBe(55);
    expect(valueAt(-30, 200, 18, 99, 1)).toBe(18);
    expect(valueAt(999, 200, 18, 99, 1)).toBe(99);
  });
});

describe('PreferencesForm age ceiling', () => {
  it('shows everyone from 60 on as 60+ and keeps them in', () => {
    const onSubmit = jest.fn();
    render(<PreferencesForm initial={{ ageMin: 59, ageMax: 99, maxDistanceKm: 50 }} onSubmit={onSubmit} />);
    expect(screen.getByText('59 bis 60+ Jahre')).toBeTruthy();
    step('Bis 60+ Jahre', 'decrement');
    step('Bis 59 Jahre', 'increment');
    fireEvent.press(screen.getByText('Wünsche speichern'));
    expect(onSubmit).toHaveBeenCalledWith({ ageMin: 59, ageMax: 99, maxDistanceKm: 50 });
  });
});

describe('pickThumb', () => {
  it('moves the nearer handle, and decides by direction when both lie on top of each other', () => {
    expect(pickThumb(10, [0, 100])).toBe(0);
    expect(pickThumb(90, [0, 100])).toBe(1);
    expect(pickThumb(50, [50, 50])).toBeNull();
    expect(pickThumb(50, [50, 50], -3)).toBe(0);
    expect(pickThumb(50, [50, 50], 3)).toBe(1);
    expect(pickThumb(10, [40])).toBe(0);
  });
});
