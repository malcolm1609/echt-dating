import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PhoneVerify } from './PhoneVerify';

const setup = (over: Partial<Parameters<typeof PhoneVerify>[0]> = {}) => {
  const props = { onSend: jest.fn().mockResolvedValue(undefined), onVerify: jest.fn().mockResolvedValue(undefined), onDone: jest.fn(), ...over };
  render(<PhoneVerify {...props} />);
  return props;
};

describe('PhoneVerify', () => {
  // Der 30-Sekunden-Countdown soll nicht nebenher echt weiterlaufen.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('says what is wrong with a landline number', () => {
    const { onSend } = setup();
    fireEvent.changeText(screen.getByLabelText('Handynummer'), '030 1234567');
    fireEvent.press(screen.getByText('Code per SMS senden'));
    expect(screen.getByText(/Bitte gib eine Handynummer an/)).toBeTruthy();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends the code to the normalized number and confirms it', async () => {
    const { onSend, onVerify, onDone } = setup();
    fireEvent.changeText(screen.getByLabelText('Handynummer'), '0151 2345 6789');
    fireEvent.press(screen.getByText('Code per SMS senden'));
    expect(onSend).toHaveBeenCalledWith('+4915123456789');
    fireEvent.changeText(await screen.findByLabelText('SMS-Code'), '123456');
    fireEvent.press(screen.getByText('Bestätigen'));
    await act(async () => {});
    expect(onVerify).toHaveBeenCalledWith('+4915123456789', '123456');
    expect(onDone).toHaveBeenCalled();
  });

  it('keeps people on the code screen when the code is wrong', async () => {
    const { onDone } = setup({ onVerify: jest.fn().mockRejectedValue(new Error('invalid')) });
    fireEvent.changeText(screen.getByLabelText('Handynummer'), '015123456789');
    fireEvent.press(screen.getByText('Code per SMS senden'));
    fireEvent.changeText(await screen.findByLabelText('SMS-Code'), '000000');
    fireEvent.press(screen.getByText('Bestätigen'));
    expect(await screen.findByText(/Der Code stimmt nicht/)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('explains when a number is already used by another account', async () => {
    setup({ onSend: jest.fn().mockRejectedValue(Object.assign(new Error('taken'), { code: 'phone_exists' })) });
    fireEvent.changeText(screen.getByLabelText('Handynummer'), '015123456789');
    fireEvent.press(screen.getByText('Code per SMS senden'));
    expect(await screen.findByText(/gehört schon zu einem anderen Konto/)).toBeTruthy();
  });

  it('lets people resend the code only after a short wait', async () => {
    const { onSend } = setup();
    fireEvent.changeText(screen.getByLabelText('Handynummer'), '015123456789');
    fireEvent.press(screen.getByText('Code per SMS senden'));
    await act(async () => {});
    expect(screen.getByText('Neuer Code in 30 s')).toBeTruthy();
    for (let i = 0; i < 30; i++) await act(async () => { jest.advanceTimersByTime(1000); });
    fireEvent.press(screen.getByText('Neuen Code senden'));
    await act(async () => {});
    expect(onSend).toHaveBeenCalledTimes(2);
  });
});
