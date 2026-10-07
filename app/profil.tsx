import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { backend } from '../src/lib/backend';
import { Screen, s } from '../src/ui/kit';
import { CompleteProfile, ProfileForm } from '../src/ui/ProfileForm';
import { font } from '../src/ui/theme';

export default function Profile() {
  const [error, setError] = useState<string>();

  const save = async (profile: CompleteProfile) => {
    setError(undefined);
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return setError('Wir brauchen deinen ungefähren Standort, um dir Menschen in deiner Nähe zu zeigen.');
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    try {
      await backend.saveProfile(profile, { lat: coords.latitude, lng: coords.longitude });
      router.replace('/verifizieren');
    } catch {
      setError('Speichern hat nicht geklappt. Bitte versuch es noch einmal.');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={font.title}>Über dich</Text>
        <Text style={font.small}>Dein Geburtsdatum wird später mit deinem Ausweis abgeglichen. Andere sehen nur dein Alter.</Text>
        <ProfileForm onSubmit={save} />
        {error && <Text style={s.error}>{error}</Text>}
      </ScrollView>
    </Screen>
  );
}
