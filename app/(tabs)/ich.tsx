import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { backend } from '../../src/lib/backend';
import { matchStore } from '../../src/lib/matches';
import { Button, Screen, s } from '../../src/ui/kit';
import { MyProfile, ProfileView } from '../../src/ui/ProfileView';
import { colors, font } from '../../src/ui/theme';

export default function Me() {
  const [profile, setProfile] = useState<MyProfile>();
  const [error, setError] = useState<string>();
  const load = useCallback(() => {
    setError(undefined);
    backend.myProfile().then(setProfile, () => setError('Dein Profil konnte nicht geladen werden.'));
  }, []);
  useFocusEffect(load);

  const restartDemo = () => {
    backend.reset?.();
    matchStore.reset();
    router.replace('/');
  };

  return (
    <Screen tabs>
      <ScrollView contentContainerStyle={{ gap: 24, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={font.display}>Du</Text>
        {!profile && !error && <Text style={font.small}>Lädt …</Text>}
        {error && (
          <View style={{ gap: 12 }}>
            <Text style={s.error}>{error}</Text>
            <Button title="Noch einmal" variant="ghost" onPress={load} />
          </View>
        )}
        {profile && (
          <ProfileView
            key={profile.displayName}
            profile={profile}
            onSaveBio={backend.saveBio}
            onSaveContent={backend.saveContent}
            onSavePreferences={async (p) => {
              await backend.savePreferences(p);
              setProfile({ ...profile, preferences: p });
            }}
            onTogglePause={async () => {
              await backend.setPaused(!profile.paused);
              setProfile({ ...profile, paused: !profile.paused });
            }}
          />
        )}
        {backend.demo && <Button title="Demo neu starten" variant="ghost" onPress={restartDemo} />}
      </ScrollView>
    </Screen>
  );
}
