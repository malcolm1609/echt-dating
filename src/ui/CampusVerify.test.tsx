import { fireEvent, render, screen } from '@testing-library/react-native';
import { CampusVerify } from './CampusVerify';

describe('CampusVerify', () => {
  it('asks for a uni mail and explains when it is not one', () => {
    const onVerify = jest.fn().mockReturnValue(null);
    render(<CampusVerify uni={null} onVerify={onVerify} />);
    fireEvent.changeText(screen.getByLabelText('Uni-Mail'), 'lena@gmail.com');
    fireEvent.press(screen.getByText('Uni-Mail bestätigen'));
    expect(onVerify).toHaveBeenCalledWith('lena@gmail.com');
    expect(screen.getByText(/keine Uni-Mail, die wir kennen/)).toBeTruthy();
  });

  it('shows the verified university', () => {
    render(<CampusVerify uni="JLU Gießen" onVerify={jest.fn()} />);
    expect(screen.getByText('JLU Gießen')).toBeTruthy();
    expect(screen.queryByLabelText('Uni-Mail')).toBeNull();
  });
});
