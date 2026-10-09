import { render, screen } from '@testing-library/react-native';
import type { DateCheckView } from '../domain/dateCheck';
import { TrustedView } from './TrustedView';

const now = new Date(2026, 9, 10, 16, 0);
const view: DateCheckView = {
  name: 'Lea',
  photo: null,
  match: { name: 'Tom', age: 24, photo: null },
  place: 'Café am Kirchenplatz',
  when: 'Samstag, 15 Uhr',
  status: 'active',
  checkAt: new Date(2026, 9, 10, 16, 5),
  location: { lat: 50.58, lng: 8.67, at: new Date(2026, 9, 10, 15, 57) },
};

describe('TrustedView', () => {
  it('shows who, where and the latest location', () => {
    render(<TrustedView view={view} now={now} />);
    expect(screen.getByText('Lea hat ein Date')).toBeTruthy();
    expect(screen.getByText(/Um 16:05 Uhr fragen wir Lea/)).toBeTruthy();
    expect(screen.getByText('Lea trifft Tom, 24')).toBeTruthy();
    expect(screen.getByText('Café am Kirchenplatz')).toBeTruthy();
    expect(screen.getByText('Zuletzt gesehen vor 3 Minuten.')).toBeTruthy();
    expect(screen.queryByText('Notruf 110 anrufen')).toBeNull();
  });

  it('raises the alarm on a call for help or no answer', () => {
    const { rerender } = render(<TrustedView view={{ ...view, status: 'help' }} now={now} />);
    expect(screen.getByText('Lea bittet um Hilfe')).toBeTruthy();
    expect(screen.getByText('Notruf 110 anrufen')).toBeTruthy();
    rerender(<TrustedView view={{ ...view, status: 'overdue' }} now={now} />);
    expect(screen.getByText('Lea hat sich nicht gemeldet')).toBeTruthy();
  });

  it('shows no location after the end and a note for a wrong link', () => {
    const { rerender } = render(<TrustedView view={{ ...view, status: 'ended', location: null }} now={now} />);
    expect(screen.getByText('Alles gut')).toBeTruthy();
    expect(screen.queryByText(/Zuletzt gesehen/)).toBeNull();
    rerender(<TrustedView view={null} now={now} />);
    expect(screen.getByText('Link ungültig')).toBeTruthy();
  });
});
