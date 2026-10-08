import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Animated, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Glass } from '../src/ui/Glass';
import { Button, Screen, s } from '../src/ui/kit';
import { useEntrance } from '../src/ui/motion';
import { photoGradient } from '../src/ui/ProfileCard';
import { colors, font, fontFamily, shadow } from '../src/ui/theme';

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
        <Hero />
        <Text accessibilityRole="header" style={{ fontFamily: fontFamily.display, fontSize: 56, lineHeight: 60, letterSpacing: -1, color: colors.text }}>Echt</Text>
        <Text style={[font.title, { fontFamily: fontFamily.medium, color: colors.muted, maxWidth: 300 }]}>Dating nur mit echten und aktiven Menschen.</Text>
        <View style={{ marginTop: 24, gap: 16 }}>
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

// Drei gefächerte Fotokarten mit Glas-Chips: zeigt sofort, worum es geht, bevor man liest.
const CARDS = [
  { name: 'Lena', chip: 'geprüft', rotate: '-8deg', left: 0, top: 22 },
  { name: 'Sara', chip: 'aktiv', rotate: '7deg', left: 172, top: 26 },
  { name: 'Tom', chip: '2 km entfernt', rotate: '-1deg', left: 84, top: 0 },
];

function Hero() {
  return (
    <View accessible={false} style={{ height: 210, width: 300, marginBottom: 20 }}>
      {CARDS.map((c) => (
        <View key={c.name} style={[{ position: 'absolute', left: c.left, top: c.top, width: 124, height: 168, borderRadius: 22, transform: [{ rotate: c.rotate }] }, shadow]}>
          <LinearGradient colors={photoGradient(c.name)} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, borderRadius: 22, padding: 8, justifyContent: 'flex-end' }}>
            <Glass tone="dark" style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: '#FFFFFF' }}>{c.chip}</Text>
            </Glass>
          </LinearGradient>
        </View>
      ))}
    </View>
  );
}
