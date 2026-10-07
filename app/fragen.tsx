import { Redirect, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { signupDraft } from '../src/lib/signupDraft';
import { Screen, StepHeader } from '../src/ui/kit';
import { ProfileContentForm } from '../src/ui/ProfileContentForm';
import { colors, font } from '../src/ui/theme';

export default function Fragen() {
  const draft = signupDraft.get();
  if (!draft) return <Redirect href="/profil" />;

  return (
    <Screen>
      <StepHeader step={4} total={6} name="Dein Profil" />
      <ScrollView contentContainerStyle={{ gap: 28, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 12 }}>
          <Text style={font.display}>Drei Fragen<Text style={{ color: colors.accent }}>.</Text></Text>
          <Text style={font.body}>Statt eines leeren Textfelds: Such dir pro Bereich eine Frage aus. Konkretes wirkt besser als Floskeln, ein Ort oder ein Erlebnis gibt anderen etwas zum Anknüpfen.</Text>
        </View>
        <ProfileContentForm
          initial={draft.content}
          submitLabel="Weiter"
          onSubmit={(content) => {
            signupDraft.setContent(content);
            router.push('/standort');
          }}
        />
      </ScrollView>
    </Screen>
  );
}
