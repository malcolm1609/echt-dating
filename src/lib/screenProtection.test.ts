import AsyncStorage from '@react-native-async-storage/async-storage';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { createScreenProtection } from './screenProtection';

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => {}),
  allowScreenCaptureAsync: jest.fn(async () => {}),
  enableAppSwitcherProtectionAsync: jest.fn(async () => {}),
  disableAppSwitcherProtectionAsync: jest.fn(async () => {}),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('screenProtection', () => {
  it('is on by default', async () => {
    const p = createScreenProtection();
    await p.init();
    expect(p.get()).toBe(true);
    expect(preventScreenCaptureAsync).toHaveBeenCalled();
    expect(allowScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it('remembers when it was switched off', async () => {
    createScreenProtection().setOn(false);
    expect(allowScreenCaptureAsync).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    const next = createScreenProtection();
    await next.init();
    expect(next.get()).toBe(false);
  });
});
