import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  allowScreenCaptureAsync,
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const KEY = 'echt.screenProtection';

/** Sperre gegen Screenshots und Bildschirmaufnahmen. Standard an; in der Beta auf dem Gerät abschaltbar. */
export function createScreenProtection() {
  let on = true;
  const listeners = new Set<() => void>();

  const apply = () => {
    if (Platform.OS === 'web') return;
    (on ? preventScreenCaptureAsync() : allowScreenCaptureAsync()).catch(() => {});
    if (Platform.OS === 'ios') (on ? enableAppSwitcherProtectionAsync(0.6) : disableAppSwitcherProtectionAsync()).catch(() => {});
  };
  const set = (next: boolean) => {
    on = next;
    apply();
    listeners.forEach((l) => l());
  };

  return {
    get: () => on,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Beim Start: Sperre sofort an, dann die gespeicherte Wahl übernehmen. */
    async init() {
      apply();
      const saved = await AsyncStorage.getItem(KEY).catch(() => null);
      if (saved === 'off') set(false);
    },
    setOn(next: boolean) {
      set(next);
      AsyncStorage.setItem(KEY, next ? 'on' : 'off').catch(() => {});
    },
  };
}

export const screenProtection = createScreenProtection();

export const useScreenProtection = () => useSyncExternalStore(screenProtection.subscribe, screenProtection.get);
