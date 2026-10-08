import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { backend } from '../src/lib/backend';
import { PLUS_PRICE } from '../src/domain/plus.ts';
import { campusStore, useCampus } from '../src/lib/campus';
import { eventStore } from '../src/lib/events';
import { matchStore } from '../src/lib/matches';
import { plusStore, usePlus } from '../src/lib/plus';
import { CampusVerify } from '../src/ui/CampusVerify';
import { Button, Screen, s } from '../src/ui/kit';
import type { MyProfile } from '../src/ui/ProfileView';
import { SettingsView } from '../src/ui/SettingsView';
import { colors, font } from '../src/ui/theme';

export default function Settings() {
  const [profile, setProfile] = useState<MyProfile>();
  const [error, setError] = useState<string>();
  const plus = usePlus();
  const campus = useCampus();
  const load = useCallback(() => {
    setError(undefined);
    backend.myProfile().then(setProfile, () => setError('Deine Einstellungen konnten nicht geladen werden.'));
  }, []);
  useFocusEffect(load);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/ich'));

  const restartDemo = () => {
    backend.reset?.();
    matchStore.reset();
    eventStore.reset();
    plusStore.reset();
    campusStore.reset();
    router.replace('/');
  };

  const signOut = async () => {
    await backend.signOut().catch(() => {});
    matchStore.reset();
    router.replace('/');
  };

  const resetTestData = async () => {
    try {
      await backend.resetTestData();
      matchStore.refresh();
      router.replace('/heute');
    } catch {
      setError('Zurücksetzen hat nicht geklappt.');
    }
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
        {profile && <CampusVerify uni={campus.uni} onVerify={campusStore.verify} />}
        <Button title={plus.active ? 'Echt Plus ist aktiv' : `Echt Plus · ${PLUS_PRICE}`} variant="ghost" icon="star" onPress={() => router.push('/plus')} />
        {backend.demo && <Button title="Demo neu starten" variant="ghost" onPress={restartDemo} />}
        {backend.beta && <Button title="Testdaten zurücksetzen" variant="ghost" icon="rotate-ccw" onPress={resetTestData} />}
        {!backend.demo && <Button title="Abmelden" variant="ghost" icon="log-out" onPress={signOut} />}
      </ScrollView>
    </Screen>
  );
}
