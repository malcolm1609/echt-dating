import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.inner}>{children}</View>
    </SafeAreaView>
  );
}

export function Button({ title, onPress, disabled, variant = 'primary' }: { title: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'ghost' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.button, variant === 'ghost' && s.ghost, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[s.buttonText, variant === 'ghost' && { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[s.input, error && { borderColor: colors.error }]} {...props} />
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

export function Chip({ label, a11y, selected, onPress }: { label: string; a11y: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={a11y} accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.chipOn]}>
      <Text style={[s.chipText, selected && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24, gap: 20 },
  button: { backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  field: { gap: 6 },
  label: { ...font.small, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, color: colors.text, fontSize: 16 },
  error: { color: colors.error, fontSize: 13 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  hint: { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.hint, borderRadius: 10, padding: 14 },
});
