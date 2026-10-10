import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Animated, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Screen, s } from '../src/ui/kit';
import { useEntrance } from '../src/ui/motion';
import { Print } from '../src/ui/ProfileCard';
import { Seal } from '../src/ui/Seal';
import { colors, font, fontFamily, shadow } from '../src/ui/theme';

const PROMISES = [
  ['Ausweis und Live-Selfie', 'Bei allen. Darum trägt hier jede Person das Siegel.'],
  ['Nur Aktive', 'Wer eine Woche nicht da ist, verschwindet aus den Vorschlägen.'],
  ['Sechs am Tag', 'Weniger Auswahl, mehr Aufmerksamkeit für jede Person.'],
];

export default function Welcome() {
  const enter = useEntrance();
  // Schon angemeldet: direkt weiter, statt jedes Mal die Begrüßung zu zeigen.
  useEffect(() => {
    if (backend.demo) return;
    backend.myStatus().then(
      ({ status }) => router.replace(status === 'admitted' ? '/heute' : status === 'pending_verification' ? '/verifizieren' : '/status'),
      () => {},
    );
  }, []);

  return (
    <Screen>
      <Animated.View style={[{ flex: 1, justifyContent: 'center', gap: 12 }, enter]}>
        <Hero />
        <Text accessibilityRole="header" style={{ fontFamily: fontFamily.display, fontSize: 60, lineHeight: 66, letterSpacing: -1.6, color: colors.text }}>Echt.</Text>
        <Text style={[font.body, { fontSize: 18, lineHeight: 26, maxWidth: 320 }]}>Jede Person hier ist mit Ausweis geprüft und wirklich aktiv. Das Siegel zeigt es.</Text>
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
      {backend.beta && <Button title="Mit Testzugang anmelden" variant="ghost" icon="key" onPress={() => router.push('/testzugang')} />}
    </Screen>
  );
}

// Drei gefächerte Abzüge mit dem Siegel: zeigt sofort, worum es geht, bevor man liest.
const CARDS = [
  { name: 'Lena', rotate: '-7deg', left: 0, top: 24 },
  { name: 'Sara', rotate: '8deg', left: 170, top: 30 },
  { name: 'Tom', rotate: '2deg', left: 84, top: 0 },
];

function Hero() {
  return (
    <View accessible={false} style={{ height: 196, width: 300, marginBottom: 12 }}>
      {CARDS.map((c) => (
        <Print key={c.name} name={c.name} style={{ position: 'absolute', left: c.left, top: c.top, width: 120, height: 148, transform: [{ rotate: c.rotate }], ...shadow }} />
      ))}
      <Seal size={64} label="Echt-Siegel" style={{ position: 'absolute', left: 146, top: 132 }} />
    </View>
  );
}
