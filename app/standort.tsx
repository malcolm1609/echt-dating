import * as Location from 'expo-location';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { locate } from '../src/lib/location';
import { signupDraft } from '../src/lib/signupDraft';
import { Button, Screen, StepHeader, s } from '../src/ui/kit';
import { LocationStep } from '../src/ui/LocationStep';
import { font } from '../src/ui/theme';

// Testbetrieb: Die Beispielprofile wohnen in Gießen, mitten in der Stadt.
const GIESSEN = { lat: 50.5841, lng: 8.6784 };

const device = {
  requestPermission: () => Location.requestForegroundPermissionsAsync(),
  currentPosition: async () => {
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: coords.latitude, lng: coords.longitude };
  },
};

export default function Standort() {
  const draft = signupDraft.get();
  // Nach Neuladen ist das Profil aus dem Speicher weg: dann zurück zu „Über dich“.
  if (!draft) return <Redirect href="/profil" />;
  if (!draft.content) return <Redirect href="/fragen" />;
  const { profile, content } = draft;
  const save = async (coords: { lat: number; lng: number }) => {
    await backend.saveProfile(profile, coords, content);
    signupDraft.clear();
    router.replace('/verifizieren');
  };

  return (
    <Screen>
      <StepHeader step={5} total={6} name="Standort" />
      <LocationStep
        onLocate={() => locate(device)}
        onOpenSettings={() => Linking.openSettings()}
        onDone={save}
      />
      {backend.beta && <TestLocation onPick={() => save(GIESSEN)} />}
    </Screen>
  );
}

function TestLocation({ onPick }: { onPick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pick = () => {
    setBusy(true);
    setFailed(false);
    onPick().catch(() => setFailed(true)).finally(() => setBusy(false));
  };
  return (
    <View style={[s.hint, { gap: 10 }]}>
      <Text style={font.small}>Testbetrieb: Die Beispielprofile sind in Gießen. Wohnst du woanders, nimm den Teststandort, sonst siehst du niemanden.</Text>
      {failed && <Text style={s.error}>Speichern hat nicht geklappt. Bitte versuch es noch einmal.</Text>}
      <Button title="Teststandort Gießen" variant="ghost" icon="map-pin" busy={busy} onPress={pick} />
    </View>
  );
}
