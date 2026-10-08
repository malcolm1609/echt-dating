import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { matchStore } from '../src/lib/matches';
import { Button, Screen, s } from '../src/ui/kit';
import type { MyProfile } from '../src/ui/ProfileView';
import { SettingsView } from '../src/ui/SettingsView';
import { colors, font } from '../src/ui/theme';

export default function Settings() {
  const [profile, setProfile] = useState<MyProfile>();
  const [error, setError] = useState<string>();
  const load = useCallback(() => {
    setError(undefined);
    backend.myProfile().then(setProfile, () => setError('Deine Einstellungen konnten nicht geladen werden.'));
  }, []);
  useFocusEffect(load);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/ich'));

  const restartDemo = () => {
    backend.reset?.();
    matchStore.reset();
    router.replace('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 24, paddingBottom: 12, paddingHorizontal: 2 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} hitSlop={12} style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <Feather name="chevron-left" size={28} color={colors.accent} />
          </Pressable>
          <Text accessibilityRole="header" style={font.display}>Einstellungen</Text>
        </View>
        {!profile && !error && <Text style={font.small}>Lädt …</Text>}
        {error && (
          <View style={{ gap: 12 }}>
            <Text style={s.error}>{error}</Text>
            <Button title="Noch einmal" variant="ghost" onPress={load} />
          </View>
        )}
        {profile && (
          <SettingsView
            key={profile.displayName}
            profile={profile}
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
