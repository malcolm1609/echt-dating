import Feather from '@expo/vector-icons/Feather';
import { ReactNode, useState } from 'react';
import { Platform, Pressable, PressableStateCallbackType, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, motion } from './theme';

// react-native-web liefert zusätzlich hovered/focused; auf dem Handy bleiben sie leer.
type State = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

const soft = Platform.select({
  web: { transitionProperty: 'background-color, border-color, transform, opacity, box-shadow', transitionDuration: `${motion.fast}ms`, transitionTimingFunction: 'ease-out' } as object,
  default: {},
});
const ring = (on?: boolean) => (on ? (Platform.select({ web: { boxShadow: `0 0 0 3px ${colors.bg}, 0 0 0 5px ${colors.hint}` } as object, default: { borderColor: colors.hint } })) : null);

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.inner}>{children}</View>
    </SafeAreaView>
  );
}

export function Button({ title, onPress, disabled, busy, variant = 'primary', icon }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; variant?: 'primary' | 'ghost'; icon?: keyof typeof Feather.glyphMap }) {
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
        !primary && s.ghost,
        hovered && (primary ? s.primaryHover : s.ghostHover),
        pressed && { transform: [{ scale: 0.97 }] },
        ring(focused),
        disabled && !busy && s.off,
      ]}
    >
      {icon && <Feather name={icon} size={18} color={disabled && !busy ? colors.muted : primary ? colors.bg : colors.text} />}
      <Text style={[s.buttonText, !primary && { color: colors.text }, disabled && !busy && { color: colors.muted }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={[font.label, focused && { color: colors.hint }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[s.input, soft, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), focused && { borderColor: colors.hint, backgroundColor: colors.raised }, error && { borderColor: colors.error }, style]}
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
      {selected && <Feather name="check" size={16} color={colors.bg} />}
      <Text style={[s.chipText, selected && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

// Wo bin ich in der Anmeldung? Große Zahl links, schmale Leiste daneben.
export function StepHeader({ step, total, name }: { step: number; total: number; name: string }) {
  return (
    <View accessibilityLabel={`Schritt ${step} von ${total}: ${name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Text style={[font.label, { color: colors.hint }]}>{`${String(step).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}</Text>
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? colors.hint : colors.line }} />
        ))}
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 20 },
  button: { minHeight: 56, flexDirection: 'row', gap: 10, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent },
  primaryHover: { backgroundColor: '#FF8571', borderColor: '#FF8571' },
  ghost: { backgroundColor: 'transparent', borderColor: colors.line },
  off: { backgroundColor: colors.surface, borderColor: colors.line },
  ghostHover: { backgroundColor: colors.raised, borderColor: colors.muted },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  field: { gap: 8 },
  label: font.label,
  input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 17 },
  error: { color: colors.error, fontSize: 13, lineHeight: 18 },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 18 },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  hint: { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.hint, borderRadius: 10, padding: 14 },
});
