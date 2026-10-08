import Feather from '@expo/vector-icons/Feather';
import { ReactNode, useState } from 'react';
import { Animated, Platform, Pressable, PressableStateCallbackType, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntrance } from './motion';
import { colors, font, fontFamily, motion } from './theme';

// react-native-web liefert zusätzlich hovered/focused; auf dem Handy bleiben sie leer.
type State = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

const soft = Platform.select({
  web: { transitionProperty: 'background-color, border-color, transform, opacity, box-shadow', transitionDuration: `${motion.fast}ms`, transitionTimingFunction: 'ease-out' } as object,
  default: {},
});
const ring = (on?: boolean) => (on ? (Platform.select({ web: { boxShadow: `0 0 0 3px ${colors.bg}, 0 0 0 5px ${colors.hint}` } as object, default: { borderColor: colors.hint } })) : null);

// Im Browser schwebt die Tab-Leiste über dem Inhalt, deshalb dort unten Platz lassen.
const tabBarSpace = Platform.OS === 'web' ? 92 : 24;

// Jeder Screen gleitet beim Öffnen kurz ein, damit Wechsel nicht hart wirken (im Browser gibt es
// keine System-Animation beim Öffnen einer neuen Seite).
export function Screen({ children, tabs }: { children: ReactNode; tabs?: boolean }) {
  const enter = useEntrance();
  return (
    <SafeAreaView style={s.screen}>
      <Animated.View style={[s.inner, tabs && { paddingBottom: tabBarSpace }, enter]}>{children}</Animated.View>
    </SafeAreaView>
  );
}

export function Button({ title, onPress, disabled, busy, variant = 'primary', icon }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; variant?: 'primary' | 'ghost' | 'clear'; icon?: keyof typeof Feather.glyphMap }) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed, hovered, focused }: State) => [
        s.button,
        soft,
        !primary && (variant === 'clear' ? s.clear : s.ghost),
        hovered && (primary ? s.primaryHover : s.ghostHover),
        pressed && { transform: [{ scale: 0.97 }] },
        ring(focused),
        disabled && !busy && s.off,
      ]}
    >
      {icon && <Feather name={icon} size={18} color={disabled && !busy ? colors.muted : primary ? colors.onAccent : colors.text} />}
      <Text style={[s.buttonText, !primary && { color: colors.text }, disabled && !busy && { color: colors.muted }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, labelStyle, error, style, ...props }: TextInputProps & { label: string; labelStyle?: TextStyle; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={[font.label, labelStyle, focused && { color: colors.hint }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[s.input, soft, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), focused && { borderColor: colors.hint }, error && { borderColor: colors.error }, style]}
        {...props}
      />
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

export function Chip({ label, a11y, selected, onPress, role = 'checkbox' }: { label: string; a11y: string; selected: boolean; onPress: () => void; role?: 'checkbox' | 'radio' }) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={a11y}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed, hovered, focused }: State) => [s.chip, soft, hovered && !selected && s.ghostHover, selected && s.chipOn, pressed && { transform: [{ scale: 0.96 }] }, ring(focused)]}
    >
      {selected && <Feather name="check" size={16} color={colors.onAccent} />}
      <Text style={[s.chipText, selected && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

// Wo bin ich in der Anmeldung? Schlichter Text und eine durchgehende Leiste.
export function StepHeader({ step, total, name }: { step: number; total: number; name: string }) {
  return (
    <View accessibilityLabel={`Schritt ${step} von ${total}: ${name}`} style={{ gap: 8 }}>
      <Text style={font.small}>{`Schritt ${step} von ${total}`}</Text>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' }}>
        <View style={{ width: `${(step / total) * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 20 },
  button: { minHeight: 54, flexDirection: 'row', gap: 10, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent },
  primaryHover: { backgroundColor: colors.accentPressed, borderColor: colors.accentPressed },
  ghost: { backgroundColor: colors.surface, borderColor: colors.line },
  clear: { backgroundColor: 'transparent', borderColor: 'transparent' },
  off: { backgroundColor: colors.surface, borderColor: colors.surface },
  ghostHover: { backgroundColor: colors.raised, borderColor: colors.raised },
  buttonText: { color: colors.onAccent, fontSize: 16, fontFamily: fontFamily.semibold },
  field: { gap: 8 },
  label: font.label,
  input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, fontFamily: fontFamily.regular, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 17 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 18 },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fontFamily.medium, fontSize: 15 },
  option: { minHeight: 52, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface },
  hint: { backgroundColor: colors.surface, borderRadius: 12, padding: 14 },
});
