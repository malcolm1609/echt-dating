import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { Button, Screen, s } from '../src/ui/kit';
import { colors, font } from '../src/ui/theme';

const STEPS = ['Foto der Vorder- und Rückseite deines Ausweises', 'Kurzes Live-Selfie, damit wir sehen, dass du es bist', 'Ergebnis in wenigen Minuten'];

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
      <Text style={font.title}>Zeig, dass du echt bist</Text>
      <View style={{ gap: 14 }}>
        {STEPS.map((step, i) => (
          <View key={step} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '800', width: 22 }}>{i + 1}</Text>
            <Text style={[font.body, { flex: 1 }]}>{step}</Text>
          </View>
        ))}
      </View>
      <View style={s.hint}>
        <Text style={font.small}>Wir speichern nur das Ergebnis der Prüfung, keine Bilder von deinem Ausweis oder Gesicht. Die Prüfung macht ein zertifizierter Anbieter.</Text>
      </View>
      <View style={{ flex: 1 }} />
      {error && <Text style={s.error}>{error}</Text>}
      <Button title="Prüfung starten" onPress={start} disabled={busy} />
    </Screen>
  );
}
