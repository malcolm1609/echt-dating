import { render, screen } from '@testing-library/react-native';
import { ActiveNearby } from './ActiveNearby';

describe('ActiveNearby', () => {
  it('shows the rounded number of people active nearby today', () => {
    render(<ActiveNearby bucket={100} />);
    expect(screen.getByText('Über 100 Menschen in deiner Nähe sind heute aktiv')).toBeTruthy();
  });

  it('shows nothing while too few people are around', () => {
    render(<ActiveNearby bucket={null} />);
    expect(screen.queryByText(/in deiner Nähe sind heute aktiv/)).toBeNull();
  });
});
