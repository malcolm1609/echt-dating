import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { motion } from './theme';

const native = Platform.OS !== 'web';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    // Nur bei eingeschalteter Einstellung neu rendern, sonst bleibt alles wie es ist.
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && v && setReduced(true), () => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduced;
}

// Blendet Inhalt sanft ein, sobald sich `key` ändert (neuer Screen-Zustand, nächste Person).
export function useEntrance(key: unknown = 0) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) return v.setValue(1);
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: motion.base, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [key, reduced, v]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 14, 0] }) }] };
}

// Kurzes Aufleuchten als Bestätigung, z. B. nach „Gefällt mir“.
export function usePulse() {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const pulse = () =>
    new Promise<void>((done) => {
      if (reduced) return done();
      Animated.sequence([
        Animated.timing(v, { toValue: 1.06, duration: motion.fast / 2, useNativeDriver: native }),
        Animated.spring(v, { toValue: 1, friction: 4, useNativeDriver: native }),
      ]).start(() => done());
    });
  return { style: { transform: [{ scale: v }] }, pulse };
}
