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
  const profile = signupDraft.get();
  // Nach Neuladen ist das Profil aus dem Speicher weg: dann zurück zu „Über dich“.
  if (!profile) return <Redirect href="/profil" />;

  return (
    <Screen>
      <StepHeader step={3} total={4} name="Standort" />
      <LocationStep
        onLocate={() => locate(device)}
        onOpenSettings={() => Linking.openSettings()}
        onDone={async (coords) => {
          await backend.saveProfile(profile, coords);
          signupDraft.clear();
          router.replace('/verifizieren');
        }}
      />
    </Screen>
  );
}
