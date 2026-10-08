import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReportPanel } from './ReportPanel';

describe('ReportPanel', () => {
  it('needs a reason before reporting', () => {
    const onReport = jest.fn().mockResolvedValue(undefined);
    render(<ReportPanel name="Lea" onReport={onReport} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByText('Melden und blockieren'));
    expect(onReport).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Belästigung oder Drohung'));
    fireEvent.press(screen.getByText('Melden und blockieren'));
    expect(onReport).toHaveBeenCalledWith('harassment');
  });

  it('can just block, and says so when it fails', async () => {
    const onBlock = jest.fn().mockRejectedValue(new Error('offline'));
    render(<ReportPanel name="Lea" onReport={jest.fn()} onBlock={onBlock} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByText('Nur blockieren'));
    expect(onBlock).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/hat nicht geklappt/)).toBeTruthy());
  });
});
