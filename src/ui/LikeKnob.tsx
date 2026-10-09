import Feather from '@expo/vector-icons/Feather';
import { useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { Glass } from './Glass';
import { colors, fontFamily } from './theme';

const native = Platform.OS !== 'web';
const PAD = 6;

/** Ab welchem Weg nach links das Loslassen als „Weiter“ zählt: gut die Hälfte der Strecke. */
/** Ein schneller Schwung nach links zählt auch, wenn der Weg kürzer war. */
export function dragDecision(dx: number, travel: number, vx = 0): 'pass' | 'back' {
  if (travel <= 0) return 'back';
  return -dx >= travel * 0.55 || (vx < -0.6 && -dx >= travel * 0.2) ? 'pass' : 'back';
}

interface Props {
  disabled?: boolean;
  onLike: () => void;
  onPass: () => void;
  /** Wie weit der Knopf gerade nach links gezogen ist (≤ 0), z. B. damit die Karte mitgeht. */
  x?: Animated.Value;
}

// Ein Bordeaux-Knopf in einer Glasleiste. Er liegt immer rechts auf „Gefällt mir“:
// antippen heißt Gefällt mir, nach links ziehen heißt Weiter.
export function LikeKnob({ disabled, onLike, onPass, x: shared }: Props) {
  const own = useRef(new Animated.Value(0)).current;
  const x = shared ?? own;
  const [width, setWidth] = useState(0);
  const [armed, setArmed] = useState(false);
  const knobWidth = Math.max(0, width * 0.56);
  const travel = Math.max(0, width - knobWidth);
  // PanResponder bleibt über Renders hinweg gleich; aktuelle Werte kommen über die Ref.
  const live = useRef({ travel, disabled, onPass, armed });
  live.current = { travel, disabled, onPass, armed };

  // Im Browser löst Loslassen nach dem Ziehen zusätzlich einen Klick aus; der zählt nicht als Gefällt mir.
  const dragged = useRef(false);
  const settle = () => setTimeout(() => (dragged.current = false), 80);

  const back = () => Animated.spring(x, { toValue: 0, friction: 6, tension: 80, useNativeDriver: native }).start();

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => !live.current.disabled && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragged.current = true;
      },
      onPanResponderMove: (_, g) => {
        const { travel } = live.current;
        x.setValue(Math.max(-travel, Math.min(0, g.dx)));
        const next = dragDecision(g.dx, travel) === 'pass';
        if (next !== live.current.armed) setArmed(next);
      },
      onPanResponderRelease: (_, g) => {
        const { travel, onPass } = live.current;
        setArmed(false);
        settle();
        if (dragDecision(g.dx, travel, g.vx) === 'pass') {
          Animated.timing(x, { toValue: -travel, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() => {
            onPass();
            back();
          });
        } else back();
      },
      onPanResponderTerminate: () => {
        setArmed(false);
        settle();
        back();
      },
    }),
  ).current;

  // Der Hinweis „Weiter“ wird kräftiger, je weiter der Knopf nach links wandert.
  const hint = travel ? x.interpolate({ inputRange: [-travel, 0], outputRange: [1, 0.55], extrapolate: 'clamp' }) : 0.55;

  return (
    <Glass interactive style={{ borderRadius: 999, padding: PAD, height: 64 }}>
      <View style={{ flex: 1, justifyContent: 'center' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ position: 'absolute', left: 18, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: hint }}>
          <Feather name="chevrons-left" size={18} color={colors.text} />
          <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: colors.text }}>Weiter</Text>
        </Animated.View>
        <Animated.View {...pan.panHandlers} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: knobWidth || '56%', transform: [{ translateX: x }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={armed ? 'Weiter' : 'Gefällt mir'}
            accessibilityHint="Nach links ziehen für Weiter"
            accessibilityState={{ disabled: !!disabled }}
            accessibilityActions={[{ name: 'activate', label: 'Gefällt mir' }, { name: 'pass', label: 'Weiter' }]}
            onAccessibilityAction={(e) => {
              if (disabled) return;
              if (e.nativeEvent.actionName === 'pass') onPass();
              else onLike();
            }}
            disabled={disabled}
            onPress={() => !dragged.current && onLike()}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              <Glass interactive tint={armed ? colors.accent : pressed ? colors.accentSoft : colors.accentGlass} style={{ flex: 1, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.7 : 1 }}>
                <Feather name={armed ? 'chevrons-left' : 'heart'} size={18} color={armed ? colors.onAccent : colors.accent} />
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: armed ? colors.onAccent : colors.accent }}>{armed ? 'Weiter' : 'Gefällt mir'}</Text>
              </Glass>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Glass>
  );
}
