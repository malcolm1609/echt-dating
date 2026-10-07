import { router } from 'expo-router';
import { Animated, Text, useWindowDimensions, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Screen, s } from '../src/ui/kit';
import { useEntrance } from '../src/ui/motion';
import { colors, font, fontFamily } from '../src/ui/theme';

const PROMISES = [
  ['Ausweis + Live-Selfie', 'Bei allen. Deshalb gibt es kein Häkchen, das jemand braucht.'],
  ['Nur Aktive', 'Wer eine Woche nicht da ist, verschwindet aus den Vorschlägen.'],
  ['Sechs am Tag', 'Weniger Auswahl, mehr Aufmerksamkeit für jede Person.'],
];

export default function Welcome() {
  const { width } = useWindowDimensions();
  const enter = useEntrance();
  // Die Wortmarke wächst mit dem Bildschirm, bleibt aber auf kleinen Handys im Rahmen.
  const mark = Math.min(132, Math.max(84, Math.min(width, 430) * 0.3));

  return (
    <Screen>
      <Animated.View style={[{ flex: 1, justifyContent: 'center' }, enter]}>
        <Text accessibilityRole="header" style={{ fontFamily: fontFamily.display, fontSize: mark, lineHeight: mark * 0.95, letterSpacing: -mark * 0.05, color: colors.text, marginLeft: -4 }}>
          Echt<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text style={[font.title, { fontFamily: fontFamily.medium, marginTop: 8, maxWidth: 300 }]}>Dating nur mit echten und aktiven Menschen.</Text>
        <View style={{ marginTop: 36, gap: 18, paddingLeft: '18%' }}>
          {PROMISES.map(([title, text], i) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={[font.label, { color: colors.hint, width: 22, marginTop: 2 }]}>{`0${i + 1}`}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[font.body, { fontWeight: '700' }]}>{title}</Text>
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
      <Button title="Ich bin echt, los" onPress={() => router.push('/anmelden')} />
    </Screen>
  );
}
