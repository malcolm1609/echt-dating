import * as Location from 'expo-location';
import { Redirect, router } from 'expo-router';
import { Linking } from 'react-native';
import { backend } from '../src/lib/backend';
import { locate } from '../src/lib/location';
import { signupDraft } from '../src/lib/signupDraft';
import { Screen, StepHeader } from '../src/ui/kit';
import { LocationStep } from '../src/ui/LocationStep';

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

  return (
    <Screen>
      <StepHeader step={5} total={6} name="Standort" />
      <LocationStep
        onLocate={() => locate(device)}
        onOpenSettings={() => Linking.openSettings()}
        onDone={async (coords) => {
          await backend.saveProfile(profile, coords, content);
          signupDraft.clear();
          router.replace('/verifizieren');
        }}
      />
    </Screen>
  );
}
