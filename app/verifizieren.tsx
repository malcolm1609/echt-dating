import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Screen, StepHeader, s } from '../src/ui/kit';
import { colors, font, fontFamily } from '../src/ui/theme';

const STEPS = ['Foto der Vorder- und Rückseite deines Ausweises', 'Kurzes Live-Selfie, damit wir sehen, dass du es bist', 'Dauert etwa zwei Minuten, das Ergebnis kommt kurz danach'];

export default function Verify() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const start = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const { url } = await backend.startVerification();
      if (url) await openBrowserAsync(url);
      router.replace('/status');
    } catch {
      setError('Die Prüfung konnte nicht gestartet werden. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <StepHeader step={4} total={4} name="Ausweis" />
      <Text style={font.display}>Zeig, dass{'\n'}du echt bist<Text style={{ color: colors.accent }}>.</Text></Text>
      <View style={{ gap: 16 }}>
        {STEPS.map((step, i) => (
          <View key={step} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.accent, fontFamily: fontFamily.display, fontSize: 28, width: 26 }}>{i + 1}</Text>
            <Text style={[font.body, { flex: 1 }]}>{step}</Text>
          </View>
        ))}
      </View>
      <View style={s.hint}>
        <Text style={font.small}>Wir speichern nur das Ergebnis der Prüfung, keine Bilder von deinem Ausweis oder Gesicht. Die Prüfung macht ein zertifizierter Anbieter.</Text>
      </View>
      <View style={{ flex: 1 }} />
      {error && <Text style={s.error}>{error}</Text>}
      <Button title={busy ? 'Prüfung wird geöffnet …' : 'Prüfung starten'} icon="camera" onPress={start} busy={busy} />
    </Screen>
  );
}
