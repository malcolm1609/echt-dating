import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { backend } from '../../src/lib/backend';
import { Glass } from '../../src/ui/Glass';
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

  return (
    <Screen tabs>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 12, paddingHorizontal: 2 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text accessibilityRole="header" style={font.display}>Du</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Einstellungen" onPress={() => router.push('/einstellungen')} hitSlop={6}>
            {({ pressed }) => (
              <Glass interactive style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] }}>
                <Feather name="settings" size={20} color={colors.text} />
              </Glass>
            )}
          </Pressable>
        </View>
        {!profile && !error && <Text style={font.small}>Lädt …</Text>}
        {error && (
          <View style={{ gap: 12 }}>
            <Text style={s.error}>{error}</Text>
            <Button title="Noch einmal" variant="ghost" onPress={load} />
          </View>
        )}
        {profile && <ProfileView key={profile.displayName} profile={profile} onSaveBio={backend.saveBio} onSaveContent={backend.saveContent} />}
      </ScrollView>
    </Screen>
  );
}
