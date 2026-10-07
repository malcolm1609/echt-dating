import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { signupDraft } from '../src/lib/signupDraft';
import { Screen, StepHeader } from '../src/ui/kit';
import { CompleteProfile, ProfileForm } from '../src/ui/ProfileForm';
import { colors, font } from '../src/ui/theme';

export default function Profile() {
  const next = (profile: CompleteProfile) => {
    signupDraft.set(profile);
    router.push('/standort');
  };

  return (
    <Screen>
      <StepHeader step={2} total={4} name="Über dich" />
      <ScrollView contentContainerStyle={{ gap: 28, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 12 }}>
          <Text style={font.display}>Erzähl kurz<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.small}>Dein Geburtsdatum gleichen wir später mit dem Ausweis ab. Andere sehen nur dein Alter.</Text>
        </View>
        <ProfileForm onSubmit={next} />
      </ScrollView>
    </Screen>
  );
}
