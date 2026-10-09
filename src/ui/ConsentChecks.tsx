import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { CONSENTS, ConsentKind } from '../domain/privacy';
import { colors, font, fontFamily } from './theme';

interface Props {
  checked: ConsentKind[];
  onChange: (checked: ConsentKind[]) => void;
  onOpenPolicy: () => void;
}

// Die Häkchen bei der Registrierung. Nichts ist vorausgewählt (Einwilligung muss aktiv erfolgen).
export function ConsentChecks({ checked, onChange, onOpenPolicy }: Props) {
  const toggle = (kind: ConsentKind) => onChange(checked.includes(kind) ? checked.filter((k) => k !== kind) : [...checked, kind]);
  return (
    <View style={{ gap: 12 }}>
      {CONSENTS.map(({ kind, text }) => {
        const on = checked.includes(kind);
        return (
          <Pressable
            key={kind}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={text}
            onPress={() => toggle(kind)}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 }}
          >
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, marginTop: 1, alignItems: 'center', justifyContent: 'center',
              borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accent : colors.surface }}>
              {on && <Feather name="check" size={16} color={colors.onAccent} />}
            </View>
            <Text style={[font.small, { flex: 1, color: colors.text }]}>{text}</Text>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="link" onPress={onOpenPolicy} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
        <Text style={[font.small, { color: colors.accent, fontFamily: fontFamily.semibold }]}>Datenschutzerklärung lesen</Text>
      </Pressable>
    </View>
  );
}

export const allConsented = (checked: ConsentKind[]) => CONSENTS.every((c) => checked.includes(c.kind));
