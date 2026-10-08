import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { PlaceLink } from './PlaceLink';

describe('PlaceLink', () => {
  it('shows name and street and opens the chosen map app', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(<PlaceLink place="Irish Pub" address="Kirchenplatz, 35390 Gießen" />);
    expect(screen.getByText('Kirchenplatz, 35390 Gießen')).toBeTruthy();
    expect(screen.queryByLabelText('Mit Waze öffnen')).toBeNull();
    fireEvent.press(screen.getByText('Irish Pub'));
    fireEvent.press(screen.getByLabelText('Mit Google Maps öffnen'));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/search/?api=1&query=Irish%20Pub%2C%20Kirchenplatz'));
    expect(screen.queryByLabelText('Mit Waze öffnen')).toBeNull();
  });
});
