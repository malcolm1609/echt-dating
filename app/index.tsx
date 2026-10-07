import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Screen, s } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

export default function Welcome() {
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 16 }}>
        <Text style={[font.display, { fontSize: 64 }]}>
          Echt<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text style={[font.title, { fontWeight: '500' }]}>Nur echte Menschen.{'\n'}Nur aktive Menschen.</Text>
        <Text style={font.small}>
          Jede Person zeigt bei der Anmeldung Ausweis und Live-Selfie. Wer nicht mehr aktiv ist, verschwindet aus den Vorschlägen.
        </Text>
      </View>
      {backend.demo && (
        <View style={s.hint}>
          <Text style={font.small}>Demo-Modus: noch keine Datenbank verbunden, alle Daten sind Beispiele.</Text>
        </View>
      )}
      <Button title="Los geht's" onPress={() => router.push('/anmelden')} />
    </Screen>
  );
}
