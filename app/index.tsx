import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Animated, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Screen, s } from '../src/ui/kit';
import { useEntrance } from '../src/ui/motion';
import { colors, font, fontFamily } from '../src/ui/theme';

const PROMISES = [
  ['Ausweis und Live-Selfie', 'Bei allen. Deshalb braucht hier niemand ein Häkchen.'],
  ['Nur Aktive', 'Wer eine Woche nicht da ist, verschwindet aus den Vorschlägen.'],
  ['Sechs am Tag', 'Weniger Auswahl, mehr Aufmerksamkeit für jede Person.'],
];

export default function Welcome() {
  const enter = useEntrance();

  return (
    <Screen>
      <Animated.View style={[{ flex: 1, justifyContent: 'center', gap: 12 }, enter]}>
        <Text accessibilityRole="header" style={{ fontFamily: fontFamily.display, fontSize: 56, lineHeight: 60, letterSpacing: -1, color: colors.text }}>Echt</Text>
        <Text style={[font.title, { fontFamily: fontFamily.medium, color: colors.muted, maxWidth: 300 }]}>Dating nur mit echten und aktiven Menschen.</Text>
        <View style={{ marginTop: 32, gap: 20 }}>
          {PROMISES.map(([title, text]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 14 }}>
              <Feather name="check" size={20} color={colors.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[font.body, { fontFamily: fontFamily.semibold }]}>{title}</Text>
                <Text style={font.small}>{text}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
      {backend.demo && (
        <View style={s.hint}>
          <Text style={font.small}>Demo: Noch ist keine Datenbank verbunden, alle Menschen hier sind Beispiele.</Text>
        </View>
      )}
      <Button title="Los geht’s" onPress={() => router.push('/anmelden')} />
    </Screen>
  );
}
